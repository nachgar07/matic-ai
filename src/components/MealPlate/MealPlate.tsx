import { useState } from "react";
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
import { MealEntry } from "@/hooks/useFatSecret";

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

  console.log("🍽️ MealPlate render:", { mealType, plateImage: !!plateImage });

  function getDefaultPlateName(mealType: string) {
    const names = {
      breakfast: "Desayuno",
      lunch: "Almuerzo", 
      dinner: "Cena",
      snack: "Merienda",
      desayuno: "Desayuno",
      almuerzo: "Almuerzo",
      cena: "Cena",
      merienda: "Merienda"
    };
    return names[mealType as keyof typeof names] || mealType;
  }

  function getMealTypeColor(mealType: string) {
    const colors = {
      breakfast: "#ff9500",
      lunch: "#34c759",
      dinner: "#af52de", 
      snack: "#ff3b30",
      desayuno: "#ff9500",
      almuerzo: "#34c759",
      cena: "#af52de",
      merienda: "#ff3b30"
    };
    return colors[mealType as keyof typeof colors] || "#007aff";
  }

  // Calculate totals for this meal type
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
      {/* Header Section - Perfectly aligned */}
      <div className="flex items-center gap-4 min-h-[60px]">
        {/* Checkbox */}
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelectionChange}
          className="h-3.5 w-3.5"
        />
        
        {/* Avatar */}
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

        {/* Content */}
        <div className="flex-1 flex flex-col justify-center min-w-0 pr-2">
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
              {/* Title row */}
              <div className="flex items-center gap-2 overflow-hidden">
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
                <span className="text-sm text-muted-foreground truncate">
                  {meals.length} {meals.length === 1 ? 'ingrediente' : 'ingredientes'}
                </span>
              </div>
              
              {/* Stats row */}
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

        {/* Expand button */}
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="shrink-0">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </Button>
          </CollapsibleTrigger>
        </Collapsible>
      </div>

      {/* Collapsible Content */}
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleContent className="space-y-3 mt-3">
          {meals.map((meal) => {
            const calories = (meal.foods.calories_per_serving || 0) * meal.servings;
            const protein = (meal.foods.protein_per_serving || 0) * meal.servings;
            const carbs = (meal.foods.carbs_per_serving || 0) * meal.servings;
            const fat = (meal.foods.fat_per_serving || 0) * meal.servings;

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
                
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                  <span>{meal.servings} {meal.foods.serving_description || 'porción'}</span>
                  <span>{Math.round(calories)} cal</span>
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="text-center p-2 rounded bg-background">
                    <div className="font-medium">{Math.round(protein * 10) / 10}g</div>
                    <div className="text-muted-foreground">Proteína</div>
                  </div>
                  <div className="text-center p-2 rounded bg-background">
                    <div className="font-medium">{Math.round(carbs * 10) / 10}g</div>
                    <div className="text-muted-foreground">Carbohidratos</div>
                  </div>
                  <div className="text-center p-2 rounded bg-background">
                    <div className="font-medium">{Math.round(fat * 10) / 10}g</div>
                    <div className="text-muted-foreground">Grasas</div>
                  </div>
                </div>
              </div>
            );
          })}
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};