import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

export type FrequencyType = 
  | "daily" 
  | "specific_weekdays" 
  | "specific_monthdays" 
  | "specific_yeardays" 
  | "repeat" 
  | "flexible";

export interface FrequencyData {
  type: FrequencyType;
  weekdays?: string[];
  monthdays?: number[];
  yeardays?: string[];
  repeatInterval?: number;
  repeatUnit?: string;
  isFlexible?: boolean;
  alternatedays?: boolean;
  useWeekdays?: boolean;
  monthdaysWeekdays?: { [key: number]: string[] };
}

interface FrequencySelectorProps {
  value: FrequencyData;
  onChange: (frequency: FrequencyData) => void;
}

const weekDays = [
  { value: "monday", label: "Lunes", short: "L" },
  { value: "tuesday", label: "Martes", short: "M" },
  { value: "wednesday", label: "Miércoles", short: "X" },
  { value: "thursday", label: "Jueves", short: "J" },
  { value: "friday", label: "Viernes", short: "V" },
  { value: "saturday", label: "Sábado", short: "S" },
  { value: "sunday", label: "Domingo", short: "D" },
];

const monthDays = Array.from({ length: 31 }, (_, i) => i + 1);

export const FrequencySelector = ({ value, onChange }: FrequencySelectorProps) => {
  const [selectedWeekdays, setSelectedWeekdays] = useState<string[]>(value.weekdays || []);
  const [selectedMonthdays, setSelectedMonthdays] = useState<number[]>(value.monthdays || []);
  const [selectedYeardays, setSelectedYeardays] = useState<string[]>(value.yeardays || []);
  const [weekdayDialogOpen, setWeekdayDialogOpen] = useState(false);
  const [selectedMonthday, setSelectedMonthday] = useState<number | null>(null);
  const [tempWeekdays, setTempWeekdays] = useState<string[]>([]);

  const handleFrequencyChange = (type: FrequencyType) => {
    const newValue: FrequencyData = {
      ...value,
      type,
      weekdays: type === "specific_weekdays" ? selectedWeekdays : undefined,
      monthdays: type === "specific_monthdays" ? selectedMonthdays : undefined,
      yeardays: type === "specific_yeardays" ? selectedYeardays : undefined,
      // Inicializar repeatInterval para tipo repeat
      repeatInterval: type === "repeat" ? (value.repeatInterval || 2) : undefined,
    };
    onChange(newValue);
  };

  const toggleWeekday = (day: string) => {
    const updated = selectedWeekdays.includes(day)
      ? selectedWeekdays.filter(d => d !== day)
      : [...selectedWeekdays, day];
    setSelectedWeekdays(updated);
    if (value.type === "specific_weekdays") {
      onChange({ ...value, weekdays: updated });
    }
  };

  const toggleMonthday = (day: number) => {
    if (value.useWeekdays) {
      // Open dialog to select weekdays for this monthday
      setSelectedMonthday(day);
      setTempWeekdays(value.monthdaysWeekdays?.[day] || []);
      setWeekdayDialogOpen(true);
    } else {
      const updated = selectedMonthdays.includes(day)
        ? selectedMonthdays.filter(d => d !== day)
        : [...selectedMonthdays, day];
      setSelectedMonthdays(updated);
      if (value.type === "specific_monthdays") {
        onChange({ ...value, monthdays: updated });
      }
    }
  };

  const handleWeekdayDialogAccept = () => {
    if (selectedMonthday === null) return;
    
    const updatedMonthdaysWeekdays = { ...value.monthdaysWeekdays };
    if (tempWeekdays.length > 0) {
      updatedMonthdaysWeekdays[selectedMonthday] = tempWeekdays;
      // Add monthday to selected if it has weekdays
      const updatedMonthdays = selectedMonthdays.includes(selectedMonthday) 
        ? selectedMonthdays 
        : [...selectedMonthdays, selectedMonthday];
      setSelectedMonthdays(updatedMonthdays);
      onChange({ 
        ...value, 
        monthdays: updatedMonthdays,
        monthdaysWeekdays: updatedMonthdaysWeekdays 
      });
    } else {
      // Remove monthday if no weekdays selected
      delete updatedMonthdaysWeekdays[selectedMonthday];
      const updatedMonthdays = selectedMonthdays.filter(d => d !== selectedMonthday);
      setSelectedMonthdays(updatedMonthdays);
      onChange({ 
        ...value, 
        monthdays: updatedMonthdays,
        monthdaysWeekdays: updatedMonthdaysWeekdays 
      });
    }
    setWeekdayDialogOpen(false);
    setSelectedMonthday(null);
  };

  const handleWeekdayDialogCancel = () => {
    setWeekdayDialogOpen(false);
    setSelectedMonthday(null);
    setTempWeekdays([]);
  };

  const toggleTempWeekday = (day: string) => {
    setTempWeekdays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const addYearday = () => {
    const updated = [...selectedYeardays, ""];
    setSelectedYeardays(updated);
    onChange({ ...value, yeardays: updated });
  };

  const removeYearday = (index: number) => {
    const updated = selectedYeardays.filter((_, i) => i !== index);
    setSelectedYeardays(updated);
    onChange({ ...value, yeardays: updated });
  };

  const updateYearday = (index: number, date: string) => {
    const updated = [...selectedYeardays];
    updated[index] = date;
    setSelectedYeardays(updated);
    onChange({ ...value, yeardays: updated });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {/* Todos los días */}
        <div className="flex items-center space-x-3">
          <div 
            className={cn(
              "w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer",
              value.type === "daily" ? "border-primary bg-primary" : "border-muted-foreground"
            )}
            onClick={() => handleFrequencyChange("daily")}
          >
            {value.type === "daily" && <div className="w-2 h-2 rounded-full bg-white" />}
          </div>
          <span 
            className={cn("text-base cursor-pointer", value.type === "daily" ? "text-foreground" : "text-muted-foreground")}
            onClick={() => handleFrequencyChange("daily")}
          >
            Todos los días
          </span>
        </div>

        {/* Días específicos de la semana */}
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <div 
              className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer",
                value.type === "specific_weekdays" ? "border-primary bg-primary" : "border-muted-foreground"
              )}
              onClick={() => handleFrequencyChange("specific_weekdays")}
            >
              {value.type === "specific_weekdays" && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
            <span 
              className={cn("text-base cursor-pointer", value.type === "specific_weekdays" ? "text-foreground" : "text-muted-foreground")}
              onClick={() => handleFrequencyChange("specific_weekdays")}
            >
              Días específicos de la semana
            </span>
          </div>

          {value.type === "specific_weekdays" && (
            <div className="grid grid-cols-3 gap-3 ml-8">
              {weekDays.map((day) => (
                <div key={day.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={day.value}
                    checked={selectedWeekdays.includes(day.value)}
                    onCheckedChange={() => toggleWeekday(day.value)}
                  />
                  <Label htmlFor={day.value} className="text-sm">{day.label}</Label>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Días específicos del mes */}
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <div 
              className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer",
                value.type === "specific_monthdays" ? "border-primary bg-primary" : "border-muted-foreground"
              )}
              onClick={() => handleFrequencyChange("specific_monthdays")}
            >
              {value.type === "specific_monthdays" && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
            <span 
              className={cn("text-base cursor-pointer", value.type === "specific_monthdays" ? "text-foreground" : "text-muted-foreground")}
              onClick={() => handleFrequencyChange("specific_monthdays")}
            >
              Días específicos del mes
            </span>
          </div>

          {value.type === "specific_monthdays" && (
            <div className="ml-8 space-y-4">
              <div className="grid grid-cols-7 gap-2">
                {monthDays.map((day) => (
                  <Button
                    key={day}
                    type="button"
                    variant={
                      value.useWeekdays 
                        ? (value.monthdaysWeekdays?.[day]?.length > 0 ? "default" : "outline")
                        : (selectedMonthdays.includes(day) ? "default" : "outline")
                    }
                    size="sm"
                    className="h-12 p-0"
                    onClick={() => toggleMonthday(day)}
                  >
                    {day}
                  </Button>
                ))}
                <Button
                  type="button"
                  variant={
                    value.useWeekdays 
                      ? (value.monthdaysWeekdays?.[32]?.length > 0 ? "default" : "outline")
                      : (selectedMonthdays.includes(32) ? "default" : "outline")
                  }
                  size="sm"
                  className="h-12 p-0"
                  onClick={() => toggleMonthday(32)}
                >
                  Último
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">Seleccione al menos un día</p>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="flexible" className="text-sm">Flexible</Label>
                  <Switch
                    id="flexible"
                    checked={value.isFlexible || false}
                    onCheckedChange={(checked) => onChange({ ...value, isFlexible: checked })}
                  />
                </div>
                <p className="text-sm text-muted-foreground">Se mostrará todos los días hasta que se complete.</p>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="weekdays" className="text-sm">Usar días de la semana</Label>
                  <Switch
                    id="weekdays"
                    checked={value.useWeekdays || false}
                    onCheckedChange={(checked) => onChange({ ...value, useWeekdays: checked })}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Días específicos del año */}
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <div 
              className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer",
                value.type === "specific_yeardays" ? "border-primary bg-primary" : "border-muted-foreground"
              )}
              onClick={() => handleFrequencyChange("specific_yeardays")}
            >
              {value.type === "specific_yeardays" && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
            <span 
              className={cn("text-base cursor-pointer", value.type === "specific_yeardays" ? "text-foreground" : "text-muted-foreground")}
              onClick={() => handleFrequencyChange("specific_yeardays")}
            >
              Días específicos del año
            </span>
          </div>

          {value.type === "specific_yeardays" && (
            <div className="ml-8 space-y-3">
              <p className="text-sm text-muted-foreground">Seleccione al menos un día</p>
              {selectedYeardays.map((date, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => updateYearday(index, e.target.value)}
                    className="flex-1"
                  />
                  {selectedYeardays.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeYearday(index)}
                    >
                      ×
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addYearday}
                className="w-16 h-16 rounded-lg bg-primary text-primary-foreground"
              >
                <Plus className="h-6 w-6" />
              </Button>
            </div>
          )}
        </div>


        {/* Repetir */}
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <div 
              className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer",
                value.type === "repeat" ? "border-primary bg-primary" : "border-muted-foreground"
              )}
              onClick={() => handleFrequencyChange("repeat")}
            >
              {value.type === "repeat" && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
            <span 
              className={cn("text-base cursor-pointer", value.type === "repeat" ? "text-foreground" : "text-muted-foreground")}
              onClick={() => handleFrequencyChange("repeat")}
            >
              Repetir
            </span>
          </div>

          {value.type === "repeat" && (
            <div className="ml-8 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm">Cada</span>
                <Input
                  type="number"
                  min="1"
                  value={value.repeatInterval || 2}
                  onChange={(e) => onChange({ ...value, repeatInterval: parseInt(e.target.value) || 2 })}
                  className="w-20"
                />
                <span className="text-sm">días</span>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="flexible-repeat" className="text-sm font-medium">Flexible</Label>
                    <p className="text-sm text-muted-foreground">Se mostrará todos los días hasta que se complete.</p>
                  </div>
                  <Switch
                    id="flexible-repeat"
                    checked={value.isFlexible || false}
                    onCheckedChange={(checked) => onChange({ ...value, isFlexible: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="alternate" className="text-sm">Alternar días</Label>
                  <Switch
                    id="alternate"
                    checked={value.alternatedays || false}
                    onCheckedChange={(checked) => onChange({ ...value, alternatedays: checked })}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Weekday Selection Dialog */}
      <Dialog open={weekdayDialogOpen} onOpenChange={setWeekdayDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Selecciona una fecha</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {weekDays.map((day, index) => (
                <div key={day.value} className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    {index === 6 ? "Último" : 
                     index === 5 ? "Sábado" : 
                     index === 0 ? "Primer" :
                     index === 1 ? "Domingo" :
                     index === 2 ? "Segundo" :
                     "Lunes"}
                  </p>
                  <Button
                    type="button"
                    variant={tempWeekdays.includes(day.value) ? "default" : "outline"}
                    className="w-full"
                    onClick={() => toggleTempWeekday(day.value)}
                  >
                    {day.short}
                  </Button>
                  <div className="mt-1 h-1 bg-muted rounded" />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            <Button variant="ghost" onClick={handleWeekdayDialogCancel}>
              CANCELAR
            </Button>
            <Button onClick={handleWeekdayDialogAccept}>
              ACEPTAR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};