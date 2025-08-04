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

  const categories = [
    { value: "bad_habit", label: "Dejar un mal hábito", icon: "🚫", color: "#ef4444" },
    { value: "arte", label: "Arte", icon: "🎨", color: "#ec4899" },
    { value: "tarea", label: "Tarea", icon: "⏰", color: "#ec4899" },
    { value: "meditacion", label: "Meditación", icon: "🧘", color: "#a855f7" },
    { value: "estudio", label: "Estudio", icon: "🎓", color: "#8b5cf6" },
    { value: "deportes", label: "Deportes", icon: "🚴", color: "#3b82f6" },
    { value: "entretenimiento", label: "Entretenimiento", icon: "⭐", color: "#06b6d4" },
    { value: "social", label: "Social", icon: "💬", color: "#10b981" },
    { value: "finanzas", label: "Finanzas", icon: "$", color: "#22c55e" },
    { value: "salud", label: "Salud", icon: "➕", color: "#84cc16" },
    { value: "trabajo", label: "Trabajo", icon: "💼", color: "#a3a3a3" },
    { value: "nutricion", label: "Nutrición", icon: "🍽️", color: "#f59e0b" },
    { value: "hogar", label: "Hogar", icon: "🏠", color: "#f97316" },
    { value: "aire_libre", label: "Aire libre", icon: "⛰️", color: "#f97316" },
    { value: "otros", label: "Otros", icon: "🔲", color: "#ef4444" },
    // Categorías legacy
    { value: "personal", label: "Personal", icon: "👤", color: "#ec4899" },
    { value: "compras", label: "Compras", icon: "🛒", color: "#f59e0b" },
  ];

  const getCategoryData = (category: string) => {
    const categoryData = categories.find(cat => cat.value === category);
    return categoryData || { icon: "📝", color: "#6b7280", label: "Otros" };
  };

  const categoryData = getCategoryData(task.category);

  return (
    <div className="flex items-center gap-4 p-4 bg-card rounded-2xl transition-all hover:bg-card/80">
      {/* Icono de la izquierda */}
      <div 
        className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl"
        style={{ 
          backgroundColor: categoryData.color,
        }}
      >
        {categoryData.icon}
      </div>

      {/* Contenido central */}
      <div className="flex-1 min-w-0">
        <h3 className={`font-medium text-base ${task.is_completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
          {task.title}
        </h3>
        
        <span className="text-sm capitalize" style={{ color: categoryData.color }}>
          {categoryData.label}
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