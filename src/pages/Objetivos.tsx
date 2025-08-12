import { useState, useEffect } from "react";
import { Header } from "@/components/Layout/Header";
import { BottomNavigation } from "@/components/Layout/BottomNavigation";
import { WeeklyCalendar } from "@/components/WeeklyCalendar/WeeklyCalendar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CreateOptionsSheet } from "@/components/CreateOptionsSheet/CreateOptionsSheet";
import { TaskCard } from "@/components/TaskCard/TaskCard";
import { HabitTracker } from "@/components/HabitTracker/HabitTracker";
import { useGoals, useTasks } from "@/hooks/useGoals";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Calendar, Filter, Search, Settings } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { isHabitActiveOnDate } from "@/utils/habitUtils";

export const Objetivos = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState<'tasks' | 'habits'>('tasks');

  const { data: tasks = [] } = useTasks(format(selectedDate, 'yyyy-MM-dd'));
  const { data: goals = [] } = useGoals();

  // Filtrar hábitos que deben mostrarse en la fecha seleccionada
  const activeHabitsForDate = goals.filter(goal => isHabitActiveOnDate(goal, selectedDate));

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

      {/* Tabs segmentadas Tareas / Hábitos */}
      <div className="px-4 py-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'tasks' | 'habits')} className="w-full">
          <div className="flex items-center justify-center">
            <TabsList className="rounded-full bg-muted p-1 grid grid-cols-2 w-[280px]">
              <TabsTrigger value="tasks" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm">
                Tareas
              </TabsTrigger>
              <TabsTrigger value="habits" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm">
                Hábitos
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="pt-4">
            <TabsContent value="tasks" className="m-0">
              {(tasks.length > 0 || activeHabitsForDate.length > 0) ? (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Tareas y hábitos para {format(selectedDate, "dd 'de' MMMM", { locale: es })}
                  </h3>
                  {/* Tareas */}
                  {tasks.map((task) => (
                    <TaskCard key={`task-${task.id}`} task={task} itemType="tarea" />
                  ))}
                  {/* Solo hábitos activos para la fecha seleccionada */}
                  {activeHabitsForDate.map((goal) => (
                    <TaskCard 
                      key={`habit-${goal.id}`} 
                      task={{
                        id: goal.id,
                        title: goal.name,
                        description: goal.description || '',
                        category: goal.category,
                        priority: goal.priority,
                        is_completed: false, // Los hábitos no tienen estado completado simple
                        is_recurring: true,
                        due_date: format(selectedDate, 'yyyy-MM-dd'),
                        due_time: null,
                        created_at: goal.created_at,
                        updated_at: goal.updated_at,
                        user_id: goal.user_id,
                        reminder_time: null
                      }}
                      itemType="hábito"
                      isHabit={true}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center px-4">
                  <div className="text-center py-16">
                    <div className="w-20 h-20 mx-auto mb-6 bg-primary/10 rounded-2xl flex items-center justify-center">
                      <Calendar className="text-primary" size={32} />
                    </div>
                    <h3 className="text-xl font-semibold mb-2 text-foreground">No hay tareas o hábitos programados</h3>
                    <p className="text-muted-foreground">
                      Prueba agregar nuevas tareas o hábitos
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="habits" className="m-0">
              {activeHabitsForDate.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Hábitos activos para {format(selectedDate, "dd 'de' MMMM", { locale: es })}
                  </h3>
                  {activeHabitsForDate.map((goal) => (
                    <HabitTracker key={goal.id} goal={goal} />
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center px-4">
                  <div className="text-center py-16">
                    <div className="w-20 h-20 mx-auto mb-6 bg-secondary/10 rounded-2xl flex items-center justify-center">
                      <Calendar className="text-secondary" size={32} />
                    </div>
                    <h3 className="text-xl font-semibold mb-2 text-foreground">No hay hábitos para este día</h3>
                    <p className="text-muted-foreground">
                      Los hábitos se muestran solo en los días programados
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
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
