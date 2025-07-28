import { DailyTotals, useNutritionGoals } from "@/hooks/useFatSecret";
import { MacroCard } from "@/components/MacroCard/MacroCard";
import { CalorieRing } from "@/components/CalorieRing/CalorieRing";
import { Card } from "@/components/ui/card";

interface NutritionSummaryProps {
  dailyTotals: DailyTotals;
}

export const NutritionSummary = ({ dailyTotals }: NutritionSummaryProps) => {
  const { data: nutritionGoals } = useNutritionGoals();
  
  const goals = {
    calories: nutritionGoals?.daily_calories || 2000,
    protein: nutritionGoals?.daily_protein || 150,
    carbs: nutritionGoals?.daily_carbs || 250,
    fat: nutritionGoals?.daily_fat || 67
  };
  return (
    <div className="space-y-4">
      {/* Calorie Ring */}
      <Card className="p-6 flex justify-center">
        <CalorieRing 
          consumed={dailyTotals.calories} 
          target={goals.calories}
          size={160}
        />
      </Card>

      {/* Macro Cards */}
      <div className="grid grid-cols-3 gap-3">
        <MacroCard
          icon="🍖"
          label="Proteína"
          current={Math.round(dailyTotals.protein * 10) / 10}
          target={goals.protein}
          unit="g"
        />
        <MacroCard
          icon="🍞"
          label="Carbohidratos"
          current={Math.round(dailyTotals.carbs * 10) / 10}
          target={goals.carbs}
          unit="g"
        />
        <MacroCard
          icon="🥑"
          label="Grasas"
          current={Math.round(dailyTotals.fat * 10) / 10}
          target={goals.fat}
          unit="g"
        />
      </div>

      {/* Quick Stats */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3 text-sm">Progreso del día</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Calorías restantes</span>
            <span className={`font-medium ${
              goals.calories - dailyTotals.calories < 0 ? 'text-red-600' : 'text-green-600'
            }`}>
              {goals.calories - dailyTotals.calories}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">% de proteína</span>
            <span className="font-medium">
              {Math.round((dailyTotals.protein / goals.protein) * 100)}%
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Calorías por gramo</span>
            <span className="font-medium">
              {dailyTotals.calories > 0 ? 
                Math.round(dailyTotals.calories / (dailyTotals.protein + dailyTotals.carbs + dailyTotals.fat)) 
                : 0
              }
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
};