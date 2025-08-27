import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronDown, ChevronRight, Edit2, Check, X, Trash2 } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { MealEntry } from "@/hooks/useFatSecret";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

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
  const [editingMeals, setEditingMeals] = useState<Record<string, {
    food_name: string;
    grams: number;
    serving_description: string;
  }>>({});
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Usar el primer meal para obtener la información de la categoría
  const firstMeal = meals[0];
  const defaultName = getDefaultPlateName(firstMeal);
  const [editingName, setEditingName] = useState(plateName || defaultName);

  console.log("🍽️ MealPlate render:", { mealType, plateImage: !!plateImage });

  function getDefaultPlateName(meal: MealEntry) {
    // Si hay datos de meal_categories, usar esos
    if (meal.meal_categories?.name) {
      return meal.meal_categories.name;
    }
    
    // Fallback a nombres por defecto basados en el UUID o string
    const mealType = meal.meal_type;
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
    return names[mealType as keyof typeof names] || "Comida";
  }

  function getMealTypeColor(firstMeal: MealEntry) {
    // Si hay información de categoría, usar su color
    if (firstMeal.meal_categories?.color) {
      return firstMeal.meal_categories.color;
    }
    
    // Fallback a colores por defecto
    const mealType = firstMeal.meal_type;
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
    setEditingName(plateName || defaultName);
    setIsEditingName(false);
  };

  const getGramsPerServing = (meal: MealEntry) => {
    // Asumimos 100g por porción como estándar si no se especifica
    const description = meal.foods.serving_description || '';
    const gramsMatch = description.match(/(\d+)\s*g/i);
    return gramsMatch ? parseInt(gramsMatch[1]) : 100;
  };

  const handleMealEdit = (mealId: string, meal: MealEntry) => {
    const gramsPerServing = getGramsPerServing(meal);
    const currentGrams = gramsPerServing * meal.servings;
    
    setEditingMeals(prev => ({
      ...prev,
      [mealId]: {
        food_name: meal.foods.food_name,
        grams: currentGrams,
        serving_description: meal.foods.serving_description || ''
      }
    }));
  };

  const handleMealSave = async (mealId: string) => {
    const editData = editingMeals[mealId];
    if (!editData) return;

    try {
      // Update the food name and serving description in the foods table
      const meal = meals.find(m => m.id === mealId);
      if (!meal) return;

      // Update the foods table
      const { error: foodError } = await supabase
        .from('foods')
        .update({
          food_name: editData.food_name,
          serving_description: editData.serving_description
        })
        .eq('id', meal.food_id);

      if (foodError) throw foodError;

      // Calculate new servings based on grams
      const targetMeal = meals.find(m => m.id === mealId);
      if (!targetMeal) return;
      
      const gramsPerServing = getGramsPerServing(targetMeal);
      const newServings = editData.grams / gramsPerServing;

      // Update the meal entry servings
      const { error: mealError } = await supabase
        .from('meal_entries')
        .update({
          servings: newServings
        })
        .eq('id', mealId);

      if (mealError) throw mealError;

      // Remove from editing state
      setEditingMeals(prev => {
        const updated = { ...prev };
        delete updated[mealId];
        return updated;
      });

      // Refresh the data
      queryClient.invalidateQueries({ queryKey: ['user-meals'] });

      toast({
        title: "Ingrediente actualizado",
        description: "Los cambios se han guardado correctamente"
      });

    } catch (error) {
      console.error('Error updating meal:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el ingrediente",
        variant: "destructive"
      });
    }
  };

  const handleMealCancel = (mealId: string) => {
    setEditingMeals(prev => {
      const updated = { ...prev };
      delete updated[mealId];
      return updated;
    });
  };

  const updateEditingMeal = (mealId: string, field: string, value: string | number) => {
    setEditingMeals(prev => ({
      ...prev,
      [mealId]: {
        ...prev[mealId],
        [field]: value
      }
    }));
  };

  return (
    <Card className="p-4">
      {/* Header Section - Perfectly aligned */}
      <div className="flex items-center gap-4 min-h-[60px]">
        {/* Checkbox */}
        <button
          onClick={() => onSelectionChange(!isSelected)}
          className="h-4 w-4 shrink-0 border border-primary rounded-sm flex items-center justify-center hover:bg-muted transition-colors"
        >
          {isSelected && <Check size={12} className="text-primary" />}
        </button>
        
        {/* Avatar */}
        <Dialog>
          <DialogTrigger asChild>
            <button className="shrink-0">
              <Avatar className="h-12 w-12 cursor-pointer hover:opacity-80 transition-opacity">
                <AvatarImage src={plateImage} alt={`Foto de ${editingName}`} />
                <AvatarFallback className="text-sm font-semibold" style={{ backgroundColor: getMealTypeColor(firstMeal) }}>
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
                  style={{ backgroundColor: getMealTypeColor(firstMeal) }}
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
            const isEditing = editingMeals[meal.id];
            const editData = isEditing || {
              food_name: meal.foods.food_name,
              grams: getGramsPerServing(meal) * meal.servings,
              serving_description: meal.foods.serving_description || ''
            };
            
            // Calculate servings from grams for nutritional calculations
            const currentServings = isEditing ? 
              editData.grams / getGramsPerServing(meal) : 
              meal.servings;
            
            const calories = (meal.foods.calories_per_serving || 0) * currentServings;
            const protein = (meal.foods.protein_per_serving || 0) * currentServings;
            const carbs = (meal.foods.carbs_per_serving || 0) * currentServings;
            const fat = (meal.foods.fat_per_serving || 0) * currentServings;

            return (
              <div key={meal.id} className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {isEditing ? (
                      <Input
                        value={editData.food_name}
                        onChange={(e) => updateEditingMeal(meal.id, 'food_name', e.target.value)}
                        className="h-7 text-sm font-medium"
                        placeholder="Nombre del ingrediente"
                      />
                    ) : (
                      <h5 className="font-medium text-sm">{meal.foods.food_name}</h5>
                    )}
                    {meal.foods.brand_name && !isEditing && (
                      <span className="text-xs text-muted-foreground">
                        • {meal.foods.brand_name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {isEditing ? (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => handleMealSave(meal.id)}
                        >
                          <Check size={12} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => handleMealCancel(meal.id)}
                        >
                          <X size={12} />
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 shrink-0 hover:bg-primary/10"
                        onClick={() => handleMealEdit(meal.id, meal)}
                      >
                        <Edit2 size={12} />
                      </Button>
                    )}
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
                </div>
                
                 <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                   {isEditing ? (
                     <div className="flex items-center gap-2">
                       <Input
                         type="number"
                         value={editData.grams}
                         onChange={(e) => updateEditingMeal(meal.id, 'grams', parseFloat(e.target.value) || 0)}
                         className="h-6 w-16 text-xs"
                         min="0"
                         step="0.1"
                       />
                       <span className="text-xs">gramos</span>
                       <Input
                         value={editData.serving_description}
                         onChange={(e) => updateEditingMeal(meal.id, 'serving_description', e.target.value)}
                         className="h-6 w-20 text-xs"
                         placeholder="porción"
                       />
                     </div>
                   ) : (
                     <span>{Math.round(currentServings * 10) / 10} × {meal.foods.serving_description || 'porción'} • {editData.grams}g</span>
                   )}
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