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
import { useCreateGoal } from "@/hooks/useGoals";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Plus, Trash2, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { EvaluationType } from "@/components/ProgressEvaluationSelector/ProgressEvaluationSelector";

const categories = [
  { value: "deportes", label: "Deportes", icon: "🏃", color: "#ef4444" },
  { value: "salud", label: "Salud", icon: "💊", color: "#10b981" },
  { value: "trabajo", label: "Trabajo", icon: "💼", color: "#3b82f6" },
  { value: "personal", label: "Personal", icon: "👤", color: "#8b5cf6" },
  { value: "educacion", label: "Educación", icon: "📚", color: "#f59e0b" },
  { value: "familia", label: "Familia", icon: "👨‍👩‍👧‍👦", color: "#ec4899" },
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

interface CreateGoalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onGoalCreated: () => void;
  category: string;
  evaluationType: EvaluationType | null;
}

export const CreateGoalDialog = ({ 
  isOpen, 
  onClose, 
  onGoalCreated, 
  category: initialCategory, 
  evaluationType 
}: CreateGoalDialogProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(initialCategory || "");
  const [priority, setPriority] = useState(1);
  const [frequency, setFrequency] = useState("daily");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [targetValue, setTargetValue] = useState(1);
  const [targetUnit, setTargetUnit] = useState("veces");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [reminderTime, setReminderTime] = useState("");
  const [activities, setActivities] = useState<string[]>([""]);

  useEffect(() => {
    if (initialCategory) {
      setCategory(initialCategory);
    }
  }, [initialCategory]);

  const createGoal = useCreateGoal();

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

    const goalData = {
      name,
      description,
      category,
      icon: selectedCategory?.icon || "🎯",
      color: selectedCategory?.color || priorities.find(p => p.value === priority)?.color || "#6366f1",
      priority,
      frequency: frequency as "daily" | "weekly" | "monthly" | "custom",
      frequency_days: frequency === "custom" ? selectedDays : null,
      target_value: targetValue,
      start_date: format(startDate, "yyyy-MM-dd"),
      end_date: endDate ? format(endDate, "yyyy-MM-dd") : undefined,
      is_active: true,
    };

    const extendedGoalData = {
      ...goalData,
      evaluation_type: evaluationType || "boolean",
      target_unit: evaluationType === "timer" ? "minutos" : targetUnit,
      activities: evaluationType === "activities" ? activities.filter(a => a.trim()) : null,
    };

    try {
      await createGoal.mutateAsync(extendedGoalData);
      onGoalCreated();
      // Reset form
      setName("");
      setDescription("");
      setCategory("");
      setPriority(1);
      setFrequency("daily");
      setSelectedDays([]);
      setTargetValue(1);
      setTargetUnit("veces");
      setStartDate(new Date());
      setEndDate(undefined);
      setReminderTime("");
      setActivities([""]);
    } catch (error) {
      console.error("Error creating goal:", error);
    }
  };

  const getEvaluationTypeLabel = () => {
    switch (evaluationType) {
      case "boolean": return "Sí/No";
      case "quantity": return "Cantidad";
      case "timer": return "Tiempo";
      case "activities": return "Lista de actividades";
      default: return "Sí/No";
    }
  };

  const addActivity = () => {
    setActivities([...activities, ""]);
  };

  const removeActivity = (index: number) => {
    if (activities.length > 1) {
      setActivities(activities.filter((_, i) => i !== index));
    }
  };

  const updateActivity = (index: number, value: string) => {
    const updated = [...activities];
    updated[index] = value;
    setActivities(updated);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader className="relative">
          <Button 
            variant="ghost" 
            size="icon"
            className="absolute left-0 top-0 h-8 w-8"
            onClick={onClose}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <DialogTitle className="text-center">
            Crear nuevo hábito - {getEvaluationTypeLabel()}
          </DialogTitle>
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
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-muted-foreground">
              🎯 Categoría
            </Label>
            <div className="grid grid-cols-3 gap-3">
              {categories.map((cat) => (
                <Button
                  key={cat.value}
                  type="button"
                  variant="outline"
                  onClick={() => setCategory(cat.value)}
                  className={cn(
                    "h-20 flex flex-col gap-1 border-2 transition-all",
                    category === cat.value 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/30"
                  )}
                >
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
                    style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                  >
                    {cat.icon}
                  </div>
                  <span className="text-xs font-medium">{cat.label}</span>
                </Button>
              ))}
            </div>
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
            
            {evaluationType === "boolean" && (
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Marcará como completado con un simple Sí/No cada día
                </p>
              </div>
            )}

            {evaluationType === "quantity" && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Al menos</span>
                <Input
                  type="number"
                  min="1"
                  value={targetValue}
                  onChange={(e) => setTargetValue(parseInt(e.target.value) || 1)}
                  className="w-20"
                />
                <Select value={targetUnit} onValueChange={setTargetUnit}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="veces">veces</SelectItem>
                    <SelectItem value="páginas">páginas</SelectItem>
                    <SelectItem value="vasos">vasos</SelectItem>
                    <SelectItem value="km">km</SelectItem>
                    <SelectItem value="repeticiones">reps</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {evaluationType === "timer" && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Al menos</span>
                <Input
                  type="number"
                  min="1"
                  value={targetValue}
                  onChange={(e) => setTargetValue(parseInt(e.target.value) || 1)}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">minutos</span>
              </div>
            )}

            {evaluationType === "activities" && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Define las sub-actividades para evaluar tu progreso:
                </p>
                {activities.map((activity, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={activity}
                      onChange={(e) => updateActivity(index, e.target.value)}
                      placeholder={`Actividad ${index + 1}`}
                      className="flex-1"
                    />
                    {activities.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeActivity(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addActivity}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar actividad
                </Button>
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                  <p className="text-sm text-rose-700 font-medium">
                    ⭐ Funcionalidad Premium
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!name || !category || createGoal.isPending || (evaluationType === "activities" && activities.every(a => !a.trim()))}
              className="flex-1"
            >
              {createGoal.isPending ? "Creando..." : "Crear hábito"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};