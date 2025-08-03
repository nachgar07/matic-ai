import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { CalendarIcon, Clock, Bell, ChevronRight, CheckSquare, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useCreateTask } from "@/hooks/useGoals";
import { cn } from "@/lib/utils";

interface CreateTaskDialogProps {
  children: React.ReactNode;
}

export const CreateTaskDialog = ({ children }: CreateTaskDialogProps) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("personal");
  const [priority, setPriority] = useState(3);
  const [dueDate, setDueDate] = useState<Date>();
  const [dueTime, setDueTime] = useState("");
  const [reminders, setReminders] = useState(0);
  const [notes, setNotes] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);

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
      setCategory("personal");
      setPriority(3);
      setDueDate(undefined);
      setDueTime("");
      setOpen(false);
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const categories = [
    { value: "personal", label: "Personal", icon: "👤" },
    { value: "trabajo", label: "Trabajo", icon: "💼" },
    { value: "compras", label: "Compras", icon: "🛒" },
    { value: "salud", label: "Salud", icon: "🏥" },
    { value: "hogar", label: "Hogar", icon: "🏠" },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Nueva Tarea</DialogTitle>
          <DialogDescription>
            Completa los detalles para crear una nueva tarea
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Terminar reporte"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción opcional..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 flex items-center justify-center">
                  <div className="w-3 h-3 bg-destructive rounded"></div>
                </div>
                <span className="font-medium">Categoría</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-destructive font-medium">
                  {categories.find(cat => cat.value === category)?.label || "Tarea"}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha límite</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP", { locale: es }) : "Seleccionar fecha"}
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

            <div className="space-y-2">
              <Label>Hora</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Hora y recordatorios */}
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-destructive" />
                <span className="font-medium">Hora y recordatorios</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{reminders}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </div>

          {/* Sub-items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
              <div className="flex items-center gap-3">
                <CheckSquare className="h-5 w-5 text-destructive" />
                <div>
                  <div className="font-medium">Sub-ítems</div>
                  <div className="text-xs text-destructive">Funcionalidad premium</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">0</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </div>

          {/* Prioridad - Updated to match design */}
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 flex items-center justify-center">
                  <div className="w-3 h-3 bg-destructive rounded"></div>
                </div>
                <span className="font-medium">Prioridad</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {priority === 1 ? "Baja" : priority === 3 ? "Normal" : priority === 5 ? "Alta" : "Urgente"}
                </span>
              </div>
            </div>
          </div>

          {/* Nota */}
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <MessageSquare className="h-5 w-5 text-destructive" />
              <span className="font-medium">Nota</span>
            </div>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Añadir nota..."
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Tarea pendiente - Recurring toggle */}
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <CalendarIcon className="h-5 w-5 text-destructive" />
                <div>
                  <div className="font-medium">Tarea pendiente</div>
                  <div className="text-xs text-muted-foreground">Se mostrará todos los días hasta que se complete.</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch 
                  checked={isRecurring} 
                  onCheckedChange={setIsRecurring}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={!title.trim() || createTask.isPending} className="flex-1">
              {createTask.isPending ? "Creando..." : "Crear Tarea"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};