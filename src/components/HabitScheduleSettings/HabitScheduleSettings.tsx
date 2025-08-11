import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Clock, Flag, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ReminderPermissions } from "@/components/ReminderPermissions/ReminderPermissions";
import { PrioritySelector } from "@/components/PrioritySelector/PrioritySelector";
import { cn } from "@/lib/utils";
interface HabitScheduleSettingsProps {
  onBack: () => void;
  onFinish: (settings: HabitScheduleSettings) => void;
}
export interface HabitScheduleSettings {
  startDate: Date;
  endDate?: Date;
  hasEndDate: boolean;
  reminderCount: number;
  reminderData?: any;
  priorityScore: number;
}
export const HabitScheduleSettings = ({
  onBack,
  onFinish
}: HabitScheduleSettingsProps) => {
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>();
  const [hasEndDate, setHasEndDate] = useState(false);
  const [reminderCount, setReminderCount] = useState(0);
  const [reminderData, setReminderData] = useState<any>(null);
  const [priorityScore, setPriorityScore] = useState(1);
  const [showReminderPermissions, setShowReminderPermissions] = useState(false);
  const [showPrioritySelector, setShowPrioritySelector] = useState(false);
  const handleFinish = () => {
    onFinish({
      startDate,
      endDate: hasEndDate ? endDate : undefined,
      hasEndDate,
      reminderCount,
      reminderData,
      priorityScore
    });
  };
  const handleReminderCreated = (data: any) => {
    setReminderData(data);
    setReminderCount(1);
    setShowReminderPermissions(false);
  };
  const handleReminderClick = () => {
    setShowReminderPermissions(true);
  };
  const setToday = () => {
    setStartDate(new Date());
  };
  return <div className="space-y-6 p-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-primary mb-6">
          ¿Cuándo quieres hacerlo?
        </h2>
      </div>

      <div className="space-y-6">
        {/* Fecha de inicio */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <CalendarIcon className="w-4 h-4 text-primary" />
            </div>
            <span className="text-base">Fecha de inicio</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={setToday} className="text-primary bg-primary/20 hover:bg-primary/30">
              Hoy
            </Button>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  {format(startDate, "dd/MM/yyyy", {
                  locale: es
                })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar mode="single" selected={startDate} onSelect={date => date && setStartDate(date)} initialFocus className="pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Fecha de fin */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <CalendarIcon className="w-4 h-4 text-primary" />
            </div>
            <span className="text-base">Fecha de fin</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Switch checked={hasEndDate} onCheckedChange={checked => {
            setHasEndDate(checked);
            if (!checked) setEndDate(undefined);
          }} className="data-[state=checked]:bg-primary" />
            
            {hasEndDate && <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-muted-foreground">
                    {endDate ? format(endDate, "dd/MM/yyyy", {
                  locale: es
                }) : "Seleccionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar mode="single" selected={endDate} onSelect={setEndDate} disabled={date => date <= startDate} initialFocus className="pointer-events-auto" />
                </PopoverContent>
              </Popover>}
          </div>
        </div>

        {/* Hora y recordatorios */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Clock className="w-4 h-4 text-primary" />
            </div>
            <span className="text-base">Hora y recordatorios</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => reminderCount > 0 ? setReminderCount(prev => prev - 1) : null} disabled={reminderCount === 0} className="w-8 h-8 p-0 text-primary">
              <Minus className="w-4 h-4" />
            </Button>
            
            <Button onClick={handleReminderClick} className="w-12 h-8 rounded-lg bg-destructive hover:bg-destructive/90 flex items-center justify-center">
              <span className="text-sm font-medium text-white">{reminderCount}</span>
            </Button>
            
            <Button variant="ghost" size="sm" onClick={handleReminderClick} className="w-8 h-8 p-0 text-primary">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Prioridad */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Flag className="w-4 h-4 text-primary" />
            </div>
            <span className="text-base">Prioridad</span>
          </div>
          
          <Button variant="ghost" size="sm" onClick={() => setShowPrioritySelector(true)} className="text-muted-foreground">
            {priorityScore}
          </Button>
        </div>
      </div>

      {/* Botones de navegación */}
      <div className="flex items-center justify-between pt-8">
        <Button variant="ghost" onClick={onBack} className="text-foreground">
          ANTERIOR
        </Button>
        
        <div className="flex gap-1">
          
          
          
          
        </div>
        
        <Button onClick={handleFinish} className="bg-primary text-primary-foreground hover:bg-primary/90">
          FINALIZAR
        </Button>
      </div>

      {/* Modal de permisos de recordatorios */}
      <ReminderPermissions isOpen={showReminderPermissions} onClose={() => setShowReminderPermissions(false)} onReminderCreated={handleReminderCreated} />

      {/* Modal de selector de prioridad */}
      <PrioritySelector open={showPrioritySelector} onOpenChange={setShowPrioritySelector} value={priorityScore} onValueChange={setPriorityScore} />
    </div>;
};