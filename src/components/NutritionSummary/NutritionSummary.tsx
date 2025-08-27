import { DailyTotals, useNutritionGoals } from "@/hooks/useFatSecret";
import { MacroCard } from "@/components/MacroCard/MacroCard";
import { CalorieRing } from "@/components/CalorieRing/CalorieRing";
import { Card } from "@/components/ui/card";
import { useWaterIntake } from "@/hooks/useWaterIntake";
import { useProfileCompletion } from "@/hooks/useProfile";
import { OnboardingCenter } from "@/components/OnboardingCenter/OnboardingCenter";

interface NutritionSummaryProps {
  dailyTotals: DailyTotals;
  selectedDate?: string;
}

export const NutritionSummary = ({ dailyTotals, selectedDate }: NutritionSummaryProps) => {
  const { data: nutritionGoals } = useNutritionGoals();
  const { waterGlasses, addWaterGlass } = useWaterIntake(selectedDate);
  const { hasPersonalData, hasNutritionGoals, isNewUser } = useProfileCompletion();
  
  // Default values for new users
  const defaultGoals = {
    calories: 2000,
    protein: 150,
    carbs: 250,
    fat: 67,
    water: 12
  };

  // Use nutrition goals if available, otherwise use defaults
  const goals = nutritionGoals ? {
    calories: nutritionGoals.daily_calories,
    protein: nutritionGoals.daily_protein,
    carbs: nutritionGoals.daily_carbs,
    fat: nutritionGoals.daily_fat,
    water: nutritionGoals.daily_water_glasses
  } : defaultGoals;

  // For new users, show 0 targets until they complete their setup
  const displayGoals = isNewUser ? {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    water: 0
  } : goals;
  return (
    <div className="space-y-4">
      {/* Calorie Ring */}
      <Card className="p-6 flex justify-center">
        <CalorieRing 
          consumed={dailyTotals.calories} 
          target={Math.max(displayGoals.calories, 1)} // Avoid division by zero
          protein={dailyTotals.protein}
          carbs={dailyTotals.carbs}
          fat={dailyTotals.fat}
          size={160}
          waterGlasses={waterGlasses}
          onWaterClick={addWaterGlass}
          waterTarget={goals.water}
          proteinTarget={displayGoals.protein}
          carbsTarget={displayGoals.carbs}
          fatTarget={displayGoals.fat}
          customCenter={isNewUser ? (
            <OnboardingCenter 
              hasPersonalData={hasPersonalData}
              hasNutritionGoals={hasNutritionGoals}
            />
          ) : undefined}
        />
      </Card>

      {/* Macro Cards */}
      <div className="grid grid-cols-3 gap-3">
        <MacroCard
          icon="🍖"
          label="Proteína"
          current={Math.round(dailyTotals.protein * 10) / 10}
          target={Math.max(displayGoals.protein, 1)} // Avoid division by zero
          unit="g"
          color="#ff6b35"
        />
        <MacroCard
          icon="🍞"
          label="Carbohidratos"
          current={Math.round(dailyTotals.carbs * 10) / 10}
          target={Math.max(displayGoals.carbs, 1)} // Avoid division by zero
          unit="g"
          color="#ffa726"
        />
        <MacroCard
          icon="🥑"
          label="Grasas"
          current={Math.round(dailyTotals.fat * 10) / 10}
          target={Math.max(displayGoals.fat, 1)} // Avoid division by zero
          unit="g"
          color="#4caf50"
        />
      </div>

      {/* Quick Stats */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3 text-sm">Progreso del día</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Calorías restantes</span>
            <span className={`font-medium ${
              displayGoals.calories > 0 && displayGoals.calories - dailyTotals.calories < 0 ? 'text-red-600' : 'text-green-600'
            }`}>
              {displayGoals.calories > 0 ? displayGoals.calories - dailyTotals.calories : 0}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">% de proteína</span>
            <span className="font-medium">
              {displayGoals.protein > 0 ? Math.round((dailyTotals.protein / displayGoals.protein) * 100) : 0}%
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">% de carbohidratos</span>
            <span className="font-medium">
              {displayGoals.carbs > 0 ? Math.round((dailyTotals.carbs / displayGoals.carbs) * 100) : 0}%
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">% de grasas</span>
            <span className="font-medium">
              {displayGoals.fat > 0 ? Math.round((dailyTotals.fat / displayGoals.fat) * 100) : 0}%
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
};