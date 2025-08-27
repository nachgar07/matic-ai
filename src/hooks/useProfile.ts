import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface UserProfile {
  id: string;
  display_name: string | null;
  age: number | null;
  weight: number | null;
  height: number | null;
  goal: string | null;
  activity_level: string | null;
  gender: string | null;
  nationality: string | null;
  calculated_calories: number | null;
  target_weight: number | null;
  currency: string | null;
  avatar_url: string | null;
}

export const useProfile = () => {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as UserProfile | null;
    }
  });
};

export const useProfileCompletion = () => {
  const { data: profile } = useProfile();
  const { data: nutritionGoals } = useQuery({
    queryKey: ['nutrition-goals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nutrition_goals')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    }
  });

  const hasPersonalData = profile && 
    profile.age && 
    profile.weight && 
    profile.height && 
    profile.goal && 
    profile.activity_level && 
    profile.gender;

  const hasNutritionGoals = nutritionGoals && 
    nutritionGoals.daily_calories && 
    nutritionGoals.daily_protein && 
    nutritionGoals.daily_carbs && 
    nutritionGoals.daily_fat;

  return {
    profile,
    nutritionGoals,
    hasPersonalData: !!hasPersonalData,
    hasNutritionGoals: !!hasNutritionGoals,
    isNewUser: !hasPersonalData || !hasNutritionGoals
  };
};