import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
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

  const [calories, setCalories] = useState(2000);
  const [percentages, setPercentages] = useState({
    protein: 25,
    carbs: 45,
    fat: 30
  });
  const [grams, setGrams] = useState({
    protein: 125,
    carbs: 225,
    fat: 67
  });

  useEffect(() => {
    if (nutritionGoals) {
      setCalories(nutritionGoals.daily_calories);
      setGrams({
        protein: nutritionGoals.daily_protein,
        carbs: nutritionGoals.daily_carbs,
        fat: nutritionGoals.daily_fat
      });
      
      // Calculate percentages from existing grams
      const totalCalories = nutritionGoals.daily_calories;
      const proteinPercent = Math.round((nutritionGoals.daily_protein * 4 / totalCalories) * 100);
      const carbsPercent = Math.round((nutritionGoals.daily_carbs * 4 / totalCalories) * 100);
      const fatPercent = Math.round((nutritionGoals.daily_fat * 9 / totalCalories) * 100);
      
      setPercentages({
        protein: proteinPercent,
        carbs: carbsPercent,
        fat: fatPercent
      });
    }
  }, [nutritionGoals]);

  // Handle percentage changes while keeping other macros' grams and percentages fixed
  const handlePercentageChange = (macro: 'protein' | 'carbs' | 'fat', newPercentage: number) => {
    // Calculate new grams for the changed macro only
    const caloriesPerGram = macro === 'fat' ? 9 : 4;
    const newGramsForMacro = Math.round((calories * newPercentage / 100) / caloriesPerGram);
    
    // Update only the changed macro's grams and percentage, keep others exactly the same
    const newGrams = { ...grams };
    newGrams[macro] = newGramsForMacro;
    
    const newPercentages = { ...percentages };
    newPercentages[macro] = newPercentage;
    
    // Calculate new total calories based on the actual grams
    const newTotalCalories = (newGrams.protein * 4) + (newGrams.carbs * 4) + (newGrams.fat * 9);
    
    setGrams(newGrams);
    setPercentages(newPercentages);
    setCalories(newTotalCalories);
  };

  // Handle calories change - recalculate percentages while keeping grams fixed
  const handleCaloriesChange = (newCalories: number) => {
    setCalories(newCalories);
    
    // Calculate raw percentages based on existing grams and new calories
    const rawPercentages = {
      protein: (grams.protein * 4 / newCalories) * 100,
      carbs: (grams.carbs * 4 / newCalories) * 100,
      fat: (grams.fat * 9 / newCalories) * 100
    };
    
    // Calculate total to normalize to 100%
    const total = rawPercentages.protein + rawPercentages.carbs + rawPercentages.fat;
    
    // Normalize to exactly 100%
    const normalizedPercentages = {
      protein: Math.round((rawPercentages.protein / total) * 100),
      carbs: Math.round((rawPercentages.carbs / total) * 100),
      fat: Math.round((rawPercentages.fat / total) * 100)
    };
    
    setPercentages(normalizedPercentages);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const formData = {
      daily_calories: calories,
      daily_protein: grams.protein,
      daily_carbs: grams.carbs,
      daily_fat: grams.fat
    };
    
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Objetivos Nutricionales</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Calorías totales */}
          <div className="space-y-2">
            <Label htmlFor="calories">Calorías diarias objetivo</Label>
            <Input
              id="calories"
              type="number"
              value={calories}
              onChange={(e) => {
                const newCalories = parseInt(e.target.value) || 2000;
                handleCaloriesChange(newCalories);
              }}
              min="1000"
              max="5000"
              step="1"
            />
          </div>

          {/* Slider de Proteína */}
          <div className="space-y-3">
            <Label className="flex items-center justify-between">
              <span style={{ color: '#3b82f6' }}>Proteína ({percentages.protein}%) - {grams.protein}g</span>
            </Label>
            <Slider
              value={[percentages.protein]}
              onValueChange={(value) => handlePercentageChange('protein', value[0])}
              max={100}
              min={10}
              step={1}
              className="w-full"
            />
          </div>

          {/* Slider de Carbohidratos */}
          <div className="space-y-3">
            <Label className="flex items-center justify-between">
              <span style={{ color: '#10b981' }}>Carbohidratos ({percentages.carbs}%) - {grams.carbs}g</span>
            </Label>
            <Slider
              value={[percentages.carbs]}
              onValueChange={(value) => handlePercentageChange('carbs', value[0])}
              max={100}
              min={10}
              step={1}
              className="w-full"
            />
          </div>

          {/* Slider de Grasas */}
          <div className="space-y-3">
            <Label className="flex items-center justify-between">
              <span style={{ color: '#f59e0b' }}>Grasas ({percentages.fat}%) - {grams.fat}g</span>
            </Label>
            <Slider
              value={[percentages.fat]}
              onValueChange={(value) => handlePercentageChange('fat', value[0])}
              max={100}
              min={10}
              step={1}
              className="w-full"
            />
          </div>

          {/* Verificación de porcentajes */}
          <div className="text-sm text-muted-foreground text-center">
            Total: {percentages.protein + percentages.carbs + percentages.fat}%
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