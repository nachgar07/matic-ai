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
  console.log(`Looking up food in USDA: ${foodName}`);
  
  // Mapeo de nombres en español a términos de búsqueda en inglés más efectivos
  const foodMapping: { [key: string]: string } = {
    'miel': 'honey',
    'aguacate': 'avocado',
    'pollo': 'chicken breast',
    'arroz': 'rice cooked',
    'huevo': 'egg whole',
    'pan': 'bread',
    'leche': 'milk',
    'queso': 'cheese',
    'tomate': 'tomato',
    'cebolla': 'onion',
    'ajo': 'garlic',
    'aceite': 'oil olive'
  };
  
  const searchTerm = foodMapping[foodName.toLowerCase()] || foodName;
  
  // USDA FoodData Central API (público, no requiere API key)
  const searchUrl = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=DEMO_KEY&query=${encodeURIComponent(searchTerm)}&pageSize=3&dataType=Foundation,SR%20Legacy`;
  
  console.log(`USDA search URL: ${searchUrl}`);
  
  try {
    const response = await fetch(searchUrl);
    console.log(`USDA API response status: ${response.status}`);
    
    if (!response.ok) {
      console.error(`USDA API error: ${response.status} - ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    console.log(`USDA API response for ${searchTerm}:`, JSON.stringify(data, null, 2));
    
    if (!data.foods || data.foods.length === 0) {
      console.log(`No USDA data found for: ${searchTerm} (original: ${foodName})`);
      return null;
    }

    // Tomar el primer resultado (mejor match)
    const food: USDAFood = data.foods[0];
    console.log(`Found USDA match for ${foodName}: ${food.description}`);

    // Extraer nutrientes principales
    const nutrients = extractMainNutrients(food.foodNutrients);
    console.log(`Extracted nutrients for ${foodName}:`, nutrients);
    
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

  console.log('Processing nutrients:', nutrients.length);

  nutrients.forEach(nutrient => {
    console.log(`Nutrient ID: ${nutrient.nutrientId}, Name: ${nutrient.nutrientName}, Value: ${nutrient.value}, Unit: ${nutrient.unitName}`);
    
    // Calorías (Energy)
    if (nutrient.nutrientId === 1008 && nutrient.unitName === 'kcal') {
      result.calories = nutrient.value;
      console.log(`Found calories: ${nutrient.value}`);
    }
    // Proteína (Protein)
    else if (nutrient.nutrientId === 1003 && nutrient.unitName === 'g') {
      result.protein = nutrient.value;
      console.log(`Found protein: ${nutrient.value}g`);
    }
    // Carbohidratos totales (Carbohydrate, by difference)
    else if (nutrient.nutrientId === 1005 && nutrient.unitName === 'g') {
      result.carbs = nutrient.value;
      console.log(`Found carbs: ${nutrient.value}g`);
    }
    // Grasa total (Total lipid (fat))
    else if (nutrient.nutrientId === 1004 && nutrient.unitName === 'g') {
      result.fat = nutrient.value;
      console.log(`Found fat: ${nutrient.value}g`);
    }
  });

  console.log('Final nutrient result:', result);
  return result;
}