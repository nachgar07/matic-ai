import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
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

    console.log('Searching for:', searchQuery);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // First search in existing foods database
    const { data: existingFoods } = await supabase
      .from('foods')
      .select('*')
      .or(`food_name.ilike.%${searchQuery}%,brand_name.ilike.%${searchQuery}%`)
      .limit(10);

    console.log('Found existing foods:', existingFoods?.length || 0);

    let processedFoods = existingFoods || [];

    // If we have less than 5 results, try to add common foods
    if (processedFoods.length < 5) {
      const commonFoods = await searchCommonFoods(searchQuery, supabase);
      processedFoods = [...processedFoods, ...commonFoods];
    }

    return new Response(
      JSON.stringify({ foods: processedFoods }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function searchCommonFoods(query: string, supabase: any) {
  const commonFoodsDatabase = [
    // Proteínas
    { name: 'Pollo a la plancha', calories: 165, protein: 31, carbs: 0, fat: 3.6, serving: '100g' },
    { name: 'Pechuga de pollo', calories: 165, protein: 31, carbs: 0, fat: 3.6, serving: '100g' },
    { name: 'Carne de res', calories: 250, protein: 26, carbs: 0, fat: 15, serving: '100g' },
    { name: 'Pescado', calories: 206, protein: 22, carbs: 0, fat: 12, serving: '100g' },
    { name: 'Salmón', calories: 208, protein: 20, carbs: 0, fat: 13, serving: '100g' },
    { name: 'Atún', calories: 144, protein: 30, carbs: 0, fat: 1, serving: '100g' },
    { name: 'Huevo', calories: 155, protein: 13, carbs: 1.1, fat: 11, serving: '100g' },
    
    // Carbohidratos
    { name: 'Arroz blanco', calories: 130, protein: 2.7, carbs: 28, fat: 0.3, serving: '100g cocido' },
    { name: 'Arroz integral', calories: 111, protein: 2.6, carbs: 23, fat: 0.9, serving: '100g cocido' },
    { name: 'Papa', calories: 77, protein: 2, carbs: 17, fat: 0.1, serving: '100g' },
    { name: 'Pasta', calories: 131, protein: 5, carbs: 25, fat: 1.1, serving: '100g cocida' },
    { name: 'Pan integral', calories: 247, protein: 13, carbs: 41, fat: 4.2, serving: '100g' },
    { name: 'Avena', calories: 389, protein: 17, carbs: 66, fat: 7, serving: '100g' },
    { name: 'Quinoa', calories: 120, protein: 4.4, carbs: 22, fat: 1.9, serving: '100g cocida' },
    
    // Vegetales
    { name: 'Brócoli', calories: 34, protein: 2.8, carbs: 7, fat: 0.4, serving: '100g' },
    { name: 'Espinaca', calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, serving: '100g' },
    { name: 'Tomate', calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, serving: '100g' },
    { name: 'Zanahoria', calories: 41, protein: 0.9, carbs: 10, fat: 0.2, serving: '100g' },
    { name: 'Lechuga', calories: 15, protein: 1.4, carbs: 2.9, fat: 0.2, serving: '100g' },
    
    // Frutas
    { name: 'Manzana', calories: 52, protein: 0.3, carbs: 14, fat: 0.2, serving: '100g' },
    { name: 'Plátano', calories: 89, protein: 1.1, carbs: 23, fat: 0.3, serving: '100g' },
    { name: 'Naranja', calories: 47, protein: 0.9, carbs: 12, fat: 0.1, serving: '100g' },
    { name: 'Fresa', calories: 32, protein: 0.7, carbs: 8, fat: 0.3, serving: '100g' },
    { name: 'Aguacate', calories: 160, protein: 2, carbs: 9, fat: 15, serving: '100g' },
    
    // Lácteos
    { name: 'Leche descremada', calories: 34, protein: 3.4, carbs: 5, fat: 0.1, serving: '100ml' },
    { name: 'Yogur griego', calories: 59, protein: 10, carbs: 3.6, fat: 0.4, serving: '100g' },
    { name: 'Queso fresco', calories: 98, protein: 11, carbs: 3.4, fat: 4, serving: '100g' },
    
    // Frutos secos
    { name: 'Almendras', calories: 579, protein: 21, carbs: 22, fat: 50, serving: '100g' },
    { name: 'Nueces', calories: 654, protein: 15, carbs: 14, fat: 65, serving: '100g' },
    
    // Legumbres
    { name: 'Frijoles', calories: 127, protein: 9, carbs: 23, fat: 0.5, serving: '100g cocidos' },
    { name: 'Lentejas', calories: 116, protein: 9, carbs: 20, fat: 0.4, serving: '100g cocidas' },
    { name: 'Garbanzos', calories: 164, protein: 8, carbs: 27, fat: 2.6, serving: '100g cocidos' },
  ];

  const searchTerms = query.toLowerCase().split(' ');
  const matchedFoods = commonFoodsDatabase.filter(food => 
    searchTerms.some(term => food.name.toLowerCase().includes(term))
  );

  const results = [];
  for (const food of matchedFoods.slice(0, 10)) {
    try {
      // Check if food already exists
      const { data: existingFood } = await supabase
        .from('foods')
        .select('*')
        .eq('food_name', food.name)
        .single();

      if (!existingFood) {
        // Insert new food
        const food_id = `common_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        
        const { data: newFood, error } = await supabase
          .from('foods')
          .insert({
            food_id,
            food_name: food.name,
            brand_name: 'Base de datos común',
            serving_description: food.serving,
            calories_per_serving: food.calories,
            protein_per_serving: food.protein,
            carbs_per_serving: food.carbs,
            fat_per_serving: food.fat
          })
          .select()
          .single();

        if (!error && newFood) {
          results.push(newFood);
        }
      } else {
        results.push(existingFood);
      }
    } catch (error) {
      console.error('Error processing common food:', error);
    }
  }

  return results;
}