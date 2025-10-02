import { useState } from "react";
import { Header } from "@/components/Layout/Header";
import { BottomNavigation } from "@/components/Layout/BottomNavigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CaloriesChart } from "@/components/CaloriesChart/CaloriesChart";
import { WeightProgressChart } from "@/components/WeightProgressChart/WeightProgressChart";
import { useCaloriesDaily, useCaloriesWeekly, useCaloriesMonthly, useCaloriesAllTime } from "@/hooks/useCalorieStats";
import { useWeightHistory } from "@/hooks/useWeightHistory";
import { useProfile } from "@/hooks/useProfile";
import { useNutritionGoals } from "@/hooks/useFatSecret";

export default function Estadisticas() {
  const [selectedDate] = useState(new Date());
  const { data: profile } = useProfile();
  const { data: nutritionGoals } = useNutritionGoals();
  const { data: weightHistory, isLoading: loadingWeight } = useWeightHistory();
  
  const { data: dailyData, isLoading: loadingDaily } = useCaloriesDaily(selectedDate);
  const { data: weeklyData, isLoading: loadingWeekly } = useCaloriesWeekly(selectedDate);
  const { data: monthlyData, isLoading: loadingMonthly } = useCaloriesMonthly(selectedDate);
  const { data: allTimeData, isLoading: loadingAllTime } = useCaloriesAllTime();

  const calorieGoal = nutritionGoals?.daily_calories || profile?.calculated_calories || 2000;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header title="Estadísticas" />
      
      <main className="flex-1 container mx-auto px-4 py-6 pb-24">
        <h1 className="text-3xl font-bold mb-6">Estadísticas</h1>

        <div className="space-y-6">
          {/* Calories Statistics */}
          <div>
            <h2 className="text-2xl font-semibold mb-4">Ingesta de Calorías</h2>
            <Tabs defaultValue="week" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="day">Día</TabsTrigger>
                <TabsTrigger value="week">Semana</TabsTrigger>
                <TabsTrigger value="month">Mes</TabsTrigger>
                <TabsTrigger value="all">Todo</TabsTrigger>
              </TabsList>
              
              <TabsContent value="day" className="mt-4">
                <CaloriesChart
                  data={dailyData || []}
                  title="Calorías del Día"
                  isLoading={loadingDaily}
                  goal={calorieGoal}
                />
              </TabsContent>
              
              <TabsContent value="week" className="mt-4">
                <CaloriesChart
                  data={weeklyData || []}
                  title="Calorías de la Semana"
                  isLoading={loadingWeekly}
                  goal={calorieGoal}
                />
              </TabsContent>
              
              <TabsContent value="month" className="mt-4">
                <CaloriesChart
                  data={monthlyData || []}
                  title="Calorías del Mes"
                  isLoading={loadingMonthly}
                  goal={calorieGoal}
                />
              </TabsContent>
              
              <TabsContent value="all" className="mt-4">
                <CaloriesChart
                  data={allTimeData || []}
                  title="Todas las Calorías"
                  isLoading={loadingAllTime}
                  goal={calorieGoal}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Weight Progress */}
          <div>
            <h2 className="text-2xl font-semibold mb-4">Progreso de Peso</h2>
            <WeightProgressChart
              data={weightHistory || []}
              targetWeight={profile?.target_weight}
              isLoading={loadingWeight}
            />
          </div>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}
