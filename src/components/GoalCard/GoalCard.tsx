import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Clock, MoreHorizontal, Edit, Trash2, BarChart3 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { Goal, useUpdateGoalProgress } from "@/hooks/useGoals";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface GoalCardProps {
  goal: Goal;
  progress?: number;
  todayCompleted?: boolean;
  onEdit?: () => void;
  onViewStats?: () => void;
}

export const GoalCard = ({ goal, progress = 0, todayCompleted = false, onEdit, onViewStats }: GoalCardProps) => {
  const [isCompleting, setIsCompleting] = useState(false);
  const updateProgress = useUpdateGoalProgress();
  const { toast } = useToast();

  const handleToggleComplete = async () => {
    if (isCompleting) return;
    
    setIsCompleting(true);
    try {
      await updateProgress.mutateAsync({
        goalId: goal.id,
        date: format(new Date(), 'yyyy-MM-dd'),
        completedValue: todayCompleted ? 0 : goal.target_value,
        isCompleted: !todayCompleted,
      });
    } finally {
      setIsCompleting(false);
    }
  };

  const handleEdit = () => {
    toast({
      title: "Función en desarrollo",
      description: "La edición de objetivos estará disponible pronto.",
    });
  };

  const handleViewStats = () => {
    toast({
      title: "Función en desarrollo", 
      description: "Las estadísticas detalladas estarán disponibles pronto.",
    });
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('goals')
        .update({ is_active: false })
        .eq('id', goal.id);

      if (error) throw error;

      toast({
        title: "Objetivo eliminado",
        description: "El objetivo se ha desactivado exitosamente.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el objetivo.",
        variant: "destructive",
      });
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return "border-l-red-500 bg-red-50";
    if (priority >= 6) return "border-l-yellow-500 bg-yellow-50";
    return "border-l-green-500 bg-green-50";
  };

  const getDaysText = () => {
    if (goal.frequency === 'daily') return 'Todos los días';
    if (goal.frequency === 'weekly') return 'Semanal';
    if (goal.frequency === 'monthly') return 'Mensual';
    return goal.frequency_days?.join(', ') || 'Personalizado';
  };

  return (
    <Card className={`p-4 border-l-4 ${getPriorityColor(goal.priority)} relative`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 flex-1">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
            style={{ backgroundColor: goal.color + '20', color: goal.color }}
          >
            {goal.icon}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">{goal.name}</h3>
            <p className="text-sm text-muted-foreground">{getDaysText()}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="p-2">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleEdit}>
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleViewStats}>
                <BarChart3 className="w-4 h-4 mr-2" />
                Ver estadísticas
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {goal.description && (
        <p className="text-sm text-muted-foreground mb-3">{goal.description}</p>
      )}

      {/* Progreso semanal */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-muted-foreground">Progreso esta semana</span>
          <span className="font-medium">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Mini calendario semanal */}
      <div className="flex justify-between gap-1">
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, index) => {
          const date = new Date();
          date.setDate(date.getDate() - date.getDay() + index + 1);
          const isCompleted = Math.random() > 0.5; // Placeholder - aquí irían los datos reales
          const isCurrentDay = isToday(date);
          
          return (
            <div
              key={day}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                isCompleted
                  ? 'bg-green-500 text-white'
                  : isCurrentDay
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {day}
            </div>
          );
        })}
      </div>

      {/* Cadena de días */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t">
        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground">🔥</span>
          <span className="text-sm font-medium">12</span>
          <span className="text-sm text-muted-foreground">días</span>
        </div>
        
        <div className="text-sm text-muted-foreground">•</div>
        
        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground">🎯</span>
          <span className="text-sm font-medium">{Math.round(progress)}%</span>
        </div>

        <div className="ml-auto">
          <Badge variant="secondary" className="text-xs">
            Prioridad {goal.priority}
          </Badge>
        </div>
      </div>
    </Card>
  );
};