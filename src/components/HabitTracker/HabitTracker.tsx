import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { format, subDays, addDays, isToday, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { es } from "date-fns/locale";
import { Goal, useGoalProgress, useUpdateGoalProgress, useDeleteGoal, useUpdateGoal } from "@/hooks/useGoals";
import { ChevronLeft, ChevronRight, BarChart3, Trash2, MoreHorizontal, CalendarIcon, Edit } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
interface HabitTrackerProps {
  goal: Goal;
}

// Generar días de la semana (función movida fuera para usar antes)
function getWeekDays(currentWeek: Date) {
  const startOfWeek = new Date(currentWeek);
  startOfWeek.setDate(currentWeek.getDate() - currentWeek.getDay() + 1); // Lunes

  return Array.from({
    length: 7
  }, (_, i) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    return date;
  });
}
export const HabitTracker = ({
  goal
}: HabitTrackerProps) => {
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
  const {
    data: progressData
  } = useGoalProgress(dateRange.startDate, dateRange.endDate);
  const updateProgress = useUpdateGoalProgress();
  const deleteGoal = useDeleteGoal();
  const updateGoal = useUpdateGoal();
  const dayLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  // Obtener progreso para un día específico
  const getDayProgress = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    const progress = progressData?.find(p => p.date === dateString && p.goal_id === goal.id);
    console.log(`📅 getDayProgress for ${dateString}:`, progress);
    return progress;
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
      endDate.setHours(23, 59, 59, 999);
      today.setHours(23, 59, 59, 999);

      // Generar TODOS los días del rango COMPLETO del hábito (para el denominador)
      const allPlanedDays = [];
      const current = new Date(startDate);
      while (current <= endDate) {
        allPlanedDays.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }

      // Filtrar días activos del rango COMPLETO (denominador)
      const totalActiveDays = allPlanedDays.filter(day => isDayActive(day));

      // Generar días hasta hoy para contar completados (numerador)
      const daysUntilToday = [];
      const currentUntilToday = new Date(startDate);
      const effectiveEndDate = today < endDate ? today : endDate;
      while (currentUntilToday <= effectiveEndDate) {
        daysUntilToday.push(new Date(currentUntilToday));
        currentUntilToday.setDate(currentUntilToday.getDate() + 1);
      }

      // Contar días completados hasta hoy (numerador)
      const completedActiveDays = daysUntilToday.filter(day => {
        const isActive = isDayActive(day);
        if (!isActive) return false;
        const progress = getDayProgress(day);
        return progress?.is_completed || false;
      });
      console.log(`📊 Calculating percentage for ${goal.name}:`);
      console.log(`📅 Full range: ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);
      console.log(`📅 Total active days in full range: ${totalActiveDays.length}`);
      console.log(`📅 Days completed until today: ${completedActiveDays.length}`);
      if (totalActiveDays.length === 0) return 0;
      const percentage = Math.round(completedActiveDays.length / totalActiveDays.length * 100);
      console.log(`📊 Final percentage: ${percentage}% (${completedActiveDays.length}/${totalActiveDays.length})`);
      return percentage;
    } else {
      // Si no hay fecha de fin, calcular solo para la semana actual
      const activeDays = weekDays.filter(day => isDayActive(day));
      const completedActiveDays = activeDays.filter(day => getDayProgress(day)?.is_completed);
      if (activeDays.length === 0) return 0;
      return Math.round(completedActiveDays.length / activeDays.length * 100);
    }
  };

  // Verificar si un día específico está activo para el hábito
  const isDayActive = (date: Date) => {
    const dayOfWeek = date.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];
    const dateString = format(date, 'yyyy-MM-dd');
    console.log(`🔍 Checking if ${dateString} (${dayName}) is active for goal:`, goal.name);
    console.log('🔍 Goal frequency:', goal.frequency);
    console.log('🔍 Goal frequency_data:', goal.frequency_data);
    console.log('🔍 Goal frequency_days:', goal.frequency_days);

    // Verificar si la fecha está dentro del rango del hábito
    const startDate = new Date(goal.start_date + 'T00:00:00');
    startDate.setHours(0, 0, 0, 0);
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);
    if (dateOnly < startDate) {
      console.log('❌ Date is before start date');
      return false;
    }

    // Si hay fecha de fin, verificar que no la exceda
    if (goal.end_date) {
      const endDate = new Date(goal.end_date + 'T00:00:00');
      endDate.setHours(23, 59, 59, 999);
      if (dateOnly > endDate) {
        console.log('❌ Date is after end date');
        return false;
      }
    }
    if (goal.frequency === 'daily') {
      console.log('✅ Daily frequency - active');
      return true;
    }
    if (goal.frequency === 'custom') {
      // Verificar si hay frequency_data con configuraciones avanzadas
      if (goal.frequency_data) {
        try {
          const frequencyData = JSON.parse(goal.frequency_data);
          console.log('🔍 Parsed frequency data:', frequencyData);

          // Días específicos de la semana
          if (frequencyData.type === 'specific_weekdays' && frequencyData.weekdays) {
            const isActive = frequencyData.weekdays.includes(dayName);
            console.log(`${isActive ? '✅' : '❌'} Specific weekdays check:`, isActive);
            return isActive;
          }

          // Días específicos del mes
          if (frequencyData.type === 'specific_monthdays' && frequencyData.monthdays) {
            const dayOfMonth = date.getDate();
            const isActive = frequencyData.monthdays.includes(dayOfMonth);
            console.log(`${isActive ? '✅' : '❌'} Specific monthdays check:`, isActive);
            return isActive;
          }

          // Días específicos del año
          if (frequencyData.type === 'specific_yeardays' && frequencyData.yeardays) {
            const currentFullDate = format(date, 'yyyy-MM-dd');
            const currentMonthDay = format(date, 'MM-dd');
            const isActive = frequencyData.yeardays.some(yearday => {
              return yearday === currentFullDate || yearday.endsWith(currentMonthDay);
            });
            console.log(`${isActive ? '✅' : '❌'} Specific yeardays check:`, isActive);
            return isActive;
          }

          // Repetir cada X días
          if (frequencyData.type === 'repeat' && frequencyData.repeatInterval) {
            const diffInDays = Math.floor((dateOnly.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            const isActiveDay = diffInDays >= 0 && diffInDays % frequencyData.repeatInterval === 0;
            console.log(`${isActiveDay ? '✅' : '❌'} Repeat interval check:`, isActiveDay, `(${diffInDays} days from start)`);
            return isActiveDay;
          }
        } catch (error) {
          console.error('Error parsing frequency_data:', error);
        }
      }

      // Fallback a frequency_days para días específicos de la semana
      const isActive = goal.frequency_days?.includes(dayName) || false;
      console.log(`${isActive ? '✅' : '❌'} Fallback frequency_days check:`, isActive);
      return isActive;
    }
    if (goal.frequency === 'weekly') {
      // Para semanal, solo los lunes están activos
      const isActive = dayOfWeek === 1;
      console.log(`${isActive ? '✅' : '❌'} Weekly frequency check:`, isActive);
      return isActive;
    }
    console.log('✅ Default - allowing all days');
    return true; // Por defecto, permitir todos los días
  };
  // Marcar día con 3 estados: normal → verde (completado) → rojo (cancelado) → normal
  const toggleDayComplete = async (date: Date) => {
    console.log('🎯 toggleDayComplete called for:', format(date, 'yyyy-MM-dd'));

    // Solo permitir toggle en días activos
    if (!isDayActive(date)) {
      console.log('❌ Day not active, returning');
      return;
    }
    const dateString = format(date, 'yyyy-MM-dd');
    const currentProgress = getDayProgress(date);
    console.log('📊 Current progress for', dateString, ':', currentProgress);

    // Determinar el estado actual y el siguiente
    let nextIsCompleted: boolean;
    let nextCompletedValue: number;
    if (!currentProgress || currentProgress.completed_value === 0) {
      // Estado 1: Sin progreso → Verde (completado)
      nextIsCompleted = true;
      nextCompletedValue = goal.target_value;
      console.log('🟢 Setting to completed');
    } else if (currentProgress.is_completed) {
      // Estado 2: Verde (completado) → Rojo (cancelado)
      nextIsCompleted = false;
      nextCompletedValue = goal.target_value; // Mantener el valor pero marcar como no completado
      console.log('🔴 Setting to cancelled');
    } else {
      // Estado 3: Rojo (cancelado) → Normal (sin progreso)
      nextIsCompleted = false;
      nextCompletedValue = 0; // Eliminar el progreso
      console.log('⚪ Setting to normal');
    }
    try {
      console.log('🚀 Updating progress with:', {
        goalId: goal.id,
        date: dateString,
        completedValue: nextCompletedValue,
        isCompleted: nextIsCompleted
      });
      await updateProgress.mutateAsync({
        goalId: goal.id,
        date: dateString,
        completedValue: nextCompletedValue,
        isCompleted: nextIsCompleted
      });
      console.log('✅ Progress updated successfully');
    } catch (error) {
      console.error('❌ Error updating progress:', error);
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
  return <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg" style={{
          backgroundColor: goal.color + '20',
          color: goal.color
        }}>
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
        const dateString = format(date, 'yyyy-MM-dd');
        console.log(`🎨 Rendering button for ${dateString}:`, {
          dayProgress,
          isCompleted,
          hasProgress,
          isCurrentDay,
          isPastDay,
          isActive
        });

        // Determinar el estado del botón más claramente
        let buttonState: 'normal' | 'completed' | 'cancelled' = 'normal';
        if (dayProgress) {
          console.log(`🔍 dayProgress for ${dateString}:`, {
            completed_value: dayProgress.completed_value,
            is_completed: dayProgress.is_completed,
            hasProgress,
            isCompleted
          });
          if (isCompleted && hasProgress) {
            buttonState = 'completed'; // Verde: completado
          } else if (!isCompleted && hasProgress) {
            buttonState = 'cancelled'; // Rojo: cancelado/fallido
          }
          // Si no tiene progreso (completed_value = 0), permanece normal
        } else {
          console.log(`❌ No dayProgress found for ${dateString}`);
        }
        console.log(`🎨 Button state for ${dateString}: ${buttonState}`);

        // Clases de estilo más claras
        const getButtonClasses = () => {
          const baseClasses = "w-10 h-10 rounded-full p-0 transition-all duration-200 border-2";
          let classes = '';
          if (!isActive) {
            classes = `${baseClasses} bg-muted/20 text-muted-foreground/40 cursor-not-allowed border-transparent`;
          } else {
            switch (buttonState) {
              case 'completed':
                classes = `${baseClasses} bg-green-500 text-white hover:bg-green-600 border-green-600 shadow-sm`;
                break;
              case 'cancelled':
                classes = `${baseClasses} bg-red-500 text-white hover:bg-red-600 border-red-600 shadow-sm`;
                break;
              default:
                if (isCurrentDay) {
                  classes = `${baseClasses} bg-primary text-primary-foreground hover:bg-primary/90 border-primary shadow-sm`;
                } else if (isPastDay) {
                  classes = `${baseClasses} bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200`;
                } else {
                  classes = `${baseClasses} bg-background hover:bg-muted border-border hover:border-muted-foreground/20`;
                }
            }
          }
          console.log(`🎨 Button classes for ${dateString}:`, classes);
          return classes;
        };
        return <div key={date.toISOString()} className="text-center">
              <div className="text-xs text-muted-foreground mb-1">
                {dayLabels[index]}
              </div>
              <Button variant="ghost" size="sm" onClick={() => {
            console.log(`👆 Button clicked for ${dateString}`);
            toggleDayComplete(date);
          }} disabled={!isActive} className={getButtonClasses()}>
                {format(date, 'd')}
              </Button>
            </div>;
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
          <span>🔥 {goal.end_date ?
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
          })() :
          // Si no hay fecha fin, contar solo la semana actual
          weekDays.filter(day => isDayActive(day) && getDayProgress(day)?.is_completed).length}</span>
        </div>
      </div>
    </Card>;
};