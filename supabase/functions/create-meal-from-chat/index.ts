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
      
        // Enhanced Spanish to English food mapping for better FatSecret results
        const foodMapping: { [key: string]: string } = {
          // Exact phrases first (more specific)
          'filete de salmón': 'salmon fillet',
          'salmón': 'salmon',
          'salmon': 'salmon',
          'arroz integral': 'brown rice',
          'arroz integral cocido': 'brown rice cooked',
          'arroz blanco': 'white rice',
          'brócoli al vapor': 'steamed broccoli',
          'brócoli': 'broccoli',
          'brocoli': 'broccoli',
          'aceite de oliva': 'olive oil',
          'aceite': 'olive oil',
          'pechuga de pollo': 'chicken breast',
          'pollo': 'chicken breast',
          'carne de res': 'beef',
          'carne': 'beef',
          'filete': 'steak',
          
          // Pasta and noodles - CRITICAL fixes for fideos
          'fideos blancos': 'white pasta',
          'fideos': 'pasta',
          'pasta': 'pasta',
          'tallarines': 'noodles',
          'espaguetis': 'spaghetti',
          'macarrones': 'macaroni',
          
          // Common foods
          'palta': 'avocado',
          'aguacate': 'avocado', 
          'huevo': 'egg',
          'huevos': 'eggs',
          'pan': 'bread',
          'arroz': 'rice',
          'papa': 'potato',
          'papas': 'potatoes',
          'tomate': 'tomato',
          'pescado': 'fish',
          'atún': 'tuna',
          'leche': 'milk',
          'queso': 'cheese',
          'mantequilla': 'butter',
          'sal': 'salt',
          'azúcar': 'sugar',
          'miel': 'honey',
          'yogur': 'yogurt',
          'yogurt': 'yogurt',
          
          // Vegetables
          'lechuga': 'lettuce',
          'espinaca': 'spinach',
          'zanahoria': 'carrot',
          'cebolla': 'onion',
          'ajo': 'garlic',
          'pimiento': 'bell pepper',
          'apio': 'celery',
          
          // Fruits
          'manzana': 'apple',
          'banana': 'banana',
          'plátano': 'banana',
          'naranja': 'orange',
          'limón': 'lemon',
          'uva': 'grape',
          'fresa': 'strawberry',
          
          // Nuts and seeds
          'nuez': 'walnut',
          'nueces': 'walnuts',
          'almendra': 'almond',
          'almendras': 'almonds'
        };

      // First, check for exact matches in the mapping
      let foundMapping = false;
      for (const [spanish, english] of Object.entries(foodMapping)) {
        if (searchTerm === spanish || searchTerm.includes(spanish)) {
          searchTerm = english;
          foundMapping = true;
          break;
        }
      }
      
      // If no mapping found, try to extract basic ingredient from complex preparations
      if (!foundMapping) {
        if (searchTerm.includes('huevos fritos') || searchTerm.includes('huevo frito')) {
          searchTerm = 'fried eggs';
        } else if (searchTerm.includes('pan tostado')) {
          searchTerm = 'toast bread';
        } else if (searchTerm.includes('papa') && (searchTerm.includes('hervida') || searchTerm.includes('hervido'))) {
          searchTerm = 'potato boiled';
        } else if (searchTerm.includes('puré') && searchTerm.includes('papa')) {
          searchTerm = 'mashed potato';
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

      // Enhanced food selection - prefer closer matches based on food type AND calories
      let selectedFood = searchData.foods[0];
      const originalName = food.name.toLowerCase();
      
      // Sort foods by relevance score for better matching
      const scoredFoods = searchData.foods.map((f: any) => {
        let score = 0;
        const foodName = f.food_name.toLowerCase();
        const caloriesPerServing = f.calories_per_serving || 0;
        
        // Higher score for exact matches
        if (foodName.includes(searchTerm)) score += 100;
        
        // Bonus for higher calorie foods (more substantial foods)
        if (caloriesPerServing > 100) score += 50;
        if (caloriesPerServing > 200) score += 50;
        if (caloriesPerServing > 300) score += 30;
        
        // Penalty for very low calorie foods that might be seasonings or tiny portions
        if (caloriesPerServing < 50) score -= 100;
        
        // Specific food type bonuses
        if (originalName.includes('salmón') || originalName.includes('salmon')) {
          if (foodName.includes('salmon')) score += 200;
          if (foodName.includes('fillet') || foodName.includes('filet')) score += 50;
          // Prefer higher calorie salmon preparations
          if (caloriesPerServing > 150) score += 100;
          // Penalize non-salmon fish
          if (foodName.includes('tuna') || foodName.includes('cod') || foodName.includes('mackerel')) score -= 100;
        }
        
        if (originalName.includes('arroz integral')) {
          if (foodName.includes('brown rice')) score += 200;
          if (foodName.includes('rice') && foodName.includes('brown')) score += 150;
          // Prefer substantial rice portions
          if (caloriesPerServing > 150) score += 100;
          // Penalize white rice or rice dishes with very low calories
          if (foodName.includes('white rice') || foodName.includes('fried rice')) score -= 50;
        }
        
        if (originalName.includes('brócoli') || originalName.includes('brocoli')) {
          if (foodName.includes('broccoli')) score += 200;
          // Penalize other vegetables
          if (foodName.includes('cauliflower') || foodName.includes('cabbage')) score -= 50;
        }
        
        if (originalName.includes('aceite de oliva') || originalName.includes('aceite')) {
          if (foodName.includes('olive oil')) score += 200;
          if (foodName.includes('oil') && foodName.includes('olive')) score += 150;
          // Prefer higher calorie oil entries (more substantial servings)
          if (caloriesPerServing > 80) score += 100;
          // Penalize other oils
          if (foodName.includes('vegetable oil') || foodName.includes('canola')) score -= 50;
        }
        
        if (originalName.includes('palta') || originalName.includes('aguacate')) {
          if (foodName.includes('avocado')) score += 200;
          // Prefer higher calorie avocado entries
          if (caloriesPerServing > 120) score += 100;
          // Penalize other vegetables
          if (!foodName.includes('avocado')) score -= 100;
        }
        
        if (originalName.includes('huevo')) {
          if (foodName.includes('egg')) score += 200;
          // Prefer substantial egg preparations
          if (caloriesPerServing > 100) score += 100;
          // Penalize eggplant
          if (foodName.includes('eggplant')) score -= 200;
        }
        
        if (originalName.includes('pan')) {
          if (foodName.includes('bread') || foodName.includes('toast')) score += 200;
          // Penalize unrelated items
          if (!foodName.includes('bread') && !foodName.includes('toast')) score -= 50;
        }
        
        // CRITICAL: Handle pasta/fideos correctly
        if (originalName.includes('fideos') || originalName.includes('pasta') || originalName.includes('tallarines')) {
          if (foodName.includes('pasta') || foodName.includes('noodle') || foodName.includes('spaghetti') || foodName.includes('macaroni')) score += 300;
          if (foodName.includes('fideo')) score += 250;
          // Prefer higher calorie pasta entries (substantial portions)
          if (caloriesPerServing > 200) score += 100;
          // SEVERELY penalize fruits, vegetables, and non-pasta items
          if (foodName.includes('banana') || foodName.includes('fruit') || foodName.includes('sweet potato')) score -= 500;
          if (foodName.includes('guinea') || foodName.includes('blanco maduro')) score -= 1000;
          // Penalize anything that's not carb-heavy
          if (caloriesPerServing < 100) score -= 200;
        }
        
        // Prefer foods without brand (generic foods)
        if (!f.brand_name) score += 30;
        
        // Penalize overly complex dishes
        if (foodName.split(' ').length > 5) score -= 20;
        
        return { ...f, score };
      });
      
      // Sort by score and pick the highest
      scoredFoods.sort((a: any, b: any) => b.score - a.score);
      selectedFood = scoredFoods[0];
      
      console.log(`Food selection for "${food.name}":`, {
        searchTerm,
        topCandidates: scoredFoods.slice(0, 5).map((f: any) => ({ 
          name: f.food_name, 
          brand: f.brand_name, 
          calories: f.calories_per_serving,
          score: f.score 
        })),
        selected: { 
          name: selectedFood.food_name, 
          brand: selectedFood.brand_name, 
          calories: selectedFood.calories_per_serving,
          score: selectedFood.score 
        }
      });
      
      console.log(`Selected food for "${food.name}":`, { name: selectedFood.food_name, brand: selectedFood.brand_name });

      // Use the servings calculated by OpenAI
      const servings = food.servings;
      
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

    // Calculate initial totals to see if we need to adjust portions
    const initialTotals = searchResults.reduce((acc, result) => {
      if (result.saved && result.food_data) {
        const calories = (result.food_data.calories_per_serving || 0) * result.servings;
        const protein = (result.food_data.protein_per_serving || 0) * result.servings;
        const carbs = (result.food_data.carbs_per_serving || 0) * result.servings;
        const fat = (result.food_data.fat_per_serving || 0) * result.servings;
        
        return {
          calories: acc.calories + calories,
          protein: acc.protein + protein,
          carbs: acc.carbs + carbs,
          fat: acc.fat + fat
        };
      }
      return acc;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

    // Extract ALL target values from user message (calories, protein, carbs, fat)
    let targetValues = null;
    if (user_message) {
      const calorieMatch = user_message.match(/(\d+)\s*kcal/);
      const proteinMatch = user_message.match(/(\d+(?:\.\d+)?)\s*g?\s*(?:de\s+)?prote[íi]na/i);
      const carbsMatch = user_message.match(/(\d+(?:\.\d+)?)\s*g?\s*(?:de\s+)?carbohidratos/i);
      const fatMatch = user_message.match(/(\d+(?:\.\d+)?)\s*g?\s*(?:de\s+)?grasas/i);
      
      if (calorieMatch || proteinMatch || carbsMatch || fatMatch) {
        targetValues = {
          calories: calorieMatch ? parseInt(calorieMatch[1]) : null,
          protein: proteinMatch ? parseFloat(proteinMatch[1]) : null,
          carbs: carbsMatch ? parseFloat(carbsMatch[1]) : null,
          fat: fatMatch ? parseFloat(fatMatch[1]) : null
        };
        console.log('🎯 Target values extracted:', targetValues);
      }
    }

    // Smart portion adjustment to match ALL macros, not just calories
    if (targetValues && searchResults.filter(r => r.saved).length > 0) {
      console.log('🔧 Starting smart portion adjustment...');
      
      // Try different scaling approaches to get closer to targets
      let bestAdjustment = null;
      let bestError = Infinity;
      
      // Test different scaling scenarios
      for (let attempt = 0; attempt < 5; attempt++) {
        const testResults = JSON.parse(JSON.stringify(searchResults)); // Deep clone
        
        if (attempt === 0) {
          // Attempt 1: Scale all portions equally
          const avgScale = targetValues.calories ? (targetValues.calories / initialTotals.calories) : 1;
          testResults.forEach(r => {
            if (r.saved) r.servings *= Math.max(0.1, Math.min(3, avgScale));
          });
        } else if (attempt === 1) {
          // Attempt 2: Prioritize protein foods for protein, carb foods for carbs, etc.
          testResults.forEach(r => {
            if (!r.saved || !r.food_data) return;
            const proteinRatio = r.food_data.protein_per_serving / (r.food_data.calories_per_serving || 1);
            const carbRatio = r.food_data.carbs_per_serving / (r.food_data.calories_per_serving || 1);
            const fatRatio = r.food_data.fat_per_serving / (r.food_data.calories_per_serving || 1);
            
            if (proteinRatio > 0.1 && targetValues.protein) {
              // This is a protein-rich food
              r.servings *= Math.max(0.2, Math.min(2, targetValues.protein / (initialTotals.protein || 1)));
            } else if (carbRatio > 0.3 && targetValues.carbs) {
              // This is a carb-rich food  
              r.servings *= Math.max(0.2, Math.min(2, targetValues.carbs / (initialTotals.carbs || 1)));
            } else if (fatRatio > 0.2 && targetValues.fat) {
              // This is a fat-rich food
              r.servings *= Math.max(0.1, Math.min(2, targetValues.fat / (initialTotals.fat || 1)));
            }
          });
        } else {
          // Attempts 3-5: Random variations
          testResults.forEach(r => {
            if (r.saved) r.servings *= (0.5 + Math.random());
          });
        }
        
        // Calculate totals for this test
        const testTotals = testResults.reduce((acc, result) => {
          if (result.saved && result.food_data) {
            const calories = (result.food_data.calories_per_serving || 0) * result.servings;
            const protein = (result.food_data.protein_per_serving || 0) * result.servings;
            const carbs = (result.food_data.carbs_per_serving || 0) * result.servings;
            const fat = (result.food_data.fat_per_serving || 0) * result.servings;
            
            return {
              calories: acc.calories + calories,
              protein: acc.protein + protein,
              carbs: acc.carbs + carbs,
              fat: acc.fat + fat
            };
          }
          return acc;
        }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
        
        // Calculate error (how far we are from targets)
        let error = 0;
        if (targetValues.calories) error += Math.abs(testTotals.calories - targetValues.calories) / targetValues.calories;
        if (targetValues.protein) error += Math.abs(testTotals.protein - targetValues.protein) / targetValues.protein;
        if (targetValues.carbs) error += Math.abs(testTotals.carbs - targetValues.carbs) / targetValues.carbs;
        if (targetValues.fat) error += Math.abs(testTotals.fat - targetValues.fat) / targetValues.fat;
        
        console.log(`📊 Attempt ${attempt + 1}: Error=${error.toFixed(3)}, Totals=${Math.round(testTotals.calories)}kcal, ${testTotals.protein.toFixed(1)}g protein, ${testTotals.carbs.toFixed(1)}g carbs, ${testTotals.fat.toFixed(1)}g fat`);
        
        if (error < bestError) {
          bestError = error;
          bestAdjustment = testResults;
        }
      }
      
      // Apply the best adjustment found
      if (bestAdjustment && bestError < 2) { // Only apply if reasonably good
        searchResults.splice(0, searchResults.length, ...bestAdjustment);
        console.log('✅ Applied best adjustment with error:', bestError.toFixed(3));
      } else {
        console.log('❌ No good adjustment found, keeping original portions');
      }
    }

    // Now create the actual meal entries with adjusted portions
    for (const result of searchResults) {
      if (!result.saved || !result.food_data) continue;

      console.log(`Creating meal entry for ${result.food_name} with ${result.servings} servings`);

      // Create meal entry with adjusted servings
      const { data: mealEntry, error: mealError } = await supabase
        .from('meal_entries')
        .insert({
          user_id: userId,
          food_id: result.food_data.id,
          servings: result.servings,
          meal_type: meal_type,
          consumed_at: new Date().toISOString()
        })
        .select(`
          *,
          foods (*)
        `)
        .single();

      if (mealError) {
        console.error(`Error creating meal entry for ${result.food_name}:`, mealError);
        result.saved = false;
        result.error = mealError.message;
        continue;
      }

      console.log(`✅ Meal entry created:`, mealEntry);
      mealEntries.push(mealEntry);
    }

    // Calculate final totals
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
      })),
      target_values: targetValues,
      adjustment_made: targetValues && Object.keys(targetValues).length > 0
    };

    console.log('🎯 Final meal creation response:', response);

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