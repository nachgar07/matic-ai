import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useWaterIntake = () => {
  const [waterGlasses, setWaterGlasses] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  // Load water intake for today
  const loadTodayWaterIntake = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('daily_water_intake')
        .select('glasses_consumed')
        .eq('user_id', user.id)
        .eq('date', getTodayDate())
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading water intake:', error);
        return;
      }

      setWaterGlasses(data?.glasses_consumed || 0);
    } catch (error) {
      console.error('Error loading water intake:', error);
    } finally {
      setLoading(false);
    }
  };

  // Update water intake
  const updateWaterIntake = async (newGlasses: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('daily_water_intake')
        .upsert({
          user_id: user.id,
          date: getTodayDate(),
          glasses_consumed: newGlasses
        }, {
          onConflict: 'user_id,date'
        });

      if (error) {
        console.error('Error updating water intake:', error);
        toast({
          title: "Error",
          description: "No se pudo guardar el consumo de agua",
          variant: "destructive"
        });
        return;
      }

      setWaterGlasses(newGlasses);
    } catch (error) {
      console.error('Error updating water intake:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar el consumo de agua",
        variant: "destructive"
      });
    }
  };

  // Add one glass of water
  const addWaterGlass = () => {
    const newCount = waterGlasses + 1;
    updateWaterIntake(newCount);
  };

  useEffect(() => {
    loadTodayWaterIntake();
  }, []);

  return {
    waterGlasses,
    addWaterGlass,
    loading
  };
};