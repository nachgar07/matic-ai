import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { useFavoriteMealPlates, useRemoveFavoriteMealPlate } from "@/hooks/useFavoriteMealPlates";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
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

                return (
                  <div
                    key={plate.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <Avatar className="h-12 w-12 border-2 border-primary/20">
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

                    <div className="flex items-center gap-1">
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
                    </div>
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
