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
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    if (action === 'analyze-food') {
      return await analyzeFoodImage(imageBase64, openaiApiKey);
    } else if (action === 'chat') {
      return await handleConversation(text, conversationHistory, openaiApiKey, userContext);
    } else {
      throw new Error('Invalid action. Use "analyze-food" or "chat"');
    }

  } catch (error) {
    console.error('Error in openai-food-assistant:', error);
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
  console.log('Analyzing food image with OpenAI GPT-4 Vision...');
  
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

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.1,
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      
      if (response.status === 429) {
        throw new Error('Se ha excedido el límite de solicitudes de OpenAI. Por favor, verifica tu plan de facturación.');
      } else if (response.status === 401) {
        throw new Error('API key de OpenAI inválida. Por favor, verifica tu configuración.');
      } else if (response.status === 403) {
        throw new Error('Acceso denegado. Verifica que tu cuenta de OpenAI tenga créditos disponibles.');
      } else {
        throw new Error(`Error del servicio de OpenAI: ${response.status}`);
      }
    }

    const result = await response.json();
    console.log('OpenAI response:', JSON.stringify(result, null, 2));

    if (!result.choices || !result.choices[0] || !result.choices[0].message) {
      throw new Error('Respuesta inválida de OpenAI API');
    }

    const analysisText = result.choices[0].message.content;
    
    try {
      // Clean the response to extract JSON
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No se encontró JSON en la respuesta');
      }
      
      const analysis: FoodAnalysisResult = JSON.parse(jsonMatch[0]);
      
      // Search for detailed nutritional info using FatSecret
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
          processing_time: new Date().toISOString(),
          provider: 'openai'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      console.error('Raw response:', analysisText);
      throw new Error(`Error al analizar la respuesta: ${parseError.message}`);
    }

  } catch (error) {
    console.error('Error in analyzeFoodImage:', error);
    throw error;
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
  console.log('Handling conversation with OpenAI GPT-4...');
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
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    })),
    { role: 'user', content: text }
  ];

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: messages,
        max_tokens: 800,
        temperature: 0.7,
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      
      if (response.status === 429) {
        throw new Error('Se ha excedido el límite de solicitudes de OpenAI.');
      } else if (response.status === 401) {
        throw new Error('API key de OpenAI inválida.');
      } else {
        throw new Error(`Error del servicio de OpenAI: ${response.status}`);
      }
    }

    const result = await response.json();
    console.log('OpenAI conversation response received');
    
    if (!result.choices || !result.choices[0] || !result.choices[0].message) {
      throw new Error('Respuesta inválida de OpenAI API');
    }

    const responseText = result.choices[0].message.content || 'Lo siento, no pude procesar tu mensaje.';

    return new Response(
      JSON.stringify({ 
        response: responseText,
        timestamp: new Date().toISOString(),
        provider: 'openai',
        user_context: userContext ? {
          calories_remaining: userContext.goals.daily_calories - userContext.today.consumed.calories,
          protein_remaining: userContext.goals.daily_protein - userContext.today.consumed.protein,
          progress_percentage: Math.round((userContext.today.consumed.calories / userContext.goals.daily_calories) * 100)
        } : null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in handleConversation:', error);
    throw error;
  }
}