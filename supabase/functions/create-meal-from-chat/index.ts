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
  // For multiple foods (original format)
  foods?: FoodItem[];
  // For single meal from openai-food-assistant
  meal_type: string;
  food_name?: string;
  servings?: number;
  calories_per_serving?: number;
  protein_per_serving?: number;
  carbs_per_serving?: number;
  fat_per_serving?: number;
  user_message?: string;
  consumed_at?: string;
}

async function findMealCategory(userMessage: string, userId: string, supabase: any): Promise<string> {
  // Get user's meal categories
  const { data: categories, error } = await supabase
    .from('meal_categories')
    .select('name')
    .eq('user_id', userId);

  if (error || !categories) {
    console.log('No meal categories found, using default meal_type');
    return 'lunch'; // default fallback
  }

  // Convert user message to lowercase for matching
  const messageLower = userMessage?.toLowerCase() || '';
  
  // Try to match user message with existing categories
  for (const category of categories) {
    const categoryName = category.name.toLowerCase();
    
    // Check for exact word matches or partial matches
    if (messageLower.includes(categoryName) || 
        categoryName.includes(messageLower.split(' ')[0])) {
      console.log(`✅ Found matching category: ${category.name} for message: ${userMessage}`);
      return category.name.toLowerCase();
    }
  }

  // Fallback mappings for common Spanish meal types
  const mealMappings: { [key: string]: string } = {
    'desayuno': 'desayuno',
    'almuerzo': 'almuerzo', 
    'comida': 'almuerzo',
    'cena': 'cena',
    'snack': 'snack',
    'merienda': 'merienda'
  };

  // Check if any category matches common meal types
  for (const [keyword, mealType] of Object.entries(mealMappings)) {
    if (messageLower.includes(keyword)) {
      // Check if this meal type exists in user's categories
      const matchingCategory = categories.find(cat => 
        cat.name.toLowerCase().includes(mealType)
      );
      if (matchingCategory) {
        console.log(`✅ Found matching category via mapping: ${matchingCategory.name}`);
        return matchingCategory.name.toLowerCase();
      }
    }
  }

  console.log('No category match found, using lunch as default');
  return 'lunch'; // default fallback
}

async function getNutritionalInfoFromOpenAI(foodName: string, servings: number, apiKey: string) {
  console.log(`Getting nutritional info from OpenAI for: ${foodName}`);
  
  const prompt = `Proporciona información nutricional precisa para el siguiente alimento en formato JSON:

Alimento: ${foodName}
Cantidad: ${servings} porción(es)

Responde SOLO con el siguiente JSON exacto (sin texto adicional):

{
  "food_name": "nombre del alimento en español",
  "serving_description": "descripción de 1 porción (ej: 1 taza, 100g, 1 pieza mediana)",
  "calories_per_serving": número_de_calorías_por_porción,
  "protein_per_serving": gramos_de_proteína_por_porción,
  "carbs_per_serving": gramos_de_carbohidratos_por_porción,
  "fat_per_serving": gramos_de_grasa_por_porción
}

Usa tu conocimiento nutricional para proporcionar valores precisos y realistas.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.1,
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const result = await response.json();
    const content = result.choices[0].message.content;
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in OpenAI response');
    }
    
    const nutritionalInfo = JSON.parse(jsonMatch[0]);
    console.log(`✅ Got nutritional info for ${foodName}:`, nutritionalInfo);
    
    return nutritionalInfo;
  } catch (error) {
    console.error(`Error getting nutritional info for ${foodName}:`, error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData = await req.json() as MealCreateRequest;
    const { 
      foods, 
      meal_type, 
      food_name, 
      servings, 
      calories_per_serving, 
      protein_per_serving, 
      carbs_per_serving, 
      fat_per_serving, 
      user_message, 
      consumed_at 
    } = requestData;
    
    console.log('Creating meal from chat:', requestData);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header is required');
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Extract user ID from auth token
    let userId: string;
    
    if (authHeader.includes('Bearer') && req.headers.get('x-user-id')) {
      userId = req.headers.get('x-user-id')!;
    } else {
      const userClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: { user }, error: userError } = await userClient.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }
      userId = user.id;
    }

    console.log('User authenticated:', userId);

    // Find the appropriate meal category based on user message and existing categories
    const determinedMealType = await findMealCategory(user_message || '', userId, supabase);
    console.log(`🎯 Determined meal type: ${determinedMealType} (original: ${meal_type})`);

    // Generate nutritional information using OpenAI for each food
    const mealEntries = [];
    const nutritionalResults = [];

    // Check if this is a single meal request (from openai-food-assistant) or multiple foods
    if (food_name && calories_per_serving) {
      // Handle single meal with pre-calculated nutrition
      console.log(`Creating single meal: ${food_name}`);
      
      // Find or create food entry with exact nutritional match
      const { data: existingFoods, error: searchError } = await supabase
        .from('foods')
        .select('*')
        .eq('food_name', food_name);

      let foodId;
      let matchedFood = null;
      
      // Look for an exact nutritional match (with 2% tolerance)
      if (existingFoods && existingFoods.length > 0) {
        for (const food of existingFoods) {
          const caloriesDiff = Math.abs((food.calories_per_serving || 0) - calories_per_serving!) / calories_per_serving! * 100;
          const proteinDiff = Math.abs((food.protein_per_serving || 0) - protein_per_serving!) / protein_per_serving! * 100;
          
          if (caloriesDiff <= 2 && proteinDiff <= 2) {
            matchedFood = food;
            break;
          }
        }
      }

      if (matchedFood) {
        foodId = matchedFood.id;
        console.log(`✅ Found nutritionally matching food: ${food_name} (${matchedFood.calories_per_serving} kcal vs ${calories_per_serving} kcal)`);
      } else {
        // Create new food entry
        const { data: newFood, error: insertError } = await supabase
          .from('foods')
          .insert({
            food_id: `openai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            food_name: food_name,
            calories_per_serving: calories_per_serving,
            protein_per_serving: protein_per_serving,
            carbs_per_serving: carbs_per_serving,
            fat_per_serving: fat_per_serving,
            serving_description: 'Porción estándar'
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error inserting food:', insertError);
          throw new Error(`Error creating food entry: ${insertError.message}`);
        }

        foodId = newFood.id;
        console.log(`✅ Created new food entry: ${food_name} (${calories_per_serving} kcal) - no exact nutritional match found`);
      }

      // Create meal entry
      const { data: mealEntry, error: mealError } = await supabase
        .from('meal_entries')
        .insert({
          user_id: userId,
          food_id: foodId,
          servings: servings || 1,
          meal_type: determinedMealType,
          consumed_at: consumed_at ? new Date(consumed_at).toISOString() : new Date().toISOString()
        })
        .select()
        .single();

      if (mealError) {
        console.error('Error creating meal entry:', mealError);
        throw new Error(`Error creating meal entry: ${mealError.message}`);
      }

      mealEntries.push({
        ...mealEntry,
        food: {
          food_name,
          calories_per_serving,
          protein_per_serving,
          carbs_per_serving,
          fat_per_serving
        },
        calculated_calories: calories_per_serving * (servings || 1),
        calculated_protein: protein_per_serving * (servings || 1),
        calculated_carbs: carbs_per_serving * (servings || 1),
        calculated_fat: fat_per_serving * (servings || 1)
      });
    } else if (foods && foods.length > 0) {
      // Handle multiple foods (original functionality)
      const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
      if (!openaiApiKey) {
        throw new Error('OpenAI API key not configured');
      }

      for (const food of foods) {
      console.log(`Getting nutritional info for: ${food.name} (${food.servings} servings)`);
      
      // Use OpenAI to get nutritional information
      const nutritionalInfo = await getNutritionalInfoFromOpenAI(food.name, food.servings, openaiApiKey);
      
      if (nutritionalInfo) {
        nutritionalResults.push(nutritionalInfo);
        
        // Find or create food entry with exact nutritional match
        const { data: existingFoods, error: searchError } = await supabase
          .from('foods')
          .select('*')
          .eq('food_name', nutritionalInfo.food_name);

        let foodId;
        let matchedFood = null;
        
        // Look for an exact nutritional match (with 2% tolerance)
        if (existingFoods && existingFoods.length > 0) {
          for (const food of existingFoods) {
            const caloriesDiff = Math.abs((food.calories_per_serving || 0) - nutritionalInfo.calories_per_serving) / nutritionalInfo.calories_per_serving * 100;
            const proteinDiff = Math.abs((food.protein_per_serving || 0) - nutritionalInfo.protein_per_serving) / nutritionalInfo.protein_per_serving * 100;
            
            if (caloriesDiff <= 2 && proteinDiff <= 2) {
              matchedFood = food;
              break;
            }
          }
        }

        if (matchedFood) {
          foodId = matchedFood.id;
          console.log(`✅ Found nutritionally matching food: ${nutritionalInfo.food_name} (${matchedFood.calories_per_serving} kcal vs ${nutritionalInfo.calories_per_serving} kcal)`);
        } else {
          // Create new food entry
          const { data: newFood, error: insertError } = await supabase
            .from('foods')
            .insert({
              food_id: `openai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              food_name: nutritionalInfo.food_name,
              calories_per_serving: nutritionalInfo.calories_per_serving,
              protein_per_serving: nutritionalInfo.protein_per_serving,
              carbs_per_serving: nutritionalInfo.carbs_per_serving,
              fat_per_serving: nutritionalInfo.fat_per_serving,
              serving_description: nutritionalInfo.serving_description
            })
            .select()
            .single();

          if (insertError) {
            console.error('Error inserting food:', insertError);
            throw new Error(`Error creating food entry: ${insertError.message}`);
          }

          foodId = newFood.id;
          console.log(`✅ Created new food entry: ${nutritionalInfo.food_name} (${nutritionalInfo.calories_per_serving} kcal) - no exact nutritional match found`);
        }

        // Create meal entry
        const { data: mealEntry, error: mealError } = await supabase
          .from('meal_entries')
          .insert({
            user_id: userId,
            food_id: foodId,
            servings: food.servings,
            meal_type: determinedMealType,
            consumed_at: consumed_at ? new Date(consumed_at).toISOString() : new Date().toISOString()
          })
          .select()
          .single();

        if (mealError) {
          console.error('Error creating meal entry:', mealError);
          throw new Error(`Error creating meal entry: ${mealError.message}`);
        }

        mealEntries.push({
          ...mealEntry,
          food: nutritionalInfo,
          calculated_calories: nutritionalInfo.calories_per_serving * food.servings,
          calculated_protein: nutritionalInfo.protein_per_serving * food.servings,
          calculated_carbs: nutritionalInfo.carbs_per_serving * food.servings,
          calculated_fat: nutritionalInfo.fat_per_serving * food.servings
        });
      } else {
        throw new Error(`Could not get nutritional information for: ${food.name}`);
      }
      }
    } else {
      throw new Error('No food information provided');
    }

    // Calculate final totals
    const totals = mealEntries.reduce((acc, entry) => {
      return {
        calories: acc.calories + entry.calculated_calories,
        protein: acc.protein + entry.calculated_protein,
        carbs: acc.carbs + entry.calculated_carbs,
        fat: acc.fat + entry.calculated_fat
      };
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

    const response = {
      success: true,
      meal_type: determinedMealType,
      foods_processed: foods ? foods.length : 1,
      foods_saved: mealEntries.length,
      totals: {
        calories: Math.round(totals.calories),
        protein: Math.round(totals.protein * 10) / 10,
        carbs: Math.round(totals.carbs * 10) / 10,
        fat: Math.round(totals.fat * 10) / 10
      },
      meal_entries: mealEntries.map(entry => ({
        id: entry.id,
        food_name: entry.food.food_name,
        servings: entry.servings,
        calories: Math.round(entry.calculated_calories)
      }))
    };

    console.log('🎯 Final meal creation response:', response);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-meal-from-chat:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});