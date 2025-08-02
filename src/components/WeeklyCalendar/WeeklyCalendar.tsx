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

  // Generar un rango amplio de días (60 días hacia atrás y 60 hacia adelante)
  const generateDays = useCallback(() => {
    const days = [];
    for (let i = -60; i <= 60; i++) {
      days.push(addDays(today, i));
    }
    return days;
  }, [today]);

  const days = generateDays();
  const todayIndex = 60; // El día de hoy está en el índice 60
  const dayWidth = 80; // Ancho de cada día en píxeles

  // Función de inercia mejorada para móviles
  const startInertia = useCallback(() => {
    if (Math.abs(velocity) < 2) { // Umbral más bajo para móviles
      setIsAnimating(false);
      return;
    }

    setIsAnimating(true);
    
    const animate = () => {
      setVelocity(prev => {
        const friction = 0.92; // Fricción más fuerte para control
        const newVelocity = prev * friction;
        
        if (Math.abs(newVelocity) < 1) {
          setIsAnimating(false);
          return 0;
        }
        
        setPosition(prevPos => {
          const newPos = prevPos + newVelocity;
          // Limitar el rango de posición
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

  // Calcular velocidad mejorada para móviles
  const calculateVelocity = useCallback(() => {
    const now = Date.now();
    const recentMoves = velocityHistory.current.filter(move => now - move.time < 150);
    
    if (recentMoves.length < 2) return 0;
    
    const first = recentMoves[0];
    const last = recentMoves[recentMoves.length - 1];
    const deltaPosition = last.position - first.position;
    const deltaTime = last.time - first.time;
    
    if (deltaTime === 0) return 0;
    
    // Multiplicar por factor para móviles
    return (deltaPosition / deltaTime) * 20; // Factor aumentado para mejor inercia
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
    
    // Aumentar la sensibilidad del movimiento
    setPosition(prev => prev + delta * 1.5); // Factor de sensibilidad
    
    // Guardar historial para calcular velocidad
    velocityHistory.current.push({ time: now, position: clientX });
    if (velocityHistory.current.length > 5) {
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
    
    if (Math.abs(finalVelocity) > 2) {
      startInertia();
    }
  }, [isDragging, calculateVelocity, startInertia]);

  // Eventos del mouse (escritorio)
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

  // Eventos táctiles (móvil)
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
    setPosition(0); // El día de hoy estará en posición 0 (centro)
  }, []);

  return (
    <div className="bg-card p-2 sm:p-4 rounded-lg overflow-hidden">
      <div 
        ref={containerRef}
        className="relative"
        style={{ height: '80px' }}
      >
        <div 
          className="flex items-center cursor-grab active:cursor-grabbing select-none absolute touch-pan-y"
          style={{
            transform: `translateX(calc(50% + ${position}px - ${todayIndex * dayWidth}px))`,
            transition: isDragging || isAnimating ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
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
            
            return (
              <div
                key={date.toISOString()}
                className={`flex flex-col items-center p-2 sm:p-3 rounded-xl sm:rounded-2xl cursor-pointer transition-all mx-1 ${
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-lg scale-105"
                    : isToday
                    ? "bg-primary/20 text-primary scale-105"
                    : "bg-secondary/50 text-foreground hover:bg-secondary"
                }`}
                style={{ 
                  minWidth: `${dayWidth}px`,
                  width: `${dayWidth}px`,
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
      
      {/* Indicador central */}
      <div className="flex justify-center mt-2">
        <div className="w-1 h-1 bg-primary/50 rounded-full"></div>
      </div>
    </div>
  );
};