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
    const requestBody = await req.json();
    console.log('🔍 ADD-MEAL REQUEST BODY:', JSON.stringify(requestBody, null, 2));
    
    const { foodId, servings, mealType, plateImage, consumedAt } = requestBody;
    
    console.log('📝 PARSED PARAMETERS:', {
      foodId,
      servings: typeof servings,
      mealType: typeof mealType,
      mealTypeValue: mealType,
      plateImage: plateImage ? 'present' : 'null',
      consumedAt
    });
    
    if (!foodId || !servings || !mealType) {
      console.error('❌ MISSING REQUIRED PARAMETERS:', { foodId, servings, mealType });
      return new Response(
        JSON.stringify({ error: 'Food ID, servings, and meal type are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
    
    console.log('👤 USER AUTH:', { 
      userError: userError ? userError.message : null, 
      userId: user?.id,
      userEmail: user?.email 
    });
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // First, find the food by food_id to get the UUID
    console.log('🔍 SEARCHING FOR FOOD:', { foodId });
    
    const { data: foodData, error: foodError } = await supabase
      .from('foods')
      .select('id, food_name')
      .eq('food_id', foodId)
      .maybeSingle();

    console.log('🍽️ FOOD LOOKUP RESULT:', { 
      foodData, 
      foodError: foodError ? foodError.message : null 
    });

    if (foodError) {
      console.error('❌ ERROR FINDING FOOD:', foodError);
      return new Response(
        JSON.stringify({ error: 'Database error when finding food' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!foodData) {
      console.error('❌ FOOD NOT FOUND:', foodId);
      return new Response(
        JSON.stringify({ error: 'Food not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare meal entry data
    const mealEntryData = {
      user_id: user.id,
      food_id: foodData.id,
      servings: parseFloat(servings),
      meal_type: mealType,
      plate_image: plateImage || null,
      consumed_at: consumedAt || new Date().toISOString()
    };
    
    console.log('📝 MEAL ENTRY DATA TO INSERT:', JSON.stringify(mealEntryData, null, 2));

    // Insert meal entry using the UUID
    const { data: mealEntry, error: insertError } = await supabase
      .from('meal_entries')
      .insert(mealEntryData)
      .select(`
        *,
        foods (*)
      `)
      .single();

    console.log('💾 INSERT RESULT:', { 
      mealEntry, 
      insertError: insertError ? {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code
      } : null 
    });

    if (insertError) {
      console.error('❌ ERROR INSERTING MEAL ENTRY:', {
        error: insertError,
        attemptedData: mealEntryData
      });
      return new Response(
        JSON.stringify({ 
          error: 'Failed to add meal entry',
          details: insertError.message,
          code: insertError.code
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ mealEntry }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in add-meal function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});