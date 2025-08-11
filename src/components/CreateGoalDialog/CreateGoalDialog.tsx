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
import { FrequencySelector, FrequencyData } from "@/components/FrequencySelector/FrequencySelector";
import { HabitScheduleSettings, HabitScheduleSettings as HabitScheduleSettingsType } from "@/components/HabitScheduleSettings/HabitScheduleSettings";

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
  onBack: () => void;
  onGoalCreated: () => void;
  category: string;
  evaluationType: EvaluationType | null;
}

export const CreateGoalDialog = ({ 
  isOpen, 
  onClose, 
  onBack,
  onGoalCreated, 
  category: initialCategory, 
  evaluationType 
}: CreateGoalDialogProps) => {
  // Estado del paso actual
  const [currentStep, setCurrentStep] = useState<'basic' | 'schedule'>('basic');
  
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
  
  // New state for advanced frequency selection (boolean evaluation type)
  const [frequencyData, setFrequencyData] = useState<FrequencyData>({
    type: "daily"
  });
  
  // Estado para configuración de horarios
  const [scheduleSettings, setScheduleSettings] = useState<HabitScheduleSettingsType | null>(null);

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

  // Función para avanzar al siguiente paso (solo para hábitos boolean)
  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (evaluationType === "boolean" && name.trim() && currentStep === 'basic') {
      setCurrentStep('schedule');
    }
  };

  // Función para volver al paso anterior
  const handleBack = () => {
    setCurrentStep('basic');
  };

  // Función para finalizar la creación del hábito
  const handleFinish = async (settings: HabitScheduleSettingsType) => {
    setScheduleSettings(settings);
    await createHabit(settings);
  };

  const createHabit = async (settings?: HabitScheduleSettingsType) => {
    if (!name || (!category && evaluationType !== "boolean")) return;

    // Use default category for boolean evaluation type if not set
    const finalCategory = category || (evaluationType === "boolean" ? "personal" : "");
    const finalSelectedCategory = categories.find(cat => cat.value === finalCategory);

    // Para hábitos boolean, usar la configuración de horarios si está disponible
    const finalStartDate = settings?.startDate || startDate;
    const finalEndDate = settings?.hasEndDate ? settings.endDate : endDate;
    const finalPriority = evaluationType === "boolean" && settings ? settings.priorityScore : priority;

    const goalData = {
      name,
      description,
      category: finalCategory,
      icon: finalSelectedCategory?.icon || "🎯",
      color: finalSelectedCategory?.color || priorities.find(p => p.value === finalPriority)?.color || "#6366f1",
      priority: finalPriority,
      frequency: (frequencyData.type === "daily" ? "daily" 
                 : frequencyData.type === "specific_weekdays" ? "custom"
                 : "custom") as "daily" | "weekly" | "custom" | "monthly",
      frequency_days: frequencyData.type === "specific_weekdays" ? frequencyData.weekdays 
                     : frequencyData.type === "specific_monthdays" ? frequencyData.monthdays?.map(String)
                     : frequencyData.type === "specific_yeardays" ? frequencyData.yeardays
                     : null,
      // Siempre guardar frequency_data para todos los hábitos
      frequency_data: JSON.stringify(frequencyData),
      target_value: targetValue,
      start_date: format(finalStartDate, "yyyy-MM-dd"),
      end_date: finalEndDate ? format(finalEndDate, "yyyy-MM-dd") : undefined,
      is_active: true,
    };

    const extendedGoalData = {
      ...goalData,
      // Only include fields that exist in the goals table
      target_value: evaluationType === "timer" ? targetValue : (evaluationType === "quantity" ? targetValue : 1),
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
      setFrequencyData({ type: "daily" });
      setCurrentStep('basic');
      setScheduleSettings(null);
    } catch (error) {
      console.error("Error creating goal:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Para hábitos boolean, usamos el flujo de dos pasos
    if (evaluationType === "boolean") {
      if (currentStep === 'basic') {
        handleContinue(e);
      }
      return;
    }
    
    // Para otros tipos, usar el flujo normal
    await createHabit();
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
      <DialogContent className="max-w-full sm:max-w-md h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto bg-gradient-to-b from-background to-muted/20 m-0 sm:m-4 rounded-none sm:rounded-lg p-0">
        
        {/* Para hábitos boolean en paso de configuración adicional */}
        {evaluationType === "boolean" && currentStep === "schedule" ? (
          <HabitScheduleSettings
            onBack={handleBack}
            onFinish={handleFinish}
          />
        ) : (
          /* Configuración básica */
          <>
            <DialogHeader className="relative pb-4 sm:pb-6 px-4 sm:px-6">
              <Button 
                variant="ghost" 
                size="icon"
                className="absolute left-4 top-4 h-10 w-10 z-10"
                onClick={onBack}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <DialogTitle className="text-center text-lg sm:text-xl pt-4 px-8">
                Crear nuevo hábito
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 px-4 sm:px-6 pb-4 sm:pb-6">
              {/* Campos iniciales para evaluación boolean */}
              {evaluationType === "boolean" && (
                <>
                  {/* Nombre del hábito */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-muted-foreground text-sm">
                      ✏️ Nombre del hábito
                    </Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Salir a correr"
                      required
                      className="text-base"
                    />
                  </div>

                  {/* Descripción */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-muted-foreground text-sm">
                      ℹ️ Descripción (opcional)
                    </Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Descripción opcional..."
                      rows={2}
                      className="text-base resize-none"
                    />
                  </div>

                  {/* Frecuencia avanzada */}
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2 text-muted-foreground text-sm">
                      📅 ¿Con qué frecuencia quieres realizarlo?
                    </Label>
                    <FrequencySelector
                      value={frequencyData}
                      onChange={setFrequencyData}
                    />
                  </div>
                </>
              )}

              {/* Resto de campos para otros tipos de evaluación */}
              {evaluationType !== "boolean" && (
                <>
                  {/* Nombre del hábito */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-muted-foreground text-sm">
                      ✏️ Nombre del hábito
                    </Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Salir a correr"
                      required
                      className="text-base"
                    />
                  </div>

                  {/* Categoría */}
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2 text-muted-foreground text-sm">
                      🎯 Categoría
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                      {categories.map((cat) => (
                        <Button
                          key={cat.value}
                          type="button"
                          variant="outline"
                          onClick={() => setCategory(cat.value)}
                          className={cn(
                            "h-16 sm:h-20 flex flex-col gap-1 border-2 transition-all text-xs",
                            category === cat.value 
                              ? "border-primary bg-primary/5" 
                              : "border-border hover:border-primary/30"
                          )}
                        >
                          <div 
                            className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-sm sm:text-lg"
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
                    <Label className="flex items-center gap-2 text-muted-foreground text-sm">
                      ℹ️ Descripción
                    </Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Descripción opcional..."
                      rows={2}
                      className="text-base resize-none"
                    />
                  </div>

                  {/* Frecuencia avanzada para todos los tipos */}
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2 text-muted-foreground text-sm">
                      📅 ¿Con qué frecuencia quieres realizarlo?
                    </Label>
                    <FrequencySelector
                      value={frequencyData}
                      onChange={setFrequencyData}
                    />
                  </div>
                </>
              )}

              {/* Campos específicos para tipos no boolean */}
              {evaluationType !== "boolean" && (
                <>
                  {/* Hora y recordatorios */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-muted-foreground text-sm">
                      🔔 Hora y recordatorios
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={reminderTime}
                        onChange={(e) => setReminderTime(e.target.value)}
                        className="flex-1 text-base"
                      />
                      <Badge variant="secondary" className="min-w-8 h-8 rounded-full text-sm">
                        {reminderTime ? "1" : "0"}
                      </Badge>
                    </div>
                  </div>

                  {/* Prioridad */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-muted-foreground text-sm">
                      🏷️ Prioridad
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      {priorities.map((p) => (
                        <Button
                          key={p.value}
                          type="button"
                          variant={priority === p.value ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPriority(p.value)}
                          className="text-sm"
                        >
                          {p.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Fechas */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Fecha de inicio */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-muted-foreground text-sm">
                        📅 Fecha de inicio
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal text-sm",
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
                      <Label className="flex items-center gap-2 text-muted-foreground text-sm">
                        📅 Fecha de fin
                      </Label>
                      <div className="flex gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "flex-1 justify-start text-left font-normal text-sm",
                                !endDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {endDate ? format(endDate, "dd/MM/yy", { locale: es }) : "Sin límite"}
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
                  </div>
                </>
              )}

              {/* Objetivo diario - Solo para tipos no boolean */}
              {evaluationType !== "boolean" && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-muted-foreground text-sm">
                    🎯 Objetivo diario
                  </Label>
                  
                  {evaluationType === "quantity" && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Al menos</span>
                      <Input
                        type="number"
                        min="1"
                        value={targetValue}
                        onChange={(e) => setTargetValue(parseInt(e.target.value) || 1)}
                        className="w-20 text-base"
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
                        className="w-20 text-base"
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
                            className="flex-1 text-base"
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
              )}

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
                  disabled={!name || (!category && evaluationType !== "boolean") || createGoal.isPending || (evaluationType === "activities" && activities.every(a => !a.trim()))}
                  className="flex-1"
                >
                  {createGoal.isPending 
                    ? "Creando..." 
                    : evaluationType === "boolean" && currentStep === "basic" 
                      ? "Continuar" 
                      : "Crear hábito"
                  }
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};