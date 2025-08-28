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
import { es, enUS } from "date-fns/locale";
import { useLanguage } from "@/hooks/useLanguage";
import { translations } from "@/lib/translations";
import { isHabitActiveOnDate } from "@/utils/habitUtils";
export const Objetivos = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState<'tasks' | 'habits'>('tasks');
  const {
    language
  } = useLanguage();
  const t = (key: keyof typeof translations.es) => translations[language][key];
  const locale = language === 'es' ? es : enUS;
  const {
    data: tasks = []
  } = useTasks(format(selectedDate, 'yyyy-MM-dd'));
  const {
    data: goals = []
  } = useGoals();

  // Filtrar hábitos que deben mostrarse en la fecha seleccionada
  const activeHabitsForDate = goals.filter(goal => isHabitActiveOnDate(goal, selectedDate));

  // Función para obtener el título del header basado en la fecha seleccionada
  const getHeaderTitle = () => {
    const today = new Date();
    if (format(selectedDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
      return t('today');
    }
    return format(selectedDate, language === 'es' ? "dd 'de' MMMM" : "MMMM d", {
      locale
    });
  };
  useEffect(() => {
    const getUser = async () => {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);
  return <div className="min-h-screen bg-background pb-20">
      <Header title={getHeaderTitle()} rightAction={<div className="flex gap-2">
            
            
            
            
          </div>} />

      {/* Calendario Semanal */}
      <div className="px-4 py-2">
        <WeeklyCalendar selectedDate={selectedDate} onDateChange={setSelectedDate} />
      </div>

      {/* Tabs segmentadas Tareas / Hábitos */}
      <div className="px-4 py-4">
        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'tasks' | 'habits')} className="w-full">
          <div className="flex items-center justify-center">
            <TabsList className="rounded-full bg-muted p-1 grid grid-cols-2 w-[280px]">
              <TabsTrigger value="tasks" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm">
                {t('tasks')}
              </TabsTrigger>
              <TabsTrigger value="habits" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm">
                {t('habits')}
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="pt-4">
            <TabsContent value="tasks" className="m-0">
              {tasks.length > 0 || activeHabitsForDate.length > 0 ? <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    {t('tasksAndHabitsFor')} {format(selectedDate, language === 'es' ? "dd 'de' MMMM" : "MMMM d", {
                  locale
                })}
                  </h3>
                  {/* Tareas */}
                  {tasks.map(task => <TaskCard key={`task-${task.id}`} task={task} itemType="tarea" />)}
                  {/* Solo hábitos activos para la fecha seleccionada */}
                  {activeHabitsForDate.map(goal => <TaskCard key={`habit-${goal.id}`} task={{
                id: goal.id,
                title: goal.name,
                description: goal.description || '',
                category: goal.category,
                priority: goal.priority,
                is_completed: false,
                // Los hábitos no tienen estado completado simple
                is_recurring: true,
                due_date: format(selectedDate, 'yyyy-MM-dd'),
                due_time: null,
                created_at: goal.created_at,
                updated_at: goal.updated_at,
                user_id: goal.user_id,
                reminder_time: null
              }} itemType="hábito" isHabit={true} />)}
                </div> : <div className="flex-1 flex items-center justify-center px-4">
                  <div className="text-center py-16">
                    <div className="w-20 h-20 mx-auto mb-6 bg-primary/10 rounded-2xl flex items-center justify-center">
                      <Calendar className="text-primary" size={32} />
                    </div>
                    <h3 className="text-xl font-semibold mb-2 text-foreground">{t('noTasksOrHabits')}</h3>
                    <p className="text-muted-foreground">
                      {t('tryAddingNew')}
                    </p>
                  </div>
                </div>}
            </TabsContent>

            <TabsContent value="habits" className="m-0">
              {activeHabitsForDate.length > 0 ? <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    {t('activeHabitsFor')} {format(selectedDate, language === 'es' ? "dd 'de' MMMM" : "MMMM d", {
                  locale
                })}
                  </h3>
                  {activeHabitsForDate.map(goal => <HabitTracker key={goal.id} goal={goal} />)}
                </div> : <div className="flex-1 flex items-center justify-center px-4">
                  <div className="text-center py-16">
                    <div className="w-20 h-20 mx-auto mb-6 bg-secondary/10 rounded-2xl flex items-center justify-center">
                      <Calendar className="text-secondary" size={32} />
                    </div>
                    <h3 className="text-xl font-semibold mb-2 text-foreground">{t('noHabitsToday')}</h3>
                    <p className="text-muted-foreground">
                      {t('habitsOnlyScheduled')}
                    </p>
                  </div>
                </div>}
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
    </div>;
};