import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { format, subDays, addDays, isToday, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { Goal, useGoalProgress, useUpdateGoalProgress } from "@/hooks/useGoals";
import { ChevronLeft, ChevronRight, BarChart3 } from "lucide-react";

interface HabitTrackerProps {
  goal: Goal;
}

export const HabitTracker = ({ goal }: HabitTrackerProps) => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const { data: progressData } = useGoalProgress();
  const updateProgress = useUpdateGoalProgress();

  // Generar días de la semana
  const getWeekDays = () => {
    const startOfWeek = new Date(currentWeek);
    startOfWeek.setDate(currentWeek.getDate() - currentWeek.getDay() + 1); // Lunes
    
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      return date;
    });
  };

  const weekDays = getWeekDays();
  const dayLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  // Obtener progreso para un día específico
  const getDayProgress = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    return progressData?.find(p => p.date === dateString && p.goal_id === goal.id);
  };

  // Calcular porcentaje de cumplimiento de la semana
  const getWeekPercentage = () => {
    const completedDays = weekDays.filter(day => getDayProgress(day)?.is_completed).length;
    return Math.round((completedDays / 7) * 100);
  };

  // Marcar día como completado/no completado
  const toggleDayComplete = async (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    const currentProgress = getDayProgress(date);
    const isCompleted = currentProgress?.is_completed || false;

    await updateProgress.mutateAsync({
      goalId: goal.id,
      date: dateString,
      completedValue: isCompleted ? 0 : goal.target_value,
      isCompleted: !isCompleted,
    });
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentWeek);
    newDate.setDate(currentWeek.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeek(newDate);
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
        </div>
      </div>

      {/* Días de la semana */}
      <div className="grid grid-cols-7 gap-2 mb-4">
        {weekDays.map((date, index) => {
          const dayProgress = getDayProgress(date);
          const isCompleted = dayProgress?.is_completed || false;
          const isCurrentDay = isToday(date);
          const isPastDay = date < new Date() && !isToday(date);

          return (
            <div key={date.toISOString()} className="text-center">
              <div className="text-xs text-muted-foreground mb-1">
                {dayLabels[index]}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleDayComplete(date)}
                className={`w-10 h-10 rounded-full p-0 ${
                  isCompleted
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : isCurrentDay
                    ? 'bg-primary text-primary-foreground'
                    : isPastDay
                    ? 'bg-red-100 text-red-600'
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
          <span>🔥 {weekDays.filter(day => getDayProgress(day)?.is_completed).length}</span>
          <Button variant="ghost" size="sm" className="p-1">
            <BarChart3 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};