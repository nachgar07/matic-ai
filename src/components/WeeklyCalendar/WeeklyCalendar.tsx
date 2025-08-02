import { useState, useRef, useEffect, useCallback } from "react";
import { format, addDays, isSameDay } from "date-fns";
import { es } from "date-fns/locale";

interface WeeklyCalendarProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export const WeeklyCalendar = ({ selectedDate, onDateChange }: WeeklyCalendarProps) => {
  const today = new Date();
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState(0);
  const [velocity, setVelocity] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const lastMoveTime = useRef(0);
  const lastPosition = useRef(0);
  const animationRef = useRef<number>();
  const velocityHistory = useRef<Array<{ time: number; position: number }>>([]);

  // Generar un rango amplio de días (30 días hacia atrás y 30 hacia adelante)
  const generateDays = useCallback(() => {
    const days = [];
    console.log('Generando días...');
    for (let i = -30; i <= 30; i++) {
      days.push(addDays(today, i));
    }
    console.log('Días generados:', days.length);
    return days;
  }, [today]);

  const days = generateDays();
  const todayIndex = 30; // El día de hoy está en el índice 30
  const dayWidth = 80; // Ancho de cada día en píxeles

  console.log('WeeklyCalendar renderizado - días:', days.length, 'position:', position);

  // Función de inercia
  const startInertia = useCallback(() => {
    if (Math.abs(velocity) < 2) {
      setIsAnimating(false);
      return;
    }

    setIsAnimating(true);
    
    const animate = () => {
      setVelocity(prev => {
        const friction = 0.92;
        const newVelocity = prev * friction;
        
        if (Math.abs(newVelocity) < 1) {
          setIsAnimating(false);
          return 0;
        }
        
        setPosition(prevPos => {
          const newPos = prevPos + newVelocity;
          const maxPosition = (days.length - 7) * dayWidth / 2;
          const minPosition = -maxPosition;
          return Math.max(minPosition, Math.min(maxPosition, newPos));
        });
        
        if (Math.abs(newVelocity) > 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setIsAnimating(false);
        }
        
        return newVelocity;
      });
    };
    
    animationRef.current = requestAnimationFrame(animate);
  }, [velocity, days.length, dayWidth]);

  // Calcular velocidad
  const calculateVelocity = useCallback(() => {
    const now = Date.now();
    const recentMoves = velocityHistory.current.filter(move => now - move.time < 150);
    
    if (recentMoves.length < 2) return 0;
    
    const first = recentMoves[0];
    const last = recentMoves[recentMoves.length - 1];
    const deltaPosition = last.position - first.position;
    const deltaTime = last.time - first.time;
    
    if (deltaTime === 0) return 0;
    
    return (deltaPosition / deltaTime) * 20;
  }, []);

  // Obtener el día más cercano al centro
  const getCenterDay = useCallback(() => {
    const centerOffset = -position / dayWidth;
    const centerIndex = Math.round(todayIndex + centerOffset);
    return Math.max(0, Math.min(days.length - 1, centerIndex));
  }, [position, dayWidth, todayIndex, days.length]);

  // Actualizar día seleccionado cuando no se está arrastrando
  useEffect(() => {
    if (!isDragging && !isAnimating) {
      const centerIndex = getCenterDay();
      const centerDay = days[centerIndex];
      if (centerDay && !isSameDay(centerDay, selectedDate)) {
        onDateChange(centerDay);
      }
    }
  }, [position, isDragging, isAnimating, getCenterDay, days, selectedDate, onDateChange]);

  // Manejadores de eventos
  const handleStart = useCallback((clientX: number) => {
    console.log('Touch/Mouse start:', clientX);
    setIsDragging(true);
    setIsAnimating(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    lastPosition.current = clientX;
    lastMoveTime.current = Date.now();
    velocityHistory.current = [{ time: Date.now(), position: clientX }];
    setVelocity(0);
  }, []);

  const handleMove = useCallback((clientX: number) => {
    if (!isDragging) return;
    
    const delta = clientX - lastPosition.current;
    const now = Date.now();
    
    console.log('Move delta:', delta);
    setPosition(prev => {
      const newPos = prev + delta * 1.5;
      console.log('New position:', newPos);
      return newPos;
    });
    
    velocityHistory.current.push({ time: now, position: clientX });
    if (velocityHistory.current.length > 5) {
      velocityHistory.current.shift();
    }
    
    lastPosition.current = clientX;
    lastMoveTime.current = now;
  }, [isDragging]);

  const handleEnd = useCallback(() => {
    if (!isDragging) return;
    
    console.log('Touch/Mouse end');
    setIsDragging(false);
    const finalVelocity = calculateVelocity();
    console.log('Final velocity:', finalVelocity);
    setVelocity(finalVelocity);
    
    if (Math.abs(finalVelocity) > 2) {
      startInertia();
    }
  }, [isDragging, calculateVelocity, startInertia]);

  // Eventos del mouse
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

  // Eventos táctiles
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    console.log('Touch start event');
    handleStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    console.log('Touch move event');
    handleMove(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    console.log('Touch end event');
    handleEnd();
  };

  // Click en día específico
  const handleDateClick = (date: Date, index: number) => {
    if (isDragging) return;
    
    const targetPosition = (todayIndex - index) * dayWidth;
    setPosition(targetPosition);
    onDateChange(date);
  };

  // Limpiar animación al desmontar
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Centrar el día de hoy al inicio
  useEffect(() => {
    console.log('Centrando día de hoy');
    setPosition(0);
  }, []);

  const containerStyle = {
    transform: `translateX(calc(50% + ${position}px - ${todayIndex * dayWidth}px))`,
    transition: isDragging || isAnimating ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    willChange: 'transform',
  };

  console.log('Container style:', containerStyle);

  return (
    <div className="bg-card p-2 sm:p-4 rounded-lg overflow-hidden">
      <div 
        ref={containerRef}
        className="relative w-full"
        style={{ height: '90px', minHeight: '90px' }}
      >
        <div 
          className="flex items-center cursor-grab active:cursor-grabbing select-none absolute top-0 left-0"
          style={containerStyle}
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
            
            return (
              <div
                key={`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`}
                className={`flex flex-col items-center justify-center p-2 sm:p-3 rounded-xl sm:rounded-2xl cursor-pointer transition-all mx-1 flex-shrink-0 ${
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-lg scale-105"
                    : isToday
                    ? "bg-primary/20 text-primary scale-105 border-2 border-primary/40"
                    : "bg-secondary/50 text-foreground hover:bg-secondary"
                }`}
                style={{ 
                  minWidth: `${dayWidth}px`,
                  width: `${dayWidth}px`,
                  height: '70px'
                }}
                onClick={() => handleDateClick(date, index)}
              >
                <span className="text-xs font-medium capitalize text-center leading-tight">
                  {format(date, "EEE", { locale: es }).slice(0, 3)}
                </span>
                <span className="text-sm sm:text-lg font-semibold mt-1">{format(date, "d")}</span>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Indicador central */}
      <div className="flex justify-center mt-2">
        <div className="w-2 h-2 bg-primary rounded-full"></div>
      </div>
      
      {/* Debug info */}
      <div className="text-xs text-muted-foreground text-center mt-2">
        Días: {days.length} | Pos: {Math.round(position)} | Centro: {getCenterDay()}
      </div>
    </div>
  );
};