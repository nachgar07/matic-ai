import { useState, useRef, useEffect, useCallback } from "react";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
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
  const startPosition = useRef(0);
  const animationRef = useRef<number>();
  const velocityHistory = useRef<Array<{ time: number; delta: number }>>([]);

  // Generar días en un rango más amplio para el efecto carrusel
  const generateDays = useCallback((centerDate: Date, range: number = 14) => {
    const days = [];
    for (let i = -range; i <= range; i++) {
      days.push(addDays(centerDate, i));
    }
    return days;
  }, []);

  const days = generateDays(today);

  // Calcular qué día está más cerca del centro
  const getCenterDayIndex = useCallback(() => {
    const dayWidth = 80; // Ancho aproximado de cada día
    const centerOffset = position;
    const dayIndex = Math.round(-centerOffset / dayWidth);
    return Math.max(0, Math.min(days.length - 1, dayIndex + Math.floor(days.length / 2)));
  }, [position, days.length]);

  // Actualizar el día seleccionado basado en la posición
  useEffect(() => {
    if (!isDragging && !isAnimating) {
      const centerIndex = getCenterDayIndex();
      const centerDay = days[centerIndex];
      if (centerDay && !isSameDay(centerDay, selectedDate)) {
        onDateChange(centerDay);
      }
    }
  }, [position, isDragging, isAnimating, getCenterDayIndex, days, selectedDate, onDateChange]);

  // Función de inercia
  const startInertia = useCallback(() => {
    if (Math.abs(velocity) < 0.5) {
      setIsAnimating(false);
      return;
    }

    setIsAnimating(true);
    
    const animate = () => {
      setVelocity(prev => {
        const newVelocity = prev * 0.95; // Factor de fricción
        
        if (Math.abs(newVelocity) < 0.5) {
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

  // Calcular velocidad basada en el historial de movimientos
  const calculateVelocity = useCallback(() => {
    const now = Date.now();
    const recentMoves = velocityHistory.current.filter(move => now - move.time < 100);
    
    if (recentMoves.length < 2) return 0;
    
    const totalDelta = recentMoves.reduce((sum, move) => sum + move.delta, 0);
    const totalTime = recentMoves[recentMoves.length - 1].time - recentMoves[0].time;
    
    return totalTime > 0 ? (totalDelta / totalTime) * 16 : 0; // Normalizar a 60fps
  }, []);

  // Manejadores de eventos
  const handleStart = useCallback((clientX: number) => {
    setIsDragging(true);
    setIsAnimating(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    startPosition.current = clientX;
    lastPosition.current = clientX;
    lastMoveTime.current = Date.now();
    velocityHistory.current = [];
  }, []);

  const handleMove = useCallback((clientX: number) => {
    if (!isDragging) return;
    
    const delta = clientX - lastPosition.current;
    const now = Date.now();
    
    setPosition(prev => prev + delta);
    
    // Guardar historial para calcular velocidad
    velocityHistory.current.push({ time: now, delta });
    if (velocityHistory.current.length > 10) {
      velocityHistory.current.shift();
    }
    
    lastPosition.current = clientX;
    lastMoveTime.current = now;
  }, [isDragging]);

  const handleEnd = useCallback(() => {
    if (!isDragging) return;
    
    setIsDragging(false);
    const finalVelocity = calculateVelocity();
    setVelocity(finalVelocity);
    startInertia();
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
    handleStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    handleEnd();
  };

  // Click en día específico
  const handleDateClick = (date: Date, index: number) => {
    if (isDragging) return;
    
    const dayWidth = 80;
    const centerIndex = Math.floor(days.length / 2);
    const targetPosition = (centerIndex - index) * dayWidth;
    
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

  return (
    <div className="bg-card p-2 sm:p-4 rounded-lg overflow-hidden">
      <div 
        ref={containerRef}
        className="relative"
        style={{ height: '80px' }}
      >
        <div 
          className="flex items-center cursor-grab active:cursor-grabbing select-none absolute"
          style={{
            transform: `translateX(${position}px)`,
            transition: isDragging || isAnimating ? 'none' : 'transform 0.3s ease-out',
            left: '50%',
            marginLeft: '-40px', // Centrar el primer elemento
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
            
            return (
              <div
                key={date.toISOString()}
                className={`flex flex-col items-center p-2 sm:p-3 rounded-xl sm:rounded-2xl cursor-pointer transition-all mx-1 ${
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-lg scale-105"
                    : isToday
                    ? "bg-primary/20 text-primary"
                    : "bg-secondary/50 text-foreground hover:bg-secondary"
                }`}
                style={{ 
                  minWidth: '60px',
                  width: '60px',
                  flexShrink: 0
                }}
                onClick={() => handleDateClick(date, index)}
              >
                <span className="text-xs font-medium capitalize truncate w-full text-center">
                  {format(date, "EEE", { locale: es }).slice(0, 3)}
                </span>
                <span className="text-sm sm:text-lg font-semibold mt-1">{format(date, "d")}</span>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Indicador central sutil */}
      <div className="flex justify-center mt-2">
        <div className="w-1 h-1 bg-primary/30 rounded-full"></div>
      </div>
    </div>
  );
};