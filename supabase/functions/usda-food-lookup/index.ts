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
  console.log(`🔍 Looking up food in USDA: ${foodName}`);
  
  // 📚 Diccionario expandido de traducciones español-inglés con términos USDA precisos
  const foodMapping: { [key: string]: string } = {
    // Proteínas
    'pollo': 'chicken breast cooked without skin',
    'pechuga': 'chicken breast cooked without skin',
    'pavo': 'turkey breast cooked',
    'carne': 'beef cooked lean',
    'res': 'beef cooked lean',
    'cerdo': 'pork cooked lean',
    'pescado': 'fish cooked',
    'salmon': 'salmon cooked',
    'atun': 'tuna cooked',
    'camarón': 'shrimp cooked',
    'camaron': 'shrimp cooked',
    'huevo': 'egg whole cooked',
    
    // Carbohidratos
    'arroz': 'rice white cooked',
    'pasta': 'pasta cooked',
    'pan': 'bread whole wheat',
    'papa': 'potato cooked',
    'patata': 'potato cooked',
    'camote': 'sweet potato cooked',
    'batata': 'sweet potato cooked',
    'tortilla': 'corn tortilla',
    'avena': 'oats cooked',
    'quinoa': 'quinoa cooked',
    
    // Verduras
    'tomate': 'tomato raw',
    'jitomate': 'tomato raw',
    'lechuga': 'lettuce raw',
    'espinaca': 'spinach raw',
    'brócoli': 'broccoli cooked',
    'brocoli': 'broccoli cooked',
    'zanahoria': 'carrot raw',
    'calabacita': 'zucchini cooked',
    'calabaza': 'squash cooked',
    'cebolla': 'onion raw',
    'ajo': 'garlic raw',
    'pimiento': 'pepper sweet raw',
    'chile': 'pepper hot raw',
    'pepino': 'cucumber raw',
    'apio': 'celery raw',
    'coliflor': 'cauliflower cooked',
    'ejote': 'green beans cooked',
    'chícharo': 'peas cooked',
    'elote': 'corn cooked',
    'maíz': 'corn cooked',
    
    // Frutas
    'manzana': 'apple raw',
    'plátano': 'banana raw',
    'platano': 'banana raw',
    'naranja': 'orange raw',
    'fresa': 'strawberry raw',
    'uva': 'grapes raw',
    'piña': 'pineapple raw',
    'mango': 'mango raw',
    'papaya': 'papaya raw',
    'sandía': 'watermelon raw',
    'melón': 'melon raw',
    'pera': 'pear raw',
    'durazno': 'peach raw',
    'kiwi': 'kiwi raw',
    
    // Lácteos
    'leche': 'milk whole',
    'yogur': 'yogurt plain',
    'yogurt': 'yogurt plain',
    'queso': 'cheese cheddar',
    'requesón': 'cottage cheese',
    'crema': 'cream',
    
    // Grasas y aceites
    'aguacate': 'avocado raw',
    'aceite': 'oil olive',
    'mantequilla': 'butter',
    'nuez': 'nuts mixed',
    'almendra': 'almonds',
    'cacahuate': 'peanuts',
    
    // Otros
    'frijol': 'beans cooked',
    'lenteja': 'lentils cooked',
    'garbanzo': 'chickpeas cooked',
    'miel': 'honey'
  };
  
  // 🔄 Sinónimos y variaciones comunes
  const synonyms: { [key: string]: string[] } = {
    'pollo': ['pechuga', 'pollo cocido', 'pechuga de pollo'],
    'tomate': ['jitomate'],
    'papa': ['patata'],
    'camote': ['batata'],
    'plátano': ['platano', 'banana'],
    'calabacita': ['calabacín', 'zucchini'],
    'camarón': ['camaron', 'gamba']
  };
  
  const lowerFoodName = foodName.toLowerCase();
  let searchTerm = '';
  let matchedKeyword = '';
  
  // 1️⃣ Buscar coincidencia exacta en diccionario
  if (foodMapping[lowerFoodName]) {
    searchTerm = foodMapping[lowerFoodName];
    matchedKeyword = lowerFoodName;
    console.log(`✅ Exact match: "${foodName}" -> "${searchTerm}"`);
  } else {
    // 2️⃣ Buscar por palabras clave parciales (más flexible)
    for (const [key, value] of Object.entries(foodMapping)) {
      if (lowerFoodName.includes(key) || key.includes(lowerFoodName)) {
        searchTerm = value;
        matchedKeyword = key;
        console.log(`✅ Partial match: "${foodName}" -> "${searchTerm}" (keyword: ${key})`);
        break;
      }
    }
  }
  
  // 3️⃣ Si no hay coincidencia, agregar "cooked" a alimentos que suelen cocinarse
  if (!searchTerm) {
    const needsCookedSuffix = [
      'arroz', 'rice', 'pollo', 'chicken', 'carne', 'meat', 'beef',
      'pescado', 'fish', 'pasta', 'papa', 'potato', 'pavo', 'turkey',
      'cerdo', 'pork', 'frijol', 'beans', 'lenteja', 'lentils',
      'verdura', 'vegetable', 'brócoli', 'broccoli'
    ];
    
    for (const keyword of needsCookedSuffix) {
      if (lowerFoodName.includes(keyword) && 
          !lowerFoodName.includes('cooked') && 
          !lowerFoodName.includes('cocido') &&
          !lowerFoodName.includes('raw') &&
          !lowerFoodName.includes('crudo')) {
        searchTerm = `${foodName} cooked`;
        console.log(`➕ Added "cooked" suffix: "${foodName}" -> "${searchTerm}"`);
        break;
      }
    }
    
    // Si aún no hay término, usar el nombre original
    if (!searchTerm) {
      searchTerm = foodName;
      console.log(`⚠️ No mapping found, using original: "${searchTerm}"`);
    }
  }
  
  // 🌐 USDA FoodData Central API (público, no requiere API key)
  const searchUrl = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=DEMO_KEY&query=${encodeURIComponent(searchTerm)}&pageSize=5&dataType=Foundation,SR%20Legacy`;
  
  console.log(`🌐 USDA search URL: ${searchUrl}`);
  
  try {
    const response = await fetch(searchUrl);
    console.log(`📡 USDA API response status: ${response.status}`);
    
    if (!response.ok) {
      console.error(`❌ USDA API error: ${response.status} - ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    
    if (!data.foods || data.foods.length === 0) {
      console.log(`❌ No USDA data found for: ${searchTerm} (original: ${foodName})`);
      return null;
    }

    // Tomar el primer resultado (mejor match)
    const food: USDAFood = data.foods[0];
    console.log(`✅ Found USDA match: ${food.description}`);
    console.log(`📊 Food nutrients array length: ${food.foodNutrients?.length || 0}`);

    // Extraer nutrientes principales
    const nutrients = extractMainNutrients(food.foodNutrients);
    console.log(`📊 Extracted nutrients for "${foodName}":`, nutrients);
    
    // ⚠️ Validación de datos: rechazar si los valores son sospechosamente incorrectos
    const isValid = validateNutrients(nutrients, foodName, matchedKeyword);
    if (!isValid) {
      console.log(`⚠️ Nutrient values failed validation, returning null`);
      return null;
    }
    
    return {
      name: foodName,
      calories: nutrients.calories,
      protein: nutrients.protein,
      carbs: nutrients.carbs,
      fat: nutrients.fat,
      per100g: true // USDA data is typically per 100g
    };

  } catch (error) {
    console.error(`❌ Error fetching USDA data for ${foodName}:`, error);
    return null;
  }
}

// 🔍 Validación de valores nutricionales para detectar datos incorrectos
function validateNutrients(nutrients: any, foodName: string, matchedKeyword: string): boolean {
  const { calories, protein, carbs, fat } = nutrients;
  
  // Valores básicos que deben cumplirse
  if (calories < 0 || protein < 0 || carbs < 0 || fat < 0) {
    console.log(`❌ Validation failed: Negative values found`);
    return false;
  }
  
  // Verificar que las calorías calculadas sean razonables (1g proteína = 4 cal, 1g carbs = 4 cal, 1g fat = 9 cal)
  const calculatedCalories = (protein * 4) + (carbs * 4) + (fat * 9);
  const calorieDiff = Math.abs(calories - calculatedCalories);
  
  // Permitir hasta 20% de diferencia (algunos alimentos tienen fibra, alcohol, etc.)
  if (calorieDiff > calories * 0.3) {
    console.log(`⚠️ Warning: Calorie calculation mismatch. Reported: ${calories}, Calculated: ${calculatedCalories.toFixed(0)}`);
    // No fallar por esto, solo advertir
  }
  
  // Validaciones específicas por tipo de alimento
  const lowerFood = foodName.toLowerCase();
  const lowerKeyword = matchedKeyword.toLowerCase();
  
  // Verduras: generalmente bajas en calorías (< 100 cal/100g)
  if (['lechuga', 'espinaca', 'calabacita', 'pepino', 'apio', 'tomate', 'jitomate'].some(v => lowerFood.includes(v) || lowerKeyword.includes(v))) {
    if (calories > 100) {
      console.log(`❌ Validation failed: Vegetable has too many calories (${calories} > 100)`);
      return false;
    }
  }
  
  // Proteínas magras: alto en proteína, bajo en grasa
  if (['pollo', 'pechuga', 'pavo', 'pescado'].some(p => lowerFood.includes(p) || lowerKeyword.includes(p))) {
    if (protein < 15) {
      console.log(`❌ Validation failed: Lean protein has too little protein (${protein}g < 15g)`);
      return false;
    }
    if (carbs > 2) {
      console.log(`❌ Validation failed: Meat has too many carbs (${carbs}g > 2g)`);
      return false;
    }
  }
  
  console.log(`✅ Validation passed for "${foodName}"`);
  return true;
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
    
    // Calorías (Energy) - ID 1008 con unidad KCAL
    if (nutrient.nutrientId === 1008 && nutrient.unitName === 'KCAL') {
      result.calories = nutrient.value;
      console.log(`Found calories: ${nutrient.value}`);
    }
    // Proteína (Protein) - ID 1003 con unidad G
    else if (nutrient.nutrientId === 1003 && nutrient.unitName === 'G') {
      result.protein = nutrient.value;
      console.log(`Found protein: ${nutrient.value}g`);
    }
    // Carbohidratos totales (Carbohydrate, by difference) - ID 1005 con unidad G
    else if (nutrient.nutrientId === 1005 && nutrient.unitName === 'G') {
      result.carbs = nutrient.value;
      console.log(`Found carbs: ${nutrient.value}g`);
    }
    // Grasa total (Total lipid (fat)) - ID 1004 con unidad G
    else if (nutrient.nutrientId === 1004 && nutrient.unitName === 'G') {
      result.fat = nutrient.value;
      console.log(`Found fat: ${nutrient.value}g`);
    }
  });

  console.log('Final nutrient result:', result);
  return result;
}