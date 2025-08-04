import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNutritionGoals, useSetNutritionGoals } from "@/hooks/useFatSecret";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface EditNutritionGoalsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditNutritionGoalsDialog = ({ open, onOpenChange }: EditNutritionGoalsDialogProps) => {
  const { data: nutritionGoals } = useNutritionGoals();
  const setNutritionGoals = useSetNutritionGoals();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    daily_calories: 2000,
    daily_protein: 150,
    daily_carbs: 250,
    daily_fat: 67
  });

  useEffect(() => {
    if (nutritionGoals) {
      setFormData({
        daily_calories: nutritionGoals.daily_calories,
        daily_protein: nutritionGoals.daily_protein,
        daily_carbs: nutritionGoals.daily_carbs,
        daily_fat: nutritionGoals.daily_fat
      });
    }
  }, [nutritionGoals]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await setNutritionGoals.mutateAsync(formData);
      
      // Invalidate related queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['nutrition-goals'] });
      queryClient.invalidateQueries({ queryKey: ['user-meals'] });
      
      toast({
        title: "Objetivos actualizados",
        description: "Tus objetivos nutricionales han sido guardados correctamente."
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating nutrition goals:', error);
      toast({
        title: "Error",
        description: "No se pudieron guardar los objetivos. Inténtalo de nuevo.",
        variant: "destructive"
      });
    }
  };

  const handleInputChange = (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Objetivos Nutricionales</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="calories">Calorías diarias objetivo</Label>
            <Input
              id="calories"
              type="number"
              value={formData.daily_calories}
              onChange={handleInputChange('daily_calories')}
              min="1000"
              max="5000"
              step="1"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="protein">Proteína diaria (g)</Label>
            <Input
              id="protein"
              type="number"
              value={formData.daily_protein}
              onChange={handleInputChange('daily_protein')}
              min="50"
              max="300"
              step="1"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="carbs">Carbohidratos diarios (g)</Label>
            <Input
              id="carbs"
              type="number"
              value={formData.daily_carbs}
              onChange={handleInputChange('daily_carbs')}
              min="50"
              max="500"
              step="1"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fat">Grasas diarias (g)</Label>
            <Input
              id="fat"
              type="number"
              value={formData.daily_fat}
              onChange={handleInputChange('daily_fat')}
              min="20"
              max="200"
              step="1"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={setNutritionGoals.isPending}
              className="flex-1"
            >
              {setNutritionGoals.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};