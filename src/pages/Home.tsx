import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CalorieRing } from "@/components/CalorieRing/CalorieRing";
import { WeeklyCalendar } from "@/components/WeeklyCalendar/WeeklyCalendar";
import { MacroCard } from "@/components/MacroCard/MacroCard";
import { BottomNavigation } from "@/components/Layout/BottomNavigation";
import { Button } from "@/components/ui/button";
import { Footprints, Flame, Sparkles, LogOut } from "lucide-react";
import { User, Session } from '@supabase/supabase-js';

export const Home = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Mock data
  const caloriesConsumed = 0;
  const caloriesTarget = 2586;
  const steps = 0;
  const activeCalories = 0;

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
      // Clean up auth state
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      });
      
      // Attempt global sign out
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Ignore errors
      }
      
      // Force page reload for a clean state
      window.location.href = '/auth';
    } catch (error) {
      console.error('Error signing out:', error);
      window.location.href = '/auth';
    }
  };

  // Show loading while checking auth
  if (loading) {
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
          size={220}
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
            current={0}
            target={129}
            unit="g"
          />
          <MacroCard
            icon="🍞"
            label="Carbs"
            current={0}
            target={323}
            unit="g"
          />
          <MacroCard
            icon="🥑"
            label="Fat"
            current={0}
            target={86}
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
        <h2 className="text-xl font-bold mb-4">Calorie logs</h2>
        <div className="bg-card rounded-lg p-6 text-center">
          <div className="text-muted-foreground mb-2">
            You haven't logged any food
          </div>
          <div className="text-sm text-muted-foreground">
            Start tracking today's calories by taking a quick photo
          </div>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};