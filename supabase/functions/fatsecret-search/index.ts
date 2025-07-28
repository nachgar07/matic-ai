import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// FatSecret OAuth 1.0 signature generation
function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  clientSecret: string,
  tokenSecret = ''
): string {
  // Normalize parameters
  const normalizedParams = Object.keys(params)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');

  // Create signature base string
  const signatureBaseString = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(normalizedParams)
  ].join('&');

  // Create signing key
  const signingKey = `${encodeURIComponent(clientSecret)}&${encodeURIComponent(tokenSecret)}`;

  // Generate HMAC-SHA1 signature
  const encoder = new TextEncoder();
  const keyBuffer = encoder.encode(signingKey);
  const dataBuffer = encoder.encode(signatureBaseString);

  return crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  ).then(key => 
    crypto.subtle.sign('HMAC', key, dataBuffer)
  ).then(signature => {
    const base64Signature = btoa(String.fromCharCode(...new Uint8Array(signature)));
    return base64Signature;
  });
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { searchQuery } = await req.json();
    
    if (!searchQuery) {
      return new Response(
        JSON.stringify({ error: 'Search query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const clientId = Deno.env.get('FATSECRET_CLIENT_ID');
    const clientSecret = Deno.env.get('FATSECRET_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: 'FatSecret credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // FatSecret API endpoint
    const apiUrl = 'https://platform.fatsecret.com/rest/server.api';
    
    // OAuth 1.0 parameters
    const oauthParams = {
      oauth_consumer_key: clientId,
      oauth_nonce: Math.random().toString(36).substring(2, 15),
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_version: '1.0',
      method: 'foods.search',
      search_expression: searchQuery,
      format: 'json'
    };

    // Generate OAuth signature
    const signature = await generateOAuthSignature('GET', apiUrl, oauthParams, clientSecret);
    oauthParams['oauth_signature'] = signature;

    // Build query string
    const queryString = Object.keys(oauthParams)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(oauthParams[key])}`)
      .join('&');

    const fullUrl = `${apiUrl}?${queryString}`;

    console.log('Making request to FatSecret API:', fullUrl);

    // Make request to FatSecret API
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      console.error('FatSecret API error:', response.status, await response.text());
      return new Response(
        JSON.stringify({ error: 'Failed to search foods' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('FatSecret API response:', data);

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Process and store food data
    const foods = data.foods?.food || [];
    const processedFoods = [];

    for (const food of foods.slice(0, 10)) { // Limit to first 10 results
      try {
        // Check if food already exists
        const { data: existingFood } = await supabase
          .from('foods')
          .select('*')
          .eq('food_id', food.food_id)
          .single();

        if (!existingFood) {
          // Insert new food
          const { data: insertedFood, error } = await supabase
            .from('foods')
            .insert({
              food_id: food.food_id,
              food_name: food.food_name,
              brand_name: food.brand_name || null,
              serving_description: food.food_description || null,
              calories_per_serving: null, // Will be fetched in detail later
              carbs_per_serving: null,
              protein_per_serving: null,
              fat_per_serving: null
            })
            .select()
            .single();

          if (!error && insertedFood) {
            processedFoods.push(insertedFood);
          }
        } else {
          processedFoods.push(existingFood);
        }
      } catch (error) {
        console.error('Error processing food:', error);
      }
    }

    return new Response(
      JSON.stringify({ 
        foods: processedFoods,
        raw_data: data // Include raw data for debugging
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fatsecret-search function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});