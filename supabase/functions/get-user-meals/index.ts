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
    let date, startDate, endDate;
    
    // Try to get parameters from request body first (for date range queries)
    if (req.method === 'POST') {
      const body = await req.json();
      startDate = body.startDate;
      endDate = body.endDate;
    }
    
    // If no body parameters, try URL parameters (for single date queries)
    if (!startDate && !endDate) {
      const url = new URL(req.url);
      date = url.searchParams.get('date');
      if (!date) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        date = `${year}-${month}-${day}`;
      }
    }

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

    // Build query based on whether we have a date range or single date
    let query = supabase
      .from('meal_entries')
      .select(`
        *,
        foods (*)
      `)
      .eq('user_id', user.id);

    if (startDate && endDate) {
      // Date range query
      query = query
        .gte('consumed_at', `${startDate}T00:00:00`)
        .lte('consumed_at', `${endDate}T23:59:59`);
    } else {
      // Single date query
      query = query
        .gte('consumed_at', `${date}T00:00:00`)
        .lt('consumed_at', `${date}T23:59:59`);
    }

    const { data: meals, error } = await query.order('consumed_at', { ascending: true });

    if (error) {
      console.error('Error fetching meals:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch meals' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If it's a date range query, return all meals without calculating daily totals
    if (startDate && endDate) {
      return new Response(
        JSON.stringify({ 
          meals: meals || []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For single date queries, calculate daily totals
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