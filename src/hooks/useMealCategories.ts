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
      // Verificar autenticación
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('Usuario no autenticado para categorías');
        return [];
      }

      // Buscar categorías del usuario
      const { data, error } = await supabase
        .from('meal_categories')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;

      // Si no tiene categorías, crear las por defecto
      if (!data || data.length === 0) {
        console.log('Creando categorías por defecto para usuario:', user.id);
        await createDefaultCategories(user.id);
        
        // Volver a consultar después de crear las categorías
        const { data: newData, error: newError } = await supabase
          .from('meal_categories')
          .select('*')
          .eq('user_id', user.id)
          .order('name');

        if (newError) throw newError;
        return newData as MealCategory[];
      }

      return data as MealCategory[];
    },
  });
};

// Función auxiliar para crear categorías por defecto
const createDefaultCategories = async (userId: string) => {
  const defaultCategories = [
    { name: 'Desayuno', color: '#f97316', icon: '🌅' },
    { name: 'Almuerzo', color: '#10b981', icon: '🍽️' },
    { name: 'Merienda', color: '#8b5cf6', icon: '🥪' },
    { name: 'Cena', color: '#3b82f6', icon: '🌙' }
  ];

  for (const category of defaultCategories) {
    await supabase
      .from('meal_categories')
      .insert({
        user_id: userId,
        name: category.name,
        color: category.color,
        icon: category.icon,
        is_default: true,
      });
  }
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

export const useUpdateMealCategory = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ categoryId, name }: {
      categoryId: string;
      name: string;
    }) => {
      const { data, error } = await supabase
        .from('meal_categories')
        .update({ name, updated_at: new Date().toISOString() })
        .eq('id', categoryId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-categories'] });
      toast({
        title: "Categoría actualizada",
        description: "El nombre de la categoría se actualizó exitosamente",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo actualizar la categoría",
        variant: "destructive"
      });
      console.error('Error updating meal category:', error);
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