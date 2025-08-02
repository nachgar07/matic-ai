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
  consumed_at?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { foods, meal_type, user_message, consumed_at } = await req.json() as MealCreateRequest;
    
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
      
      // ENHANCED CONTEXTUAL ANALYSIS - Understand the COMPLETE phrase, not individual words
      let searchTerm = food.name.toLowerCase().trim();
      let contextualHints = {
        isMainDish: false,
        isSideDish: false,
        isBeverage: false,
        isPasta: false,
        isMeat: false,
        isVegetable: false,
        isFruit: false,
        cookingMethod: null,
        expectedCalories: null
      };
      
      // STEP 1: Analyze complete phrase patterns for better understanding
      const analyzePhrase = (phrase: string) => {
        // Pasta/Noodles patterns
        if (/fideos?\s+blancos?/i.test(phrase) || /pasta\s+blanca/i.test(phrase)) {
          contextualHints.isPasta = true;
          contextualHints.expectedCalories = 200;
          return 'white pasta';
        }
        if (/fideos?\s+integrales?/i.test(phrase) || /pasta\s+integral/i.test(phrase)) {
          contextualHints.isPasta = true;
          contextualHints.expectedCalories = 220;
          return 'whole wheat pasta';
        }
        if (/fideos?\s+con\s+/i.test(phrase)) {
          contextualHints.isPasta = true;
          contextualHints.isMainDish = true;
          return 'pasta with sauce';
        }
        if (/fideos?$/i.test(phrase) || /^pasta$/i.test(phrase)) {
          contextualHints.isPasta = true;
          return 'pasta';
        }
        
        // Meat patterns with cooking methods
        if (/pollo\s+(a\s+la\s+)?plancha/i.test(phrase) || /pechuga\s+plancha/i.test(phrase)) {
          contextualHints.isMeat = true;
          contextualHints.cookingMethod = 'grilled';
          contextualHints.isMainDish = true;
          contextualHints.expectedCalories = 180;
          return 'grilled chicken breast';
        }
        if (/pollo\s+hervido/i.test(phrase) || /pollo\s+cocido/i.test(phrase)) {
          contextualHints.isMeat = true;
          contextualHints.cookingMethod = 'boiled';
          return 'boiled chicken';
        }
        if (/pechuga\s+de\s+pollo/i.test(phrase)) {
          contextualHints.isMeat = true;
          contextualHints.isMainDish = true;
          return 'chicken breast';
        }
        if (/pollo$/i.test(phrase)) {
          contextualHints.isMeat = true;
          contextualHints.isMainDish = true;
          return 'chicken breast';
        }
        
        // Rice patterns
        if (/arroz\s+integral/i.test(phrase)) {
          contextualHints.isSideDish = true;
          contextualHints.expectedCalories = 150;
          return 'brown rice';
        }
        if (/arroz\s+blanco/i.test(phrase)) {
          contextualHints.isSideDish = true;
          contextualHints.expectedCalories = 140;
          return 'white rice';
        }
        if (/arroz$/i.test(phrase)) {
          contextualHints.isSideDish = true;
          return 'rice';
        }
        
        // Egg patterns with cooking methods
        if (/huevos?\s+fritos?/i.test(phrase)) {
          contextualHints.cookingMethod = 'fried';
          contextualHints.expectedCalories = 150;
          return 'fried eggs';
        }
        if (/huevos?\s+hervidos?/i.test(phrase) || /huevos?\s+duros?/i.test(phrase)) {
          contextualHints.cookingMethod = 'boiled';
          return 'boiled eggs';
        }
        if (/huevos?\s+revueltos?/i.test(phrase)) {
          contextualHints.cookingMethod = 'scrambled';
          return 'scrambled eggs';
        }
        if (/huevos?$/i.test(phrase)) {
          return 'eggs';
        }
        
        // Bread patterns
        if (/pan\s+tostado/i.test(phrase) || /tostadas?/i.test(phrase)) {
          contextualHints.cookingMethod = 'toasted';
          return 'toasted bread';
        }
        if (/pan\s+integral/i.test(phrase)) {
          return 'whole wheat bread';
        }
        if (/pan$/i.test(phrase)) {
          return 'bread';
        }
        
        // Vegetable patterns
        if (/br[óo]coli\s+al\s+vapor/i.test(phrase)) {
          contextualHints.isVegetable = true;
          contextualHints.cookingMethod = 'steamed';
          return 'steamed broccoli';
        }
        if (/br[óo]coli$/i.test(phrase)) {
          contextualHints.isVegetable = true;
          return 'broccoli';
        }
        
        // Oil patterns
        if (/aceite\s+de\s+oliva/i.test(phrase)) {
          contextualHints.expectedCalories = 120;
          return 'olive oil';
        }
        if (/aceite$/i.test(phrase)) {
          contextualHints.expectedCalories = 120;
          return 'olive oil';
        }
        
        // Fruit patterns
        if (/pl[áa]tano\s+maduro/i.test(phrase) || /banana\s+madura/i.test(phrase)) {
          contextualHints.isFruit = true;
          return 'ripe banana';
        }
        if (/pl[áa]tano$/i.test(phrase) || /banana$/i.test(phrase)) {
          contextualHints.isFruit = true;
          return 'banana';
        }
        
        // If no specific pattern matches, try simple word mapping
        return null;
      };
      
      // Apply contextual analysis
      let analyzedTerm = analyzePhrase(searchTerm);
      
      // STEP 2: Fallback to enhanced word mapping if no pattern matched
      if (!analyzedTerm) {
        const enhancedMapping: { [key: string]: string } = {
          // Direct translations prioritizing context
          'salmón': 'salmon',
          'salmon': 'salmon',
          'palta': 'avocado',
          'aguacate': 'avocado',
          'tomate': 'tomato',
          'papa': 'potato',
          'papas': 'potatoes',
          'pescado': 'fish',
          'atún': 'tuna',
          'leche': 'milk',
          'queso': 'cheese',
          'mantequilla': 'butter',
          'yogur': 'yogurt',
          'lechuga': 'lettuce',
          'espinaca': 'spinach',
          'zanahoria': 'carrot',
          'cebolla': 'onion',
          'manzana': 'apple',
          'naranja': 'orange',
          'limón': 'lemon'
        };
        
        analyzedTerm = enhancedMapping[searchTerm] || searchTerm;
      }
      
      searchTerm = analyzedTerm;
      
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
      
      // Sort foods by relevance score using CONTEXTUAL understanding
      const scoredFoods = searchData.foods.map((f: any) => {
        let score = 0;
        const foodName = f.food_name.toLowerCase();
        const caloriesPerServing = f.calories_per_serving || 0;
        
        // CONTEXTUAL SCORING - Use the hints we gathered about what type of food this should be
        if (contextualHints.isPasta) {
          if (foodName.includes('pasta') || foodName.includes('noodle') || foodName.includes('spaghetti') || foodName.includes('macaroni')) score += 500;
          if (foodName.includes('fideo')) score += 400;
          // SEVERELY penalize non-pasta items when we expect pasta
          if (foodName.includes('banana') || foodName.includes('fruit') || foodName.includes('sweet potato')) score -= 1000;
          if (foodName.includes('guinea') || foodName.includes('blanco maduro')) score -= 2000;
          if (!foodName.includes('pasta') && !foodName.includes('noodle') && !foodName.includes('spaghetti') && !foodName.includes('fideo')) score -= 300;
        }
        
        if (contextualHints.isMeat) {
          if (foodName.includes('chicken') || foodName.includes('beef') || foodName.includes('pork') || foodName.includes('meat')) score += 400;
          if (contextualHints.cookingMethod === 'grilled' && foodName.includes('grilled')) score += 200;
          if (contextualHints.cookingMethod === 'boiled' && foodName.includes('boiled')) score += 200;
          // Penalize non-meat items when we expect meat
          if (!foodName.includes('chicken') && !foodName.includes('beef') && !foodName.includes('pork') && !foodName.includes('meat')) score -= 200;
        }
        
        if (contextualHints.isVegetable) {
          if (foodName.includes('broccoli') || foodName.includes('carrot') || foodName.includes('spinach')) score += 300;
          if (contextualHints.cookingMethod === 'steamed' && foodName.includes('steamed')) score += 200;
          // Penalize non-vegetables when we expect vegetables
          if (foodName.includes('meat') || foodName.includes('chicken') || foodName.includes('beef')) score -= 200;
        }
        
        if (contextualHints.isFruit) {
          if (foodName.includes('banana') || foodName.includes('apple') || foodName.includes('orange')) score += 300;
          // Penalize non-fruits when we expect fruits
          if (!foodName.includes('fruit') && !foodName.includes('banana') && !foodName.includes('apple')) score -= 100;
        }
        
        // Expected calorie matching
        if (contextualHints.expectedCalories) {
          const caloriesDiff = Math.abs(caloriesPerServing - contextualHints.expectedCalories);
          if (caloriesDiff < 50) score += 200;  // Very close to expected
          else if (caloriesDiff < 100) score += 100; // Reasonably close
          else if (caloriesDiff > 200) score -= 100; // Too far from expected
        }
        
        // Main dish vs side dish context
        if (contextualHints.isMainDish) {
          if (caloriesPerServing > 150) score += 100; // Main dishes should have substantial calories
          if (caloriesPerServing < 100) score -= 150; // Penalize low-calorie items for main dishes
        }
        
        if (contextualHints.isSideDish) {
          if (caloriesPerServing > 50 && caloriesPerServing < 200) score += 100; // Side dishes should be moderate calories
        }
        
        // Higher score for exact search term matches
        if (foodName.includes(searchTerm.toLowerCase())) score += 150;
        
        // General calorie-based scoring (less important now with contextual hints)
        if (caloriesPerServing > 100) score += 30;
        if (caloriesPerServing > 200) score += 30;
        
        // Penalty for very low calorie foods that might be seasonings
        if (caloriesPerServing < 20) score -= 200;
        
        // Legacy specific food bonuses (kept for backward compatibility)
        if (originalName.includes('salmón') || originalName.includes('salmon')) {
          if (foodName.includes('salmon')) score += 200;
          if (foodName.includes('fillet') || foodName.includes('filet')) score += 50;
        }
        
        if (originalName.includes('aceite')) {
          if (foodName.includes('olive oil')) score += 200;
          if (foodName.includes('oil') && foodName.includes('olive')) score += 150;
        }
        
        if (originalName.includes('huevo')) {
          if (foodName.includes('egg')) score += 200;
          // Penalize eggplant
          if (foodName.includes('eggplant')) score -= 300;
        }
        
        // Prefer foods without brand (generic foods)
        if (!f.brand_name) score += 50;
        
        // Penalize overly complex dishes unless we expect a main dish
        if (foodName.split(' ').length > 5 && !contextualHints.isMainDish) score -= 30;
        
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
          consumed_at: consumed_at || new Date().toISOString()
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