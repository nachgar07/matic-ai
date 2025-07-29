import { useState } from "react";
import { MealEntry } from "@/hooks/useFatSecret";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2 } from "lucide-react";
import { MealPlate } from "@/components/MealPlate/MealPlate";

interface MealPlateListProps {
  meals: MealEntry[];
  onDeleteSelectedMeals?: (mealIds: string[]) => void;
  onDeleteMeal?: (mealId: string) => void;
}

export const MealPlateList = ({ meals, onDeleteSelectedMeals, onDeleteMeal }: MealPlateListProps) => {
  const [selectedPlates, setSelectedPlates] = useState<Set<string>>(new Set());
  const [plateNames, setPlateNames] = useState<Record<string, string>>({});

  const groupedMeals = meals.reduce((acc, meal) => {
    if (!acc[meal.meal_type]) {
      acc[meal.meal_type] = [];
    }
    acc[meal.meal_type].push(meal);
    return acc;
  }, {} as Record<string, MealEntry[]>);

  const allPlateTypes = Object.keys(groupedMeals);
  const isAllSelected = allPlateTypes.length > 0 && allPlateTypes.every(type => selectedPlates.has(type));
  const isSomeSelected = selectedPlates.size > 0;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPlates(new Set(allPlateTypes));
    } else {
      setSelectedPlates(new Set());
    }
  };

  const handlePlateSelection = (mealType: string, selected: boolean) => {
    const newSelected = new Set(selectedPlates);
    if (selected) {
      newSelected.add(mealType);
    } else {
      newSelected.delete(mealType);
    }
    setSelectedPlates(newSelected);
  };

  const handleDeleteSelected = () => {
    const mealIdsToDelete: string[] = [];
    
    selectedPlates.forEach(mealType => {
      const mealsOfType = groupedMeals[mealType];
      mealsOfType.forEach(meal => {
        mealIdsToDelete.push(meal.id);
      });
    });

    if (mealIdsToDelete.length > 0) {
      onDeleteSelectedMeals?.(mealIdsToDelete);
      setSelectedPlates(new Set());
    }
  };

  const handlePlateNameChange = (mealType: string, newName: string) => {
    setPlateNames(prev => ({
      ...prev,
      [mealType]: newName
    }));
  };

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
      {/* Selection Controls */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={isAllSelected || (isSomeSelected && !isAllSelected)}
              onCheckedChange={handleSelectAll}
              className="h-5 w-5 shrink-0"
            />
            <span className="text-sm font-medium">
              {isSomeSelected 
                ? `${selectedPlates.size} plato${selectedPlates.size === 1 ? '' : 's'} seleccionado${selectedPlates.size === 1 ? '' : 's'}`
                : 'Seleccionar todos los platos'
              }
            </span>
          </div>
          
          {isSomeSelected && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteSelected}
              className="gap-2 w-full sm:w-auto"
            >
              <Trash2 size={16} />
              <span className="sm:inline">Eliminar seleccionados</span>
            </Button>
          )}
        </div>
      </Card>

      {/* Meal Plates */}
      <div className="space-y-3">
        {Object.entries(groupedMeals).map(([mealType, mealList]) => (
            <MealPlate
              key={mealType}
              mealType={mealType}
              meals={mealList}
              isSelected={selectedPlates.has(mealType)}
              onSelectionChange={(selected) => handlePlateSelection(mealType, selected)}
              onPlateNameChange={handlePlateNameChange}
              plateName={plateNames[mealType]}
              onDeleteMeal={onDeleteMeal}
            />
        ))}
      </div>
    </div>
  );
};