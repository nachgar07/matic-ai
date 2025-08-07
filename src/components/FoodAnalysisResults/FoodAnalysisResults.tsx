import { useState } from 'react';
import { Check, Edit2, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAddMeal } from '@/hooks/useFatSecret';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';

interface AnalyzedFood {
  name: string;
  estimated_portion: string;
  estimated_calories: number;
  estimated_protein?: number;
  estimated_carbs?: number;
  estimated_fat?: number;
  confidence: number;
  fatsecret_data?: {
    food_id: string;
    food_name: string;
    calories_per_serving?: number;
    protein_per_serving?: number;
    carbs_per_serving?: number;
    fat_per_serving?: number;
  };
}

interface FoodAnalysisResultsProps {
  analysis: {
    foods: AnalyzedFood[];
    total_estimated_calories: number;
    suggestions: string[];
    originalImage: string;
  };
  onClose: () => void;
  onSuccess: () => void;
  selectedDate?: Date;
}

export const FoodAnalysisResults = ({ analysis, onClose, onSuccess, selectedDate }: FoodAnalysisResultsProps) => {
  const [editingFood, setEditingFood] = useState<number | null>(null);
  const [editedFoods, setEditedFoods] = useState(analysis.foods);
  const [selectedMealTypes, setSelectedMealTypes] = useState<Record<number, string>>({});
  const [servings, setServings] = useState<Record<number, number>>({});
  const [globalMealType, setGlobalMealType] = useState<string>("");
  const { toast } = useToast();
  const addMealMutation = useAddMeal();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const updateFood = (index: number, field: string, value: any) => {
    const updated = [...editedFoods];
    updated[index] = { ...updated[index], [field]: value };
    setEditedFoods(updated);
  };

  const addFoodToMeal = async (food: AnalyzedFood, index: number) => {
    const mealType = selectedMealTypes[index] as 'breakfast' | 'lunch' | 'dinner' | 'snack';
    const foodServings = servings[index] || 1;

    if (!mealType) {
      toast({
        title: "Selecciona el tipo de comida",
        description: "Por favor indica si es desayuno, almuerzo, cena o snack.",
        variant: "destructive"
      });
      return;
    }

    try {
      let foodIdToUse = food.fatsecret_data?.food_id;

      // If no FatSecret data, create a manual food entry with estimated values
      if (!foodIdToUse) {
        const foodPayload = {
          food_id: `manual_${Date.now()}_${index}`,
          food_name: food.name,
          brand_name: "Estimado por IA",
          calories_per_serving: food.estimated_calories,
          protein_per_serving: food.estimated_protein || Math.round(food.estimated_calories * 0.15 / 4),
          carbs_per_serving: food.estimated_carbs || Math.round(food.estimated_calories * 0.5 / 4),
          fat_per_serving: food.estimated_fat || Math.round(food.estimated_calories * 0.35 / 9),
          serving_description: food.estimated_portion
        };

        // Store the food in the foods table first using Supabase function
        const { data: insertedFood, error: foodError } = await supabase.functions.invoke('add-manual-food', {
          body: foodPayload
        });

        if (foodError) throw foodError;
        foodIdToUse = insertedFood.food_id;
      }

      await addMealMutation.mutateAsync({
        foodId: foodIdToUse,
        servings: foodServings,
        mealType,
        plateImage: analysis.originalImage,
        consumedAt: selectedDate
      });

      await queryClient.invalidateQueries({ queryKey: ['user-meals'] });

      toast({
        title: "Comida agregada",
        description: `${food.name} se agregó a tu registro de ${getMealTypeLabel(mealType)}.`
      });

    } catch (error) {
      console.error('Error adding food to meal:', error);
      toast({
        title: "Error", 
        description: "No se pudo agregar la comida. Intenta de nuevo.",
        variant: "destructive"
      });
    }
  };

  const addAllFoods = async () => {
    const foodsWithMealType = editedFoods.filter((_, index) => selectedMealTypes[index]);
    
    if (foodsWithMealType.length === 0) {
      toast({
        title: "Configura los alimentos",
        description: "Selecciona el tipo de comida para al menos un alimento.",
        variant: "destructive"
      });
      return;
    }

    try {
      for (let i = 0; i < editedFoods.length; i++) {
        if (selectedMealTypes[i]) {
          await addFoodToMeal(editedFoods[i], i);
        }
      }

      toast({
        title: "¡Comidas agregadas!",
        description: `Se agregaron ${foodsWithMealType.length} alimentos a tu registro.`
      });

      onSuccess();
    } catch (error) {
      console.error('Error adding all foods:', error);
      toast({
        title: "Error",
        description: "Hubo un problema agregando algunas comidas.",
        variant: "destructive"
      });
    }
  };

  const getMealTypeLabel = (type: string) => {
    const labels = {
      breakfast: 'desayuno',
      lunch: 'almuerzo', 
      dinner: 'cena',
      snack: 'snack'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const applyGlobalMealType = () => {
    if (!globalMealType) return;
    
    const newSelectedMealTypes = {...selectedMealTypes};
    editedFoods.forEach((_, index) => {
      newSelectedMealTypes[index] = globalMealType;
    });
    setSelectedMealTypes(newSelectedMealTypes);
    
    toast({
      title: "Tipo de comida aplicado",
      description: `Todos los alimentos se configuraron como ${getMealTypeLabel(globalMealType)}.`
    });
  };

  const totalCalories = editedFoods.reduce((sum, food) => {
    const serving = servings[editedFoods.indexOf(food)] || 1;
    return sum + (food.estimated_calories * serving);
  }, 0);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      <Card className={`w-full ${isMobile ? 'max-w-full' : 'max-w-4xl'} bg-background max-h-[95vh] overflow-y-auto`}>
        <div className={`${isMobile ? 'p-4' : 'p-6'}`}>
          <div className={`flex justify-between items-start mb-4 ${isMobile ? 'mb-4' : 'mb-6'}`}>
            <div>
              <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold mb-2`}>Análisis de Alimentos</h3>
              <p className="text-sm text-muted-foreground">
                Se identificaron {editedFoods.length} alimentos • ~{Math.round(totalCalories)} calorías
              </p>
            </div>
            <Button variant="ghost" onClick={onClose} size={isMobile ? "sm" : "default"}>×</Button>
          </div>

          {/* Original image preview */}
          <div className={`${isMobile ? 'mb-4' : 'mb-6'}`}>
            <img
              src={analysis.originalImage}
              alt="Foto analizada"
              className={`w-full ${isMobile ? 'max-h-24' : 'max-h-32'} object-contain rounded-lg bg-muted`}
            />
          </div>

          {/* Global meal type selector */}
          <Card className={`${isMobile ? 'p-3 mb-4' : 'p-4 mb-6'} bg-primary/5 border-primary/20`}>
            <div className={`${isMobile ? 'flex-col gap-3' : 'flex items-center gap-4'}`}>
              <div className="flex-1">
                <label className="text-sm font-medium text-muted-foreground">
                  Asignar todos los alimentos como:
                </label>
                <Select
                  value={globalMealType}
                  onValueChange={setGlobalMealType}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Seleccionar tipo de comida..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="breakfast">Desayuno</SelectItem>
                    <SelectItem value="lunch">Almuerzo</SelectItem>
                    <SelectItem value="dinner">Cena</SelectItem>
                    <SelectItem value="snack">Snack</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={applyGlobalMealType}
                disabled={!globalMealType}
                variant="outline"
                className={isMobile ? 'w-full' : ''}
                size={isMobile ? 'sm' : 'default'}
              >
                Aplicar a Todos
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              O configura cada alimento individualmente abajo (personalizado)
            </p>
          </Card>

          {/* Foods list */}
          <div className={`space-y-4 ${isMobile ? 'mb-4' : 'mb-6'}`}>
            {editedFoods.map((food, index) => (
              <Card key={index} className={`${isMobile ? 'p-3' : 'p-4'}`}>
                <div className={`${isMobile ? 'flex-col space-y-3' : 'flex items-start gap-4'}`}>
                  <div className="flex-1">
                    <div className={`flex ${isMobile ? 'flex-col gap-1' : 'items-center gap-2'} mb-2`}>
                      <h4 className="font-medium">{food.name}</h4>
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant={food.confidence > 0.8 ? "default" : "secondary"} className={isMobile ? 'text-xs' : ''}>
                          {Math.round(food.confidence * 100)}% confianza
                        </Badge>
                        {food.fatsecret_data && (
                          <Badge variant="outline" className={isMobile ? 'text-xs' : ''}>
                            <Check className="h-3 w-3 mr-1" />
                            En base de datos
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-1 md:grid-cols-3 gap-4'}`}>
                      {/* Portion */}
                      <div>
                        <label className="text-sm text-muted-foreground">Porción</label>
                        {editingFood === index ? (
                          <Input
                            value={food.estimated_portion}
                            onChange={(e) => updateFood(index, 'estimated_portion', e.target.value)}
                            className="mt-1"
                          />
                        ) : (
                          <p className={`mt-1 ${isMobile ? 'text-sm' : ''}`}>{food.estimated_portion}</p>
                        )}
                      </div>

                      {/* Servings */}
                      <div>
                        <label className="text-sm text-muted-foreground">Porciones</label>
                        <Input
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={servings[index] || 1}
                          onChange={(e) => setServings({...servings, [index]: parseFloat(e.target.value) || 1})}
                          className="mt-1"
                        />
                      </div>

                      {/* Meal type */}
                      <div>
                        <label className="text-sm text-muted-foreground">
                          Tipo de comida {selectedMealTypes[index] && globalMealType !== selectedMealTypes[index] && "(personalizado)"}
                        </label>
                        <Select
                          value={selectedMealTypes[index] || ""}
                          onValueChange={(value) => setSelectedMealTypes({...selectedMealTypes, [index]: value})}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Seleccionar..." />
                          </SelectTrigger>
                          <SelectContent className="bg-background z-50">
                            <SelectItem value="breakfast">Desayuno</SelectItem>
                            <SelectItem value="lunch">Almuerzo</SelectItem>
                            <SelectItem value="dinner">Cena</SelectItem>
                            <SelectItem value="snack">Snack</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Nutritional info */}
                    <div className={`mt-3 grid ${isMobile ? 'grid-cols-1 gap-2' : 'grid-cols-2 md:grid-cols-4 gap-3'} text-sm`}>
                      <div>
                        <label className="text-xs text-muted-foreground">Calorías</label>
                        {editingFood === index ? (
                          <Input
                            type="number"
                            value={food.estimated_calories}
                            onChange={(e) => updateFood(index, 'estimated_calories', parseFloat(e.target.value) || 0)}
                            className="mt-1 h-8"
                          />
                        ) : (
                          <p className="mt-1 font-medium">
                            {Math.round(food.estimated_calories * (servings[index] || 1))}
                          </p>
                        )}
                      </div>
                      
                      <div>
                        <label className="text-xs text-muted-foreground">Proteína (g)</label>
                        {editingFood === index ? (
                          <Input
                            type="number"
                            step="0.1"
                            value={food.estimated_protein || food.fatsecret_data?.protein_per_serving || 0}
                            onChange={(e) => updateFood(index, 'estimated_protein', parseFloat(e.target.value) || 0)}
                            className="mt-1 h-8"
                          />
                        ) : (
                          <p className="mt-1 font-medium">
                            {Math.round((food.estimated_protein || food.fatsecret_data?.protein_per_serving || 0) * (servings[index] || 1))}g
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="text-xs text-muted-foreground">Carbos (g)</label>
                        {editingFood === index ? (
                          <Input
                            type="number"
                            step="0.1"
                            value={food.estimated_carbs || food.fatsecret_data?.carbs_per_serving || 0}
                            onChange={(e) => updateFood(index, 'estimated_carbs', parseFloat(e.target.value) || 0)}
                            className="mt-1 h-8"
                          />
                        ) : (
                          <p className="mt-1 font-medium">
                            {Math.round((food.estimated_carbs || food.fatsecret_data?.carbs_per_serving || 0) * (servings[index] || 1))}g
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="text-xs text-muted-foreground">Grasa (g)</label>
                        {editingFood === index ? (
                          <Input
                            type="number"
                            step="0.1"
                            value={food.estimated_fat || food.fatsecret_data?.fat_per_serving || 0}
                            onChange={(e) => updateFood(index, 'estimated_fat', parseFloat(e.target.value) || 0)}
                            className="mt-1 h-8"
                          />
                        ) : (
                          <p className="mt-1 font-medium">
                            {Math.round((food.estimated_fat || food.fatsecret_data?.fat_per_serving || 0) * (servings[index] || 1))}g
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className={`flex ${isMobile ? 'justify-end gap-2' : 'gap-2'}`}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingFood(editingFood === index ? null : index)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      onClick={async () => {
                        await addFoodToMeal(food, index);
                        onSuccess();
                      }}
                      disabled={!selectedMealTypes[index]}
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Agregar
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* AI Suggestions */}
          {analysis.suggestions && analysis.suggestions.length > 0 && (
            <Card className="p-4 mb-6 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h5 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                    Consejos Nutricionales
                  </h5>
                  <ul className="space-y-1 text-sm text-blue-700 dark:text-blue-300">
                    {analysis.suggestions.map((suggestion, index) => (
                      <li key={index}>• {suggestion}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={addAllFoods} className="flex-1">
              Agregar Todas las Comidas
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};