import { useState, useRef, useEffect, useCallback } from "react";
import { format, addDays, isSameDay } from "date-fns";
import { es } from "date-fns/locale";

interface WeeklyCalendarProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  mealsData?: any;
  mealsRangeData?: { mealsByDate: Record<string, any[]>; meals: any[] };
  tasksCount?: number;
}

export const WeeklyCalendar = ({ selectedDate, onDateChange, mealsData, mealsRangeData, tasksCount }: WeeklyCalendarProps) => {
  const today = new Date();
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState(0);
  const [velocity, setVelocity] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const lastPosition = useRef(0);
  const animationRef = useRef<number>();
  const velocityHistory = useRef<Array<{ time: number; position: number }>>([]);

  // Generar días (2 meses atrás y 2 meses adelante)
  const days = [];
  for (let i = -60; i <= 60; i++) {
    days.push(addDays(today, i));
  }

  // Calcular ancho por día
  const containerWidth = containerRef.current?.offsetWidth || 400;
  const dayWidth = Math.floor(containerWidth / 7);

  // Función de inercia mejorada - más tiempo y más fuerza
  const startInertia = useCallback(() => {
    if (Math.abs(velocity) < 1) { // Umbral más bajo
      setIsAnimating(false);
      return;
    }

    setIsAnimating(true);
    
    const animate = () => {
      setVelocity(prev => {
        const newVelocity = prev * 0.98; // Fricción más baja para durar más tiempo
        
        if (Math.abs(newVelocity) < 0.5) { // Umbral más bajo para durar más
          setIsAnimating(false);
          return 0;
        }
        
        setPosition(prevPos => prevPos + newVelocity);
        animationRef.current = requestAnimationFrame(animate);
        return newVelocity;
      });
    };
    
    animationRef.current = requestAnimationFrame(animate);
  }, [velocity]);

  // Calcular velocidad
  const calculateVelocity = useCallback(() => {
    const now = Date.now();
    const recentMoves = velocityHistory.current.filter(move => now - move.time < 150);
    
    if (recentMoves.length < 2) return 0;
    
    const first = recentMoves[0];
    const last = recentMoves[recentMoves.length - 1];
    const deltaPosition = last.position - first.position;
    const deltaTime = last.time - first.time;
    
    return deltaTime > 0 ? (deltaPosition / deltaTime) * 30 : 0; // Factor aumentado para más fuerza
  }, []);

  // Eventos de drag
  const handleStart = useCallback((clientX: number) => {
    setIsDragging(true);
    setIsAnimating(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    lastPosition.current = clientX;
    velocityHistory.current = [{ time: Date.now(), position: clientX }];
    setVelocity(0);
  }, []);

  const handleMove = useCallback((clientX: number) => {
    if (!isDragging) return;
    
    const delta = clientX - lastPosition.current;
    setPosition(prev => prev + delta * 2); // Factor aumentado para más sensibilidad
    
    velocityHistory.current.push({ time: Date.now(), position: clientX });
    if (velocityHistory.current.length > 5) {
      velocityHistory.current.shift();
    }
    
    lastPosition.current = clientX;
  }, [isDragging]);

  const handleEnd = useCallback(() => {
    if (!isDragging) return;
    
    setIsDragging(false);
    const finalVelocity = calculateVelocity();
    setVelocity(finalVelocity);
    
    if (Math.abs(finalVelocity) > 1) { // Umbral más bajo para activar inercia
      startInertia();
    }
  }, [isDragging, calculateVelocity, startInertia]);

  // Eventos mouse
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    e.preventDefault();
    handleMove(e.clientX);
  };

  const handleMouseUp = () => {
    handleEnd();
  };

  // Eventos touch
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    handleStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    handleMove(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    handleEnd();
  };

  // Verificar si un día tiene actividad (comidas, tareas o gastos)
  const hasActivity = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    const todayString = format(new Date(), 'yyyy-MM-dd');
    
    // Si es hoy y hay tareas, mostrar indicador
    if (dateString === todayString && tasksCount && tasksCount > 0) {
      return true;
    }
    
    // Verificar si hay comidas para cualquier día usando mealsRangeData
    if (mealsRangeData?.mealsByDate && mealsRangeData.mealsByDate[dateString]) {
      return mealsRangeData.mealsByDate[dateString].length > 0;
    }
    
    // Fallback: si es hoy y hay datos de comidas actuales
    if (dateString === todayString && mealsData?.meals && mealsData.meals.length > 0) {
      return true;
    }
    
    return false;
  };

  // Click en día
  const handleDateClick = (date: Date) => {
    if (isDragging) return;
    onDateChange(date);
  };

  // Posición inicial centrada en el día de hoy - EXACTAMENTE AL CENTRO
  useEffect(() => {
    if (dayWidth > 0) {
      // Calcular para que el día de hoy (índice 60) aparezca en el centro exacto de la pantalla
      // Centro de pantalla = containerWidth / 2
      // Centro del día = dayWidth / 2
      // Posición del día de hoy = 60 * dayWidth
      const centerScreen = containerWidth / 2;
      const centerDay = dayWidth / 2;
      const todayPosition = 60 * dayWidth;
      const offsetToCenter = centerScreen - centerDay - todayPosition;
      
      setPosition(offsetToCenter);
    }
  }, [dayWidth, containerWidth]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div className="bg-card p-2 rounded-lg overflow-hidden">
      <div 
        ref={containerRef}
        className="relative w-full"
        style={{ height: '80px' }}
      >
        <div 
          className="flex items-center cursor-grab active:cursor-grabbing select-none absolute top-0 left-0"
          style={{
            transform: `translateX(${position}px)`,
            transition: isDragging || isAnimating ? 'none' : 'transform 0.3s ease-out',
            willChange: 'transform',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {days.map((date, index) => {
            const isToday = isSameDay(date, today);
            const isSelected = isSameDay(date, selectedDate);
            const hasActivityIndicator = hasActivity(date);
            
            return (
              <div
                key={`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`}
                className={`flex flex-col items-center justify-center rounded-2xl cursor-pointer transition-all flex-shrink-0 relative ${
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : isToday && !isSelected
                    ? "bg-primary/20 text-primary"
                    : "bg-secondary/50 text-foreground hover:bg-secondary"
                }`}
                style={{ 
                  width: `${dayWidth - 4}px`,
                  height: '60px',
                  margin: '0 2px'
                }}
                onClick={() => handleDateClick(date)}
              >
                <span className="text-xs font-medium capitalize">
                  {format(date, "EEE", { locale: es }).slice(0, 3)}
                </span>
                <span className="text-xl font-semibold">{format(date, "d")}</span>
                
                {/* Indicador de actividad */}
                {hasActivityIndicator && (
                  <div className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full"></div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};