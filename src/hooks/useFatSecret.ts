import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Food {
  id: string;
  food_id: string;
  food_name: string;
  brand_name?: string;
  serving_description?: string;
  calories_per_serving?: number;
  carbs_per_serving?: number;
  protein_per_serving?: number;
  fat_per_serving?: number;
}

export interface MealEntry {
  id: string;
  user_id: string;
  food_id: string;
  servings: number;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  consumed_at: string;
  foods: Food;
}

export interface DailyTotals {
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
}

// Search foods using FatSecret API
export const useSearchFoods = () => {
  return useMutation({
    mutationFn: async (searchQuery: string) => {
      const { data, error } = await supabase.functions.invoke('fatsecret-search', {
        body: { searchQuery }
      });

      if (error) throw error;
      return data;
    }
  });
};

// Add meal entry
export const useAddMeal = () => {
  return useMutation({
    mutationFn: async ({ foodId, servings, mealType }: {
      foodId: string;
      servings: number;
      mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    }) => {
      const { data, error } = await supabase.functions.invoke('add-meal', {
        body: { foodId, servings, mealType }
      });

      if (error) throw error;
      return data;
    }
  });
};

// Get user meals for a specific date
export const useUserMeals = (date?: string) => {
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  return useQuery({
    queryKey: ['user-meals', targetDate],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-user-meals', {
        body: { date: targetDate }
      });

      if (error) throw error;
      return data as { meals: MealEntry[]; dailyTotals: DailyTotals };
    }
  });
};