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
6. Crear planes de comidas balanceados que cumplan con los objetivos nutricionales

Características importantes:
- Responde en español
- Sé conciso pero informativo
- Da consejos prácticos y realistas
- Pregunta por detalles cuando sea necesario
- Celebra los logros del usuario
- Ofrece alternativas saludables
- No reemplazas el consejo médico profesional

CAPACIDADES AVANZADAS:
- Puedes crear múltiples comidas (desayuno, almuerzo, cena, snacks) en una sola conversación
- Puedes sugerir comidas para completar las calorías y macronutrientes faltantes
- SIEMPRE respeta los límites nutricionales del usuario (no te pases de calorías, proteínas, carbohidratos o grasas)
- Cuando sugiras completar el día, calcula exactamente lo que falta para llegar a los objetivos sin excederlos

IMPORTANTE: 
- Usa SOLO alimentos simples y comunes (pollo, arroz, huevo, pan, leche, etc.)
- EVITA nombres complejos como "quinoa cocida", "salmón a la plancha" - usa "quinoa" y "salmón"

REGLAS PARA SUGERENCIAS DE COMIDAS:
- SIEMPRE usa la función search_foods ANTES de sugerir cualquier comida
- Esto te dará información nutricional exacta de la base de datos FatSecret
- Calcula las porciones precisas basándote en los datos reales, no en estimaciones
- Solo después de tener los datos exactos, sugiere la comida con porciones calculadas

REGLAS PARA MÚLTIPLES COMIDAS:
- Cuando el usuario pida crear MÚLTIPLES comidas (desayuno, almuerzo, cena), NO uses la función create_meal inmediatamente
- PRIMERO busca los alimentos con search_foods para obtener información nutricional exacta
- LUEGO presenta una sugerencia completa con las tres comidas calculadas exactamente para las calorías restantes
- SOLO usa create_meal DESPUÉS de que el usuario confirme explícitamente que quiere registrar las comidas sugeridas

🎯 REGLAS PARA CÁLCULOS PRECISOS:
- SIEMPRE busca primero los alimentos con search_foods para obtener valores nutricionales exactos
- Usa los datos reales de la base de datos, no estimaciones
- Calcula las porciones exactas para llegar a los valores restantes
- Verifica que la suma coincida exactamente con lo que le falta al usuario`;

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

🎯 VALORES RESTANTES (LO QUE LE FALTA AL USUARIO):
- Calorías restantes: ${Math.max(0, userContext.goals.daily_calories - Math.round(userContext.today.consumed.calories))} kcal
- Proteína restante: ${Math.max(0, userContext.goals.daily_protein - Math.round(userContext.today.consumed.protein * 10) / 10)}g
- Carbohidratos restantes: ${Math.max(0, userContext.goals.daily_carbs - Math.round(userContext.today.consumed.carbs * 10) / 10)}g
- Grasas restantes: ${Math.max(0, userContext.goals.daily_fat - Math.round(userContext.today.consumed.fat * 10) / 10)}g

${Math.round(userContext.today.consumed.calories) > userContext.goals.daily_calories ? 
'⚠️ IMPORTANTE: El usuario YA SUPERÓ su objetivo diario de calorías. No debe consumir más calorías hoy.' :
'✅ El usuario aún puede consumir más calorías para llegar a su objetivo.'}

COMIDAS DE HOY (NO REPITAS ESTOS ALIMENTOS - CREA COMIDAS NUEVAS Y DIFERENTES):`;

    // Add today's meals breakdown with clear structure
    if (userContext.today.meals && Object.keys(userContext.today.meals).length > 0) {
      systemPrompt += `\n\nCOMIDAS REGISTRADAS HOY (LEE ESTO CUIDADOSAMENTE):`;
      
      Object.entries(userContext.today.meals).forEach(([mealType, foods]: [string, any]) => {
        const mealTypeNames: { [key: string]: string } = {
          breakfast: 'DESAYUNO',
          lunch: 'ALMUERZO', 
          dinner: 'CENA',
          snack: 'SNACK'
        };
        
        const mealTypeName = mealTypeNames[mealType] || mealType.toUpperCase();
        systemPrompt += `\n\n${mealTypeName}:`;
        
        if (foods && foods.length > 0) {
          foods.forEach((food: any, index: number) => {
            systemPrompt += `\n  ${index + 1}. ${food.food_name} - ${food.servings} porción${food.servings === 1 ? '' : 'es'} - ${Math.round(food.calories)} kcal`;
          });
        } else {
          systemPrompt += `\n  (Sin comidas registradas)`;
        }
      });
      
      systemPrompt += `\n\nIMPORTANTE: Estas son las ÚNICAS comidas que el usuario ha registrado hoy. NO inventes comidas diferentes.`;
    } else {
      systemPrompt += `\n\nCOMIDAS REGISTRADAS HOY: Ninguna comida registrada aún.`;
    }

    if (userContext.recent_patterns.frequent_foods.length > 0) {
      systemPrompt += `\n\nALIMENTOS MÁS FRECUENTES (últimos 7 días):`;
      userContext.recent_patterns.frequent_foods.forEach((item: any) => {
        systemPrompt += `\n- ${item.food} (${item.count} veces)`;
      });
    }

    systemPrompt += `\n\n🔢 VALORES EXACTOS QUE DEBES USAR (NO CALCULES TÚ):
❌ NO hagas tus propios cálculos matemáticos
✅ USA EXACTAMENTE estos números:

CALORÍAS RESTANTES: ${Math.max(0, userContext.goals.daily_calories - userContext.today.consumed.calories)} kcal
PROTEÍNA RESTANTE: ${Math.max(0, userContext.goals.daily_protein - userContext.today.consumed.protein).toFixed(2)}g  
CARBOHIDRATOS RESTANTES: ${Math.max(0, userContext.goals.daily_carbs - userContext.today.consumed.carbs).toFixed(2)}g
GRASAS RESTANTES: ${Math.max(0, userContext.goals.daily_fat - userContext.today.consumed.fat).toFixed(2)}g

🚨 REGLA CRÍTICA: Si el usuario pregunta "cuánto me falta", responde EXACTAMENTE con estos números de arriba.
🚨 NO inventes otros números. USA LOS DE ARRIBA.
🚨 Ejemplo: "Te faltan ${Math.max(0, userContext.goals.daily_calories - userContext.today.consumed.calories)} calorías, ${Math.max(0, userContext.goals.daily_protein - userContext.today.consumed.protein).toFixed(2)}g de proteína..."

USA ESTA INFORMACIÓN para:
1. Responder con los valores exactos cuando pregunten "cuánto me falta"
2. Sugerir comidas que encajen en estos valores restantes
3. NO hacer cálculos propios - usar solo estos números
5. Mantener un tono motivador y personalizar respuestas según el progreso actual

REGLA CRÍTICA PARA VARIEDAD: 
- NUNCA repitas los alimentos que ya están registrados hoy
- SIEMPRE crea comidas completamente NUEVAS y DIFERENTES 
- Usa ingredientes y preparaciones distintas a las ya consumidas
- Varía las fuentes de proteína, carbohidratos y vegetales
- Cuando el usuario pida múltiples comidas, cada una debe ser única y diferente

REGLA CRÍTICA PARA LÍMITES NUTRICIONALES: 
- La suma total del día NO DEBE EXCEDER los objetivos nutricionales del usuario
- Si está cerca del límite, sugiere porciones más pequeñas o alimentos más ligeros
- Calcula exactamente cuánto puede comer sin exceder los límites`;
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
        tools: [
          {
            type: 'function',
            function: {
              name: 'search_foods',
              description: 'Busca alimentos en la base de datos de FatSecret para obtener información nutricional exacta ANTES de hacer sugerencias de comidas. Úsalo SIEMPRE antes de sugerir comidas para asegurar que los alimentos existan y obtener valores nutricionales precisos.',
              parameters: {
                type: 'object',
                properties: {
                  search_queries: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Lista de nombres de alimentos a buscar (ej: ["salmon", "brown rice", "broccoli"])'
                  }
                },
                required: ['search_queries']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'create_meal',
              description: 'Registra alimentos en el diario nutricional del usuario. USA esta función cuando: 1) El usuario diga que YA COMIÓ algo (ej: "desayuné 2 huevos", "comí una ensalada", "ya cené"), 2) El usuario pida registrar UNA comida específica, 3) El usuario confirme explícitamente que quiere registrar comidas sugeridas. NO uses esta función cuando el usuario solo pida SUGERENCIAS de múltiples comidas futuras.',
              parameters: {
                type: 'object',
                properties: {
                  foods: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: {
                          type: 'string',
                          description: 'Nombre SIMPLE del alimento en español (ej: "pollo", "arroz", "huevo", "avena", no "quinoa cocida con especias")'
                        },
                        servings: {
                          type: 'number',
                          description: 'Cantidad de porciones (ej: 1, 0.5, 2)'
                        }
                      },
                      required: ['name', 'servings']
                    },
                    description: 'Lista de alimentos SIMPLES y COMUNES'
                  },
                  meal_type: {
                    type: 'string',
                    enum: ['breakfast', 'lunch', 'dinner', 'snack'],
                    description: 'Tipo de comida: breakfast (desayuno), lunch (almuerzo), dinner (cena), snack (merienda)'
                  }
                },
                required: ['foods', 'meal_type']
              }
            }
          }
        ],
        tool_choice: 'auto'
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

    const choice = result.choices[0];
    const message = choice.message;

    // Check if OpenAI wants to call a function
    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0];
      console.log('OpenAI wants to call tool:', toolCall.function.name);
      console.log('Tool arguments:', toolCall.function.arguments);
      
      if (toolCall.function.name === 'search_foods') {
        console.log('OpenAI requested food search:', toolCall.function.arguments);
        
        try {
          const args = JSON.parse(toolCall.function.arguments);
          const searchResult = await executeSearchFoods(args);
          
          // Continue conversation with search results
          const searchPrompt = `Resultados de búsqueda de alimentos:\n${JSON.stringify(searchResult, null, 2)}\n\nAhora que tienes la información nutricional exacta de estos alimentos, sugiere una comida usando estas calorías y valores nutricionales reales para completar exactamente lo que le falta al usuario.`;
          
          // Make another call to OpenAI with the search results
          const followUpMessages = [
            ...messages,
            { role: 'assistant', content: `Buscando información nutricional de los alimentos...` },
            { role: 'system', content: searchPrompt }
          ];
          
          const followUpResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o',
              messages: followUpMessages,
              max_tokens: 800,
              temperature: 0.7,
              tools: [{
                type: 'function',
                function: {
                  name: 'create_meal',
                  description: 'Registra alimentos en el diario nutricional del usuario cuando confirme explícitamente.',
                  parameters: {
                    type: 'object',
                    properties: {
                      foods: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            name: { type: 'string' },
                            servings: { type: 'number' }
                          },
                          required: ['name', 'servings']
                        }
                      },
                      meal_type: {
                        type: 'string',
                        enum: ['breakfast', 'lunch', 'dinner', 'snack']
                      }
                    },
                    required: ['foods', 'meal_type']
                  }
                }
              }]
            })
          });
          
          const followUpResult = await followUpResponse.json();
          const followUpMessage = followUpResult.choices[0].message;
          
          return new Response(
            JSON.stringify({
              response: followUpMessage.content,
              search_results: searchResult,
              timestamp: new Date().toISOString(),
              provider: 'openai'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
          
        } catch (error) {
          console.error('Error executing food search:', error);
          return new Response(
            JSON.stringify({
              response: `Hubo un error al buscar los alimentos: ${error.message}. Puedo sugerir comidas basándome en alimentos comunes.`,
              timestamp: new Date().toISOString(),
              provider: 'openai'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
      } else if (toolCall.function.name === 'create_meal') {
        console.log('OpenAI requested meal creation:', toolCall.function.arguments);
        
        try {
          const args = JSON.parse(toolCall.function.arguments);
          const mealResult = await executeCreateMeal(args, userContext);
          
          return new Response(
            JSON.stringify(mealResult),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          console.error('Error executing meal creation:', error);
          return new Response(
            JSON.stringify({
              response: `Hubo un error al registrar la comida: ${error.message}. Puedes intentar agregarla manualmente.`,
              timestamp: new Date().toISOString(),
              provider: 'openai'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    const responseText = message.content || 'Lo siento, no pude procesar tu mensaje.';

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

async function executeCreateMeal(args: any, userContext: any) {
  console.log('Executing create_meal function with args:', args);
  
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user ID from context
    if (!userContext?.user?.id) {
      throw new Error('User context not available');
    }

    // Create Authorization header for the function call
    const authToken = `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`;
    
    // Call create-meal-from-chat function
    const createMealResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/create-meal-from-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authToken,
        'apikey': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        'x-user-id': userContext.user.id
      },
      body: JSON.stringify({
        foods: args.foods || [],
        meal_type: args.meal_type || 'snack',
        user_message: userContext.originalUserMessage || null, // Pass original message for target extraction
        consumed_at: userContext.selectedDate || null // Pass selected date
      })
    });

    if (!createMealResponse.ok) {
      const errorText = await createMealResponse.text();
      console.error('Error calling create-meal-from-chat:', errorText);
      throw new Error(`Failed to create meal: ${errorText}`);
    }

    const data = await createMealResponse.json();
    console.log('Meal creation result:', data);

    // Generate response based on results
    let response = '';
    const mealTypeNames = {
      breakfast: 'desayuno',
      lunch: 'almuerzo', 
      dinner: 'cena',
      snack: 'snack'
    };

    if (data.success && data.foods_saved > 0) {
      response = `¡Perfecto! He registrado tu ${mealTypeNames[args.meal_type] || 'comida'}:\n\n`;
      
      data.results.filter((r: any) => r.saved).forEach((food: any) => {
        response += `• ${food.food_data.food_name} (${food.servings} porción${food.servings === 1 ? '' : 'es'}) - ${food.total_calories} kcal\n`;
      });
      
      response += `\n📊 **Totales:** ${data.totals.calories} kcal, ${data.totals.protein}g proteína, ${data.totals.carbs}g carbohidratos, ${data.totals.fat}g grasa`;
      
      if (userContext?.goals) {
        const newCalories = userContext.today.consumed.calories + data.totals.calories;
        const remaining = userContext.goals.daily_calories - newCalories;
        response += `\n\n🎯 Llevas ${Math.round(newCalories)} de tus ${userContext.goals.daily_calories} calorías diarias. ${remaining > 0 ? `Te quedan ${Math.round(remaining)} kcal.` : '¡Objetivo alcanzado!'}`;
      }
    } else {
      response = `He intentado registrar tu comida, pero `;
      if (data.foods_found === 0) {
        response += 'no pude encontrar los alimentos en la base de datos. ¿Podrías ser más específico con los nombres?';
      } else {
        response += `solo pude encontrar ${data.foods_found} de ${data.foods_processed} alimentos. Los que no encontré podrías agregarlos manualmente.`;
      }
    }

    if (data.results.some((r: any) => !r.found)) {
      response += '\n\n❓ **No encontré:** ';
      response += data.results.filter((r: any) => !r.found).map((r: any) => r.food_name).join(', ');
    }

    return {
      response,
      meal_created: true,
      meal_data: data,
      timestamp: new Date().toISOString(),
      provider: 'openai',
      user_context: userContext ? {
        calories_remaining: userContext.goals.daily_calories - (userContext.today.consumed.calories + (data.totals?.calories || 0)),
        protein_remaining: userContext.goals.daily_protein - (userContext.today.consumed.protein + (data.totals?.protein || 0)),
        progress_percentage: Math.round(((userContext.today.consumed.calories + (data.totals?.calories || 0)) / userContext.goals.daily_calories) * 100)
      } : null
    };

  } catch (error) {
    console.error('Error in executeCreateMeal:', error);
    return {
      response: `Lo siento, hubo un error al registrar tu comida: ${error.message}. Puedes intentar agregarla manualmente.`,
      meal_created: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      provider: 'openai'
    };
  }
}

async function executeSearchFoods(args: any) {
  console.log('Executing search_foods function with args:', args);
  
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const searchPromises = args.search_queries.map(async (query: string) => {
      try {
        const { data, error } = await supabase.functions.invoke('fatsecret-search', {
          body: { searchQuery: query, limit: 3 }
        });

        if (error) {
          console.error(`Error searching for ${query}:`, error);
          return { query, foods: [], error: error.message };
        }

        return { 
          query, 
          foods: data?.foods?.slice(0, 3) || [],
          found: data?.foods?.length > 0
        };
      } catch (error) {
        console.error(`Error searching for ${query}:`, error);
        return { query, foods: [], error: error.message };
      }
    });

    const searchResults = await Promise.all(searchPromises);
    
    return {
      success: true,
      results: searchResults,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('Error in executeSearchFoods:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}