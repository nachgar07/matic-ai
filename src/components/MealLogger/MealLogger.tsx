import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Food, useAddMeal } from "@/hooks/useFatSecret";
import { useToast } from "@/hooks/use-toast";

interface MealLoggerProps {
  food: Food;
  onClose: () => void;
  onSuccess: () => void;
}

export const MealLogger = ({ food, onClose, onSuccess }: MealLoggerProps) => {
  const [servings, setServings] = useState("1");
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');
  const { mutateAsync: addMeal, isPending } = useAddMeal();
  const { toast } = useToast();

  const calculateNutrition = (multiplier: number) => ({
    calories: Math.round((food.calories_per_serving || 0) * multiplier),
    protein: Math.round((food.protein_per_serving || 0) * multiplier * 10) / 10,
    carbs: Math.round((food.carbs_per_serving || 0) * multiplier * 10) / 10,
    fat: Math.round((food.fat_per_serving || 0) * multiplier * 10) / 10,
  });

  const nutrition = calculateNutrition(parseFloat(servings) || 1);

  const handleSubmit = async () => {
    try {
      await addMeal({
        foodId: food.food_id,
        servings: parseFloat(servings) || 1,
        mealType
      });
      
      toast({
        title: "¡Comida registrada!",
        description: `${food.food_name} añadido a ${getMealTypeLabel(mealType)}`
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

  const getMealTypeLabel = (type: string) => {
    const labels = {
      breakfast: "Desayuno",
      lunch: "Almuerzo", 
      dinner: "Cena",
      snack: "Snack"
    };
    return labels[type as keyof typeof labels] || type;
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
            <Select value={mealType} onValueChange={(value: any) => setMealType(value)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="breakfast">Desayuno</SelectItem>
                <SelectItem value="lunch">Almuerzo</SelectItem>
                <SelectItem value="dinner">Cena</SelectItem>
                <SelectItem value="snack">Snack</SelectItem>
              </SelectContent>
            </Select>
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