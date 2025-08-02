import { useState, useRef, useEffect } from "react";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { es } from "date-fns/locale";

interface WeeklyCalendarProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export const WeeklyCalendar = ({ selectedDate, onDateChange }: WeeklyCalendarProps) => {
  const today = new Date();
  const [weekOffset, setWeekOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [currentTranslate, setCurrentTranslate] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calcular la semana actual basada en el offset
  const currentWeekStart = addDays(startOfWeek(today, { weekStartsOn: 1 }), weekOffset * 7);
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  // Detectar el inicio del arrastre
  const handleDragStart = (clientX: number) => {
    setIsDragging(true);
    setStartX(clientX);
    setCurrentTranslate(0);
  };

  // Manejar el movimiento del arrastre
  const handleDragMove = (clientX: number) => {
    if (!isDragging) return;
    
    const deltaX = clientX - startX;
    setCurrentTranslate(deltaX);
  };

  // Finalizar el arrastre y determinar si cambiar semana
  const handleDragEnd = () => {
    if (!isDragging) return;
    
    const threshold = 80; // Umbral mínimo para cambiar semana
    
    if (Math.abs(currentTranslate) > threshold) {
      if (currentTranslate > 0) {
        // Arrastrar hacia la derecha = semana anterior
        setWeekOffset(prev => prev - 1);
      } else {
        // Arrastrar hacia la izquierda = semana siguiente
        setWeekOffset(prev => prev + 1);
      }
    }
    
    // Reset del estado
    setIsDragging(false);
    setCurrentTranslate(0);
    setStartX(0);
  };

  // Eventos del mouse
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    e.preventDefault();
    handleDragMove(e.clientX);
  };

  const handleMouseUp = () => {
    handleDragEnd();
  };

  // Eventos táctiles
  const handleTouchStart = (e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleDragMove(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    handleDragEnd();
  };

  const handleDateClick = (date: Date) => {
    if (!isDragging) {
      onDateChange(date);
    }
  };

  return (
    <div className="bg-card p-2 sm:p-4 rounded-lg overflow-hidden">
      <div 
        ref={containerRef}
        className="flex justify-between items-center cursor-grab active:cursor-grabbing select-none transition-transform duration-200 ease-out gap-1 sm:gap-2"
        style={{
          transform: `translateX(${currentTranslate}px)`,
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {weekDates.map((date) => {
          const isToday = isSameDay(date, today);
          const isSelected = isSameDay(date, selectedDate);
          
          return (
            <div
              key={date.toISOString()}
              className={`flex flex-col items-center p-2 sm:p-3 rounded-xl sm:rounded-2xl cursor-pointer transition-all flex-1 min-w-0 ${
                isSelected
                  ? "bg-primary text-primary-foreground shadow-lg scale-105"
                  : isToday
                  ? "bg-primary/20 text-primary"
                  : "bg-secondary/50 text-foreground hover:bg-secondary"
              }`}
              onClick={() => handleDateClick(date)}
            >
              <span className="text-xs font-medium capitalize truncate w-full text-center">
                {format(date, "EEE", { locale: es }).slice(0, 3)}
              </span>
              <span className="text-sm sm:text-lg font-semibold mt-1">{format(date, "d")}</span>
            </div>
          );
        })}
      </div>
      
      {/* Indicador de semana para mobile */}
      <div className="flex justify-center mt-2 sm:hidden">
        <div className="flex space-x-1">
          {[-2, -1, 0, 1, 2].map((offset) => (
            <div
              key={offset}
              className={`w-2 h-2 rounded-full transition-colors ${
                offset === 0 ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};