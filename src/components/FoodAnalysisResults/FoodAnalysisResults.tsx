import { useState } from 'react';
import { Plus, Sparkles, Trash2 } from 'lucide-react';
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
import { useMealCategories, useCreateMealCategory, useDeleteMealCategory } from '@/hooks/useMealCategories';

interface AnalyzedFood {
  name: string;
  estimated_portion: string;
  estimated_calories: number;
  estimated_protein: number;
  estimated_carbs: number;
  estimated_fat: number;
  confidence: number;
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
  const [editedFoods, setEditedFoods] = useState(analysis.foods || []);
  const [selectedMealTypes, setSelectedMealTypes] = useState<Record<number, string>>({});
  const [servings, setServings] = useState<Record<number, number>>({});
  const [globalMealType, setGlobalMealType] = useState<string>("");
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const { toast } = useToast();
  const addMealMutation = useAddMeal();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const { data: mealCategories } = useMealCategories();
  const createMealCategory = useCreateMealCategory();
  const deleteMealCategory = useDeleteMealCategory();

  const updateFood = (index: number, field: string, value: any) => {
    const updated = [...editedFoods];
    updated[index] = { ...updated[index], [field]: value };
    setEditedFoods(updated);
  };

  const addFoodToMeal = async (food: AnalyzedFood, index: number) => {
    const mealType = selectedMealTypes[index];
    const foodServings = servings[index] || 1;

    if (!mealType) {
      toast({
        title: "Selecciona el tipo de comida",
        description: "Por favor selecciona una categoría de comida.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Create manual food entry with OpenAI estimated values
      const foodPayload = {
        food_id: `manual_${Date.now()}_${index}`,
        food_name: food.name,
        brand_name: "Analizado por IA",
        calories_per_serving: food.estimated_calories,
        protein_per_serving: food.estimated_protein,
        carbs_per_serving: food.estimated_carbs,
        fat_per_serving: food.estimated_fat,
        serving_description: food.estimated_portion
      };

      // Store the food in the foods table first using Supabase function
      const { data: insertedFood, error: foodError } = await supabase.functions.invoke('add-manual-food', {
        body: foodPayload
      });

      if (foodError) throw foodError;

      await addMealMutation.mutateAsync({
        foodId: insertedFood.food_id,
        servings: foodServings,
        mealType,
        plateImage: analysis.originalImage,
        consumedAt: selectedDate
      });

      await queryClient.invalidateQueries({ queryKey: ['user-meals'] });

      const categoryName = mealCategories?.find(cat => cat.id === mealType)?.name || mealType;
      toast({
        title: "Comida agregada",
        description: `${food.name} se agregó a tu registro de ${categoryName}.`
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

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({
        title: "Nombre requerido",
        description: "Por favor ingresa un nombre para la categoría",
        variant: "destructive"
      });
      return;
    }

    try {
      const newCategory = await createMealCategory.mutateAsync({ 
        name: newCategoryName.trim() 
      });
      
      setGlobalMealType(newCategory.id);
      setShowCreateCategory(false);
      setNewCategoryName('');
    } catch (error) {
      console.error('Error creating category:', error);
    }
  };

  const handleGlobalMealTypeChange = (value: string) => {
    if (value === 'create-new') {
      setShowCreateCategory(true);
      return;
    }
    
    setGlobalMealType(value);
    setShowCreateCategory(false);
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const category = mealCategories?.find(cat => cat.id === categoryId);
    if (!category) return;

    if (category.is_default) {
      toast({
        title: "No se puede eliminar",
        description: "Las categorías por defecto no se pueden eliminar",
        variant: "destructive"
      });
      return;
    }

    try {
      await deleteMealCategory.mutateAsync(categoryId);
      
      // Remove from selected meal types if it was selected
      if (globalMealType === categoryId) {
        setGlobalMealType('');
      }
      
      const newSelectedMealTypes = {...selectedMealTypes};
      Object.keys(newSelectedMealTypes).forEach(index => {
        if (newSelectedMealTypes[parseInt(index)] === categoryId) {
          delete newSelectedMealTypes[parseInt(index)];
        }
      });
      setSelectedMealTypes(newSelectedMealTypes);
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  const handleIndividualMealTypeChange = (index: number, value: string) => {
    if (value === 'create-new') {
      setShowCreateCategory(true);
      return;
    }
    
    setSelectedMealTypes({...selectedMealTypes, [index]: value});
  };

  const applyGlobalMealType = () => {
    if (!globalMealType) return;
    
    const newSelectedMealTypes = {...selectedMealTypes};
    editedFoods.forEach((_, index) => {
      newSelectedMealTypes[index] = globalMealType;
    });
    setSelectedMealTypes(newSelectedMealTypes);
    
    const categoryName = mealCategories?.find(cat => cat.id === globalMealType)?.name || globalMealType;
    toast({
      title: "Tipo de comida aplicado",
      description: `Todos los alimentos se configuraron como ${categoryName}.`
    });
  };

  const totalCalories = (editedFoods || []).reduce((sum, food) => {
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
                Se identificaron {editedFoods?.length || 0} alimentos • ~{Math.round(totalCalories)} calorías
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
                {!showCreateCategory ? (
                  <Select
                    value={globalMealType}
                    onValueChange={handleGlobalMealTypeChange}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Seleccionar tipo de comida..." />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      {mealCategories?.map((category) => (
                        <SelectItem key={category.id} value={category.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1">
                            <span>{category.icon} {category.name}</span>
                          </div>
                          {!category.is_default && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 hover:bg-destructive/20 ml-2"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDeleteCategory(category.id);
                              }}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          )}
                        </SelectItem>
                      ))}
                      <SelectItem value="create-new" className="text-primary">
                        <Plus className="h-4 w-4 inline mr-2" />
                        Crear nueva categoría
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex gap-2 mt-1">
                    <Input
                      placeholder="Nombre de la categoría..."
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleCreateCategory()}
                    />
                    <Button onClick={handleCreateCategory} size="sm" disabled={!newCategoryName.trim()}>
                      Crear
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setShowCreateCategory(false);
                        setNewCategoryName('');
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                )}
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
            {(editedFoods || []).map((food, index) => (
              <Card key={index} className={`${isMobile ? 'p-3' : 'p-4'}`}>
                <div className={`${isMobile ? 'flex-col space-y-3' : 'flex items-start gap-4'}`}>
                  <div className="flex-1">
                    <div className={`flex ${isMobile ? 'flex-col gap-1' : 'items-center gap-2'} mb-2`}>
                      <h4 className="font-medium">{food.name}</h4>
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant={food.confidence > 0.8 ? "default" : "secondary"} className={isMobile ? 'text-xs' : ''}>
                          {Math.round(food.confidence * 100)}% confianza
                        </Badge>
                        <Badge variant="outline" className={isMobile ? 'text-xs' : ''}>
                          Analizado por IA
                        </Badge>
                      </div>
                    </div>

                    <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-1 md:grid-cols-3 gap-4'}`}>
                      {/* Portion */}
                      <div>
                        <label className="text-sm text-muted-foreground">Porción</label>
                        <p className={`mt-1 ${isMobile ? 'text-sm' : ''}`}>{food.estimated_portion}</p>
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
                          onValueChange={(value) => handleIndividualMealTypeChange(index, value)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Seleccionar..." />
                          </SelectTrigger>
                          <SelectContent className="bg-background z-50">
                            {mealCategories?.map((category) => (
                              <SelectItem key={category.id} value={category.id} className="flex items-center justify-between">
                                <div className="flex items-center gap-2 flex-1">
                                  <span>{category.icon} {category.name}</span>
                                </div>
                                {!category.is_default && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 hover:bg-destructive/20 ml-2"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleDeleteCategory(category.id);
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                  </Button>
                                )}
                              </SelectItem>
                            ))}
                            <SelectItem value="create-new" className="text-primary">
                              <Plus className="h-4 w-4 inline mr-2" />
                              Crear nueva categoría
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Nutritional info */}
                    <div className={`mt-3 grid ${isMobile ? 'grid-cols-2 gap-2' : 'grid-cols-4 gap-3'} text-sm`}>
                      <div className={isMobile ? 'text-center' : ''}>
                        <span className="text-muted-foreground block text-xs">Calorías</span>
                        <span className="font-medium text-lg">
                          {Math.round(food.estimated_calories * (servings[index] || 1))}
                        </span>
                      </div>
                      
                      <div className={isMobile ? 'text-center' : ''}>
                        <span className="text-muted-foreground block text-xs">Proteína</span>
                        <span className="font-medium">
                          {Math.round(food.estimated_protein * (servings[index] || 1))}g
                        </span>
                      </div>

                      <div className={isMobile ? 'text-center' : ''}>
                        <span className="text-muted-foreground block text-xs">Carbos</span>
                        <span className="font-medium">
                          {Math.round(food.estimated_carbs * (servings[index] || 1))}g
                        </span>
                      </div>

                      <div className={isMobile ? 'text-center' : ''}>
                        <span className="text-muted-foreground block text-xs">Grasa</span>
                        <span className="font-medium">
                          {Math.round(food.estimated_fat * (servings[index] || 1))}g
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={`flex ${isMobile ? 'justify-end gap-2' : 'gap-2'}`}>
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