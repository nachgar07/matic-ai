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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { food_id, food_name, brand_name, calories_per_serving, protein_per_serving, carbs_per_serving, fat_per_serving, serving_description } = await req.json()

    // Insert the food into the foods table
    const { data: foodData, error: foodError } = await supabase
      .from('foods')
      .insert({
        food_id,
        food_name,
        brand_name,
        calories_per_serving,
        protein_per_serving,
        carbs_per_serving,
        fat_per_serving,
        serving_description
      })
      .select()
      .single()

    if (foodError) {
      console.error('Error inserting food:', foodError)
      return new Response(
        JSON.stringify({ error: 'Failed to insert food' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify(foodData),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})