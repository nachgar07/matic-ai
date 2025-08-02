import { useState, useEffect } from "react";
import { Header } from "@/components/Layout/Header";
import { BottomNavigation } from "@/components/Layout/BottomNavigation";
import { WeeklyCalendar } from "@/components/WeeklyCalendar/WeeklyCalendar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GoalCard } from "@/components/GoalCard/GoalCard";
import { TaskCard } from "@/components/TaskCard/TaskCard";
import { HabitTracker } from "@/components/HabitTracker/HabitTracker";
import { useGoals, useTasks, useGoalStats } from "@/hooks/useGoals";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Calendar, Target, BarChart3, List, Filter, Search, Settings, TrendingUp, Minus, TrendingDown } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export const Objetivos = () => {
  const [activeTab, setActiveTab] = useState('hoy');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [user, setUser] = useState(null);

  const { data: goals = [], isLoading: goalsLoading } = useGoals();
  const { data: tasks = [], isLoading: tasksLoading } = useTasks(format(selectedDate, 'yyyy-MM-dd'));
  const { data: stats } = useGoalStats();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  // Filtrar objetivos según frecuencia diaria para la vista de hábitos
  const dailyGoals = goals.filter(goal => goal.frequency === 'daily');
  const weeklyGoals = goals.filter(goal => goal.frequency === 'weekly');
  const allGoals = goals;

  // Filtrar tareas por estado
  const pendingTasks = tasks.filter(task => !task.is_completed);
  const completedTasks = tasks.filter(task => task.is_completed);

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
        <WeeklyCalendar />
      </div>

      {/* Navegación por pestañas */}
      <div className="px-4">
        <div className="flex gap-2 mb-4 overflow-x-auto">
          <Button 
            variant={activeTab === 'hoy' ? 'default' : 'ghost'} 
            size="sm"
            onClick={() => setActiveTab('hoy')}
          >
            Todo
          </Button>
          <Button 
            variant={activeTab === 'trabajo' ? 'default' : 'ghost'} 
            size="sm"
            onClick={() => setActiveTab('trabajo')}
            className="whitespace-nowrap"
          >
            💼 Trabajo
          </Button>
          <Button 
            variant={activeTab === 'compras' ? 'default' : 'ghost'} 
            size="sm"
            onClick={() => setActiveTab('compras')}
            className="whitespace-nowrap"
          >
            🛒 Compras
          </Button>
          <Button 
            variant={activeTab === 'objetivos' ? 'default' : 'ghost'} 
            size="sm"
            onClick={() => setActiveTab('objetivos')}
            className="whitespace-nowrap"
          >
            ⭐ Objetivos
          </Button>
        </div>
      </div>

      <div className="px-4 space-y-4">
        {/* Vista principal con tareas y hábitos mezclados */}
        {activeTab === 'hoy' && (
          <div className="space-y-4">
            {/* Hábitos del día */}
            {dailyGoals.length > 0 && (
              <div className="space-y-3">
                {dailyGoals.map((goal) => (
                  <HabitTracker key={goal.id} goal={goal} />
                ))}
              </div>
            )}

            {/* Tareas pendientes */}
            {pendingTasks.length > 0 && (
              <div className="space-y-3">
                {pendingTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            )}

            {/* Tareas completadas */}
            {completedTasks.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  ✅ Completadas ({completedTasks.length})
                </h3>
                {completedTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            )}

            {/* Estado vacío */}
            {pendingTasks.length === 0 && dailyGoals.length === 0 && (
              <div className="text-center py-12">
                <Target className="mx-auto mb-4 text-muted-foreground" size={48} />
                <h3 className="font-medium mb-2">¡Perfecto día!</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  No tienes tareas pendientes para hoy
                </p>
                <Button>
                  <Plus className="mr-2" size={16} />
                  Agregar tarea
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Vista de objetivos */}
        {activeTab === 'objetivos' && (
          <div className="space-y-4">
            {goals.length > 0 ? (
              goals.map((goal) => (
                <GoalCard 
                  key={goal.id} 
                  goal={goal} 
                  progress={Math.random() * 100} // Aquí iría el cálculo real del progreso
                  todayCompleted={Math.random() > 0.5} // Aquí iría el estado real
                />
              ))
            ) : (
              <div className="text-center py-12">
                <Target className="mx-auto mb-4 text-muted-foreground" size={48} />
                <h3 className="font-medium mb-2">No tienes objetivos</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Crea tu primer objetivo para comenzar
                </p>
                <Button>
                  <Plus className="mr-2" size={16} />
                  Crear objetivo
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Vista filtrada por categoría */}
        {activeTab !== 'hoy' && activeTab !== 'objetivos' && (
          <div className="space-y-4">
            {tasks
              .filter(task => task.category === activeTab)
              .map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            
            {tasks.filter(task => task.category === activeTab).length === 0 && (
              <div className="text-center py-12">
                <List className="mx-auto mb-4 text-muted-foreground" size={48} />
                <h3 className="font-medium mb-2">No hay tareas</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  No tienes tareas en esta categoría
                </p>
                <Button>
                  <Plus className="mr-2" size={16} />
                  Agregar tarea
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Botón flotante para agregar */}
        <div className="fixed bottom-24 right-4">
          <Button size="lg" className="rounded-full shadow-lg">
            <Plus size={24} />
          </Button>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};