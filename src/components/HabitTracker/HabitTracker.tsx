import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { format, subDays, addDays, isToday, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { es } from "date-fns/locale";
import { Goal, useGoalProgress, useUpdateGoalProgress, useDeleteGoal } from "@/hooks/useGoals";
import { ChevronLeft, ChevronRight, BarChart3, Trash2, MoreHorizontal, CalendarIcon } from "lucide-react";
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
  
  // Determinar el rango de fechas para cargar datos de progreso
  const getProgressDateRange = () => {
    if (goal.end_date) {
      // Para hábitos con fecha final, cargar desde inicio hasta fin
      const startDate = new Date(goal.start_date);
      const endDate = new Date(goal.end_date);
      
      return {
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd')
      };
    } else {
      // Para hábitos sin fecha final, cargar un rango más amplio que incluya la semana actual
      const today = new Date();
      const startDate = new Date(goal.start_date);
      
      // Cargar desde la fecha de inicio del hábito o 30 días atrás, lo que sea más reciente
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      const effectiveStart = startDate > thirtyDaysAgo ? startDate : thirtyDaysAgo;
      
      // Cargar hasta 7 días en el futuro para permitir planificación
      const sevenDaysFromNow = new Date(today);
      sevenDaysFromNow.setDate(today.getDate() + 7);
      
      return {
        startDate: format(effectiveStart, 'yyyy-MM-dd'),
        endDate: format(sevenDaysFromNow, 'yyyy-MM-dd')
      };
    }
  };

  const dateRange = getProgressDateRange();
  
  // Obtener progreso para el rango apropiado
  const { data: progressData } = useGoalProgress(dateRange.startDate, dateRange.endDate);
  const updateProgress = useUpdateGoalProgress();
  const deleteGoal = useDeleteGoal();
  const dayLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  // Obtener progreso para un día específico
  const getDayProgress = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    return progressData?.find(p => p.date === dateString && p.goal_id === goal.id);
  };

  // Calcular porcentaje de cumplimiento 
  const getWeekPercentage = () => {
    if (goal.end_date) {
      // Si hay fecha de fin, calcular sobre todo el rango del hábito
      const startDate = new Date(goal.start_date);
      const endDate = new Date(goal.end_date);
      const today = new Date();
      
      // Normalizar todas las fechas a medianoche
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999); // Incluir todo el día final
      today.setHours(23, 59, 59, 999);
      
      // La fecha efectiva final es la menor entre hoy y la fecha final
      const effectiveEndDate = today <= endDate ? today : endDate;
      
      // Generar todos los días desde inicio hasta la fecha efectiva (inclusive)
      const allDays = [];
      const current = new Date(startDate);
      
      while (current <= effectiveEndDate) {
        allDays.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
      
      // Filtrar solo los días que son activos según la frecuencia
      const activeDays = allDays.filter(day => isDayActive(day));
      const completedActiveDays = activeDays.filter(day => getDayProgress(day)?.is_completed);
      
      console.log(`Porcentaje para ${goal.name} (${format(startDate, 'dd/MM')} al ${format(new Date(goal.end_date), 'dd/MM')}):`, {
        totalDaysInRange: allDays.length,
        activeDays: activeDays.length,
        completedDays: completedActiveDays.length,
        percentage: activeDays.length > 0 ? Math.round((completedActiveDays.length / activeDays.length) * 100) : 0
      });
      
      if (activeDays.length === 0) return 0;
      return Math.round((completedActiveDays.length / activeDays.length) * 100);
    } else {
      // Si no hay fecha de fin, calcular solo para la semana actual
      const activeDays = weekDays.filter(day => isDayActive(day));
      const completedActiveDays = activeDays.filter(day => getDayProgress(day)?.is_completed);
      
      if (activeDays.length === 0) return 0;
      return Math.round((completedActiveDays.length / activeDays.length) * 100);
    }
  };

  // Verificar si un día específico está activo para el hábito
  const isDayActive = (date: Date) => {
    const dayOfWeek = date.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];
    
    // Verificar si la fecha está dentro del rango del hábito
    const startDate = new Date(goal.start_date);
    startDate.setHours(0, 0, 0, 0);
    
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);
    
    if (dateOnly < startDate) return false;
    
    // Si hay fecha de fin, verificar que no la exceda
    if (goal.end_date) {
      const endDate = new Date(goal.end_date);
      endDate.setHours(23, 59, 59, 999);
      
      if (dateOnly > endDate) return false;
    }
    
    if (goal.frequency === 'daily') return true;
    
    if (goal.frequency === 'custom') {
      // Verificar si hay frequency_data con configuraciones avanzadas
      if (goal.frequency_data) {
        try {
          const frequencyData = JSON.parse(goal.frequency_data);
          
          console.log(`Verificando día ${format(date, 'yyyy-MM-dd')} para frecuencia:`, frequencyData);
          
          // Días específicos de la semana
          if (frequencyData.type === 'specific_weekdays' && frequencyData.weekdays) {
            const isActive = frequencyData.weekdays.includes(dayName);
            console.log(`Día ${dayName}, weekdays:`, frequencyData.weekdays, 'activo:', isActive);
            return isActive;
          }
          
          // Días específicos del mes
          if (frequencyData.type === 'specific_monthdays' && frequencyData.monthdays) {
            const dayOfMonth = date.getDate();
            return frequencyData.monthdays.includes(dayOfMonth);
          }
          
          // Días específicos del año
          if (frequencyData.type === 'specific_yeardays' && frequencyData.yeardays) {
            const currentFullDate = format(date, 'yyyy-MM-dd');
            const currentMonthDay = format(date, 'MM-dd');
            
            return frequencyData.yeardays.some(yearday => {
              return yearday === currentFullDate || yearday.endsWith(currentMonthDay);
            });
          }
          
          // Repetir cada X días
          if (frequencyData.type === 'repeat' && frequencyData.repeatInterval) {
            const diffInDays = Math.floor((dateOnly.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            const isActiveDay = diffInDays >= 0 && diffInDays % frequencyData.repeatInterval === 0;
            
            console.log(`Cálculo repeat para ${format(date, 'yyyy-MM-dd')}:`, {
              startDate: format(startDate, 'yyyy-MM-dd'),
              currentDate: format(dateOnly, 'yyyy-MM-dd'),
              diffInDays,
              repeatInterval: frequencyData.repeatInterval,
              remainder: diffInDays % frequencyData.repeatInterval,
              isActiveDay
            });
            
            return isActiveDay;
          }
          
          console.log(`Tipo de frecuencia no reconocido: ${frequencyData.type}`);
          
        } catch (error) {
          console.error('Error parsing frequency_data:', error);
        }
      }
      
      // Fallback a frequency_days para días específicos de la semana
      const fallbackActive = goal.frequency_days?.includes(dayName) || false;
      console.log(`Fallback para ${dayName}, frequency_days:`, goal.frequency_days, 'activo:', fallbackActive);
      return fallbackActive;
    }
    
    if (goal.frequency === 'weekly') {
      // Para semanal, solo los lunes están activos
      return dayOfWeek === 1;
    }
    
    return true; // Por defecto, permitir todos los días
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
    
    if (!currentProgress || currentProgress.completed_value === 0) {
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
      console.log('Actualizando progreso:', {
        goalId: goal.id,
        goalName: goal.name,
        goalHasEndDate: !!goal.end_date,
        date: dateString,
        completedValue: nextCompletedValue,
        isCompleted: nextIsCompleted,
      });
      
      await updateProgress.mutateAsync({
        goalId: goal.id,
        date: dateString,
        completedValue: nextCompletedValue,
        isCompleted: nextIsCompleted,
      });
      
      console.log('Progreso actualizado exitosamente');
    } catch (error) {
      console.error('Error updating progress:', error);
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

          console.log(`Día ${format(date, 'yyyy-MM-dd')}:`, {
            isActive,
            isInRange: date >= new Date(goal.start_date) && (!goal.end_date || date <= new Date(goal.end_date + 'T23:59:59')),
            startDate: goal.start_date,
            endDate: goal.end_date,
            frequency: goal.frequency
          });

          // Determinar el estado del botón
          let buttonState = 'normal';
          let stateLabel = 'Normal';
          if (hasProgress && isCompleted) {
            buttonState = 'completed'; // Verde
            stateLabel = 'Completado';
          } else if (hasProgress && !isCompleted) {
            buttonState = 'cancelled'; // Rojo
            stateLabel = 'Cancelado';
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
          <span>🔥 {
            goal.end_date ? 
            // Si hay fecha fin, contar completados en todo el rango
            (() => {
              const startDate = new Date(goal.start_date);
              const endDate = new Date(goal.end_date);
              // WORKAROUND: Agregar 1 día a la fecha final para compensar problema de zona horaria
              endDate.setDate(endDate.getDate() + 1);
              
              const today = new Date();
              
              // Normalizar fechas para comparar solo días (sin horas)
              const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
              const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
              const effectiveEndDate = todayOnly <= endDateOnly ? todayOnly : endDateOnly;
              
              const allDays = [];
              const current = new Date(startDate);
              while (current <= effectiveEndDate) {
                allDays.push(new Date(current));
                current.setDate(current.getDate() + 1);
              }
              
              return allDays.filter(day => isDayActive(day) && getDayProgress(day)?.is_completed).length;
            })()
            :
            // Si no hay fecha fin, contar solo la semana actual
            weekDays.filter(day => isDayActive(day) && getDayProgress(day)?.is_completed).length
          }</span>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="p-1">
                <CalendarIcon className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-fit">
              <DialogHeader>
                <DialogTitle>Calendario de {goal.name}</DialogTitle>
              </DialogHeader>
              <div className="p-4">
                <Calendar
                  mode="multiple"
                  selected={eachDayOfInterval({
                    start: startOfMonth(new Date()),
                    end: endOfMonth(new Date())
                  }).filter(day => isDayActive(day))}
                  className="rounded-md border pointer-events-auto"
                  locale={es}
                  disabled={false}
                  modifiers={{
                    active: (date) => isDayActive(date),
                  }}
                  modifiersStyles={{
                    active: {
                      backgroundColor: goal.color + '40',
                      color: goal.color,
                      fontWeight: 'bold',
                      border: `2px solid ${goal.color}`,
                    }
                  }}
                />
                <div className="mt-4 text-sm text-muted-foreground text-center">
                  Los días marcados representan cuándo debes realizar este hábito
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button variant="ghost" size="sm" className="p-1">
            <BarChart3 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};