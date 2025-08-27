import { useState } from "react";
import { MealEntry } from "@/hooks/useFatSecret";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { Trash2 } from "lucide-react";
import { MealPlate } from "@/components/MealPlate/MealPlate";

interface MealPlateListProps {
  meals: MealEntry[];
  onDeleteSelectedMeals?: (mealIds: string[]) => void;
  onDeleteMeal?: (mealId: string) => void;
  plateImages?: Record<string, string>;
}

export const MealPlateList = ({ meals, onDeleteSelectedMeals, onDeleteMeal, plateImages = {} }: MealPlateListProps) => {
  const [selectedPlates, setSelectedPlates] = useState<Set<string>>(new Set());
  const [plateNames, setPlateNames] = useState<Record<string, string>>({});

  console.log("📋 MealPlateList received plateImages:", plateImages);

  const groupedMeals = meals.reduce((acc, meal) => {
    // Usar el nombre de la categoría o un fallback
    const groupKey = meal.meal_categories?.name || meal.meal_type || 'Comida';
    if (!acc[groupKey]) {
      acc[groupKey] = [];
    }
    acc[groupKey].push(meal);
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
            <button
              onClick={() => handleSelectAll(!isAllSelected)}
              className="h-4 w-4 shrink-0 border border-primary rounded-sm flex items-center justify-center hover:bg-muted transition-colors"
            >
              {isAllSelected && <Check size={12} className="text-primary" />}
              {isSomeSelected && !isAllSelected && <div className="h-1.5 w-1.5 bg-primary rounded-sm" />}
            </button>
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
      {Object.entries(groupedMeals).map(([groupName, mealList]) => {
        // Use the plate_image from the first meal entry in this group, or fallback to plateImages prop
        const plateImageFromDB = mealList.find(meal => meal.plate_image)?.plate_image;
        const firstMeal = mealList[0];
        const mealTypeKey = firstMeal.meal_type; // Keep original for backwards compatibility with plateImages
        const finalPlateImage = plateImageFromDB || plateImages[mealTypeKey];
        
        console.log(`🍽️ Rendering MealPlate for ${groupName}, DB image:`, !!plateImageFromDB, "Prop image:", !!plateImages[mealTypeKey]);
        return (
          <MealPlate
            key={groupName}
            mealType={mealTypeKey} // Keep for backwards compatibility
            meals={mealList}
            isSelected={selectedPlates.has(groupName)}
            onSelectionChange={(selected) => handlePlateSelection(groupName, selected)}
            onPlateNameChange={handlePlateNameChange}
            plateName={plateNames[groupName]}
            onDeleteMeal={onDeleteMeal}
            plateImage={finalPlateImage}
          />
        );
      })}
      </div>
    </div>
  );
};