import { format } from "date-fns";
import { Goal } from "@/hooks/useGoals";

/**
 * Verifica si un hábito debe estar activo en una fecha específica
 * basándose en su configuración de frecuencia
 */
export const isHabitActiveOnDate = (goal: Goal, date: Date): boolean => {
  const dayOfWeek = date.getDay();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = dayNames[dayOfWeek];
  
  // Verificar si la fecha está dentro del rango del hábito
  const startDate = new Date(goal.start_date);
  startDate.setHours(0, 0, 0, 0);
  
  const dateOnly = new Date(date);
  dateOnly.setHours(0, 0, 0, 0);
  
  if (dateOnly < startDate) return false;
  
  // Si hay fecha de fin, verificar que no la exceda (incluir la fecha de fin)
  if (goal.end_date) {
    const endDate = new Date(goal.end_date);
    endDate.setHours(0, 0, 0, 0);
    
    if (dateOnly > endDate) return false;
  }
  
  if (goal.frequency === 'daily') return true;
  
  if (goal.frequency === 'custom') {
    // Verificar si hay frequency_data con configuraciones avanzadas
    if (goal.frequency_data) {
      try {
        const frequencyData = JSON.parse(goal.frequency_data);
        
        // Días específicos de la semana
        if (frequencyData.type === 'specific_weekdays' && frequencyData.weekdays) {
          return frequencyData.weekdays.includes(dayName);
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
          return diffInDays >= 0 && diffInDays % frequencyData.repeatInterval === 0;
        }
        
      } catch (error) {
        console.error('Error parsing frequency_data:', error);
      }
    }
    
    // Fallback a frequency_days para días específicos de la semana
    return goal.frequency_days?.includes(dayName) || false;
  }
  
  if (goal.frequency === 'weekly') {
    // Para semanal, solo los lunes están activos
    return dayOfWeek === 1;
  }
  
  return true; // Por defecto, permitir todos los días
};