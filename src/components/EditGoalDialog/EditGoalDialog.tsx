import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Goal } from "@/hooks/useGoals";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const categories = [
  { value: "deportes", label: "Deportes", icon: "🏃" },
  { value: "salud", label: "Salud", icon: "💊" },
  { value: "trabajo", label: "Trabajo", icon: "💼" },
  { value: "personal", label: "Personal", icon: "👤" },
  { value: "educacion", label: "Educación", icon: "📚" },
  { value: "familia", label: "Familia", icon: "👨‍👩‍👧‍👦" },
];

const frequencies = [
  { value: "daily", label: "Todos los días" },
  { value: "weekly", label: "Semanal" },
  { value: "custom", label: "Personalizado" },
];

const weekDays = [
  { value: "monday", label: "Lun", short: "L" },
  { value: "tuesday", label: "Mar", short: "M" },
  { value: "wednesday", label: "Mié", short: "X" },
  { value: "thursday", label: "Jue", short: "J" },
  { value: "friday", label: "Vie", short: "V" },
  { value: "saturday", label: "Sáb", short: "S" },
  { value: "sunday", label: "Dom", short: "D" },
];

const priorities = [
  { value: 1, label: "Baja", color: "#10b981" },
  { value: 2, label: "Media", color: "#f59e0b" },
  { value: 3, label: "Alta", color: "#ef4444" },
];

interface EditGoalDialogProps {
  goal: Goal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditGoalDialog = ({ goal, open, onOpenChange }: EditGoalDialogProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState(1);
  const [frequency, setFrequency] = useState("daily");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [targetValue, setTargetValue] = useState(1);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [reminderTime, setReminderTime] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Llenar el formulario con los datos del objetivo
  useEffect(() => {
    if (goal && open) {
      setName(goal.name);
      setDescription(goal.description || "");
      setCategory(goal.category);
      setPriority(goal.priority);
      setFrequency(goal.frequency);
      setSelectedDays(goal.frequency_days || []);
      setTargetValue(goal.target_value);
      setStartDate(new Date(goal.start_date));
      setEndDate(goal.end_date ? new Date(goal.end_date) : undefined);
      setReminderTime("");
    }
  }, [goal, open]);

  const selectedCategory = categories.find(cat => cat.value === category);

  const toggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !category) return;

    setIsUpdating(true);
    
    try {
      const { error } = await supabase
        .from('goals')
        .update({
          name,
          description,
          category,
          icon: selectedCategory?.icon || goal.icon,
          color: priorities.find(p => p.value === priority)?.color || goal.color,
          priority,
          frequency: frequency as "daily" | "weekly" | "monthly" | "custom",
          frequency_days: frequency === "custom" ? selectedDays : null,
          target_value: targetValue,
          start_date: format(startDate, "yyyy-MM-dd"),
          end_date: endDate ? format(endDate, "yyyy-MM-dd") : null,
        })
        .eq('id', goal.id);

      if (error) throw error;

      toast({
        title: "Objetivo actualizado",
        description: "Los cambios se han guardado exitosamente.",
      });

      // Invalidar queries para actualizar la UI
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goal-progress'] });
      queryClient.invalidateQueries({ queryKey: ['goal-stats'] });
      
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating goal:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el objetivo. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar objetivo</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nombre del hábito */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-muted-foreground">
              ✏️ Nombre del hábito
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Salir a correr"
              required
            />
          </div>

          {/* Categoría */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-muted-foreground">
              🎯 Categoría
            </Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar categoría" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    <div className="flex items-center gap-2">
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-muted-foreground">
              ℹ️ Descripción
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción opcional..."
              rows={2}
            />
          </div>

          {/* Hora y recordatorios */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-muted-foreground">
              🔔 Hora y recordatorios
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="flex-1"
              />
              <Badge variant="secondary" className="min-w-8 h-8 rounded-full">
                {reminderTime ? "1" : "0"}
              </Badge>
            </div>
          </div>

          {/* Prioridad */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-muted-foreground">
              🏷️ Prioridad
            </Label>
            <div className="flex gap-2">
              {priorities.map((p) => (
                <Button
                  key={p.value}
                  type="button"
                  variant={priority === p.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPriority(p.value)}
                  className="flex-1"
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Frecuencia */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-muted-foreground">
              📅 Frecuencia
            </Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {frequencies.map((freq) => (
                  <SelectItem key={freq.value} value={freq.value}>
                    {freq.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {frequency === "custom" && (
              <div className="grid grid-cols-7 gap-1 mt-2">
                {weekDays.map((day) => (
                  <Button
                    key={day.value}
                    type="button"
                    variant={selectedDays.includes(day.value) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleDay(day.value)}
                    className="h-8 p-0"
                  >
                    {day.short}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Fecha de inicio */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-muted-foreground">
              📅 Fecha de inicio
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "dd/MM/yy", { locale: es }) : "Seleccionar fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => date && setStartDate(date)}
                  locale={es}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Fecha de fin */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-muted-foreground">
              📅 Fecha de fin
            </Label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "dd/MM/yy", { locale: es }) : "Sin fecha límite"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    locale={es}
                    disabled={(date) => date < startDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {endDate && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setEndDate(undefined)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Objetivo diario */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-muted-foreground">
              🎯 Objetivo diario
            </Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Al menos</span>
              <Input
                type="number"
                min="1"
                value={targetValue}
                onChange={(e) => setTargetValue(parseInt(e.target.value) || 1)}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">veces</span>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!name || !category || isUpdating}
              className="flex-1"
            >
              {isUpdating ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};