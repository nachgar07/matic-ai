import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Clock, Bell, MessageSquare, MoreHorizontal, CalendarDays, Trash2, Edit2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Task, useUpdateTask } from "@/hooks/useGoals";
import { EditTaskDialog } from "@/components/EditTaskDialog/EditTaskDialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TaskCardProps {
  task: Task;
}

export const TaskCard = ({ task }: TaskCardProps) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const updateTask = useUpdateTask();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleToggleComplete = async () => {
    if (isUpdating) return;
    
    setIsUpdating(true);
    try {
      await updateTask.mutateAsync({
        taskId: task.id,
        updates: { is_completed: !task.is_completed }
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEdit = () => {
    setEditDialogOpen(true);
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', task.id);

      if (error) throw error;

      // Invalidar queries para actualizar la UI
      queryClient.invalidateQueries({ queryKey: ['tasks'] });

      toast({
        title: "Tarea eliminada",
        description: "La tarea se ha eliminado exitosamente.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la tarea.",
        variant: "destructive",
      });
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return "text-red-500";
    if (priority >= 6) return "text-yellow-500";
    return "text-green-500";
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'trabajo': return '💼';
      case 'personal': return '👤';
      case 'salud': return '🏃';
      case 'compras': return '🛒';
      default: return '📝';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'trabajo': return '#6366f1';
      case 'personal': return '#ec4899';
      case 'salud': return '#10b981';
      case 'compras': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-card rounded-2xl transition-all hover:bg-card/80">
      {/* Icono de la izquierda */}
      <div 
        className="w-12 h-12 rounded-2xl flex items-center justify-center"
        style={{ 
          backgroundColor: getCategoryColor(task.category),
        }}
      >
        <Clock className="w-6 h-6 text-white" />
      </div>

      {/* Contenido central */}
      <div className="flex-1 min-w-0">
        <h3 className={`font-medium text-base ${task.is_completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
          {task.title}
        </h3>
        
        <span className="text-sm capitalize" style={{ color: getCategoryColor(task.category) }}>
          {task.category === 'personal' ? 'Hábito' : 'Tarea'}
        </span>
      </div>

      {/* Botón de check a la derecha */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleToggleComplete}
        disabled={isUpdating}
        className="p-2 h-auto"
      >
        {task.is_completed ? (
          <CheckCircle2 className="w-6 h-6 text-green-500" />
        ) : (
          <Circle className="w-6 h-6 text-muted-foreground" />
        )}
      </Button>
      
      <EditTaskDialog 
        task={task}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />
    </div>
  );
};