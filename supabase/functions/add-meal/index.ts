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
    const { foodId, servings, mealType, plateImage, consumedAt } = await req.json();
    
    if (!foodId || !servings || !mealType) {
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
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // First, find the food by food_id to get the UUID
    const { data: foodData, error: foodError } = await supabase
      .from('foods')
      .select('id')
      .eq('food_id', foodId)
      .maybeSingle();

    if (foodError) {
      console.error('Error finding food:', foodError);
      return new Response(
        JSON.stringify({ error: 'Database error when finding food' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!foodData) {
      console.error('Food not found with food_id:', foodId);
      return new Response(
        JSON.stringify({ error: 'Food not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert meal entry using the UUID
    const { data: mealEntry, error: insertError } = await supabase
      .from('meal_entries')
      .insert({
        user_id: user.id,
        food_id: foodData.id,
        servings: parseFloat(servings),
        meal_type: mealType,
        plate_image: plateImage || null,
        consumed_at: consumedAt || new Date().toISOString()
      })
      .select(`
        *,
        foods (*)
      `)
      .single();

    if (insertError) {
      console.error('Error inserting meal entry:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to add meal entry' }),
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