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
  const [currentX, setCurrentX] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calcular la semana actual basada en el offset y mantener el día seleccionado centrado
  useEffect(() => {
    const currentWeekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Lunes como primer día
    const selectedWeekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const todayWeekStart = startOfWeek(today, { weekStartsOn: 1 });
    
    // Calcular cuántas semanas hay de diferencia
    const daysDiff = Math.floor((selectedWeekStart.getTime() - todayWeekStart.getTime()) / (1000 * 60 * 60 * 24));
    const weeksDiff = Math.floor(daysDiff / 7);
    setWeekOffset(weeksDiff);
  }, [selectedDate]);

  const currentWeekStart = addDays(startOfWeek(today, { weekStartsOn: 1 }), weekOffset * 7);
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.clientX);
    setCurrentX(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    setCurrentX(e.clientX);
    const diff = e.clientX - startX;
    setDragOffset(diff);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    
    const diff = currentX - startX;
    const threshold = 50; // Umbral mínimo para cambiar semana
    
    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        // Arrastrar hacia la derecha = semana anterior
        setWeekOffset(prev => prev - 1);
      } else {
        // Arrastrar hacia la izquierda = semana siguiente
        setWeekOffset(prev => prev + 1);
      }
    }
    
    setIsDragging(false);
    setDragOffset(0);
    setStartX(0);
    setCurrentX(0);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartX(e.touches[0].clientX);
    setCurrentX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    setCurrentX(e.touches[0].clientX);
    const diff = e.touches[0].clientX - startX;
    setDragOffset(diff);
  };

  const handleTouchEnd = () => {
    handleMouseUp();
  };

  const handleDateClick = (date: Date) => {
    onDateChange(date);
  };

  return (
    <div className="bg-card p-4 rounded-lg overflow-hidden">
      <div 
        ref={containerRef}
        className="flex justify-between items-center cursor-grab active:cursor-grabbing select-none transition-transform duration-200 ease-out"
        style={{
          transform: `translateX(${dragOffset}px)`,
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
              className={`flex flex-col items-center p-3 rounded-2xl cursor-pointer transition-all min-w-[60px] ${
                isSelected
                  ? "bg-primary text-primary-foreground shadow-lg scale-105"
                  : isToday
                  ? "bg-primary/20 text-primary"
                  : "bg-secondary/50 text-foreground hover:bg-secondary"
              }`}
              onClick={() => handleDateClick(date)}
            >
              <span className="text-xs font-medium capitalize">
                {format(date, "EEE", { locale: es }).slice(0, 3)}
              </span>
              <span className="text-lg font-semibold mt-1">{format(date, "d")}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};