import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MealEntry } from './useFatSecret';

export interface FavoriteMealPlate {
  id: string;
  user_id: string;
  plate_name: string;
  plate_image?: string;
  meal_type: string;
  created_at: string;
  favorite_meal_plate_items: {
    id: string;
    food_id: string;
    servings: number;
    foods: {
      id: string;
      food_id: string;
      food_name: string;
      brand_name?: string;
      serving_description?: string;
      calories_per_serving?: number;
      carbs_per_serving?: number;
      protein_per_serving?: number;
      fat_per_serving?: number;
    };
  }[];
}

// Get user's favorite meal plates
export const useFavoriteMealPlates = () => {
  return useQuery({
    queryKey: ['favorite-meal-plates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('favorite_meal_plates')
        .select(`
          id,
          user_id,
          plate_name,
          plate_image,
          meal_type,
          created_at,
          favorite_meal_plate_items (
            id,
            food_id,
            servings,
            foods (*)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as FavoriteMealPlate[];
    }
  });
};

// Add meal plate to favorites
export const useAddFavoriteMealPlate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      plateName, 
      plateImage, 
      mealType, 
      meals 
    }: {
      plateName: string;
      plateImage?: string;
      mealType: string;
      meals: MealEntry[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Insert the favorite meal plate
      const { data: plate, error: plateError } = await supabase
        .from('favorite_meal_plates')
        .insert({
          user_id: user.id,
          plate_name: plateName,
          plate_image: plateImage,
          meal_type: mealType
        })
        .select()
        .single();

      if (plateError) throw plateError;

      // Insert all the meal items
      const items = meals.map(meal => ({
        favorite_plate_id: plate.id,
        food_id: meal.food_id,
        servings: meal.servings
      }));

      const { error: itemsError } = await supabase
        .from('favorite_meal_plate_items')
        .insert(items);

      if (itemsError) throw itemsError;

      return plate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorite-meal-plates'] });
    }
  });
};

// Remove meal plate from favorites
export const useRemoveFavoriteMealPlate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (plateId: string) => {
      const { error } = await supabase
        .from('favorite_meal_plates')
        .delete()
        .eq('id', plateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorite-meal-plates'] });
    }
  });
};
