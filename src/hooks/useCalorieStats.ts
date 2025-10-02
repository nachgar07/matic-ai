import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from "date-fns";

export interface DailyCalories {
  date: string;
  calories: number;
}

const fetchCaloriesForRange = async (startDate: string, endDate: string): Promise<DailyCalories[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const response = await supabase.functions.invoke('get-user-meals', {
    body: { startDate, endDate }
  });

  if (response.error) throw response.error;

  const meals = response.data?.meals || [];
  
  // Group by date and sum calories
  const caloriesByDate = meals.reduce((acc: Record<string, number>, meal: any) => {
    const date = format(new Date(meal.consumed_at), 'yyyy-MM-dd');
    const calories = Number(meal.foods?.calories_per_serving || 0) * Number(meal.servings || 0);
    acc[date] = (acc[date] || 0) + calories;
    return acc;
  }, {});

  return Object.entries(caloriesByDate)
    .map(([date, calories]) => ({ date, calories: calories as number }))
    .sort((a, b) => a.date.localeCompare(b.date));
};

export const useCaloriesDaily = (date: Date) => {
  const dateStr = format(date, 'yyyy-MM-dd');
  
  return useQuery({
    queryKey: ['calories-daily', dateStr],
    queryFn: () => fetchCaloriesForRange(dateStr, dateStr)
  });
};

export const useCaloriesWeekly = (date: Date) => {
  const start = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const end = format(endOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  
  return useQuery({
    queryKey: ['calories-weekly', start, end],
    queryFn: () => fetchCaloriesForRange(start, end)
  });
};

export const useCaloriesMonthly = (date: Date) => {
  const start = format(startOfMonth(date), 'yyyy-MM-dd');
  const end = format(endOfMonth(date), 'yyyy-MM-dd');
  
  return useQuery({
    queryKey: ['calories-monthly', start, end],
    queryFn: () => fetchCaloriesForRange(start, end)
  });
};

export const useCaloriesAllTime = () => {
  const today = format(new Date(), 'yyyy-MM-dd');
  const startDate = '2020-01-01'; // Far enough back to get all data
  
  return useQuery({
    queryKey: ['calories-all-time'],
    queryFn: () => fetchCaloriesForRange(startDate, today)
  });
};
