import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FoodAnalysisResult {
  foods: Array<{
    name: string;
    estimated_portion: string;
    estimated_calories: number;
    confidence: number;
  }>;
  total_estimated_calories: number;
  suggestions: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, imageBase64, text, conversationHistory, userContext } = await req.json();
    const apiKey = Deno.env.get('GOOGLE_AI_API_KEY');
    
    if (!apiKey) {
      throw new Error('Google AI API key not configured');
    }

    if (action === 'analyze-food') {
      return await analyzeFoodImage(imageBase64, apiKey);
    } else if (action === 'chat') {
      return await handleConversation(text, conversationHistory, apiKey, userContext);
    } else {
      throw new Error('Invalid action. Use "analyze-food" or "chat"');
    }

  } catch (error) {
    console.error('Error in gemini-food-assistant:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function analyzeFoodImage(imageBase64: string, apiKey: string) {
  console.log('Analyzing food image with Gemini Vision...');
  
  const prompt = `Analiza esta imagen de comida y proporciona la siguiente información en formato JSON exacto:

{
  "foods": [
    {
      "name": "nombre del alimento en español",
      "estimated_portion": "descripción de la porción (ej: 1 taza, 150g, 1 pieza mediana)",
      "estimated_calories": número_estimado_de_calorías,
      "confidence": nivel_de_confianza_del_0_al_1
    }
  ],
  "total_estimated_calories": total_de_calorías_estimadas,
  "suggestions": ["consejos nutricionales breves en español"]
}

Instrucciones importantes:
- Identifica TODOS los alimentos visibles en la imagen
- Estima las porciones de manera realista basándote en el tamaño visual
- Proporciona estimaciones calóricas conservadoras pero precisas
- Si hay múltiples elementos del mismo alimento, agrégalos como elementos separados
- Incluye 2-3 consejos nutricionales relevantes
- Responde SOLO con el JSON, sin texto adicional`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: "image/jpeg",
              data: imageBase64
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.1,
        topK: 32,
        topP: 1,
        maxOutputTokens: 2048,
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API error:', errorText);
    throw new Error(`Gemini API error: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  console.log('Gemini response:', JSON.stringify(result, null, 2));

  if (!result.candidates || !result.candidates[0] || !result.candidates[0].content) {
    throw new Error('Invalid response from Gemini API');
  }

  const analysisText = result.candidates[0].content.parts[0].text;
  
  try {
    // Clean the response to extract JSON
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    
    const analysis: FoodAnalysisResult = JSON.parse(jsonMatch[0]);
    
    // Now search for detailed nutritional info using FatSecret
    const enrichedFoods = await Promise.all(
      analysis.foods.map(async (food) => {
        try {
          const searchResult = await searchFoodInFatSecret(food.name);
          return {
            ...food,
            fatsecret_data: searchResult
          };
        } catch (error) {
          console.error(`Error searching ${food.name} in FatSecret:`, error);
          return food;
        }
      })
    );

    return new Response(
      JSON.stringify({
        ...analysis,
        foods: enrichedFoods,
        processing_time: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (parseError) {
    console.error('Error parsing Gemini response:', parseError);
    console.error('Raw response:', analysisText);
    throw new Error(`Failed to parse analysis: ${parseError.message}`);
  }
}

async function searchFoodInFatSecret(foodName: string) {
  console.log(`Searching for "${foodName}" in FatSecret...`);
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const { data, error } = await supabase.functions.invoke('fatsecret-search', {
      body: { searchQuery: foodName }
    });

    if (error) {
      console.error('FatSecret search error:', error);
      return null;
    }

    // Return the first relevant result if available
    if (data?.foods && data.foods.length > 0) {
      return data.foods[0];
    }

    return null;
  } catch (error) {
    console.error('Error calling FatSecret search:', error);
    return null;
  }
}

async function handleConversation(text: string, conversationHistory: any[], apiKey: string, userContext: any) {
  console.log('Handling conversation with Gemini...');
  console.log('User context received:', userContext ? 'yes' : 'no');
  
  // Build dynamic system prompt with user context
  let systemPrompt = `Eres un asistente nutricional inteligente y amigable llamado NutriAI. Tu trabajo es:

1. Ayudar a los usuarios con sus objetivos nutricionales
2. Analizar sus hábitos alimenticios
3. Dar consejos personalizados y motivación
4. Responder preguntas sobre nutrición de manera clara y útil
5. Mantener un tono conversacional, amigable y motivador

Características importantes:
- Responde en español
- Sé conciso pero informativo
- Da consejos prácticos y realistas
- Pregunta por detalles cuando sea necesario
- Celebra los logros del usuario
- Ofrece alternativas saludables
- No reemplazas el consejo médico profesional`;

  // Add user context if available
  if (userContext) {
    systemPrompt += `

INFORMACIÓN ACTUALIZADA DEL USUARIO:

Usuario: ${userContext.user.display_name}

OBJETIVOS NUTRICIONALES DIARIOS:
- Calorías: ${userContext.goals.daily_calories} kcal
- Proteína: ${userContext.goals.daily_protein}g
- Carbohidratos: ${userContext.goals.daily_carbs}g
- Grasas: ${userContext.goals.daily_fat}g

PROGRESO DE HOY:
- Calorías consumidas: ${Math.round(userContext.today.consumed.calories)}/${userContext.goals.daily_calories} kcal
- Proteína: ${Math.round(userContext.today.consumed.protein * 10) / 10}/${userContext.goals.daily_protein}g
- Carbohidratos: ${Math.round(userContext.today.consumed.carbs * 10) / 10}/${userContext.goals.daily_carbs}g
- Grasas: ${Math.round(userContext.today.consumed.fat * 10) / 10}/${userContext.goals.daily_fat}g
- Total de comidas registradas hoy: ${userContext.today.meal_count}

COMIDAS DE HOY:`;

    // Add today's meals breakdown
    Object.entries(userContext.today.meals).forEach(([mealType, foods]: [string, any]) => {
      const mealTypeNames: { [key: string]: string } = {
        breakfast: 'Desayuno',
        lunch: 'Almuerzo', 
        dinner: 'Cena',
        snack: 'Snack'
      };
      
      systemPrompt += `\n${mealTypeNames[mealType] || mealType}:`;
      foods.forEach((food: any) => {
        systemPrompt += `\n  - ${food.food_name} (${food.servings} porción${food.servings === 1 ? '' : 'es'}) - ${Math.round(food.calories)} kcal`;
      });
    });

    if (userContext.recent_patterns.frequent_foods.length > 0) {
      systemPrompt += `\n\nALIMENTOS MÁS FRECUENTES (últimos 7 días):`;
      userContext.recent_patterns.frequent_foods.forEach((item: any) => {
        systemPrompt += `\n- ${item.food} (${item.count} veces)`;
      });
    }

    systemPrompt += `\n\nUSA ESTA INFORMACIÓN para dar consejos personalizados, celebrar el progreso, identificar patrones y sugerir mejoras específicas. Mantén un tono motivador y personaliza tus respuestas según el progreso actual del usuario.`;
  }

  const messages = [
    { role: 'user', parts: [{ text: systemPrompt }] },
    ...conversationHistory.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    })),
    { role: 'user', parts: [{ text: text }] }
  ];

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: messages,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini conversation error:', errorText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const result = await response.json();
  
  if (!result.candidates || !result.candidates[0] || !result.candidates[0].content) {
    throw new Error('Invalid response from Gemini API');
  }

  const responseText = result.candidates[0].content.parts[0].text;

  return new Response(
    JSON.stringify({ 
      response: responseText,
      timestamp: new Date().toISOString(),
      user_context: userContext ? {
        calories_remaining: userContext.goals.daily_calories - userContext.today.consumed.calories,
        protein_remaining: userContext.goals.daily_protein - userContext.today.consumed.protein,
        progress_percentage: Math.round((userContext.today.consumed.calories / userContext.goals.daily_calories) * 100)
      } : null
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}