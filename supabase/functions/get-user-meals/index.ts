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

  console.log('Request method:', req.method);
  console.log('Request headers:', Object.fromEntries(req.headers.entries()));

  try {
    let date, startDate, endDate;
    
    // Try to get parameters from request body (for POST requests from supabase.functions.invoke)
    try {
      const bodyText = await req.text();
      console.log('Request body:', bodyText);
      
      if (bodyText && bodyText.trim()) {
        const body = JSON.parse(bodyText);
        console.log('Parsed body:', body);
        
        date = body.date;
        startDate = body.startDate;
        endDate = body.endDate;
      }
    } catch (jsonError) {
      console.log('No valid JSON body found, trying URL parameters');
    }
    
    // If no body parameters, try URL parameters (fallback)
    if (!date && !startDate && !endDate) {
      const url = new URL(req.url);
      console.log('URL parameters:', url.searchParams.toString());
      
      date = url.searchParams.get('date');
      if (!date) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        date = `${year}-${month}-${day}`;
      }
    }
    
    console.log('Final parameters:', { date, startDate, endDate });

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

    // First, let's try to get meals with category information
    let mealsWithCategories = [];
    
    // Get basic meals first
    let basicQuery = supabase
      .from('meal_entries')
      .select(`
        *,
        foods (*)
      `)
      .eq('user_id', user.id);

    if (startDate && endDate) {
      // Date range query
      basicQuery = basicQuery
        .gte('consumed_at', `${startDate}T00:00:00`)
        .lte('consumed_at', `${endDate}T23:59:59`);
    } else {
      // Single date query
      basicQuery = basicQuery
        .gte('consumed_at', `${date}T00:00:00`)
        .lt('consumed_at', `${date}T23:59:59`);
    }

    const { data: basicMeals, error: mealsError } = await basicQuery.order('consumed_at', { ascending: true });

    if (mealsError) {
      console.error('Error fetching meals:', mealsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch meals' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Now get meal categories for each meal
    const mealsWithCategoryInfo = await Promise.all(
      (basicMeals || []).map(async (meal) => {
        console.log(`🏷️ GET-USER-MEALS - Looking for category: "${meal.meal_type}" for user: ${user.id}`);
        
        // Verificar si meal_type es un UUID
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(meal.meal_type);
        
        let category = null;
        
        if (isUuid) {
          // Buscar por ID si es UUID
          const { data, error: categoryError } = await supabase
            .from('meal_categories')
            .select('name, color, icon')
            .eq('id', meal.meal_type)
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (categoryError) {
            console.log(`🏷️ GET-USER-MEALS - Error fetching category by ID: ${categoryError.message}`);
          }
          category = data;
        } else {
          // Buscar por nombre si no es UUID (compatibilidad con datos antiguos)
          const { data, error: categoryError } = await supabase
            .from('meal_categories')
            .select('name, color, icon')
            .eq('name', meal.meal_type)
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (categoryError) {
            console.log(`🏷️ GET-USER-MEALS - Error fetching category by name: ${categoryError.message}`);
          }
          category = data;
        }
        
        console.log(`🏷️ GET-USER-MEALS - Found category for "${meal.meal_type}":`, category);

        return {
          ...meal,
          meal_categories: category || { name: meal.meal_type || 'Comida', color: '#6366f1', icon: '🍽️' }
        };
      })
    );

    const meals = mealsWithCategoryInfo;

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