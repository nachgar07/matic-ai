import { useState, useEffect } from "react";
import { Header } from "@/components/Layout/Header";
import { BottomNavigation } from "@/components/Layout/BottomNavigation";
import { WeeklyCalendar } from "@/components/WeeklyCalendar/WeeklyCalendar";
import { Button } from "@/components/ui/button";
import { CreateTaskDialog } from "@/components/CreateTaskDialog/CreateTaskDialog";
import { useGoals, useTasks } from "@/hooks/useGoals";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Calendar, Filter, Search, Settings } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export const Objetivos = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [user, setUser] = useState(null);

  const { data: tasks = [] } = useTasks(format(selectedDate, 'yyyy-MM-dd'));

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header 
        title="Hoy" 
        rightAction={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm">
              <Search size={16} />
            </Button>
            <Button variant="ghost" size="sm">
              <Filter size={16} />
            </Button>
            <Button variant="ghost" size="sm">
              <Calendar size={16} />
            </Button>
            <Button variant="ghost" size="sm">
              <Settings size={16} />
            </Button>
          </div>
        }
      />

      {/* Calendario Semanal */}
      <div className="px-4 py-2">
        <WeeklyCalendar 
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
        />
      </div>

      {/* Mostrar tareas para la fecha seleccionada */}
      <div className="px-4 pt-4">
        {tasks.length > 0 ? (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              Tareas para {format(selectedDate, "dd 'de' MMMM", { locale: es })}
            </h3>
            {tasks.map((task) => (
              <div key={task.id} className="bg-card p-3 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      task.is_completed 
                        ? 'bg-primary border-primary' 
                        : 'border-muted-foreground'
                    }`} />
                    <span className={task.is_completed ? 'line-through text-muted-foreground' : ''}>
                      {task.title}
                    </span>
                  </div>
                  {task.due_time && (
                    <span className="text-xs text-muted-foreground">
                      {task.due_time}
                    </span>
                  )}
                </div>
                {task.description && (
                  <p className="text-sm text-muted-foreground mt-2 ml-7">
                    {task.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* Estado vacío con icono de calendario */
          <div className="flex-1 flex items-center justify-center px-4">
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-6 bg-primary/10 rounded-2xl flex items-center justify-center">
                <Calendar className="text-primary" size={32} />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">No hay nada programado</h3>
              <p className="text-muted-foreground">
                Prueba agregar nuevas actividades
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Botón flotante para agregar */}
      <div className="fixed bottom-24 right-4">
        <CreateTaskDialog>
          <Button size="lg" className="rounded-full shadow-lg h-14 w-14">
            <Plus size={24} />
          </Button>
        </CreateTaskDialog>
      </div>

      <BottomNavigation />
    </div>
  );
};