import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useFavoriteMealPlates, useRemoveFavoriteMealPlate } from "@/hooks/useFavoriteMealPlates";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useLanguage } from "@/hooks/useLanguage";
import { translations } from "@/lib/translations";

interface FavoriteMealsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddMeal: (plateId: string) => void;
}

export const FavoriteMealsDialog = ({ open, onOpenChange, onAddMeal }: FavoriteMealsDialogProps) => {
  const { data: favoritePlates, isLoading } = useFavoriteMealPlates();
  const removeMutation = useRemoveFavoriteMealPlate();
  const { toast } = useToast();
  const { language } = useLanguage();
  const t = translations[language];
  const [expandedPlates, setExpandedPlates] = useState<Set<string>>(new Set());

  const toggleExpanded = (plateId: string) => {
    setExpandedPlates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(plateId)) {
        newSet.delete(plateId);
      } else {
        newSet.add(plateId);
      }
      return newSet;
    });
  };

  const handleRemove = async (plateId: string, plateName: string) => {
    try {
      await removeMutation.mutateAsync(plateId);
      toast({
        title: t.success || "Éxito",
        description: `${plateName} ${t.removedFromFavorites || "eliminado de favoritos"}`,
      });
    } catch (error) {
      console.error('Error removing favorite plate:', error);
      toast({
        title: t.error || "Error",
        description: t.errorRemovingFavorite || "Error al eliminar de favoritos",
        variant: "destructive",
      });
    }
  };

  const handleAddMeal = (plateId: string, plateName: string) => {
    onAddMeal(plateId);
    toast({
      title: t.success || "Éxito",
      description: `${plateName} ${t.addedToToday || "agregado a las comidas de hoy"}`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t.favoriteMeals || "Comidas Favoritas"}</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh]">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              {t.loading || "Cargando..."}
            </div>
          ) : !favoritePlates || favoritePlates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t.noFavoriteMeals || "No tienes comidas favoritas guardadas"}
            </div>
          ) : (
            <div className="space-y-3">
              {favoritePlates.map((plate) => {
                const totalCalories = plate.favorite_meal_plate_items.reduce(
                  (sum, item) => sum + (item.foods.calories_per_serving || 0) * item.servings,
                  0
                );
                const totalProtein = plate.favorite_meal_plate_items.reduce(
                  (sum, item) => sum + (item.foods.protein_per_serving || 0) * item.servings,
                  0
                );
                const totalCarbs = plate.favorite_meal_plate_items.reduce(
                  (sum, item) => sum + (item.foods.carbs_per_serving || 0) * item.servings,
                  0
                );
                const totalFat = plate.favorite_meal_plate_items.reduce(
                  (sum, item) => sum + (item.foods.fat_per_serving || 0) * item.servings,
                  0
                );
                const isExpanded = expandedPlates.has(plate.id);

                return (
                  <div
                    key={plate.id}
                    className="rounded-lg border bg-card"
                  >
                    {/* Header */}
                    <div className="flex items-center gap-3 p-3">
                      <Avatar className="h-12 w-12 border-2 border-primary/20 shrink-0">
                        <AvatarImage src={plate.plate_image} />
                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
                          🍽️
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{plate.plate_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {Math.round(totalCalories)} {t.kcal || "kcal"} • {plate.favorite_meal_plate_items.length} {t.items || "items"}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemove(plate.id, plate.plate_name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                          onClick={() => handleAddMeal(plate.id, plate.plate_name)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => toggleExpanded(plate.id)}
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    {/* Collapsible Content */}
                    <Collapsible open={isExpanded}>
                      <CollapsibleContent>
                        <div className="px-3 pb-3 pt-0 space-y-2 border-t">
                          {/* Nutritional Summary */}
                          <div className="flex gap-2 text-xs pt-2">
                            <span className="font-medium text-primary">
                              {Math.round(totalCalories)} cal
                            </span>
                            <span>P: {Math.round(totalProtein * 10) / 10}g</span>
                            <span>C: {Math.round(totalCarbs * 10) / 10}g</span>
                            <span>G: {Math.round(totalFat * 10) / 10}g</span>
                          </div>

                          {/* Individual Items */}
                          {plate.favorite_meal_plate_items.map((item) => (
                            <div key={item.id} className="p-2 rounded-lg bg-muted/50">
                              <div className="flex items-center justify-between mb-1">
                                <h5 className="font-medium text-sm">{item.foods.food_name}</h5>
                                <span className="text-xs text-muted-foreground">
                                  {item.servings} {item.servings === 1 ? 'porción' : 'porciones'}
                                </span>
                              </div>
                              <div className="flex gap-3 text-xs text-muted-foreground">
                                <span>{Math.round((item.foods.calories_per_serving || 0) * item.servings)} cal</span>
                                <span>P: {Math.round((item.foods.protein_per_serving || 0) * item.servings * 10) / 10}g</span>
                                <span>C: {Math.round((item.foods.carbs_per_serving || 0) * item.servings * 10) / 10}g</span>
                                <span>G: {Math.round((item.foods.fat_per_serving || 0) * item.servings * 10) / 10}g</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
