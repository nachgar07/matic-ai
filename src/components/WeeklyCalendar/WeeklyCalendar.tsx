import { useState } from "react";

const daysOfWeek = ["L", "M", "X", "J", "V", "S", "D"];

export const WeeklyCalendar = () => {
  const [selectedDate, setSelectedDate] = useState(26); // Default to 26 like in the image
  
  // Generate week dates (21-27 as shown in the image)
  const weekDates = Array.from({ length: 7 }, (_, i) => 21 + i);

  return (
    <div className="bg-card p-4 rounded-lg">
      <div className="flex justify-between items-center">
        {weekDates.map((date, index) => (
          <div
            key={date}
            className={`flex flex-col items-center p-2 rounded-lg cursor-pointer transition-colors ${
              date === selectedDate
                ? "bg-primary text-primary-foreground"
                : "hover:bg-secondary"
            }`}
            onClick={() => setSelectedDate(date)}
          >
            <span className="text-sm font-medium">{daysOfWeek[index]}</span>
            <span className="text-sm mt-1">{date}</span>
          </div>
        ))}
      </div>
    </div>
  );
};