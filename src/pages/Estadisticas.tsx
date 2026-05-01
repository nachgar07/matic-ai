import { useState } from "react";
import { Header } from "@/components/Layout/Header";
import { BottomNavigation } from "@/components/Layout/BottomNavigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CaloriesChart } from "@/components/CaloriesChart/CaloriesChart";
import { WeightProgressChart } from "@/components/WeightProgressChart/WeightProgressChart";
import { useCaloriesDaily, useCaloriesWeekly, useCaloriesMonthly, useCaloriesAllTime } from "@/hooks/useCalorieStats";
import { useWeightHistory, WeightPeriod } from "@/hooks/useWeightHistory";
import { useProfile } from "@/hooks/useProfile";
import { useNutritionGoals } from "@/hooks/useFatSecret";
import { useLanguage } from "@/hooks/useLanguage";
import { translations } from "@/lib/translations";

export default function Estadisticas() {
  const [selectedDate] = useState(new Date());
  const [weightPeriod, setWeightPeriod] = useState<WeightPeriod>("all");
  const { language } = useLanguage();
  const t = (k: keyof typeof translations.es) => translations[language][k];
  const { data: profile } = useProfile();
  const { data: nutritionGoals } = useNutritionGoals();
  const { data: weightHistory, isLoading: loadingWeight } = useWeightHistory(weightPeriod, selectedDate);
  
  const { data: dailyData, isLoading: loadingDaily } = useCaloriesDaily(selectedDate);
  const { data: weeklyData, isLoading: loadingWeekly } = useCaloriesWeekly(selectedDate);
  const { data: monthlyData, isLoading: loadingMonthly } = useCaloriesMonthly(selectedDate);
  const { data: allTimeData, isLoading: loadingAllTime } = useCaloriesAllTime();

  const calorieGoal = nutritionGoals?.daily_calories || profile?.calculated_calories || 2000;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header title={t('statistics')} />
      
      <main className="flex-1 container mx-auto px-4 py-6 pb-24">
        <h1 className="text-3xl font-bold mb-6">{t('statistics')}</h1>

        <div className="space-y-6">
          {/* Calories Statistics */}
          <div>
            <h2 className="text-2xl font-semibold mb-4">{t('calorieIntake')}</h2>
            <Tabs defaultValue="week" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="day">{t('day')}</TabsTrigger>
                <TabsTrigger value="week">{t('week')}</TabsTrigger>
                <TabsTrigger value="month">{t('month')}</TabsTrigger>
                <TabsTrigger value="all">{t('allTime')}</TabsTrigger>
              </TabsList>
              
              <TabsContent value="day" className="mt-4">
                <CaloriesChart
                  data={dailyData || []}
                  title={t('caloriesDay')}
                  isLoading={loadingDaily}
                  goal={calorieGoal}
                />
              </TabsContent>
              
              <TabsContent value="week" className="mt-4">
                <CaloriesChart
                  data={weeklyData || []}
                  title={t('caloriesWeek')}
                  isLoading={loadingWeekly}
                  goal={calorieGoal}
                />
              </TabsContent>
              
              <TabsContent value="month" className="mt-4">
                <CaloriesChart
                  data={monthlyData || []}
                  title={t('caloriesMonth')}
                  isLoading={loadingMonthly}
                  goal={calorieGoal}
                />
              </TabsContent>
              
              <TabsContent value="all" className="mt-4">
                <CaloriesChart
                  data={allTimeData || []}
                  title={t('caloriesAll')}
                  isLoading={loadingAllTime}
                  goal={calorieGoal}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Weight Progress */}
          <div>
            <h2 className="text-2xl font-semibold mb-4">{t('weightProgress')}</h2>
            <WeightProgressChart
              data={weightHistory || []}
              targetWeight={profile?.target_weight}
              isLoading={loadingWeight}
              period={weightPeriod}
              onPeriodChange={setWeightPeriod}
            />
          </div>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}
