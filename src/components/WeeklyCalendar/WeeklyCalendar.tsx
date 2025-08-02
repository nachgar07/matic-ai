import { useState, useRef, useEffect } from "react";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { es } from "date-fns/locale";

const daysOfWeek = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export const WeeklyCalendar = () => {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today);
  const [weekOffset, setWeekOffset] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  // Generar la semana actual basada en el offset
  const currentWeekStart = addDays(startOfWeek(today, { weekStartsOn: 0 }), weekOffset * 7);
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    startX.current = e.pageX - (scrollRef.current?.offsetLeft || 0);
    scrollLeft.current = scrollRef.current?.scrollLeft || 0;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    e.preventDefault();
    const x = e.pageX - (scrollRef.current?.offsetLeft || 0);
    const walk = (x - startX.current) * 2;
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollLeft.current - walk;
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    isDragging.current = true;
    startX.current = e.touches[0].pageX - (scrollRef.current?.offsetLeft || 0);
    scrollLeft.current = scrollRef.current?.scrollLeft || 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const x = e.touches[0].pageX - (scrollRef.current?.offsetLeft || 0);
    const walk = (x - startX.current) * 2;
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollLeft.current - walk;
    }
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY > 0) {
      setWeekOffset(prev => prev + 1);
    } else {
      setWeekOffset(prev => prev - 1);
    }
  };

  return (
    <div className="bg-card p-4 rounded-lg">
      <div 
        ref={scrollRef}
        className="flex justify-between items-center cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      >
        {weekDates.map((date, index) => {
          const isToday = isSameDay(date, today);
          const isSelected = isSameDay(date, selectedDate);
          
          return (
            <div
              key={date.toISOString()}
              className={`flex flex-col items-center p-3 rounded-2xl cursor-pointer transition-all min-w-[60px] ${
                isSelected || isToday
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "bg-secondary/50 text-foreground hover:bg-secondary"
              }`}
              onClick={() => setSelectedDate(date)}
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