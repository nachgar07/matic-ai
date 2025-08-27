import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CalorieRing } from "@/components/CalorieRing/CalorieRing";
import { WeeklyCalendar } from "@/components/WeeklyCalendar/WeeklyCalendar";
import { MacroCard } from "@/components/MacroCard/MacroCard";
import { BottomNavigation } from "@/components/Layout/BottomNavigation";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { User, Session } from '@supabase/supabase-js';
import { useUserMeals, useUserMealsForDateRange, useNutritionGoals } from "@/hooks/useFatSecret";
import { useWaterIntake } from "@/hooks/useWaterIntake";
import { useGoals, useTasks } from "@/hooks/useGoals";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { useLanguage } from "@/hooks/useLanguage";
import { translations } from "@/lib/translations";
import { isHabitActiveOnDate } from "@/utils/habitUtils";
import { useExpenses } from "@/hooks/useExpenses";
import { TermsAcceptanceModal } from "@/components/TermsAcceptanceModal/TermsAcceptanceModal";

export const Home = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [authInitialized, setAuthInitialized] = useState(false);
  
  const { language } = useLanguage();
  const t = (key: keyof typeof translations.es) => translations[language][key];
  const locale = language === 'es' ? es : enUS;

  // Only fetch data when user is fully authenticated and initialized
  const selectedDateString = format(selectedDate, 'yyyy-MM-dd');
  const shouldFetchData = authInitialized && !loading && !!session && !!user;
  
  // Get meal data for the selected date (only when authenticated)
  const {
    data: mealsData,
    isLoading: mealsLoading
  } = useUserMeals(shouldFetchData ? selectedDateString : undefined);
  
  // Get meals for date range (for calendar) (only when authenticated)  
  const startDate = format(new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
  const endDate = format(new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
  const {
    data: mealsRangeData,
    isLoading: mealsRangeLoading
  } = useUserMealsForDateRange(
    shouldFetchData ? startDate : '', 
    shouldFetchData ? endDate : ''
  );
  
  // Only fetch nutrition goals, water, tasks, etc when authenticated
  const { data: nutritionGoals } = useNutritionGoals();
  const { waterGlasses } = useWaterIntake();
  const { data: tasks = [] } = useTasks(shouldFetchData ? format(selectedDate, 'yyyy-MM-dd') : '');
  const { data: goals = [] } = useGoals();
  
  // Filter active habits for selected date
  const activeHabitsForDate = goals.filter(goal => isHabitActiveOnDate(goal, selectedDate));

  // Get expenses for selected date (only when authenticated)
  const { expenses, chartData, totalAmount, loading: expensesLoading } = useExpenses(
    shouldFetchData ? selectedDate : null
  );

  // Terms acceptance - only initialize when user is ready
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState<boolean | null>(null);
  const [checkingTerms, setCheckingTerms] = useState(false);

  // Calculate real values from meal data
  const dailyTotals = mealsData?.dailyTotals || {
    calories: 0,
    carbs: 0,
    protein: 0,
    fat: 0
  };
  const caloriesConsumed = Math.round(dailyTotals.calories);
  const caloriesTarget = nutritionGoals?.daily_calories || 2586;
  const steps = 0; // Still mock data - not implemented
  const activeCalories = 0; // Still mock data - not implemented

  useEffect(() => {
    // Set up auth state listener
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      setAuthInitialized(true);
    });

    // Check for existing session
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      setAuthInitialized(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Check terms acceptance when user is ready
  useEffect(() => {
    if (user && !checkingTerms && hasAcceptedTerms === null) {
      setCheckingTerms(true);
      checkUserTerms();
    }
  }, [user, checkingTerms, hasAcceptedTerms]);

  const checkUserTerms = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_terms_acceptance')
        .select('*')
        .eq('user_id', user.id)
        .eq('terms_version', '2025-08-26')
        .eq('privacy_version', '2025-08-26')
        .maybeSingle();

      if (error) {
        console.error('Error checking terms acceptance:', error);
        setHasAcceptedTerms(false);
      } else {
        setHasAcceptedTerms(!!data);
      }
    } catch (error) {
      console.error('Network error checking terms acceptance:', error);
      setHasAcceptedTerms(false);
    } finally {
      setCheckingTerms(false);
    }
  };

  const handleSignOut = async () => {
    try {
      // Clean up auth state including problematic URLs
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-') || key.includes('sueosblancos') || key.includes('blanqueria') || key.includes('xn--')) {
          localStorage.removeItem(key);
          console.log('🧹 Removed key during logout:', key);
        }
      });

      // Clean sessionStorage too
      Object.keys(sessionStorage || {}).forEach(key => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-') || key.includes('sueosblancos') || key.includes('blanqueria') || key.includes('xn--')) {
          sessionStorage.removeItem(key);
          console.log('🧹 Removed sessionStorage key during logout:', key);
        }
      });

      // Clean problematic cookies
      document.cookie.split(";").forEach(function (c) {
        const cookie = c.trim();
        if (cookie.includes('sueosblancos') || cookie.includes('blanqueria') || cookie.includes('xn--')) {
          const eqPos = cookie.indexOf("=");
          const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
          document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
          console.log('🧹 Removed problematic cookie during logout:', name);
        }
      });

      // Attempt global sign out
      try {
        await supabase.auth.signOut({
          scope: 'global'
        });
      } catch (err) {
        console.error('Global sign out failed:', err);
      }

      // Force page reload for a clean state
      window.location.href = '/auth';
    } catch (error) {
      console.error('Error signing out:', error);
      window.location.href = '/auth';
    }
  };

  // Show loading while checking auth or loading meal data 
  if (loading || mealsLoading || checkingTerms) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-muted-foreground">{t('loading')}</div>
        </div>
      </div>;
  }

  // Redirect to auth if not logged in
  if (!session || !user) {
    window.location.href = '/auth';
    return null;
  }

  // Handle terms acceptance
  const handleAcceptTerms = async () => {
    if (!user) return;
    
    setCheckingTerms(true);
    try {
      const { error } = await supabase
        .from('user_terms_acceptance')
        .upsert({
          user_id: user.id,
          terms_version: '2025-08-26',
          privacy_version: '2025-08-26',
          ip_address: null,
          user_agent: navigator.userAgent
        });

      if (error) {
        console.error('Error accepting terms:', error);
      } else {
        setHasAcceptedTerms(true);
      }
    } catch (error) {
      console.error('Network error accepting terms:', error);
    } finally {
      setCheckingTerms(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Matic AI</h1>
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
        <WeeklyCalendar 
          selectedDate={selectedDate} 
          onDateChange={setSelectedDate}
          mealsData={mealsData}
          mealsRangeData={mealsRangeData}
          tasksCount={tasks.length + activeHabitsForDate.length}
          expensesCount={expenses.length}
        />
      </div>

      {/* Main Calorie Ring */}
      <div className="px-4 py-6 flex justify-center">
        <CalorieRing 
          consumed={caloriesConsumed} 
          target={caloriesTarget} 
          protein={Math.round(dailyTotals.protein)} 
          carbs={Math.round(dailyTotals.carbs)} 
          fat={Math.round(dailyTotals.fat)} 
          size={220} 
          waterGlasses={waterGlasses} 
          simple={true} 
          waterTarget={nutritionGoals?.daily_water_glasses || 12} 
        />
      </div>

      {/* Macronutrients */}
      <div className="px-4 mb-6">
        <div className="flex gap-3">
          <MacroCard icon="🥩" label={t('protein')} current={Math.round(dailyTotals.protein)} target={nutritionGoals?.daily_protein || 129} unit="g" />
          <MacroCard icon="🍞" label={t('carbohydrates')} current={Math.round(dailyTotals.carbs)} target={nutritionGoals?.daily_carbs || 323} unit="g" />
          <MacroCard icon="🥑" label={t('fats')} current={Math.round(dailyTotals.fat)} target={nutritionGoals?.daily_fat || 86} unit="g" />
        </div>
      </div>

      {/* Daily Tasks Section */}
      <div className="px-4">
        <h2 className="text-xl font-bold mb-4">
          {t('tasksOf')} {format(selectedDate, language === 'es' ? "dd 'de' MMMM" : "MMMM d", { locale })}
        </h2>
        
        {(tasks.length > 0 || activeHabitsForDate.length > 0) ? (
          <div className="space-y-3">
            {/* Upcoming Tasks Summary */}
            <div className="bg-card rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-foreground">{t('dailySummaryText')}</h3>
                <span className="text-sm text-muted-foreground">
                  {tasks.length + activeHabitsForDate.length} {t('activities')}
                </span>
              </div>
              
              <div className="space-y-2">
                {/* Tasks */}
                {tasks.slice(0, 3).map((task) => {
                  // Categorías de tareas con iconos originales
                  const categories = [
                    { value: "ejercicio", label: "Ejercicio", icon: "🏋️‍♂️", color: "#8b5cf6" },
                    { value: "salud", label: "Salud", icon: "🏥", color: "#10b981" },
                    { value: "educacion", label: "Educación", icon: "📚", color: "#3b82f6" },
                    { value: "trabajo", label: "Trabajo", icon: "💼", color: "#a3a3a3" },
                    { value: "nutricion", label: "Nutrición", icon: "🍽️", color: "#f59e0b" },
                    { value: "hogar", label: "Hogar", icon: "🏠", color: "#f97316" },
                    { value: "aire_libre", label: "Aire libre", icon: "⛰️", color: "#f97316" },
                    { value: "otros", label: "Otros", icon: "🔲", color: "#ef4444" },
                    { value: "personal", label: "Personal", icon: "👤", color: "#ec4899" },
                    { value: "compras", label: "Compras", icon: "🛒", color: "#f59e0b" },
                  ];
                  
                  const categoryData = categories.find(cat => cat.value === task.category) || 
                    { icon: "📝", color: "#6b7280", label: "Otros" };

                  return (
                    <div key={task.id} className="flex items-center gap-3 py-2">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                        style={{ backgroundColor: categoryData.color }}
                      >
                        {categoryData.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${
                          task.is_completed ? 'line-through text-muted-foreground' : 'text-foreground'
                        }`}>
                          {task.title}
                        </p>
                        {task.due_time && (
                          <p className="text-xs text-muted-foreground">
                            {task.due_time}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
                
                {/* Habits */}
                {activeHabitsForDate.slice(0, 2).map((goal) => (
                  <div key={goal.id} className="flex items-center gap-3 py-2">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                      style={{ 
                        backgroundColor: goal.color + '40', 
                        color: goal.color 
                      }}
                    >
                      {goal.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-foreground">
                        {goal.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{t('habit')}</p>
                    </div>
                  </div>
                ))}
                
                {tasks.length + activeHabitsForDate.length > 5 && (
                  <div className="text-center pt-2">
                    <span className="text-xs text-muted-foreground">
                      {t('and')} {tasks.length + activeHabitsForDate.length - 5} {t('more')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-lg p-6 text-center">
            <div className="text-muted-foreground mb-2">
              {t('noTasksScheduled')}
            </div>
            <div className="text-sm text-muted-foreground">
              {t('goToGoals')}
            </div>
          </div>
        )}
      </div>

      {/* Expenses Section */}
      <div className="px-4 mt-6">
        <h2 className="text-xl font-bold mb-4">
          {t('expensesOf')} {format(selectedDate, language === 'es' ? "dd 'de' MMMM" : "MMMM d", { locale })}
        </h2>
        
        {expensesLoading ? (
          <div className="bg-card rounded-lg p-6 text-center">
            <div className="text-muted-foreground">{t('loading')} gastos...</div>
          </div>
        ) : expenses.length > 0 ? (
          <div className="space-y-4">
            {/* Expense Summary */}
            <div className="bg-card rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-foreground">{t('expensesSummary')}</h3>
                <span className="text-lg font-bold text-foreground">
                  ${totalAmount.toLocaleString()}
                </span>
              </div>
              
              <div className="space-y-2">
                {expenses.slice(0, 3).map((expense) => (
                  <div key={expense.id} className="flex items-center gap-3 py-2">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                      style={{ backgroundColor: expense.category_color }}
                    >
                      {expense.category_icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-foreground">
                        {expense.store_name || t('unknownStore')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {expense.category_name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">
                        ${expense.total_amount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
                
                {expenses.length > 3 && (
                  <div className="text-center pt-2">
                    <span className="text-xs text-muted-foreground">
                      {t('and')} {expenses.length - 3} gastos {t('more')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-lg p-6 text-center">
            <div className="text-muted-foreground mb-2">
              {t('noExpensesToday')}
            </div>
            <div className="text-sm text-muted-foreground">
              {t('goToExpenses')}
            </div>
          </div>
        )}
      </div>

      <BottomNavigation />
      
      {/* Terms Acceptance Modal */}
      <TermsAcceptanceModal 
        isOpen={hasAcceptedTerms === false} 
        onAccept={handleAcceptTerms} 
      />
    </div>
  );
};