import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { CalendarIcon, Clock, Bell, ChevronRight, MessageSquare, X } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useCreateTask } from "@/hooks/useGoals";
import { cn } from "@/lib/utils";
import { CategorySelector } from "@/components/CategorySelector/CategorySelector";
import { ReminderPermissions } from "@/components/ReminderPermissions/ReminderPermissions";
import { PrioritySelector } from "@/components/PrioritySelector/PrioritySelector";

interface CreateTaskDialogProps {
  children: React.ReactNode;
}

const categories = [
  { value: "bad_habit", label: "Dejar un mal hábito", icon: "🚫", color: "#ef4444" },
  { value: "arte", label: "Arte", icon: "🎨", color: "#ec4899" },
  { value: "tarea", label: "Tarea", icon: "⏰", color: "#ec4899" },
  { value: "meditacion", label: "Meditación", icon: "🧘", color: "#a855f7" },
  { value: "estudio", label: "Estudio", icon: "🎓", color: "#8b5cf6" },
  { value: "deportes", label: "Deportes", icon: "🚴", color: "#3b82f6" },
  { value: "entretenimiento", label: "Entretenimiento", icon: "⭐", color: "#06b6d4" },
  { value: "social", label: "Social", icon: "💬", color: "#10b981" },
  { value: "finanzas", label: "Finanzas", icon: "$", color: "#22c55e" },
  { value: "salud", label: "Salud", icon: "➕", color: "#84cc16" },
  { value: "trabajo", label: "Trabajo", icon: "💼", color: "#a3a3a3" },
  { value: "nutricion", label: "Nutrición", icon: "🍽️", color: "#f59e0b" },
  { value: "hogar", label: "Hogar", icon: "🏠", color: "#f97316" },
  { value: "aire_libre", label: "Aire libre", icon: "⛰️", color: "#f97316" },
  { value: "otros", label: "Otros", icon: "🔲", color: "#ef4444" },
];

export const CreateTaskDialog = ({ children }: CreateTaskDialogProps) => {
  const [open, setOpen] = useState(false);
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [showReminderPermissions, setShowReminderPermissions] = useState(false);
  const [prioritySelectorOpen, setPrioritySelectorOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("tarea");
  const [priority, setPriority] = useState(3);
  const [dueDate, setDueDate] = useState<Date>();
  const [dueTime, setDueTime] = useState("");
  const [reminders, setReminders] = useState(0);
  const [notes, setNotes] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [reminderData, setReminderData] = useState<any>(null);

  const createTask = useCreateTask();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) return;

    try {
      await createTask.mutateAsync({
        title,
        description: description || undefined,
        category,
        priority,
        due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : undefined,
        due_time: dueTime || undefined,
        is_completed: false,
      });

      // Resetear formulario
      setTitle("");
      setDescription("");
      setCategory("tarea");
      setPriority(3);
      setDueDate(undefined);
      setDueTime("");
      setNotes("");
      setReminders(0);
      setIsRecurring(false);
      setOpen(false);
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleCategorySelect = (categoryValue: string) => {
    setCategory(categoryValue);
    setShowCategorySelector(false);
  };

  const handleReminderCreated = (reminder: any) => {
    setReminderData(reminder);
    setReminders(1);
    setShowReminderPermissions(false);
  };

  const selectedCategory = categories.find(cat => cat.value === category);

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          {children}
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[95vh] p-0 border-none">
          <div className="flex flex-col h-full bg-background">
            <SheetHeader className="flex flex-row items-center justify-between p-6 border-b">
              <SheetTitle className="text-xl font-bold text-foreground">
                Nueva Tarea
              </SheetTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Campo de título con borde rojo */}
                <div className="space-y-2">
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Tarea"
                    className="text-lg font-medium border-2 border-destructive rounded-lg p-4 bg-transparent"
                    required
                  />
                </div>

                {/* Categoría */}
                <div className="space-y-2">
                  <div 
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => setShowCategorySelector(true)}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-lg"
                        style={{ backgroundColor: selectedCategory?.color || "#ec4899" }}
                      >
                        {selectedCategory?.icon || "⏰"}
                      </div>
                      <span className="font-medium text-lg">Categoría</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-destructive font-medium bg-destructive/10 px-3 py-1 rounded-full">
                        {selectedCategory?.label || "Tarea"}
                      </span>
                      <div className="w-8 h-8 rounded-full bg-destructive flex items-center justify-center">
                        <Clock className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fecha */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <CalendarIcon className="h-8 w-8 text-destructive" />
                      <span className="font-medium text-lg">Fecha</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" className="text-destructive font-medium bg-destructive/10 px-3 py-1 rounded-full">
                            {dueDate ? format(dueDate, "dd/MM/yyyy", { locale: es }) : "Hoy"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={dueDate}
                            onSelect={setDueDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>

                {/* Hora y recordatorios */}
                <div className="space-y-2">
                  <div 
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => setShowReminderPermissions(true)}
                  >
                    <div className="flex items-center gap-3">
                      <Bell className="h-8 w-8 text-destructive" />
                      <span className="font-medium text-lg">Hora y recordatorios</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-destructive font-medium bg-destructive/10 px-3 py-1 rounded-full">
                        {reminders}
                      </span>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                </div>

                {/* Prioridad */}
                <div className="space-y-2">
                  <div 
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => setPrioritySelectorOpen(true)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-destructive flex items-center justify-center">
                        <div className="w-3 h-3 bg-white rounded"></div>
                      </div>
                      <span className="font-medium text-lg">Prioridad</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-destructive font-medium bg-destructive/10 px-3 py-1 rounded-full">
                        {priority >= 8 ? "Urgente" : priority >= 5 ? "Alta" : priority >= 3 ? "Normal" : "Baja"} - {priority}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Nota */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-4 border rounded-lg">
                    <MessageSquare className="h-8 w-8 text-destructive" />
                    <span className="font-medium text-lg">Nota</span>
                  </div>
                  {notes && (
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Añadir nota..."
                      rows={3}
                      className="resize-none"
                    />
                  )}
                </div>

                {/* Tarea pendiente */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <CalendarIcon className="h-8 w-8 text-destructive" />
                      <div>
                        <div className="font-medium text-lg">Tarea pendiente</div>
                        <div className="text-sm text-muted-foreground">
                          Se mostrará todos los días hasta que se complete.
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-destructive flex items-center justify-center">
                        <Switch 
                          checked={isRecurring} 
                          onCheckedChange={setIsRecurring}
                          className="scale-75"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Botones fijos en la parte inferior */}
            <div className="p-6 border-t bg-background">
              <div className="flex gap-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setOpen(false)} 
                  className="flex-1 h-12 text-lg font-semibold"
                >
                  CANCELAR
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={!title.trim() || createTask.isPending} 
                  className="flex-1 h-12 text-lg font-semibold bg-destructive hover:bg-destructive/90"
                >
                  CONFIRMAR
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <CategorySelector 
        isOpen={showCategorySelector}
        onClose={() => setShowCategorySelector(false)}
        onSelectCategory={handleCategorySelect}
      />

      <ReminderPermissions
        isOpen={showReminderPermissions}
        onClose={() => setShowReminderPermissions(false)}
        onReminderCreated={handleReminderCreated}
      />
      
      <PrioritySelector
        open={prioritySelectorOpen}
        onOpenChange={setPrioritySelectorOpen}
        value={priority}
        onValueChange={setPriority}
      />
    </>
  );
};