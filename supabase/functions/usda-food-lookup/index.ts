import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface USDANutrient {
  nutrientId: number;
  nutrientName: string;
  value: number;
  unitName: string;
}

interface USDAFood {
  fdcId: number;
  description: string;
  foodNutrients: USDANutrient[];
}

interface FoodMatch {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  per100g: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { foodNames } = await req.json();
    
    if (!foodNames || !Array.isArray(foodNames)) {
      throw new Error('foodNames array is required');
    }

    const results = await Promise.all(
      foodNames.map(async (foodName: string) => {
        try {
          return await lookupFoodInUSDA(foodName);
        } catch (error) {
          console.error(`Error looking up ${foodName}:`, error);
          return null;
        }
      })
    );

    return new Response(
      JSON.stringify({ results: results.filter(r => r !== null) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in usda-food-lookup:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function lookupFoodInUSDA(foodName: string): Promise<FoodMatch | null> {
  // USDA FoodData Central API (público, no requiere API key)
  const searchUrl = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=DEMO_KEY&query=${encodeURIComponent(foodName)}&pageSize=5&dataType=Foundation,SR%20Legacy`;
  
  try {
    const response = await fetch(searchUrl);
    
    if (!response.ok) {
      console.error(`USDA API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (!data.foods || data.foods.length === 0) {
      console.log(`No USDA data found for: ${foodName}`);
      return null;
    }

    // Tomar el primer resultado (mejor match)
    const food: USDAFood = data.foods[0];
    console.log(`Found USDA match for ${foodName}: ${food.description}`);

    // Extraer nutrientes principales
    const nutrients = extractMainNutrients(food.foodNutrients);
    
    return {
      name: foodName,
      calories: nutrients.calories,
      protein: nutrients.protein,
      carbs: nutrients.carbs,
      fat: nutrients.fat,
      per100g: true // USDA data is typically per 100g
    };

  } catch (error) {
    console.error(`Error fetching USDA data for ${foodName}:`, error);
    return null;
  }
}

function extractMainNutrients(nutrients: USDANutrient[]) {
  const result = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0
  };

  nutrients.forEach(nutrient => {
    // Calorías (Energy)
    if (nutrient.nutrientId === 1008 && nutrient.unitName === 'kcal') {
      result.calories = nutrient.value;
    }
    // Proteína (Protein)
    else if (nutrient.nutrientId === 1003 && nutrient.unitName === 'g') {
      result.protein = nutrient.value;
    }
    // Carbohidratos totales (Carbohydrate, by difference)
    else if (nutrient.nutrientId === 1005 && nutrient.unitName === 'g') {
      result.carbs = nutrient.value;
    }
    // Grasa total (Total lipid (fat))
    else if (nutrient.nutrientId === 1004 && nutrient.unitName === 'g') {
      result.fat = nutrient.value;
    }
  });

  return result;
}