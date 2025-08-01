import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FoodItem {
  name: string;
  servings: number;
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
      
      // Simplify search term - remove preparation details and map Spanish to English
      let searchTerm = food.name.toLowerCase();
      
      // Spanish to English food mapping for better FatSecret results
      const foodMapping: { [key: string]: string } = {
        'palta': 'avocado',
        'aguacate': 'avocado', 
        'pollo': 'chicken',
        'huevo': 'egg',
        'huevos': 'eggs',
        'pan': 'bread',
        'arroz': 'rice',
        'papa': 'potato',
        'tomate': 'tomato',
        'carne': 'beef',
        'pescado': 'fish',
        'leche': 'milk',
        'queso': 'cheese',
        'mantequilla': 'butter',
        'aceite': 'oil',
        'sal': 'salt',
        'azúcar': 'sugar'
      };

      // Extract basic ingredient from complex preparations
      if (searchTerm.includes('huevos fritos') || searchTerm.includes('huevo frito')) {
        searchTerm = 'fried eggs';
      } else if (searchTerm.includes('pan tostado')) {
        searchTerm = 'toast bread';
      } else if (searchTerm.includes('palta') || searchTerm.includes('aguacate')) {
        searchTerm = 'avocado';
      } else if (searchTerm.includes('pollo')) {
        searchTerm = 'chicken';
      } else if (searchTerm.includes('papa') && (searchTerm.includes('hervida') || searchTerm.includes('hervido'))) {
        searchTerm = 'potato boiled';
      } else if (searchTerm.includes('papa')) {
        searchTerm = 'potato';
      } else if (searchTerm.includes('puré') && searchTerm.includes('papa')) {
        searchTerm = 'mashed potato';
      } else if (searchTerm.includes('arroz')) {
        searchTerm = 'rice';
      } else if (searchTerm.includes('pescado')) {
        searchTerm = 'fish';
      } else if (searchTerm.includes('carne')) {
        searchTerm = 'beef';
      } else {
        // Check if we have a direct mapping
        for (const [spanish, english] of Object.entries(foodMapping)) {
          if (searchTerm.includes(spanish)) {
            searchTerm = english;
            break;
          }
        }
      }
      
      console.log(`Simplified search term: ${searchTerm}`);
      
      // Search for the food using FatSecret
      const { data: searchData, error: searchError } = await supabase.functions.invoke('fatsecret-search', {
        body: { searchQuery: searchTerm }
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

      // Smarter food selection - prefer closer matches
      let selectedFood = searchData.foods[0];
      
      // For avocado/palta, specifically look for avocado in results
      if ((food.name.toLowerCase().includes('palta') || food.name.toLowerCase().includes('aguacate')) && searchData.foods.length > 1) {
        const avocadoMatch = searchData.foods.find((f: any) => 
          f.food_name.toLowerCase().includes('avocado') || 
          f.food_name.toLowerCase().includes('avocados')
        );
        if (avocadoMatch) {
          selectedFood = avocadoMatch;
        }
      }
      
      // For eggs, look for egg-related foods
      if (food.name.toLowerCase().includes('huevo') && searchData.foods.length > 1) {
        const eggMatch = searchData.foods.find((f: any) => 
          f.food_name.toLowerCase().includes('egg') && 
          !f.food_name.toLowerCase().includes('eggplant')
        );
        if (eggMatch) {
          selectedFood = eggMatch;
        }
      }
      
      // For bread/toast, look for bread-related foods
      if (food.name.toLowerCase().includes('pan') && searchData.foods.length > 1) {
        const breadMatch = searchData.foods.find((f: any) => 
          f.food_name.toLowerCase().includes('bread') || 
          f.food_name.toLowerCase().includes('toast')
        );
        if (breadMatch) {
          selectedFood = breadMatch;
        }
      }
      
      console.log(`Selected food for "${food.name}":`, { name: selectedFood.food_name, brand: selectedFood.brand_name });

      // Use the servings calculated by OpenAI
      const servings = food.servings;

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