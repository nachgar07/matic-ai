import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CalorieRing } from "@/components/CalorieRing/CalorieRing";
import { WeeklyCalendar } from "@/components/WeeklyCalendar/WeeklyCalendar";
import { MacroCard } from "@/components/MacroCard/MacroCard";
import { BottomNavigation } from "@/components/Layout/BottomNavigation";
import { Button } from "@/components/ui/button";
import { Footprints, Flame, Sparkles, LogOut } from "lucide-react";
import { User, Session } from '@supabase/supabase-js';
import { useUserMeals, useNutritionGoals } from "@/hooks/useFatSecret";
import { useWaterIntake } from "@/hooks/useWaterIntake";

export const Home = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Get real data from hooks
  const { data: mealsData, isLoading: mealsLoading } = useUserMeals();
  const { data: nutritionGoals } = useNutritionGoals();
  const { waterGlasses } = useWaterIntake();
  
  // Calculate real values from meal data
  const dailyTotals = mealsData?.dailyTotals || { calories: 0, carbs: 0, protein: 0, fat: 0 };
  const caloriesConsumed = Math.round(dailyTotals.calories);
  const caloriesTarget = nutritionGoals?.daily_calories || 2586;
  const steps = 0; // Still mock data - not implemented
  const activeCalories = 0; // Still mock data - not implemented

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      // Clean up auth state including problematic URLs
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-') ||
            key.includes('sueosblancos') || key.includes('blanqueria') ||
            key.includes('xn--')) {
          localStorage.removeItem(key);
          console.log('🧹 Removed key during logout:', key);
        }
      });
      
      // Clean sessionStorage too
      Object.keys(sessionStorage || {}).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-') ||
            key.includes('sueosblancos') || key.includes('blanqueria') ||
            key.includes('xn--')) {
          sessionStorage.removeItem(key);
          console.log('🧹 Removed sessionStorage key during logout:', key);
        }
      });
      
      // Clean problematic cookies
      document.cookie.split(";").forEach(function(c) { 
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
        await supabase.auth.signOut({ scope: 'global' });
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
  if (loading || mealsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-muted-foreground">Cargando...</div>
        </div>
      </div>
    );
  }

  // Redirect to auth if not logged in
  if (!session || !user) {
    window.location.href = '/auth';
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Calogram</h1>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleSignOut}
            className="text-muted-foreground"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
        <WeeklyCalendar />
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
        />
      </div>

      {/* Activity Stats */}
      <div className="px-4 mb-6">
        <div className="flex gap-4">
          <div className="flex-1 bg-card rounded-lg p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Footprints className="text-muted-foreground mr-2" size={20} />
              <span className="text-sm text-muted-foreground">steps</span>
            </div>
            <div className="text-2xl font-bold">{steps}</div>
          </div>
          <div className="flex-1 bg-card rounded-lg p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Flame className="text-orange-500 mr-2" size={20} />
              <span className="text-sm text-muted-foreground">active calories</span>
            </div>
            <div className="text-2xl font-bold">{activeCalories}</div>
          </div>
        </div>
      </div>

      {/* Macronutrients */}
      <div className="px-4 mb-6">
        <div className="flex gap-3">
          <MacroCard
            icon="🥩"
            label="Protein"
            current={Math.round(dailyTotals.protein)}
            target={nutritionGoals?.daily_protein || 129}
            unit="g"
          />
          <MacroCard
            icon="🍞"
            label="Carbs"
            current={Math.round(dailyTotals.carbs)}
            target={nutritionGoals?.daily_carbs || 323}
            unit="g"
          />
          <MacroCard
            icon="🥑"
            label="Fat"
            current={Math.round(dailyTotals.fat)}
            target={nutritionGoals?.daily_fat || 86}
            unit="g"
          />
        </div>
      </div>

      {/* Reminder Card */}
      <div className="px-4 mb-6">
        <div className="bg-card rounded-lg p-4 flex items-center">
          <Sparkles className="text-primary mr-3" size={24} />
          <span className="text-muted-foreground">
            "Don't forget to log today's food!"
          </span>
        </div>
      </div>

      {/* Calorie Logs Section */}
      <div className="px-4">
        <h2 className="text-xl font-bold mb-4">Registro de calorías</h2>
        {mealsData?.meals && mealsData.meals.length > 0 ? (
          <div className="bg-card rounded-lg p-6 text-center">
            <div className="text-muted-foreground mb-2">
              {mealsData.meals.length} comida{mealsData.meals.length === 1 ? '' : 's'} registrada{mealsData.meals.length === 1 ? '' : 's'} hoy
            </div>
            <div className="text-sm text-muted-foreground">
              {caloriesConsumed} calorías consumidas de {caloriesTarget} objetivo
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-lg p-6 text-center">
            <div className="text-muted-foreground mb-2">
              No has registrado ninguna comida
            </div>
            <div className="text-sm text-muted-foreground">
              Comienza a hacer seguimiento tomando una foto rápida
            </div>
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
};