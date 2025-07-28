import { MealEntry } from "@/hooks/useFatSecret";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreVertical, Edit2, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface MealListProps {
  meals: MealEntry[];
  onEditMeal?: (meal: MealEntry) => void;
  onDeleteMeal?: (mealId: string) => void;
}

export const MealList = ({ meals, onEditMeal, onDeleteMeal }: MealListProps) => {
  const getMealTypeLabel = (type: string) => {
    const labels = {
      breakfast: "Desayuno",
      lunch: "Almuerzo", 
      dinner: "Cena",
      snack: "Snack"
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getMealTypeColor = (type: string) => {
    const colors = {
      breakfast: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      lunch: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      dinner: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      snack: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
    };
    return colors[type as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const groupedMeals = meals.reduce((acc, meal) => {
    if (!acc[meal.meal_type]) {
      acc[meal.meal_type] = [];
    }
    acc[meal.meal_type].push(meal);
    return acc;
  }, {} as Record<string, MealEntry[]>);

  if (meals.length === 0) {
    return (
      <Card className="p-6 text-center">
        <div className="text-muted-foreground mb-2">
          No has registrado comidas hoy
        </div>
        <div className="text-sm text-muted-foreground">
          Comienza agregando tu primera comida
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(groupedMeals).map(([mealType, mealList]) => (
        <div key={mealType}>
          <div className="flex items-center gap-2 mb-3">
            <Badge className={getMealTypeColor(mealType)}>
              {getMealTypeLabel(mealType)}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {mealList.length} {mealList.length === 1 ? 'item' : 'items'}
            </span>
          </div>
          
          <div className="space-y-2">
            {mealList.map((meal) => {
              const totalCalories = Math.round((meal.foods.calories_per_serving || 0) * meal.servings);
              const totalProtein = Math.round((meal.foods.protein_per_serving || 0) * meal.servings * 10) / 10;
              const totalCarbs = Math.round((meal.foods.carbs_per_serving || 0) * meal.servings * 10) / 10;
              const totalFat = Math.round((meal.foods.fat_per_serving || 0) * meal.servings * 10) / 10;

              return (
                <Card key={meal.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm">{meal.foods.food_name}</h4>
                        {meal.foods.brand_name && (
                          <span className="text-xs text-muted-foreground">
                            • {meal.foods.brand_name}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-xs text-muted-foreground mb-2">
                        {meal.servings}x {meal.foods.serving_description || "porción"}
                      </p>
                      
                      <div className="flex gap-4 text-xs">
                        <span className="font-medium text-primary">
                          {totalCalories} cal
                        </span>
                        <span>P: {totalProtein}g</span>
                        <span>C: {totalCarbs}g</span>
                        <span>G: {totalFat}g</span>
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEditMeal?.(meal)}>
                          <Edit2 size={14} className="mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => onDeleteMeal?.(meal.id)}
                          className="text-red-600"
                        >
                          <Trash2 size={14} className="mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};