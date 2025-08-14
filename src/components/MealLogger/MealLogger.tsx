import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Food, useAddMeal } from "@/hooks/useFatSecret";
import { useToast } from "@/hooks/use-toast";
import { useMealCategories, useCreateMealCategory } from "@/hooks/useMealCategories";

interface MealLoggerProps {
  food: Food;
  onClose: () => void;
  onSuccess: () => void;
  selectedDate?: Date;
}

export const MealLogger = ({ food, onClose, onSuccess, selectedDate }: MealLoggerProps) => {
  const [servings, setServings] = useState("1");
  const [mealType, setMealType] = useState<string>("Desayuno");
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const { mutateAsync: addMeal, isPending } = useAddMeal();
  const { toast } = useToast();
  const { data: categories, isLoading: categoriesLoading } = useMealCategories();
  const { mutateAsync: createCategory, isPending: isCreatingCategory } = useCreateMealCategory();

  // Set default meal type when categories load
  if (categories && categories.length > 0 && mealType === "Desayuno" && !categories.find(c => c.name === "Desayuno")) {
    setMealType(categories[0].name);
  }

  const calculateNutrition = (multiplier: number) => ({
    calories: Math.round((food.calories_per_serving || 0) * multiplier),
    protein: Math.round((food.protein_per_serving || 0) * multiplier * 10) / 10,
    carbs: Math.round((food.carbs_per_serving || 0) * multiplier * 10) / 10,
    fat: Math.round((food.fat_per_serving || 0) * multiplier * 10) / 10,
  });

  const nutrition = calculateNutrition(parseFloat(servings) || 1);

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    try {
      const newCategory = await createCategory({ name: newCategoryName.trim() });
      setMealType(newCategory.name);
      setShowCreateCategory(false);
      setNewCategoryName("");
    } catch (error) {
      console.error('Error creating category:', error);
    }
  };

  const handleMealTypeChange = (value: string) => {
    if (value === "create-new") {
      setShowCreateCategory(true);
    } else {
      setMealType(value);
      setShowCreateCategory(false);
    }
  };

  const handleSubmit = async () => {
    try {
      // Map custom category names to the meal_type format expected by the API
      let finalMealType = mealType;
      
      // For backward compatibility, map default categories to expected values
      const categoryMapping: Record<string, string> = {
        'Desayuno': 'breakfast',
        'Almuerzo': 'lunch', 
        'Cena': 'dinner',
        'Snack': 'snack'
      };

      // Use mapping if it exists, otherwise use the category name directly
      if (categoryMapping[mealType]) {
        finalMealType = categoryMapping[mealType];
      }

      await addMeal({
        foodId: food.food_id,
        servings: parseFloat(servings) || 1,
        mealType: finalMealType as any,
        consumedAt: selectedDate
      });
      
      toast({
        title: "¡Comida registrada!",
        description: `${food.food_name} añadido a ${mealType}`
      });
      
      onSuccess();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo registrar la comida",
        variant: "destructive"
      });
    }
  };


  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 space-y-4">
        <div className="text-center">
          <h2 className="text-lg font-semibold">{food.food_name}</h2>
          {food.brand_name && (
            <p className="text-sm text-muted-foreground">{food.brand_name}</p>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="servings">Porciones</Label>
            <Input
              id="servings"
              type="number"
              step="0.5"
              min="0.1"
              value={servings}
              onChange={(e) => setServings(e.target.value)}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {food.serving_description || "1 porción"}
            </p>
          </div>

          <div>
            <Label htmlFor="meal-type">Tipo de comida</Label>
            {!showCreateCategory ? (
              <Select value={mealType} onValueChange={handleMealTypeChange}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  {categoriesLoading ? (
                    <SelectItem value="loading" disabled>Cargando...</SelectItem>
                  ) : (
                    <>
                      {categories?.map((category) => (
                        <SelectItem key={category.id} value={category.name}>
                          {category.icon} {category.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="create-new">➕ Crear nueva categoría</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            ) : (
              <div className="space-y-2 mt-1">
                <Input
                  placeholder="Nombre de la nueva categoría"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateCategory()}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowCreateCategory(false);
                      setNewCategoryName("");
                    }}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCreateCategory}
                    disabled={!newCategoryName.trim() || isCreatingCategory}
                    className="flex-1"
                  >
                    {isCreatingCategory ? "Creando..." : "Crear"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Nutrition Summary */}
          <Card className="p-3 bg-muted/50">
            <h4 className="font-medium text-sm mb-2">Información nutricional</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span>Calorías:</span>
                <span className="font-medium">{nutrition.calories}</span>
              </div>
              <div className="flex justify-between">
                <span>Proteína:</span>
                <span className="font-medium">{nutrition.protein}g</span>
              </div>
              <div className="flex justify-between">
                <span>Carbohidratos:</span>
                <span className="font-medium">{nutrition.carbs}g</span>
              </div>
              <div className="flex justify-between">
                <span>Grasas:</span>
                <span className="font-medium">{nutrition.fat}g</span>
              </div>
            </div>
          </Card>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isPending} className="flex-1">
            {isPending ? "Guardando..." : "Agregar"}
          </Button>
        </div>
      </Card>
    </div>
  );
};