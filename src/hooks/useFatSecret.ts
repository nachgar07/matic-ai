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
  plate_image?: string;
  foods: Food;
}

export interface DailyTotals {
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
}

export interface FavoriteFood {
  id: string;
  user_id: string;
  food_id: string;
  created_at: string;
  foods: Food;
}

export interface NutritionGoals {
  id: string;
  user_id: string;
  daily_calories: number;
  daily_protein: number;
  daily_carbs: number;
  daily_fat: number;
  created_at: string;
  updated_at: string;
}

// Search foods using FatSecret API
export const useSearchFoods = () => {
  return useMutation({
    mutationFn: async ({ searchQuery, page = 0 }: { searchQuery: string; page?: number }) => {
      const { data, error } = await supabase.functions.invoke('fatsecret-search', {
        body: { searchQuery, page, limit: 8 }
      });

      if (error) throw error;
      return data;
    }
  });
};

// Add meal entry
export const useAddMeal = () => {
  return useMutation({
    mutationFn: async ({ foodId, servings, mealType, plateImage, consumedAt }: {
      foodId: string;
      servings: number;
      mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
      plateImage?: string;
      consumedAt?: Date;
    }) => {
      const { data, error } = await supabase.functions.invoke('add-meal', {
        body: { foodId, servings, mealType, plateImage, consumedAt: consumedAt?.toISOString() }
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

// Get user's favorite foods
export const useFavoriteFoods = () => {
  return useQuery({
    queryKey: ['favorite-foods'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('favorite_foods')
        .select(`
          id,
          user_id,
          food_id,
          created_at,
          foods (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as FavoriteFood[];
    }
  });
};

// Add food to favorites
export const useAddFavorite = () => {
  return useMutation({
    mutationFn: async (foodId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('favorite_foods')
        .insert({ food_id: foodId, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  });
};

// Remove food from favorites
export const useRemoveFavorite = () => {
  return useMutation({
    mutationFn: async (favoriteId: string) => {
      const { error } = await supabase
        .from('favorite_foods')
        .delete()
        .eq('id', favoriteId);

      if (error) throw error;
    }
  });
};

// Get user's nutrition goals
export const useNutritionGoals = () => {
  return useQuery({
    queryKey: ['nutrition-goals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nutrition_goals')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as NutritionGoals | null;
    }
  });
};

// Set user's nutrition goals
export const useSetNutritionGoals = () => {
  return useMutation({
    mutationFn: async (goals: {
      daily_calories: number;
      daily_protein: number;
      daily_carbs: number;
      daily_fat: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('nutrition_goals')
        .upsert({ ...goals, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  });
};

// Delete meal entry
export const useDeleteMeal = () => {
  return useMutation({
    mutationFn: async (mealId: string) => {
      const { error } = await supabase
        .from('meal_entries')
        .delete()
        .eq('id', mealId);

      if (error) throw error;
    }
  });
};