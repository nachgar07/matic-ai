import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell, Plus, Clock, Check, X } from "lucide-react";
import { LocalNotifications } from '@capacitor/local-notifications';
import { toast } from "sonner";

interface ReminderPermissionsProps {
  isOpen: boolean;
  onClose: () => void;
  onReminderCreated: (reminderData: any) => void;
}

export const ReminderPermissions = ({ isOpen, onClose, onReminderCreated }: ReminderPermissionsProps) => {
  const [showNewReminder, setShowNewReminder] = useState(false);
  const [reminderTime, setReminderTime] = useState("12:00");
  const [reminderType, setReminderType] = useState("notification");
  const [reminderSchedule, setReminderSchedule] = useState("always");

  const handleCreateReminder = async () => {
    try {
      // Request permissions for notifications
      const permission = await LocalNotifications.requestPermissions();
      
      if (permission.display === 'granted') {
        const reminderData = {
          time: reminderTime,
          type: reminderType,
          schedule: reminderSchedule
        };

        // Schedule the notification if type is not 'none'
        if (reminderType !== 'none') {
          await scheduleNotification(reminderData);
        }

        onReminderCreated(reminderData);
        setShowNewReminder(false);
        onClose();
        toast.success("Recordatorio creado exitosamente");
      } else {
        toast.error("Se necesitan permisos de notificación para crear recordatorios");
      }
    } catch (error) {
      console.error('Error creating reminder:', error);
      toast.error("Error al crear el recordatorio");
    }
  };

  const scheduleNotification = async (reminderData: any) => {
    const [hours, minutes] = reminderData.time.split(':').map(Number);
    const now = new Date();
    const scheduledDate = new Date();
    scheduledDate.setHours(hours, minutes, 0, 0);
    
    // If the time has passed today, schedule for tomorrow
    if (scheduledDate <= now) {
      scheduledDate.setDate(scheduledDate.getDate() + 1);
    }

    await LocalNotifications.schedule({
      notifications: [
        {
          title: "Recordatorio de Tarea",
          body: "Es hora de completar tu tarea",
          id: Date.now(),
          schedule: { at: scheduledDate },
          sound: reminderData.type === 'alarm' ? 'default' : undefined,
          actionTypeId: "",
          extra: null
        }
      ]
    });
  };

  if (showNewReminder) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="bottom" className="h-[95vh] p-0 border-none">
          <div className="flex flex-col h-full bg-background">
            <SheetHeader className="flex flex-row items-center justify-between p-6 border-b">
              <SheetTitle className="text-xl font-bold text-foreground">
                Nueva Tarea
              </SheetTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Nuevo recordatorio */}
              <div className="text-center text-muted-foreground text-lg">
                Nuevo recordatorio
              </div>

              {/* Hora del recordatorio */}
              <div className="space-y-2">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="h-8 w-8 text-destructive" />
                    <Input
                      type="time"
                      value={reminderTime}
                      onChange={(e) => setReminderTime(e.target.value)}
                      className="font-medium text-lg border-none bg-transparent p-0 h-auto focus-visible:ring-0"
                    />
                  </div>
                </div>
                <div className="text-center text-destructive font-medium">
                  Hora del recordatorio
                </div>
              </div>

              {/* Tipo de recordatorio */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-4">
                  <Bell className="h-8 w-8 text-destructive" />
                  <span className="font-medium text-lg">Tipo de recordatorio</span>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div 
                    className={`flex flex-col items-center gap-2 p-4 border rounded-lg cursor-pointer ${
                      reminderType === 'none' ? 'bg-muted border-destructive' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setReminderType('none')}
                  >
                    <div className="text-4xl">🔕</div>
                    <span className="text-sm text-center">No recordar</span>
                  </div>

                  <div 
                    className={`flex flex-col items-center gap-2 p-4 border rounded-lg cursor-pointer ${
                      reminderType === 'notification' ? 'bg-destructive/10 border-destructive' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setReminderType('notification')}
                  >
                    <Bell className="h-8 w-8 text-destructive" />
                    <span className="text-sm text-center">Notificación</span>
                  </div>

                  <div 
                    className={`flex flex-col items-center gap-2 p-4 border rounded-lg cursor-pointer ${
                      reminderType === 'alarm' ? 'bg-muted border-destructive' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setReminderType('alarm')}
                  >
                    <div className="text-4xl">⏰</div>
                    <span className="text-sm text-center">Alarma</span>
                  </div>
                </div>
              </div>

              {/* Programación del recordatorio */}
              <div className="space-y-3">
                <div className="text-destructive font-medium">
                  Programación del recordatorio
                </div>

                <div className="space-y-3">
                  <div 
                    className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer ${
                      reminderSchedule === 'always' ? 'bg-destructive/10 border-destructive' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setReminderSchedule('always')}
                  >
                    <span className="font-medium text-lg">Siempre activo</span>
                    {reminderSchedule === 'always' && (
                      <div className="w-6 h-6 rounded-full bg-destructive flex items-center justify-center">
                        <div className="w-3 h-3 bg-white rounded-full"></div>
                      </div>
                    )}
                  </div>

                  <div 
                    className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer ${
                      reminderSchedule === 'specific_days' ? 'bg-destructive/10 border-destructive' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setReminderSchedule('specific_days')}
                  >
                    <span className="font-medium text-lg">Días específicos de la semana</span>
                    {reminderSchedule === 'specific_days' && (
                      <div className="w-6 h-6 rounded-full bg-destructive flex items-center justify-center">
                        <div className="w-3 h-3 bg-white rounded-full"></div>
                      </div>
                    )}
                  </div>

                  <div 
                    className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer ${
                      reminderSchedule === 'days_before' ? 'bg-destructive/10 border-destructive' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setReminderSchedule('days_before')}
                  >
                    <span className="font-medium text-lg">Días antes</span>
                    {reminderSchedule === 'days_before' && (
                      <div className="w-6 h-6 rounded-full bg-destructive flex items-center justify-center">
                        <div className="w-3 h-3 bg-white rounded-full"></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Botones fijos en la parte inferior */}
            <div className="p-6 border-t bg-background">
              <div className="flex gap-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowNewReminder(false)} 
                  className="flex-1 h-12 text-lg font-semibold"
                >
                  CANCELAR
                </Button>
                <Button 
                  onClick={handleCreateReminder}
                  className="flex-1 h-12 text-lg font-semibold bg-destructive hover:bg-destructive/90"
                >
                  CONFIRMAR
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[95vh] p-0 border-none">
        <div className="flex flex-col h-full bg-background">
          <SheetHeader className="flex flex-row items-center justify-between p-6 border-b">
            <SheetTitle className="text-xl font-bold text-foreground">
              Nueva Tarea
            </SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Categoría */}
            <div className="space-y-2">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-destructive flex items-center justify-center text-lg">
                    ⏰
                  </div>
                  <span className="font-medium text-lg">Categoría</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-destructive font-medium bg-destructive/10 px-3 py-1 rounded-full">
                    Tarea
                  </span>
                  <div className="w-8 h-8 rounded-full bg-destructive flex items-center justify-center">
                    <Clock className="h-4 w-4 text-white" />
                  </div>
                </div>
              </div>
            </div>

            {/* Hora y recordatorios */}
            <div className="space-y-4">
              <div className="text-center text-muted-foreground text-lg">
                Hora y recordatorios
              </div>

              {/* Permisos necesarios */}
              <div className="bg-destructive text-white p-4 rounded-lg text-center">
                <div className="font-semibold text-lg mb-2">Permisos necesarios</div>
              </div>

              {/* Ilustración de notificación */}
              <div className="flex justify-center py-8">
                <div className="relative">
                  <div className="w-20 h-20 bg-orange-400 rounded-2xl flex items-center justify-center text-2xl">
                    🔔
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <Plus className="h-3 w-3 text-white" />
                  </div>
                </div>
              </div>

              <div className="text-center text-muted-foreground">
                No hay recordatorios para la actividad
              </div>

              {/* Botón Nuevo Recordatorio */}
              <div className="flex justify-center">
                <Button
                  onClick={() => setShowNewReminder(true)}
                  variant="outline"
                  className="border-destructive text-destructive hover:bg-destructive/10"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  NUEVO RECORDATORIO
                </Button>
              </div>
            </div>
          </div>

          {/* Botón cerrar en la parte inferior */}
          <div className="p-6 bg-background">
            <Button 
              onClick={onClose}
              variant="outline"
              className="w-full h-12 text-lg font-semibold"
            >
              CERRAR
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};