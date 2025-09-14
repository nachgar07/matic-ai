import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { foodId, servings, mealType, plateImage, consumedAt } = await req.json();
    
    console.log('📥 ADD-MEAL REQUEST:', { foodId, servings, mealType, hasPlateImage: !!plateImage });

    // Validate required parameters
    if (!foodId || !servings || !mealType) {
      console.error('❌ Missing required parameters:', { foodId, servings, mealType });
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: foodId, servings, mealType' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get the user from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ No authorization header');
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('❌ Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('✅ User authenticated:', user.id);

    // Look up the food by foodId (supports UUID `id` or string `food_id`)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(foodId);

    let foodLookup = await supabase
      .from('foods')
      .select('id')
      .eq(isUuid ? 'id' : 'food_id', foodId)
      .single();

    // Fallback: if we tried as UUID and failed, try by `food_id`
    if ((foodLookup.error || !foodLookup.data) && isUuid) {
      foodLookup = await supabase
        .from('foods')
        .select('id')
        .eq('food_id', foodId)
        .single();
    }

    const food = foodLookup.data;
    const foodError = foodLookup.error;

    if (foodError || !food) {
      console.error('❌ Food not found:', foodError);
      return new Response(
        JSON.stringify({ error: 'Food not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('✅ Food found:', food.id);

    // Insert the meal entry
    const mealEntry = {
      user_id: user.id,
      food_id: food.id,
      servings: parseFloat(servings),
      meal_type: mealType,
      consumed_at: consumedAt || new Date().toISOString(),
      plate_image: plateImage || null,
    };

    console.log('💾 Inserting meal entry:', { ...mealEntry, plate_image: plateImage ? '[IMAGE_DATA]' : null });

    const { data: insertedMeal, error: insertError } = await supabase
      .from('meal_entries')
      .insert(mealEntry)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to insert meal entry', details: insertError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('✅ ADD-MEAL SUCCESS:', { mealEntry: insertedMeal });

    return new Response(
      JSON.stringify({ mealEntry: insertedMeal }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ ADD-MEAL ERROR:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});