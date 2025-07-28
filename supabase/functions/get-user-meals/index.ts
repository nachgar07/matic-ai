import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];

    // Get user from authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get meals for the specified date
    const { data: meals, error } = await supabase
      .from('meal_entries')
      .select(`
        *,
        foods (*)
      `)
      .eq('user_id', user.id)
      .gte('consumed_at', `${date}T00:00:00`)
      .lt('consumed_at', `${date}T23:59:59`)
      .order('consumed_at', { ascending: true });

    if (error) {
      console.error('Error fetching meals:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch meals' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate daily totals
    let totalCalories = 0;
    let totalCarbs = 0;
    let totalProtein = 0;
    let totalFat = 0;

    meals?.forEach(meal => {
      const servings = meal.servings || 1;
      totalCalories += (meal.foods?.calories_per_serving || 0) * servings;
      totalCarbs += (meal.foods?.carbs_per_serving || 0) * servings;
      totalProtein += (meal.foods?.protein_per_serving || 0) * servings;
      totalFat += (meal.foods?.fat_per_serving || 0) * servings;
    });

    return new Response(
      JSON.stringify({ 
        meals: meals || [],
        dailyTotals: {
          calories: Math.round(totalCalories),
          carbs: Math.round(totalCarbs * 10) / 10,
          protein: Math.round(totalProtein * 10) / 10,
          fat: Math.round(totalFat * 10) / 10
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-user-meals function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});