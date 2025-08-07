import { useState, useEffect } from "react";
import { Header } from "@/components/Layout/Header";
import { BottomNavigation } from "@/components/Layout/BottomNavigation";
import { WeeklyCalendar } from "@/components/WeeklyCalendar/WeeklyCalendar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CreateOptionsSheet } from "@/components/CreateOptionsSheet/CreateOptionsSheet";
import { TaskCard } from "@/components/TaskCard/TaskCard";
import { HabitTracker } from "@/components/HabitTracker/HabitTracker";
import { useGoals, useTasks } from "@/hooks/useGoals";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Calendar, Filter, Search, Settings } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export const Objetivos = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [user, setUser] = useState(null);
  const [showHabits, setShowHabits] = useState(false);

  const { data: tasks = [] } = useTasks(format(selectedDate, 'yyyy-MM-dd'));
  const { data: goals = [] } = useGoals();

  // Función para obtener el título del header basado en la fecha seleccionada
  const getHeaderTitle = () => {
    const today = new Date();
    if (format(selectedDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
      return 'Hoy';
    }
    return format(selectedDate, "dd 'de' MMMM", { locale: es });
  };

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
        title={getHeaderTitle()} 
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

      {/* Switch entre Tareas y Hábitos */}
      <div className="flex items-center justify-center px-4 py-4">
        <div className="flex items-center gap-4 bg-muted rounded-full p-1">
          <span className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${!showHabits ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}>
            Tareas
          </span>
          <Switch 
            checked={showHabits}
            onCheckedChange={setShowHabits}
          />
          <span className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${showHabits ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}>
            Hábitos
          </span>
        </div>
      </div>

      {/* Mostrar tareas o hábitos según el switch */}
      <div className="px-4 pt-4">
        {!showHabits ? (
          /* Vista de Tareas */
          tasks.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                Tareas para {format(selectedDate, "dd 'de' MMMM", { locale: es })}
              </h3>
              {tasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          ) : (
            /* Estado vacío para tareas */
            <div className="flex-1 flex items-center justify-center px-4">
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-6 bg-primary/10 rounded-2xl flex items-center justify-center">
                  <Calendar className="text-primary" size={32} />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-foreground">No hay tareas programadas</h3>
                <p className="text-muted-foreground">
                  Prueba agregar nuevas tareas
                </p>
              </div>
            </div>
          )
        ) : (
          /* Vista de Hábitos */
          goals.length > 0 ? (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Hábitos activos
              </h3>
              {goals.map((goal) => (
                <HabitTracker key={goal.id} goal={goal} />
              ))}
            </div>
          ) : (
            /* Estado vacío para hábitos */
            <div className="flex-1 flex items-center justify-center px-4">
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-6 bg-secondary/10 rounded-2xl flex items-center justify-center">
                  <Calendar className="text-secondary" size={32} />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-foreground">No hay hábitos configurados</h3>
                <p className="text-muted-foreground">
                  Prueba crear nuevos hábitos
                </p>
              </div>
            </div>
          )
        )}
      </div>

      {/* Botón flotante para agregar */}
      <div className="fixed bottom-24 right-4">
        <CreateOptionsSheet>
          <Button size="lg" className="rounded-full shadow-lg h-14 w-14">
            <Plus size={24} />
          </Button>
        </CreateOptionsSheet>
      </div>

      <BottomNavigation />
    </div>
  );
};