import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MealCategory {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export const useMealCategories = () => {
  return useQuery({
    queryKey: ['meal-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meal_categories')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as MealCategory[];
    },
  });
};

export const useCreateMealCategory = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ name, color = '#6366f1', icon = '🍽️' }: {
      name: string;
      color?: string;
      icon?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data, error } = await supabase
        .from('meal_categories')
        .insert({
          user_id: user.id,
          name,
          color,
          icon,
          is_default: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data as MealCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-categories'] });
      toast({
        title: "¡Categoría creada!",
        description: "La nueva categoría de comida se ha creado exitosamente",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo crear la categoría de comida",
        variant: "destructive"
      });
      console.error('Error creating meal category:', error);
    },
  });
};

export const useDeleteMealCategory = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (categoryId: string) => {
      const { error } = await supabase
        .from('meal_categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-categories'] });
      toast({
        title: "Categoría eliminada",
        description: "La categoría se eliminó exitosamente",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo eliminar la categoría",
        variant: "destructive"
      });
      console.error('Error deleting meal category:', error);
    },
  });
};