import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, subDays, isToday } from "date-fns";

export interface Goal {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  category: string;
  icon: string;
  color: string;
  priority: number;
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
  frequency_days?: string[];
  frequency_data?: string;
  target_value: number;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GoalProgress {
  id: string;
  goal_id: string;
  user_id: string;
  date: string;
  completed_value: number;
  is_completed: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  due_date?: string;
  due_time?: string;
  is_completed: boolean;
  priority: number;
  category: string;
  reminder_time?: string;
  is_recurring: boolean;
  created_at: string;
  updated_at: string;
}

// Hook para obtener objetivos del usuario
export const useGoals = () => {
  return useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false });
      
      if (error) throw error;
      return data as Goal[];
    },
  });
};

// Hook para obtener progreso de objetivos
export const useGoalProgress = (startDate?: string, endDate?: string) => {
  const defaultDate = format(new Date(), 'yyyy-MM-dd');
  const queryStartDate = startDate || defaultDate;
  const queryEndDate = endDate || defaultDate;
  
  return useQuery({
    queryKey: ['goal-progress', queryStartDate, queryEndDate],
    queryFn: async () => {
      let query = supabase
        .from('goal_progress')
        .select(`
          *,
          goals (*)
        `);
      
      if (startDate && endDate) {
        query = query.gte('date', queryStartDate).lte('date', queryEndDate);
      } else {
        query = query.eq('date', queryStartDate);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
  });
};

// Hook para obtener estadísticas de objetivos
export const useGoalStats = () => {
  return useQuery({
    queryKey: ['goal-stats'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const last7Days = format(subDays(new Date(), 7), 'yyyy-MM-dd');
      
      // Obtener progreso de los últimos 7 días
      const { data: progressData, error: progressError } = await supabase
        .from('goal_progress')
        .select(`
          *,
          goals (name, icon, color)
        `)
        .gte('date', last7Days)
        .lte('date', today);
      
      if (progressError) throw progressError;
      
      // Obtener objetivos activos
      const { data: goalsData, error: goalsError } = await supabase
        .from('goals')
        .select('*')
        .eq('is_active', true);
        
      if (goalsError) throw goalsError;
      
      return { progressData, goalsData };
    },
  });
};

// Hook para obtener tareas
export const useTasks = (date?: string) => {
  const targetDate = date || format(new Date(), 'yyyy-MM-dd');
  
  return useQuery({
    queryKey: ['tasks', targetDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .or(`due_date.eq.${targetDate},and(due_date.is.null,is_recurring.eq.true)`)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Filtrar tareas que deben mostrarse: 
      // 1. Tareas sin fecha (is_recurring = true) se muestran todos los días
      // 2. Tareas con fecha específica solo se muestran en esa fecha
      const filteredTasks = data?.filter(task => {
        if (!task.due_date && task.is_recurring) return true; // Tareas pendientes recurrentes
        if (task.due_date === targetDate) return true; // Tareas para la fecha específica
        return false;
      }) || [];
      
      return filteredTasks as Task[];
    },
    enabled: !!date // Only run when date is provided
  });
};

// Hook para crear objetivo
export const useCreateGoal = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (goalData: Omit<Goal, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data, error } = await supabase
        .from('goals')
        .insert([{ ...goalData, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast({
        title: "Objetivo creado",
        description: "Tu nuevo objetivo se ha creado exitosamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo crear el objetivo. Inténtalo de nuevo.",
        variant: "destructive",
      });
    },
  });
};

// Hook para actualizar progreso de objetivo
export const useUpdateGoalProgress = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      goalId, 
      date, 
      completedValue,
      isCompleted,
      notes 
    }: { 
      goalId: string; 
      date: string; 
      completedValue: number;
      isCompleted: boolean;
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data, error } = await supabase
        .from('goal_progress')
        .upsert({
          goal_id: goalId,
          user_id: user.id,
          date,
          completed_value: completedValue,
          is_completed: isCompleted,
          notes,
        }, {
          onConflict: 'goal_id,date'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidar todas las queries de goal-progress para asegurar actualización inmediata
      queryClient.invalidateQueries({ queryKey: ['goal-progress'] });
      queryClient.invalidateQueries({ queryKey: ['goal-stats'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el progreso. Inténtalo de nuevo.",
        variant: "destructive",
      });
    },
  });
};

// Hook para crear tarea
export const useCreateTask = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (taskData: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data, error } = await supabase
        .from('tasks')
        .insert([{ ...taskData, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.refetchQueries({ queryKey: ['tasks'] });
      toast({
        title: "Tarea creada",
        description: "Tu nueva tarea se ha creado exitosamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo crear la tarea. Inténtalo de nuevo.",
        variant: "destructive",
      });
    },
  });
};

// Hook para actualizar objetivo
export const useUpdateGoal = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ goalId, updates }: { goalId: string; updates: Partial<Goal> }) => {
      const { data, error } = await supabase
        .from('goals')
        .update(updates)
        .eq('id', goalId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goal-progress'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['goal-stats'] });
      toast({
        title: "Hábito actualizado",
        description: "El hábito se ha actualizado correctamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el hábito. Inténtalo de nuevo.",
        variant: "destructive",
      });
    },
  });
};

// Hook para eliminar objetivo
export const useDeleteGoal = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (goalId: string) => {
      const { data, error } = await supabase
        .from('goals')
        .update({ is_active: false })
        .eq('id', goalId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goal-progress'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['goal-stats'] });
      toast({
        title: "Hábito eliminado",
        description: "El hábito se ha eliminado correctamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo eliminar el hábito. Inténtalo de nuevo.",
        variant: "destructive",
      });
    },
  });
};

// Hook para actualizar tarea
export const useUpdateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: string; updates: Partial<Task> }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
};