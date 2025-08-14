import { useState, useRef } from "react";
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
  itemType?: 'tarea' | 'hábito';
  isHabit?: boolean;
}

export const TaskCard = ({ task, itemType = 'tarea', isHabit = false }: TaskCardProps) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const dragRef = useRef<HTMLDivElement>(null);
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

  const handleDragStart = (clientX: number) => {
    setIsDragging(true);
    setStartX(clientX);
  };

  const handleDragMove = (clientX: number) => {
    if (!isDragging) return;
    
    const deltaX = clientX - startX;
    // Solo permitir arrastrar hacia la derecha
    if (deltaX > 0) {
      setDragX(Math.min(deltaX, 200));
    }
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    // Si se arrastró más de 100px, eliminar la tarea
    if (dragX > 100) {
      handleDelete();
    } else {
      // Volver a la posición original
      setDragX(0);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    handleDragStart(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleDragMove(e.clientX);
  };

  const handleMouseUp = () => {
    handleDragEnd();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleDragMove(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    handleDragEnd();
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
    <div className="relative overflow-hidden">
      {/* Fondo de eliminación */}
      <div 
        className={`absolute inset-0 bg-destructive flex items-center justify-end pr-6 transition-opacity duration-200 ${
          dragX > 50 ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <Trash2 className="w-6 h-6 text-white" />
      </div>
      
      {/* Tarjeta principal */}
      <div 
        ref={dragRef}
        className="flex items-center gap-4 p-4 bg-card rounded-2xl transition-all hover:bg-card/80 cursor-grab active:cursor-grabbing select-none"
        style={{
          transform: `translateX(${dragX}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={isDragging ? handleMouseMove : undefined}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={isDragging ? handleTouchMove : undefined}
        onTouchEnd={handleTouchEnd}
      >
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
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`font-medium text-base ${task.is_completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
              {task.title}
            </h3>
            <Badge variant="secondary" className="text-xs px-2 py-0.5">
              {itemType}
            </Badge>
          </div>
          
          <span className="text-sm capitalize" style={{ color: categoryData.color }}>
            {categoryData.label}
          </span>
        </div>

        {/* Botón de check a la derecha */}
        {!isHabit ? (
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
        )}
      </div>
      
      <EditTaskDialog 
        task={task}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />
    </div>
  );
};