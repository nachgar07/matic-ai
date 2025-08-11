import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { format, subDays, addDays, isToday, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { Goal, useGoalProgress, useUpdateGoalProgress, useDeleteGoal } from "@/hooks/useGoals";
import { ChevronLeft, ChevronRight, BarChart3, Trash2, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface HabitTrackerProps {
  goal: Goal;
}

// Generar días de la semana (función movida fuera para usar antes)
function getWeekDays(currentWeek: Date) {
  const startOfWeek = new Date(currentWeek);
  startOfWeek.setDate(currentWeek.getDate() - currentWeek.getDay() + 1); // Lunes
  
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    return date;
  });
}

export const HabitTracker = ({ goal }: HabitTrackerProps) => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const weekDays = getWeekDays(currentWeek);
  
  // Obtener progreso para todos los días de la semana
  const { data: progressData } = useGoalProgress(
    format(weekDays[0], 'yyyy-MM-dd'),
    format(weekDays[6], 'yyyy-MM-dd')
  );
  const updateProgress = useUpdateGoalProgress();
  const deleteGoal = useDeleteGoal();
  const dayLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  // Obtener progreso para un día específico
  const getDayProgress = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    return progressData?.find(p => p.date === dateString && p.goal_id === goal.id);
  };

  // Calcular porcentaje de cumplimiento de la semana
  const getWeekPercentage = () => {
    const activeDays = weekDays.filter(day => isDayActive(day));
    const completedActiveDays = activeDays.filter(day => getDayProgress(day)?.is_completed);
    
    if (activeDays.length === 0) return 0;
    return Math.round((completedActiveDays.length / activeDays.length) * 100);
  };

  // Verificar si un día específico está activo para el hábito
  const isDayActive = (date: Date) => {
    const dayOfWeek = date.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];
    
    if (goal.frequency === 'daily') return true;
    if (goal.frequency === 'custom') {
      return goal.frequency_days?.includes(dayName) || false;
    }
    if (goal.frequency === 'weekly') {
      // Para semanal, solo los lunes están activos
      return dayOfWeek === 1;
    }
    return false;
  };

  // Marcar día con 3 estados: normal → verde (completado) → rojo (cancelado) → normal
  const toggleDayComplete = async (date: Date) => {
    // Solo permitir toggle en días activos
    if (!isDayActive(date)) return;
    
    const dateString = format(date, 'yyyy-MM-dd');
    const currentProgress = getDayProgress(date);
    
    // Determinar el estado actual y el siguiente
    let nextIsCompleted: boolean;
    let nextCompletedValue: number;
    
    if (!currentProgress) {
      // Estado 1: Sin progreso → Verde (completado)
      nextIsCompleted = true;
      nextCompletedValue = goal.target_value;
    } else if (currentProgress.is_completed) {
      // Estado 2: Verde (completado) → Rojo (cancelado)
      nextIsCompleted = false;
      nextCompletedValue = goal.target_value; // Mantener el valor pero marcar como no completado
    } else {
      // Estado 3: Rojo (cancelado) → Normal (sin progreso)
      nextIsCompleted = false;
      nextCompletedValue = 0; // Eliminar el progreso
    }

    try {
      await updateProgress.mutateAsync({
        goalId: goal.id,
        date: dateString,
        completedValue: nextCompletedValue,
        isCompleted: nextIsCompleted,
      });
    } catch (error) {
      console.error('Update failed:', error);
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentWeek);
    newDate.setDate(currentWeek.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeek(newDate);
  };

  const handleDelete = async () => {
    await deleteGoal.mutateAsync(goal.id);
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
            style={{ backgroundColor: goal.color + '20', color: goal.color }}
          >
            {goal.icon}
          </div>
          <div>
            <h3 className="font-semibold">{goal.name}</h3>
            <p className="text-sm text-muted-foreground">
              {goal.frequency === 'daily' ? 'Todos los días' : goal.frequency}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigateWeek('prev')}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigateWeek('next')}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar hábito
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Días de la semana */}
      <div className="grid grid-cols-7 gap-2 mb-4">
        {weekDays.map((date, index) => {
          const dayProgress = getDayProgress(date);
          const isCompleted = dayProgress?.is_completed || false;
          const hasProgress = dayProgress && dayProgress.completed_value > 0;
          const isCurrentDay = isToday(date);
          const isPastDay = date < new Date() && !isToday(date);
          const isActive = isDayActive(date);

          // Determinar el estado del botón
          let buttonState = 'normal';
          if (hasProgress && isCompleted) {
            buttonState = 'completed'; // Verde
          } else if (hasProgress && !isCompleted) {
            buttonState = 'cancelled'; // Rojo
          }

          return (
            <div key={date.toISOString()} className="text-center">
              <div className="text-xs text-muted-foreground mb-1">
                {dayLabels[index]}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleDayComplete(date)}
                disabled={!isActive}
                className={`w-10 h-10 rounded-full p-0 ${
                  !isActive
                    ? 'bg-muted/30 text-muted-foreground/50 cursor-not-allowed'
                    : buttonState === 'completed'
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : buttonState === 'cancelled'
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : isCurrentDay
                    ? 'bg-primary text-primary-foreground hover:bg-primary/80'
                    : isPastDay
                    ? 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                {format(date, 'd')}
              </Button>
            </div>
          );
        })}
      </div>

      {/* Estadísticas */}
      <div className="flex items-center justify-between pt-3 border-t">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="text-sm font-medium">{getWeekPercentage()}%</span>
            <Progress value={getWeekPercentage()} className="w-20 h-2" />
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>🔥 {weekDays.filter(day => isDayActive(day) && getDayProgress(day)?.is_completed).length}</span>
          <Button variant="ghost" size="sm" className="p-1">
            <BarChart3 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};