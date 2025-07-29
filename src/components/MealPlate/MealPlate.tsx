import { useState } from "react";
import { MealEntry } from "@/hooks/useFatSecret";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronDown, ChevronRight, Edit2, Check, X, Trash2 } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface MealPlateProps {
  mealType: string;
  meals: MealEntry[];
  isSelected: boolean;
  onSelectionChange: (selected: boolean) => void;
  onPlateNameChange: (mealType: string, newName: string) => void;
  plateName?: string;
  onDeleteMeal?: (mealId: string) => void;
  plateImage?: string;
}

export const MealPlate = ({ 
  mealType, 
  meals, 
  isSelected, 
  onSelectionChange,
  onPlateNameChange,
  plateName,
  onDeleteMeal,
  plateImage
}: MealPlateProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState(plateName || getDefaultPlateName(mealType));

  function getDefaultPlateName(type: string) {
    const labels = {
      breakfast: "Desayuno",
      lunch: "Almuerzo", 
      dinner: "Cena",
      snack: "Snack"
    };
    return labels[type as keyof typeof labels] || type;
  }

  const getMealTypeColor = (type: string) => {
    const colors = {
      breakfast: "hsl(30 84% 57%)", // Orange
      lunch: "hsl(142 76% 36%)",   // Green  
      dinner: "hsl(262 83% 58%)",  // Purple
      snack: "hsl(346 87% 43%)"    // Pink
    };
    return colors[type as keyof typeof colors] || "hsl(var(--muted))";
  };

  // Calculate totals
  const totals = meals.reduce((acc, meal) => {
    const calories = (meal.foods.calories_per_serving || 0) * meal.servings;
    const protein = (meal.foods.protein_per_serving || 0) * meal.servings;
    const carbs = (meal.foods.carbs_per_serving || 0) * meal.servings;
    const fat = (meal.foods.fat_per_serving || 0) * meal.servings;
    
    return {
      calories: acc.calories + calories,
      protein: acc.protein + protein,
      carbs: acc.carbs + carbs,
      fat: acc.fat + fat
    };
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const handleNameSave = () => {
    onPlateNameChange(mealType, editingName);
    setIsEditingName(false);
  };

  const handleNameCancel = () => {
    setEditingName(plateName || getDefaultPlateName(mealType));
    setIsEditingName(false);
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3 mb-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelectionChange}
          className="h-5 w-5 self-center"
        />
        
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="flex-1">
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-1">
              {/* Imagen del plato a la izquierda */}
              <Dialog>
                <DialogTrigger asChild>
                  <button className="shrink-0">
                    <Avatar className="h-12 w-12 cursor-pointer hover:opacity-80 transition-opacity">
                      <AvatarImage src={plateImage} alt={`Foto de ${editingName}`} />
                      <AvatarFallback className="text-sm font-semibold" style={{ backgroundColor: getMealTypeColor(mealType) }}>
                        {editingName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DialogTrigger>
                <DialogContent className="p-2 max-w-lg">
                  {plateImage ? (
                    <img 
                      src={plateImage} 
                      alt={`Foto de ${editingName}`}
                      className="w-full h-auto rounded-lg"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
                      <span className="text-muted-foreground">No hay imagen disponible</span>
                    </div>
                  )}
                </DialogContent>
              </Dialog>

              {/* Contenido principal centrado verticalmente */}
              <div className="flex flex-col justify-center flex-1">
                {isEditingName ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="h-8 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleNameSave();
                        if (e.key === 'Escape') handleNameCancel();
                      }}
                      autoFocus
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 shrink-0"
                      onClick={handleNameSave}
                    >
                      <Check size={14} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 shrink-0"
                      onClick={handleNameCancel}
                    >
                      <X size={14} />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {/* Título y controles */}
                    <div className="flex items-center gap-2">
                      <Badge 
                        style={{ backgroundColor: getMealTypeColor(mealType) }}
                        className="text-white shrink-0"
                      >
                        {editingName}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 shrink-0"
                        onClick={() => setIsEditingName(true)}
                      >
                        <Edit2 size={12} />
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        {meals.length} {meals.length === 1 ? 'ingrediente' : 'ingredientes'}
                      </span>
                    </div>
                    
                    {/* Estadísticas nutricionales */}
                    <div className="flex flex-wrap gap-2 text-sm">
                      <span className="font-medium text-primary">
                        {Math.round(totals.calories)} cal
                      </span>
                      <span>P: {Math.round(totals.protein * 10) / 10}g</span>
                      <span>C: {Math.round(totals.carbs * 10) / 10}g</span>
                      <span>G: {Math.round(totals.fat * 10) / 10}g</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {!isEditingName && (
              <div className="flex items-center justify-end gap-2">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
                    {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </Button>
                </CollapsibleTrigger>
              </div>
            )}
          </div>

          <CollapsibleContent className="mt-3">
            <div className="space-y-2 pl-6 border-l-2 border-muted">
              {meals.map((meal) => {
                const itemCalories = Math.round((meal.foods.calories_per_serving || 0) * meal.servings);
                const itemProtein = Math.round((meal.foods.protein_per_serving || 0) * meal.servings * 10) / 10;
                const itemCarbs = Math.round((meal.foods.carbs_per_serving || 0) * meal.servings * 10) / 10;
                const itemFat = Math.round((meal.foods.fat_per_serving || 0) * meal.servings * 10) / 10;

                return (
                  <div key={meal.id} className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <h5 className="font-medium text-sm">{meal.foods.food_name}</h5>
                        {meal.foods.brand_name && (
                          <span className="text-xs text-muted-foreground">
                            • {meal.foods.brand_name}
                          </span>
                        )}
                      </div>
                      {onDeleteMeal && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 shrink-0 hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => onDeleteMeal(meal.id)}
                        >
                          <Trash2 size={12} />
                        </Button>
                      )}
                    </div>
                    
                    <p className="text-xs text-muted-foreground mb-2">
                      {meal.servings}x {meal.foods.serving_description || "porción"}
                    </p>
                    
                    <div className="flex gap-3 text-xs">
                      <span className="font-medium text-primary">
                        {itemCalories} cal
                      </span>
                      <span>P: {itemProtein}g</span>
                      <span>C: {itemCarbs}g</span>
                      <span>G: {itemFat}g</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </Card>
  );
};