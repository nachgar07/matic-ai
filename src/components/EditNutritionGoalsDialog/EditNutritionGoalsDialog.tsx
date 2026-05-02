import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useNutritionGoals, useSetNutritionGoals } from "@/hooks/useFatSecret";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Droplets } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { translations } from "@/lib/translations";

interface EditNutritionGoalsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditNutritionGoalsDialog = ({ open, onOpenChange }: EditNutritionGoalsDialogProps) => {
  const { data: nutritionGoals } = useNutritionGoals();
  const setNutritionGoals = useSetNutritionGoals();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = (k: keyof typeof translations.es) => translations[language][k];
  
  const [showAlert, setShowAlert] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  const [calories, setCalories] = useState(0);
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
  
  const [waterIntake, setWaterIntake] = useState(2.5); // Liters

  useEffect(() => {
    if (nutritionGoals) {
      setCalories(nutritionGoals.daily_calories);
      setGrams({
        protein: nutritionGoals.daily_protein,
        carbs: nutritionGoals.daily_carbs,
        fat: nutritionGoals.daily_fat
      });
      
      // Set water intake from glasses (convert to liters)
      if (nutritionGoals.daily_water_glasses) {
        setWaterIntake(nutritionGoals.daily_water_glasses / 4); // 4 glasses = 1 liter
      }
      
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

  // Fetch user profile for calculated calories
  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        setProfile(data);
      }
    };
    fetchProfile();
  }, []);

  const handleRecommendedCalories = () => {
    if (profile?.calculated_calories) {
      handleCaloriesChange(profile.calculated_calories);
      toast({
        title: t('caloriesApplied'),
        description: language === 'es'
          ? `Se aplicaron ${profile.calculated_calories} calorías recomendadas.`
          : `Applied ${profile.calculated_calories} recommended calories.`
      });
    } else {
      setShowAlert(true);
    }
  };

  const handleNavigateToSettings = () => {
    setShowAlert(false);
    onOpenChange(false);
    navigate('/perfil');
  };

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

  // Handle grams changes - recalculate percentage and total calories
  const handleGramsChange = (macro: 'protein' | 'carbs' | 'fat', newGrams: number) => {
    const updatedGrams = { ...grams };
    updatedGrams[macro] = newGrams;
    
    // Calculate new total calories based on the actual grams
    const newTotalCalories = (updatedGrams.protein * 4) + (updatedGrams.carbs * 4) + (updatedGrams.fat * 9);
    
    // Calculate new percentage for the changed macro
    const caloriesPerGram = macro === 'fat' ? 9 : 4;
    const newPercentage = Math.round((newGrams * caloriesPerGram / newTotalCalories) * 100);
    
    const updatedPercentages = { ...percentages };
    updatedPercentages[macro] = newPercentage;
    
    setGrams(updatedGrams);
    setPercentages(updatedPercentages);
    setCalories(newTotalCalories);
  };

  // Handle calories change - recalculate grams while keeping percentages fixed
  const handleCaloriesChange = (newCalories: number) => {
    setCalories(newCalories);
    
    // Recalculate grams based on existing percentages and new calories
    const newGrams = {
      protein: Math.round((newCalories * percentages.protein / 100) / 4),
      carbs: Math.round((newCalories * percentages.carbs / 100) / 4),
      fat: Math.round((newCalories * percentages.fat / 100) / 9)
    };
    
    setGrams(newGrams);
  };

  const nutritionPresets = [
    {
      name: t('presetWeightLoss'),
      description: t('presetWeightLossDesc'),
      protein: 35,
      carbs: 30,
      fat: 35
    },
    {
      name: t('presetMuscleGain'),
      description: t('presetMuscleGainDesc'),
      protein: 30,
      carbs: 40,
      fat: 30
    },
    {
      name: t('presetMaintenance'),
      description: t('presetMaintenanceDesc'),
      protein: 25,
      carbs: 45,
      fat: 30
    },
    {
      name: t('presetKeto'),
      description: t('presetKetoDesc'),
      protein: 20,
      carbs: 10,
      fat: 70
    },
    {
      name: t('presetPerformance'),
      description: t('presetPerformanceDesc'),
      protein: 25,
      carbs: 50,
      fat: 25
    },
    {
      name: t('presetDiabetic'),
      description: t('presetDiabeticDesc'),
      protein: 30,
      carbs: 35,
      fat: 35
    }
  ];

  const applyPreset = (preset: typeof nutritionPresets[0]) => {
    const newPercentages = {
      protein: preset.protein,
      carbs: preset.carbs,
      fat: preset.fat
    };
    
    // Calculate grams based on current calories and new percentages
    const newGrams = {
      protein: Math.round((calories * preset.protein / 100) / 4),
      carbs: Math.round((calories * preset.carbs / 100) / 4),
      fat: Math.round((calories * preset.fat / 100) / 9)
    };
    
    setPercentages(newPercentages);
    setGrams(newGrams);
  };

  const calculateRecommendedWater = () => {
    if (profile?.weight) {
      // Recomendación: 35ml por kg de peso corporal
      const recommendedLiters = (profile.weight * 35) / 1000;
      setWaterIntake(Math.round(recommendedLiters * 10) / 10);
      toast({
        title: t('waterApplied'),
        description: language === 'es'
          ? `Se aplicaron ${Math.round(recommendedLiters * 10) / 10}L basado en tu peso.`
          : `Applied ${Math.round(recommendedLiters * 10) / 10}L based on your weight.`
      });
    } else {
      setShowAlert(true);
    }
  };

  const litersToGlasses = (liters: number) => {
    // 1 vaso = 250ml
    return Math.round(liters * 4);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const formData = {
      daily_calories: calories,
      daily_protein: grams.protein,
      daily_carbs: grams.carbs,
      daily_fat: grams.fat,
      daily_water_glasses: litersToGlasses(waterIntake)
    };
    
    try {
      await setNutritionGoals.mutateAsync(formData);
      
      // Invalidate related queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['nutrition-goals'] });
      queryClient.invalidateQueries({ queryKey: ['user-meals'] });
      
      toast({
        title: t('goalsUpdated'),
        description: t('goalsUpdatedDesc')
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating nutrition goals:', error);
      toast({
        title: t('error'),
        description: t('couldNotSaveGoals'),
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('editNutritionGoals')}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Presets nutricionales */}
          <div className="space-y-3">
            <Label>{t('nutritionPresets')}</Label>
            <div className="grid grid-cols-2 gap-2">
              {nutritionPresets.map((preset) => (
                <Button
                  key={preset.name}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset(preset)}
                  className="h-auto p-3 text-left flex flex-col items-start min-h-[80px] w-full"
                >
                  <span className="text-xs font-medium leading-tight w-full">{preset.name}</span>
                  <span className="text-[9px] text-muted-foreground mt-1 leading-tight w-full whitespace-pre-line">{preset.description}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Calorías totales */}
          <div className="space-y-2">
            <Label htmlFor="calories">{t('dailyCalorieTarget')}</Label>
            <div className="flex gap-2">
              <Input
                id="calories"
                type="number"
                value={calories}
                onChange={(e) => {
                  const newCalories = parseInt(e.target.value) || 0;
                  handleCaloriesChange(newCalories);
                }}
                min="0"
                max="5000"
                step="1"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRecommendedCalories}
                className="px-3"
              >
                {t('recommended')}
              </Button>
            </div>
          </div>

          {/* Slider de Proteína */}
          <div className="space-y-3">
            <Label className="flex items-center justify-between">
              <span style={{ color: '#3b82f6' }}>{t('proteinLabel')} ({percentages.protein}%)</span>
            </Label>
            <div className="flex items-center gap-3">
              <Slider
                value={[percentages.protein]}
                onValueChange={(value) => handlePercentageChange('protein', value[0])}
                max={100}
                min={10}
                step={1}
                className="flex-1"
              />
              <div className="flex items-center gap-1 min-w-[80px]">
                <Input
                  type="number"
                  value={grams.protein}
                  onChange={(e) => {
                    const newGrams = parseInt(e.target.value) || 0;
                    handleGramsChange('protein', newGrams);
                  }}
                  min="0"
                  max="500"
                  className="w-16 h-8 text-sm"
                />
                <span className="text-sm text-muted-foreground">g</span>
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {t('cal4Per1g')}
            </div>
          </div>

          {/* Slider de Carbohidratos */}
          <div className="space-y-3">
            <Label className="flex items-center justify-between">
              <span style={{ color: '#10b981' }}>{t('carbsLabel')} ({percentages.carbs}%)</span>
            </Label>
            <div className="flex items-center gap-3">
              <Slider
                value={[percentages.carbs]}
                onValueChange={(value) => handlePercentageChange('carbs', value[0])}
                max={100}
                min={10}
                step={1}
                className="flex-1"
              />
              <div className="flex items-center gap-1 min-w-[80px]">
                <Input
                  type="number"
                  value={grams.carbs}
                  onChange={(e) => {
                    const newGrams = parseInt(e.target.value) || 0;
                    handleGramsChange('carbs', newGrams);
                  }}
                  min="0"
                  max="500"
                  className="w-16 h-8 text-sm"
                />
                <span className="text-sm text-muted-foreground">g</span>
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {t('cal4Per1g')}
            </div>
          </div>

          {/* Slider de Grasas */}
          <div className="space-y-3">
            <Label className="flex items-center justify-between">
              <span style={{ color: '#f59e0b' }}>{t('fatsLabel')} ({percentages.fat}%)</span>
            </Label>
            <div className="flex items-center gap-3">
              <Slider
                value={[percentages.fat]}
                onValueChange={(value) => handlePercentageChange('fat', value[0])}
                max={100}
                min={10}
                step={1}
                className="flex-1"
              />
              <div className="flex items-center gap-1 min-w-[80px]">
                <Input
                  type="number"
                  value={grams.fat}
                  onChange={(e) => {
                    const newGrams = parseInt(e.target.value) || 0;
                    handleGramsChange('fat', newGrams);
                  }}
                  min="0"
                  max="500"
                  className="w-16 h-8 text-sm"
                />
                <span className="text-sm text-muted-foreground">g</span>
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {t('cal9Per1g')}
            </div>
          </div>

          {/* Verificación de porcentajes */}
          <div className="text-sm text-muted-foreground text-center">
            {t('total')}: {percentages.protein + percentages.carbs + percentages.fat}%
          </div>

          {/* Ingesta de agua */}
          <div className="space-y-3 pt-4 border-t">
            <Label className="flex items-center gap-2">
              <Droplets className="h-4 w-4 text-blue-500" />
              {t('dailyWaterIntake')}
            </Label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={waterIntake}
                  onChange={(e) => setWaterIntake(parseFloat(e.target.value) || 0)}
                  min="0"
                  max="10"
                  step="0.1"
                  className="flex-1"
                  placeholder={t('liters')}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={calculateRecommendedWater}
                  className="px-3"
                >
                  {t('recommended')}
                </Button>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{waterIntake}L = {litersToGlasses(waterIntake)} {t('glasses')} {t('glassesEach')}</span>
                <span className="flex items-center gap-1">
                  <Droplets className="h-3 w-3" />
                  {litersToGlasses(waterIntake)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              disabled={setNutritionGoals.isPending}
              className="flex-1"
            >
              {setNutritionGoals.isPending ? t('saving') : t('save')}
            </Button>
          </div>
        </form>
      </DialogContent>

      <AlertDialog open={showAlert} onOpenChange={setShowAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('calcRecommendedTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('calcRecommendedDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleNavigateToSettings}>
              {t('goToPersonal')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};