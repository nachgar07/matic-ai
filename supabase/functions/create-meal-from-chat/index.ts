import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FoodItem {
  name: string;
  quantity: string;
  estimated_servings?: number;
}

interface MealCreateRequest {
  foods: FoodItem[];
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  user_message?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { foods, meal_type, user_message } = await req.json() as MealCreateRequest;
    
    console.log('Creating meal from chat:', { foods, meal_type, user_message });

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header is required');
    }

    // Initialize Supabase client with service role key for internal operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Extract user ID from auth token
    let userId: string;
    
    if (authHeader.includes('Bearer') && req.headers.get('x-user-id')) {
      // This is an internal call, we need to get user_id from request body or headers
      const userIdHeader = req.headers.get('x-user-id');
      if (!userIdHeader) {
        throw new Error('User ID required for service role calls');
      }
      userId = userIdHeader;
    } else {
      // This is a user call, validate the token
      const userClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
          global: { headers: { Authorization: authHeader } }
        }
      );

      const { data: { user }, error: userError } = await userClient.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }
      userId = user.id;
    }

    console.log('User authenticated:', userId);

    // Search for each food and create meal entries
    const mealEntries = [];
    const searchResults = [];

    for (const food of foods) {
      console.log(`Searching for food: ${food.name}`);
      
      // Search for the food using FatSecret
      const { data: searchData, error: searchError } = await supabase.functions.invoke('fatsecret-search', {
        body: { searchQuery: food.name }
      });

      if (searchError) {
        console.error(`Error searching for ${food.name}:`, searchError);
        searchResults.push({
          food_name: food.name,
          query: food.quantity,
          found: false,
          error: searchError.message
        });
        continue;
      }

      if (!searchData?.foods || searchData.foods.length === 0) {
        console.log(`No results found for: ${food.name}`);
        searchResults.push({
          food_name: food.name,
          query: food.quantity,
          found: false,
          error: 'No se encontró en la base de datos'
        });
        continue;
      }

      // Take the first result (best match)
      const selectedFood = searchData.foods[0];
      console.log(`Found food:`, selectedFood);

      // Determine servings - use estimated_servings or default to 1
      const servings = food.estimated_servings || 1;

      // Create meal entry
      const { data: mealEntry, error: mealError } = await supabase
        .from('meal_entries')
        .insert({
          user_id: userId,
          food_id: selectedFood.id,
          servings: servings,
          meal_type: meal_type,
          consumed_at: new Date().toISOString()
        })
        .select(`
          *,
          foods (*)
        `)
        .single();

      if (mealError) {
        console.error(`Error creating meal entry for ${food.name}:`, mealError);
        searchResults.push({
          food_name: food.name,
          query: food.quantity,
          found: true,
          saved: false,
          error: mealError.message
        });
        continue;
      }

      console.log(`Meal entry created:`, mealEntry);
      mealEntries.push(mealEntry);
      
      searchResults.push({
        food_name: food.name,
        query: food.quantity,
        found: true,
        saved: true,
        food_data: selectedFood,
        servings: servings,
        total_calories: Math.round((selectedFood.calories_per_serving || 0) * servings)
      });
    }

    // Calculate totals
    const totals = mealEntries.reduce((acc, entry) => {
      if (entry.foods) {
        const calories = (entry.foods.calories_per_serving || 0) * entry.servings;
        const protein = (entry.foods.protein_per_serving || 0) * entry.servings;
        const carbs = (entry.foods.carbs_per_serving || 0) * entry.servings;
        const fat = (entry.foods.fat_per_serving || 0) * entry.servings;
        
        return {
          calories: acc.calories + calories,
          protein: acc.protein + protein,
          carbs: acc.carbs + carbs,
          fat: acc.fat + fat
        };
      }
      return acc;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

    const response = {
      success: true,
      meal_type,
      foods_processed: foods.length,
      foods_found: searchResults.filter(r => r.found).length,
      foods_saved: searchResults.filter(r => r.saved).length,
      results: searchResults,
      totals: {
        calories: Math.round(totals.calories),
        protein: Math.round(totals.protein * 10) / 10,
        carbs: Math.round(totals.carbs * 10) / 10,
        fat: Math.round(totals.fat * 10) / 10
      },
      meal_entries: mealEntries.map(entry => ({
        id: entry.id,
        food_name: entry.foods?.food_name,
        servings: entry.servings,
        calories: Math.round((entry.foods?.calories_per_serving || 0) * entry.servings)
      }))
    };

    console.log('Meal creation response:', response);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-meal-from-chat:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});