import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Generate OAuth 1.0 signature for FatSecret API
async function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  clientSecret: string
): Promise<string> {
  // Sort parameters
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');

  // Create signature base string
  const signatureBase = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(sortedParams)
  ].join('&');

  // Create signing key (consumer secret + '&' + token secret, but we don't have token secret)
  const signingKey = `${encodeURIComponent(clientSecret)}&`;

  // Generate HMAC-SHA1 signature
  const encoder = new TextEncoder();
  const keyData = encoder.encode(signingKey);
  const messageData = encoder.encode(signatureBase);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

// Translation dictionary for Spanish to English food terms
function translateFoodTerm(term: string): string[] {
  const translations: Record<string, string[]> = {
    // Vegetables
    'remolacha': ['beetroot', 'beet'],
    'berenjena': ['eggplant', 'aubergine'],
    'calabacín': ['zucchini', 'courgette'],
    'calabaza': ['pumpkin', 'squash'],
    'apio': ['celery'],
    'alcachofa': ['artichoke'],
    'coliflor': ['cauliflower'],
    'repollo': ['cabbage'],
    'col': ['cabbage'],
    'espinaca': ['spinach'],
    'lechuga': ['lettuce'],
    'tomate': ['tomato'],
    'pepino': ['cucumber'],
    'pimiento': ['pepper', 'bell pepper'],
    'cebolla': ['onion'],
    'ajo': ['garlic'],
    'zanahoria': ['carrot'],
    'papa': ['potato'],
    'patata': ['potato'],
    
    // Fruits
    'manzana': ['apple'],
    'pera': ['pear'],
    'plátano': ['banana'],
    'naranja': ['orange'],
    'limón': ['lemon'],
    'fresa': ['strawberry'],
    'uva': ['grape'],
    'piña': ['pineapple'],
    'mango': ['mango'],
    'aguacate': ['avocado'],
    'melón': ['melon'],
    'sandía': ['watermelon'],
    
    // Proteins
    'pollo': ['chicken'],
    'res': ['beef'],
    'cerdo': ['pork'],
    'pescado': ['fish'],
    'salmón': ['salmon'],
    'atún': ['tuna'],
    'huevo': ['egg'],
    'jamón': ['ham'],
    'tocino': ['bacon'],
    
    // Grains & Carbs
    'arroz': ['rice'],
    'pasta': ['pasta'],
    'pan': ['bread'],
    'avena': ['oats', 'oatmeal'],
    'quinoa': ['quinoa'],
    'trigo': ['wheat'],
    'cebada': ['barley'],
    
    // Dairy
    'leche': ['milk'],
    'queso': ['cheese'],
    'yogur': ['yogurt'],
    'mantequilla': ['butter'],
    'crema': ['cream'],
    
    // Legumes
    'frijol': ['bean', 'beans'],
    'frijoles': ['beans'],
    'lenteja': ['lentil'],
    'lentejas': ['lentils'],
    'garbanzo': ['chickpea'],
    'garbanzos': ['chickpeas'],
    
    // Nuts
    'almendra': ['almond'],
    'nuez': ['walnut', 'nut'],
    'maní': ['peanut'],
    'cacahuate': ['peanut'],
  };
  
  const lowerTerm = term.toLowerCase();
  return translations[lowerTerm] || [term];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { searchQuery, page = 0, limit = 8 } = await req.json();
    
    if (!searchQuery) {
      return new Response(
        JSON.stringify({ error: 'Search query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const clientId = Deno.env.get('FATSECRET_CLIENT_ID');
    const clientSecret = Deno.env.get('FATSECRET_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      console.error('FatSecret credentials missing');
      return new Response(
        JSON.stringify({ error: 'FatSecret credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Searching FatSecret API for:', searchQuery, 'page:', page);

    // First check if we have existing foods in our database
    const { data: existingFoods } = await supabase
      .from('foods')
      .select('*')
      .ilike('food_name', `%${searchQuery}%`)
      .range(page * limit, (page + 1) * limit - 1);

    // If we have enough existing foods, return them first for speed
    if (existingFoods && existingFoods.length >= limit && page === 0) {
      console.log('Returning existing foods from database:', existingFoods.length);
      return new Response(
        JSON.stringify({ foods: existingFoods, hasMore: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Translate search terms if needed (only for first page)
    const searchTerms = page === 0 ? searchQuery.split(' ') : [searchQuery];
    const translatedTerms = page === 0 ? searchTerms.flatMap(term => translateFoodTerm(term)) : [];
    const allSearchTerms = [...new Set([searchQuery, ...translatedTerms])];
    
    console.log('Search terms to try:', allSearchTerms);

    // FatSecret API endpoint
    const apiUrl = 'https://platform.fatsecret.com/rest/server.api';
    
    let allProcessedFoods = existingFoods || [];
    const seenFoodNames = new Set(allProcessedFoods.map(f => f.food_name.toLowerCase()));
    
    // Try searching with the main term only for speed
    const searchTerm = allSearchTerms[0];
    
    try {
      console.log('Trying search term:', searchTerm);
      
      // Generate OAuth parameters
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const nonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      const oauthParams = {
        oauth_consumer_key: clientId,
        oauth_nonce: nonce,
        oauth_signature_method: 'HMAC-SHA1',
        oauth_timestamp: timestamp,
        oauth_version: '1.0',
        method: 'foods.search',
        search_expression: searchTerm,
        format: 'json',
        max_results: (limit * 2).toString() // Get double to account for filtering
      };

      // Generate signature
      const signature = await generateOAuthSignature('GET', apiUrl, oauthParams, clientSecret);
      
      // Build request URL
      const allParams = { ...oauthParams, oauth_signature: signature };
      const queryString = Object.keys(allParams)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(allParams[key])}`)
        .join('&');

      const fullUrl = `${apiUrl}?${queryString}`;
      console.log('Making FatSecret API request for term:', searchTerm);

      // Make API request
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        console.log(`Search failed for "${searchTerm}" with status ${response.status}`);
      } else {
        const data = await response.json();

        if (!data.error) {
          // Process search results - optimized batch processing
          const foods = data.foods?.food || [];
          console.log(`Found ${foods.length} foods for "${searchTerm}"`);
          
          // Sort foods by relevance - prioritize simple, basic foods
          const sortedFoods = foods.sort((a, b) => {
            const aName = a.food_name.toLowerCase();
            const bName = b.food_name.toLowerCase();
            const searchLower = searchTerm.toLowerCase();
            
            // Heavily penalize foods with specific brand names (especially fast food/processed)
            const problematicBrands = [
              'Papa John\'s', 'Taco Bell', 'McDonald\'s', 'KFC', 'Burger King', 'Trader Joe\'s',
              'Wendy\'s', 'Subway', 'Pizza Hut', 'Domino\'s', 'Puerto Rican', 'Mexican', 'Chinese'
            ];
            const aHasBadBrand = problematicBrands.some(brand => 
              (a.brand_name && a.brand_name.includes(brand)) || aName.includes(brand.toLowerCase())
            );
            const bHasBadBrand = problematicBrands.some(brand => 
              (b.brand_name && b.brand_name.includes(brand)) || bName.includes(brand.toLowerCase())
            );
            
            if (aHasBadBrand && !bHasBadBrand) return 1;
            if (!aHasBadBrand && bHasBadBrand) return -1;
            
            // Heavily penalize foods with complex preparations or styles
            const complexIndicators = [
              'style', 'seasoned', 'recipe', 'fritters', 'frituras', 'fried', 'frito', 'frita',
              'stuffed', 'rellena', 'battered', 'breaded', 'tempura', 'crispy', 'crunchy',
              'sauce', 'salsa', 'gravy', 'creamy', 'cheesy', 'spicy', 'hot', 'buffalo',
              'barbecue', 'teriyaki', 'honey', 'glazed', 'marinated', 'grilled', 'roasted'
            ];
            
            const aIsComplex = complexIndicators.some(indicator => aName.includes(indicator));
            const bIsComplex = complexIndicators.some(indicator => bName.includes(indicator));
            
            if (aIsComplex && !bIsComplex) return 1;
            if (!aIsComplex && bIsComplex) return -1;
            
            // Heavily prioritize exact or very close matches
            if (aName === searchLower && bName !== searchLower) return -1;
            if (bName === searchLower && aName !== searchLower) return 1;
            
            // For "papa hervida" specifically, prioritize "boiled" over anything else
            if (searchLower.includes('hervida')) {
              const aHasBoiled = aName.includes('boiled') || aName.includes('hervida');
              const bHasBoiled = bName.includes('boiled') || bName.includes('hervida');
              
              if (aHasBoiled && !bHasBoiled) return -1;
              if (!aHasBoiled && bHasBoiled) return 1;
            }
            
            // Prioritize foods without brand names or with basic database entries
            const aIsBasic = !a.brand_name || a.brand_name === 'Base de datos común' || a.brand_name === 'USDA';
            const bIsBasic = !b.brand_name || b.brand_name === 'Base de datos común' || b.brand_name === 'USDA';
            
            if (aIsBasic && !bIsBasic) return -1;
            if (!aIsBasic && bIsBasic) return 1;
            
            // Prioritize shorter, simpler names (usually more basic)
            const aLength = aName.length;
            const bLength = bName.length;
            if (Math.abs(aLength - bLength) > 20) {
              return aLength - bLength;
            }
            
            // Final tiebreaker: alphabetical
            return aName.localeCompare(bName);
          });
          
          // Process foods and filter duplicates
          for (const food of sortedFoods) {
            if (allProcessedFoods.length >= limit) break;
            
            // Skip if we already have this food name
            if (seenFoodNames.has(food.food_name.toLowerCase())) continue;
            seenFoodNames.add(food.food_name.toLowerCase());
            
            try {
              // Check if food exists in our database
              const { data: existingFood } = await supabase
                .from('foods')
                .select('*')
                .eq('food_id', food.food_id)
                .maybeSingle();

            if (existingFood) {
              allProcessedFoods.push(existingFood);
              continue;
            }

            // Get detailed nutrition info for new foods (simplified for speed)
            const detailParams = {
              oauth_consumer_key: clientId,
              oauth_nonce: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
              oauth_signature_method: 'HMAC-SHA1',
              oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
              oauth_version: '1.0',
              method: 'food.get',
              food_id: food.food_id,
              format: 'json'
            };

            const detailSignature = await generateOAuthSignature('GET', apiUrl, detailParams, clientSecret);
            const detailAllParams = { ...detailParams, oauth_signature: detailSignature };
            const detailQueryString = Object.keys(detailAllParams)
              .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(detailAllParams[key])}`)
              .join('&');

            const detailUrl = `${apiUrl}?${detailQueryString}`;
            const detailResponse = await fetch(detailUrl);
            
            if (detailResponse.ok) {
              const detailData = await detailResponse.json();

              let calories = 0, protein = 0, carbs = 0, fat = 0, servingDesc = '1 porción';

              if (detailData.food && !detailData.error) {
                const serving = detailData.food.servings?.serving;
                if (serving) {
                  const firstServing = Array.isArray(serving) ? serving[0] : serving;
                  calories = parseFloat(firstServing.calories || '0');
                  protein = parseFloat(firstServing.protein || '0');
                  carbs = parseFloat(firstServing.carbohydrate || '0');
                  fat = parseFloat(firstServing.fat || '0');
                  servingDesc = firstServing.serving_description || '1 porción';
                }
              }

              // Insert food with nutrition data
              const { data: newFood, error } = await supabase
                .from('foods')
                .insert({
                  food_id: food.food_id,
                  food_name: food.food_name,
                  brand_name: food.brand_name || null,
                  serving_description: servingDesc,
                  calories_per_serving: calories,
                  protein_per_serving: protein,
                  carbs_per_serving: carbs,
                  fat_per_serving: fat
                })
                .select()
                .single();

              if (!error && newFood) {
                allProcessedFoods.push(newFood);
              }
            }

          } catch (error) {
            console.error('Error processing food:', food.food_id, error);
            continue;
            }
          }
        }
      }
        
    } catch (error) {
      console.error(`Error searching for "${searchTerm}":`, error);
    }

    console.log('Total processed foods count:', allProcessedFoods.length);

    // Determine if there are more results available
    const hasMore = allProcessedFoods.length >= limit;

    return new Response(
      JSON.stringify({ 
        foods: allProcessedFoods.slice(0, limit),
        hasMore: hasMore,
        total: allProcessedFoods.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: 'Error searching foods' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});