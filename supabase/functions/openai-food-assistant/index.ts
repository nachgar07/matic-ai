import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Define interfaces for better type safety
interface FoodAnalysisResult {
  foods: Array<{
    name: string;
    estimated_portion: string;
    estimated_calories: number;
    estimated_protein: number;
    estimated_carbs: number;
    estimated_fat: number;
    confidence: number;
    source?: string;
  }>;
  total_estimated_calories: number;
  total_estimated_protein: number;
  total_estimated_carbs: number;
  total_estimated_fat: number;
  suggestions: string[];
}

serve(async (req) => {
  console.log('🚀 FUNCTION START - Method:', req.method);
  console.log('🚀 FUNCTION START - URL:', req.url);
  console.log('🚀 FUNCTION START - Headers:', Object.fromEntries(req.headers.entries()));
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS - Handling OPTIONS request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📥 PARSING REQUEST BODY...');
    const body = await req.text();
    console.log('📥 RAW BODY:', body.substring(0, 200) + '...');
    
    const { action, image, text, conversationHistory, userContext } = JSON.parse(body);
    console.log('📥 PARSED DATA:', {
      action,
      hasImage: !!image,
      textLength: text?.length,
      historyLength: conversationHistory?.length,
      hasUserContext: !!userContext
    });

    // Get auth header for user authentication
    const authHeader = req.headers.get('Authorization');
    console.log('🔑 AUTH DEBUG - Header capture:', {
      hasAuthHeader: !!authHeader,
      headerValue: authHeader ? authHeader.substring(0, 20) + '...' : 'NO HEADER',
      allHeaders: Object.fromEntries(req.headers.entries())
    });
    
    if (!authHeader) {
      console.error('🚨 AUTH DEBUG - No Authorization header found in request');
      throw new Error('Authorization header is required');
    }

    // Get OpenAI API key
    console.log('🔑 CHECKING OPENAI API KEY...');
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('🚨 OpenAI API key not configured');
      throw new Error('OpenAI API key not configured');
    }
    
    console.log('🔑 OpenAI API Key check:', {
      hasKey: !!openAIApiKey,
      keyLength: openAIApiKey?.length,
      keyPreview: openAIApiKey?.substring(0, 8) + '...'
    });

    console.log('🔄 ROUTING ACTION:', action);

    if (action === 'analyze-food') {
      console.log('📸 ANALYZING FOOD IMAGE...');
      
      if (!image) {
        console.error('🚨 NO IMAGE DATA PROVIDED');
        throw new Error('No image data provided');
      }
      
      const result = await analyzeFoodImage(image, openAIApiKey);
      console.log('📸 ANALYSIS COMPLETED SUCCESSFULLY:', result);
      
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else if (action === 'chat') {
      console.log('💬 HANDLING CHAT CONVERSATION...');
      
      if (!text) {
        console.error('🚨 NO TEXT PROVIDED FOR CHAT');
        throw new Error('No text provided for chat');
      }
      
      // Add auth info to userContext for functions that need it
      const enrichedUserContext = {
        ...userContext,
        authHeader: authHeader
      };
      
      console.log('💬 CALLING HANDLE CONVERSATION...');
      const result = await handleConversation(text, conversationHistory, openAIApiKey, enrichedUserContext);
      console.log('💬 CONVERSATION RESULT:', result);
      
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      console.error('🚨 INVALID ACTION SPECIFIED:', action);
      throw new Error('Invalid action specified');
    }

  } catch (error) {
    console.error('🚨 Error in openai-food-assistant function:', error);
    console.error('🚨 Error stack:', error.stack?.substring(0, 1000));
    
    // More detailed error responses based on error type
    let status = 500;
    let errorType = 'Internal server error';
    let userMessage = 'Error interno del servidor. Intenta nuevamente en unos minutos.';
    
    if (error.message?.includes('API key') || error.message?.includes('authentication') || error.message?.includes('Unauthorized')) {
      status = 401;
      errorType = 'Authentication error';
      userMessage = 'Error de configuración del servicio de IA. Contacta al soporte.';
    } else if (error.message?.includes('rate limit') || error.message?.includes('quota') || error.message?.includes('429')) {
      status = 429;
      errorType = 'Rate limit exceeded';
      userMessage = 'Demasiadas consultas. Espera un momento antes de intentar nuevamente.';
    } else if (error.message?.includes('network') || error.message?.includes('timeout') || error.name === 'NetworkError') {
      status = 503;
      errorType = 'Service unavailable';
      userMessage = 'Servicio de IA temporalmente no disponible. Usa las opciones manuales mientras tanto.';
    } else if (error.message?.includes('OpenAI') || error.message?.includes('model') || error.message?.includes('completion')) {
      status = 502;
      errorType = 'AI service error';
      userMessage = 'El servicio de IA está temporalmente sobrecargado. Intenta nuevamente o usa las opciones manuales.';
    }
    
    console.error(`🚨 RETURNING ERROR RESPONSE: Status ${status}, Type: ${errorType}, Message: ${userMessage}`);
    
    return new Response(
      JSON.stringify({ 
        error: errorType,
        message: userMessage,
        status,
        timestamp: new Date().toISOString(),
        details: error.stack ? error.stack.split('\n').slice(0, 3) : 'No stack trace available'
      }),
      { 
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Function to analyze food images
async function analyzeFoodImage(base64Image: string, apiKey: string): Promise<FoodAnalysisResult> {
  console.log('Analyzing food image with OpenAI GPT-4 Vision...');
  
  // Clean and validate base64 image
  if (!base64Image) {
    throw new Error('No image data provided');
  }
  
  // Remove any data URL prefix if present
  const cleanBase64 = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');
  
  // Basic validation of base64 format
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleanBase64)) {
    throw new Error('Invalid base64 image format');
  }
  
  const prompt = `Analiza esta imagen de comida e identifica unicamente los alimentos y sus porciones estimadas en formato JSON:

{
  "foods": [
    {
      "name": "nombre del alimento en español (simple y comun)",
      "estimated_portion": "peso estimado en gramos (ej: 150g, 200g, 50g)",
      "confidence": nivel_de_confianza_del_0_al_1
    }
  ],
  "suggestions": ["consejos nutricionales breves en español"]
}

Instrucciones importantes:
- Identifica TODOS los alimentos visibles en la imagen
- Usa nombres SIMPLES y COMUNES (ej: "aguacate", "miel", "pan", "pollo")
- Estima el PESO EN GRAMOS de cada porcion de manera realista
- NO incluyas informacion nutricional (calorias, proteinas, etc.) - eso se calculara con datos USDA
- Si hay multiples elementos del mismo alimento, agregalos como elementos separados
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
        model: 'gpt-4.1-2025-04-14', // Modelo estable y confiable
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
                  url: `data:image/jpeg;base64,${cleanBase64}`,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_completion_tokens: 1000, // Parámetro correcto para GPT-4.1
        temperature: 0.1,
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🚨 OpenAI API error details:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        errorBody: errorText
      });
      
      if (response.status === 429) {
        throw new Error('Se ha excedido el limite de solicitudes de OpenAI. Verifica tu plan de facturacion o espera unos minutos.');
      } else if (response.status === 401) {
        throw new Error('API key de OpenAI invalida. Por favor, verifica que la clave este configurada correctamente en Supabase.');
      } else if (response.status === 403) {
        throw new Error('Acceso denegado. Verifica que tu cuenta de OpenAI tenga creditos disponibles.');
      } else if (response.status >= 500) {
        throw new Error('Error del servidor de OpenAI. El servicio puede estar temporalmente sobrecargado. Intenta nuevamente en unos minutos.');
      } else {
        throw new Error(`Error del servicio de OpenAI (${response.status}): ${errorText}`);
      }
    }

    const result = await response.json();
    console.log('OpenAI response:', JSON.stringify(result, null, 2));

    if (!result.choices || !result.choices[0] || !result.choices[0].message) {
      throw new Error('Respuesta invalida de OpenAI API');
    }

    const analysisText = result.choices[0].message.content;
    
    try {
      console.log('Raw OpenAI response content:', analysisText);
      
      // Clean the response to extract JSON
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('No JSON found in OpenAI response:', analysisText);
        throw new Error('No se encontró JSON válido en la respuesta de OpenAI');
      }
      
      console.log('Extracted JSON:', jsonMatch[0]);
      const initialAnalysis = JSON.parse(jsonMatch[0]);
      
      if (!initialAnalysis.foods || !Array.isArray(initialAnalysis.foods)) {
        console.error('Invalid foods array in response:', initialAnalysis);
        throw new Error('La respuesta no contiene una lista válida de alimentos');
      }
      
      // Obtener datos nutricionales precisos de USDA para cada alimento
      const foodNames = initialAnalysis.foods.map((food: any) => food.name);
      console.log('Looking up nutritional data for foods:', foodNames);
      
      const usdaResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/usda-food-lookup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
        },
        body: JSON.stringify({ foodNames })
      });

      let nutritionalData: any[] = [];
      if (usdaResponse.ok) {
        const usdaResult = await usdaResponse.json();
        nutritionalData = usdaResult.results || [];
        console.log('USDA nutritional data received:', nutritionalData.length, 'foods');
      } else {
        console.error('Failed to fetch USDA data, falling back to OpenAI estimates');
      }

      // Combinar identificacion de OpenAI con datos nutricionales de USDA
      const finalFoods = initialAnalysis.foods.map((food: any, index: number) => {
        const usdaData = nutritionalData.find(data => data.name === food.name);
        
        if (usdaData) {
          // Convertir de por 100g a la porcion estimada
          // Extraer el peso de la porcion estimada (ej: "15g" -> 15)
          const portionMatch = food.estimated_portion.match(/(\d+(?:\.\d+)?)\s*g/i);
          const portionWeight = portionMatch ? parseFloat(portionMatch[1]) : 15; // Default 15g si no se encuentra
          const factor = portionWeight / 100;
          
          console.log(`Portion calculation for ${food.name}: ${food.estimated_portion} -> ${portionWeight}g (factor: ${factor})`);
          console.log(`USDA values per 100g: ${usdaData.calories} cal, ${usdaData.protein}g protein, ${usdaData.carbs}g carbs, ${usdaData.fat}g fat`);
          
          const finalCalories = Math.round(usdaData.calories * factor);
          const finalProtein = Math.round(usdaData.protein * factor * 10) / 10;
          const finalCarbs = Math.round(usdaData.carbs * factor * 10) / 10;
          const finalFat = Math.round(usdaData.fat * factor * 10) / 10;
          
          console.log(`Final values for portion: ${finalCalories} cal, ${finalProtein}g protein, ${finalCarbs}g carbs, ${finalFat}g fat`);
          
          return {
            name: food.name,
            estimated_portion: food.estimated_portion,
            estimated_calories: finalCalories,
            estimated_protein: finalProtein,
            estimated_carbs: finalCarbs,
            estimated_fat: finalFat,
            confidence: food.confidence,
            source: 'USDA'
          };
        } else {
          // Fallback con valores especificos conocidos si no hay datos USDA
          console.log(`No USDA data found for ${food.name}, using precise fallback values`);
          
          // Base de datos de valores nutricionales precisos para alimentos comunes (por 100g) - Datos corregidos según USDA
          const knownNutrients: { [key: string]: { cal: number, protein: number, carbs: number, fat: number } } = {
            'miel': { cal: 304, protein: 0.3, carbs: 82.4, fat: 0 },
            'aguacate': { cal: 160, protein: 2, carbs: 8, fat: 14.7 }, // Corregido: carbs de 8.5 a 8
            'huevo': { cal: 143, protein: 12.6, carbs: 1.1, fat: 9.5 }, // Corregido según datos USDA verificados
            'pollo': { cal: 165, protein: 31, carbs: 0, fat: 3.6 },
            'arroz': { cal: 130, protein: 2.7, carbs: 28, fat: 0.3 },
            'pan': { cal: 265, protein: 11.7, carbs: 49, fat: 3.2 }, // Corregido: proteína de 9 a 11.7
            'pan de molde integral': { cal: 265, protein: 11.7, carbs: 49, fat: 3.2 } // Agregado específicamente
          };
          
          const portionWeight = parseFloat(food.estimated_portion.replace(/[^\d.]/g, '')) || 100;
          const factor = portionWeight / 100;
          
          const nutrientData = knownNutrients[food.name.toLowerCase()];
          
          if (nutrientData) {
            return {
              name: food.name,
              estimated_portion: food.estimated_portion,
              estimated_calories: Math.round(nutrientData.cal * factor),
              estimated_protein: Math.round(nutrientData.protein * factor * 10) / 10,
              estimated_carbs: Math.round(nutrientData.carbs * factor * 10) / 10,
              estimated_fat: Math.round(nutrientData.fat * factor * 10) / 10,
              confidence: food.confidence,
              source: 'known_values'
            };
          } else {
            return {
              name: food.name,
              estimated_portion: food.estimated_portion,
              estimated_calories: 50, // Valor conservador
              estimated_protein: 1,
              estimated_carbs: 10,
              estimated_fat: 1,
              confidence: food.confidence * 0.5, // Reducir confianza
              source: 'fallback'
            };
          }
        }
      });

      // Calcular totales
      const totalCalories = finalFoods.reduce((sum, food) => sum + food.estimated_calories, 0);
      const totalProtein = finalFoods.reduce((sum, food) => sum + food.estimated_protein, 0);
      const totalCarbs = finalFoods.reduce((sum, food) => sum + food.estimated_carbs, 0);
      const totalFat = finalFoods.reduce((sum, food) => sum + food.estimated_fat, 0);

      const finalAnalysis: FoodAnalysisResult = {
        foods: finalFoods,
        total_estimated_calories: totalCalories,
        total_estimated_protein: Math.round(totalProtein * 10) / 10,
        total_estimated_carbs: Math.round(totalCarbs * 10) / 10,
        total_estimated_fat: Math.round(totalFat * 10) / 10,
        suggestions: initialAnalysis.suggestions || []
      };
      
      console.log('Final analysis result:', finalAnalysis);
      return finalAnalysis;

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

async function handleConversation(text: string, conversationHistory: any[], apiKey: string, userContext: any) {
  console.log('🗨️ HANDLE CONVERSATION START');
  console.log('🗨️ TEXT LENGTH:', text?.length);
  console.log('🗨️ HISTORY LENGTH:', conversationHistory?.length);
  console.log('🗨️ USER CONTEXT:', userContext ? 'present' : 'missing');
  
  try {
  console.log('User context received:', userContext ? 'yes' : 'no');
  
  let systemPrompt = `# Asistente Nutricional Calculador

Eres un calculador nutricional preciso. SIEMPRE calcula exactitud matemática antes de responder.

🍽️ FUNCIONES: create_meal, create_plate, create_meal_plan

## PROCESO OBLIGATORIO:
1. **CALCULAR DÉFICIT:** Restante = Objetivo_Diario - Consumido_Hoy
2. **CREAR PLAN:** Distribuir entre desayuno/almuerzo/merienda/cena
3. **VERIFICAR:** Plan debe estar entre 98-102% del déficit en TODOS los macros
4. **AJUSTAR:** Repetir hasta coincidir exactamente
5. **PRESENTAR:** SOLO cuando todos los macros estén perfectos

## BASE NUTRICIONAL (por 100g):
- Pechuga pollo: 165 kcal, 31g prot, 0g carbs, 3.6g grasas
- Huevo entero: 143 kcal, 13g prot, 1g carbs, 10g grasas
- Merluza: 90 kcal, 20g prot, 0g carbs, 1.1g grasas
- Arroz integral cocido: 110 kcal, 2g prot, 23g carbs, 0.6g grasas
- Avena cocida: 68 kcal, 2.4g prot, 12g carbs, 1.4g grasas
- Pan integral: 240 kcal, 10g prot, 43g carbs, 3.3g grasas
- Aceite oliva: 900 kcal, 0g prot, 0g carbs, 100g grasas
- Palta: 160 kcal, 2g prot, 9g carbs, 15g grasas

## FORMATO RESPUESTA CONCISO:
"🧮 **Plan calculado para completar exactamente tus objetivos:**

**DESAYUNO:**
- Alimento (Xg): Y kcal, Zg prot, Wg carbs, Qg grasas

**ALMUERZO:**
- Alimento (Xg): Y kcal, Zg prot, Wg carbs, Qg grasas

**MERIENDA:**
- Alimento (Xg): Y kcal, Zg prot, Wg carbs, Qg grasas

**CENA:**
- Alimento (Xg): Y kcal, Zg prot, Wg carbs, Qg grasas

**TOTAL PLAN:** 🔥 X kcal 💪 Yg prot 🍞 Zg carbs 🥑 Wg grasas

¿Confirmas este plan que completa exactamente tu déficit restante?"

NUNCA ejecutar create_meal_plan sin confirmación del usuario.`;

  // Add user context to the prompt if available
  if (userContext?.user) {
    systemPrompt += `

INFORMACION DEL USUARIO:
`;
    systemPrompt += `- Usuario: ${userContext.user.display_name || userContext.user.email}
`;
    
    if (userContext.goals) {
      systemPrompt += `- Objetivos diarios:
`;
      systemPrompt += `  • Calorías: ${userContext.goals.daily_calories} kcal
`;
      systemPrompt += `  • Proteína: ${userContext.goals.daily_protein}g
`;
      systemPrompt += `  • Carbohidratos: ${userContext.goals.daily_carbs}g
`;
      systemPrompt += `  • Grasas: ${userContext.goals.daily_fat}g
`;
    }

    if (userContext.today) {
      systemPrompt += `

- Progreso de hoy:
`;
      systemPrompt += `  • Calorías consumidas: ${Math.round(userContext.today.consumed.calories)} kcal
`;
      systemPrompt += `  • Proteína consumida: ${Math.round(userContext.today.consumed.protein * 10) / 10}g
`;
      systemPrompt += `  • Carbohidratos consumidos: ${Math.round(userContext.today.consumed.carbs * 10) / 10}g
`;
      systemPrompt += `  • Grasas consumidas: ${Math.round(userContext.today.consumed.fat * 10) / 10}g
`;
      systemPrompt += `  • Comidas registradas: ${userContext.today.meal_count}
`;
    }
  }

  // Prepare the conversation for OpenAI
  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map((msg: any) => ({
      role: msg.role,
      content: msg.content
    })),
    { role: 'user', content: text }
  ];

  const tools = [
    {
      type: 'function',
      function: {
        name: "create_meal",
        description: "Registra una comida específica en la base de datos del usuario",
        parameters: {
          type: "object",
          properties: {
            meal_type: {
              type: "string",
              enum: ["breakfast", "lunch", "dinner", "snack"],
              description: "Tipo de comida (breakfast, lunch, dinner, snack)"
            },
            food_name: {
              type: "string",
              description: "Nombre del alimento a registrar"
            },
            servings: {
              type: "number",
              description: "Cantidad de porciones"
            },
            calories_per_serving: {
              type: "number",
              description: "Calorías por porción"
            },
            protein_per_serving: {
              type: "number",
              description: "Proteína en gramos por porción"
            },
            carbs_per_serving: {
              type: "number",
              description: "Carbohidratos en gramos por porción"
            },
            fat_per_serving: {
              type: "number",
              description: "Grasas en gramos por porción"
            }
          },
          required: ["meal_type", "food_name", "servings", "calories_per_serving", "protein_per_serving", "carbs_per_serving", "fat_per_serving"]
        }
      }
    },
    {
      type: 'function',
      function: {
        name: "create_plate",
        description: "Crea un plato completo con múltiples alimentos. Úsalo cuando el usuario quiera crear un plato con varios ingredientes.",
        parameters: {
          type: "object",
          properties: {
            meal_type: {
              type: "string",
              enum: ["breakfast", "lunch", "dinner", "snack"],
              description: "Tipo de comida (breakfast, lunch, dinner, snack)"
            },
            plate_name: {
              type: "string",
              description: "Nombre descriptivo del plato (ej: 'Desayuno mediterráneo', 'Ensalada de pollo')"
            },
            foods: {
              type: "array",
              description: "Lista de alimentos que componen el plato",
              items: {
                type: "object",
                properties: {
                  food_name: {
                    type: "string",
                    description: "Nombre del alimento"
                  },
                  servings: {
                    type: "number",
                    description: "Cantidad de porciones de este alimento"
                  },
                  calories_per_serving: {
                    type: "number",
                    description: "Calorías por porción"
                  },
                  protein_per_serving: {
                    type: "number",
                    description: "Proteína en gramos por porción"
                  },
                  carbs_per_serving: {
                    type: "number",
                    description: "Carbohidratos en gramos por porción"
                  },
                  fat_per_serving: {
                    type: "number",
                    description: "Grasas en gramos por porción"
                  }
                },
                required: ["food_name", "servings", "calories_per_serving", "protein_per_serving", "carbs_per_serving", "fat_per_serving"]
              }
            }
          },
          required: ["meal_type", "plate_name", "foods"]
        }
      }
    },
    {
      type: 'function',
      function: {
        name: "create_meal_plan",
        description: "Crea múltiples platos de una vez para un plan alimenticio completo (ej: almuerzo + merienda + cena). Usar cuando el usuario pida un plan completo o múltiples comidas.",
        parameters: {
          type: "object",
          properties: {
            plan_name: {
              type: "string",
              description: "Nombre del plan (ej: 'Plan para completar el día', 'Plan alimenticio de hoy')"
            },
            plates: {
              type: "array",
              description: "Lista de platos que componen el plan completo",
              items: {
                type: "object",
                properties: {
                  meal_type: {
                    type: "string",
                    enum: ["breakfast", "lunch", "dinner", "snack"],
                    description: "Tipo de comida (breakfast, lunch, dinner, snack)"
                  },
                  plate_name: {
                    type: "string",
                    description: "Nombre descriptivo del plato"
                  },
                  foods: {
                    type: "array",
                    description: "Lista de alimentos que componen este plato",
                    items: {
                      type: "object",
                      properties: {
                        food_name: {
                          type: "string",
                          description: "Nombre del alimento"
                        },
                        servings: {
                          type: "number",
                          description: "Cantidad de porciones de este alimento"
                        },
                        calories_per_serving: {
                          type: "number",
                          description: "Calorías por porción"
                        },
                        protein_per_serving: {
                          type: "number",
                          description: "Proteína en gramos por porción"
                        },
                        carbs_per_serving: {
                          type: "number",
                          description: "Carbohidratos en gramos por porción"
                        },
                        fat_per_serving: {
                          type: "number",
                          description: "Grasas en gramos por porción"
                        }
                      },
                      required: ["food_name", "servings", "calories_per_serving", "protein_per_serving", "carbs_per_serving", "fat_per_serving"]
                    }
                  }
                },
                required: ["meal_type", "plate_name", "foods"]
              }
            }
          },
          required: ["plan_name", "plates"]
        }
      }
    }
  ];

  console.log('🤖 PREPARING OPENAI REQUEST...');
  console.log('🤖 MESSAGES COUNT:', messages.length);
  console.log('🤖 TOOLS COUNT:', tools.length);

  console.log('Sending conversation to OpenAI...');

  try {
    console.log('🔄 FETCHING FROM OPENAI API...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14', // Modelo estable y confiable
        messages: messages,
        tools: tools,
        tool_choice: "auto",
        temperature: 0.1, // Baja temperatura para precisión matemática
        max_completion_tokens: 1000, // Parámetro correcto para GPT-4.1
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🚨 OpenAI Chat API error details:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        errorBody: errorText
      });
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('OpenAI conversation response:', JSON.stringify(data, null, 2));

    // Check if OpenAI wants to call a function
    if (data.choices[0].message.tool_calls && data.choices[0].message.tool_calls.length > 0) {
      const toolCall = data.choices[0].message.tool_calls[0];
      console.log('OpenAI requested function call:', toolCall);

      if (toolCall.function.name === 'create_meal') {
        const functionArgs = JSON.parse(toolCall.function.arguments);
        console.log('Function arguments:', functionArgs);
        
        try {
          const mealResult = await executeCreateMeal(functionArgs, userContext);
          return {
            reply: mealResult.message,
            functionCalled: true,
            updatedProgress: mealResult.updatedProgress
          };
        } catch (error) {
          console.error('Error executing create_meal function:', error);
          return {
            reply: `Lo siento, hubo un error al intentar guardar la comida: ${error.message}. Por favor, intenta nuevamente.`,
            functionCalled: false
          };
        }
      } else if (toolCall.function.name === 'create_plate') {
        const functionArgs = JSON.parse(toolCall.function.arguments);
        console.log('🍽️ CREATE_PLATE - Function arguments:', JSON.stringify(functionArgs, null, 2));
        
        try {
          const plateResult = await executeCreatePlate(functionArgs, userContext);
          return {
            reply: plateResult.message,
            functionCalled: true,
            updatedProgress: plateResult.updatedProgress
          };
        } catch (error) {
          console.error('🚨 CREATE_PLATE - Error executing create_plate function:', error);
          return {
            reply: `Lo siento, hubo un error al intentar crear el plato: ${error.message}. Por favor, intenta nuevamente.`,
            functionCalled: false
          };
        }
      } else if (toolCall.function.name === 'create_meal_plan') {
        const functionArgs = JSON.parse(toolCall.function.arguments);
        console.log('🍽️ CREATE_MEAL_PLAN - Function arguments:', JSON.stringify(functionArgs, null, 2));
        
        try {
          const planResult = await executeCreateMealPlan(functionArgs, userContext);
          return {
            reply: planResult.message,
            functionCalled: true,
            updatedProgress: planResult.updatedProgress
          };
        } catch (error) {
          console.error('🚨 CREATE_MEAL_PLAN - Error executing create_meal_plan function:', error);
          return {
            reply: `Lo siento, hubo un error al intentar crear el plan alimenticio: ${error.message}. Por favor, intenta nuevamente.`,
            functionCalled: false
          };
        }
      }
    }

    // Return the regular conversation response
    console.log('💬 RETURNING REGULAR CONVERSATION RESPONSE');
    const responseData: any = {
      reply: data.choices[0].message.content,
      functionCalled: false
    };

    console.log('💬 RESPONSE DATA:', responseData);
    return responseData;

  } catch (error) {
    console.error('🚨🚨🚨 ERROR IN HANDLE CONVERSATION:', error);
    console.error('🚨 ERROR NAME:', error.name);
    console.error('🚨 ERROR MESSAGE:', error.message);
    console.error('🚨 ERROR STACK:', error.stack);
    throw error;
  }
  
  } catch (outerError) {
    console.error('🚨🚨🚨 OUTER ERROR IN HANDLE CONVERSATION:', outerError);
    throw outerError;
  }
}

async function executeCreateMeal(args: any, userContext: any) {
  console.log('🍽️ CREATE_MEAL - Executing create_meal with args:', args);
  
  try {
    // Create Supabase client using service role key for database operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Extract user ID from auth token - FIXED METHOD
    console.log('🔍 CREATE_MEAL - Attempting user authentication...');
    console.log('🔑 CREATE_MEAL - Auth header present:', !!userContext.authHeader);
    
    if (!userContext.authHeader) {
      console.error('🚨 CREATE_MEAL - No auth header provided in userContext');
      throw new Error('No authorization header provided');
    }

    // Use the service role client to verify the JWT token directly
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('📞 CREATE_MEAL - Verifying JWT token...');
    
    // Extract the JWT token from the Authorization header
    const token = userContext.authHeader.replace('Bearer ', '');
    
    // Verify the JWT token using the service role client
    const { data: { user }, error: userError } = await serviceClient.auth.getUser(token);
    
    console.log('🔍 CREATE_MEAL - Token verification result:', { 
      hasUser: !!user, 
      hasError: !!userError,
      errorMessage: userError?.message,
      userId: user?.id
    });
    
    if (userError || !user) {
      console.error('🚨 CREATE_MEAL - JWT token verification failed:', userError);
      throw new Error('User not authenticated - invalid or expired token');
    }

    console.log('✅ CREATE_MEAL - User authenticated successfully:', user.id);
    console.log('👤 CREATE_MEAL - User ID from auth:', user.id);
    console.log('📋 CREATE_MEAL - User email:', user.email);

    // Create or find the food entry
    const { data: existingFood } = await supabase
      .from('foods')
      .select('*')
      .eq('food_name', args.food_name)
      .limit(1);

    let foodId;
    if (existingFood && existingFood.length > 0) {
      foodId = existingFood[0].id;
      console.log(`Found existing food: ${args.food_name}`);
    } else {
      // Create new food entry
      const { data: newFood, error: insertError } = await supabase
        .from('foods')
        .insert({
          food_id: `openai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          food_name: args.food_name,
          calories_per_serving: args.calories_per_serving,
          protein_per_serving: args.protein_per_serving,
          carbs_per_serving: args.carbs_per_serving,
          fat_per_serving: args.fat_per_serving,
          serving_description: 'Porción estándar'
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting food:', insertError);
        throw new Error(`Error creating food entry: ${insertError.message}`);
      }

      foodId = newFood.id;
      console.log(`Created new food: ${args.food_name}`);
    }

    // Create meal entry
    const { data: mealEntry, error: mealError } = await supabase
      .from('meal_entries')
      .insert({
        user_id: user.id,
        food_id: foodId,
        servings: args.servings || 1,
        meal_type: args.meal_type,
        consumed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (mealError) {
      console.error('Error creating meal entry:', mealError);
      throw new Error(`Error creating meal entry: ${mealError.message}`);
    }

    console.log('Meal created successfully:', mealEntry);

    // Format a nice response for the user
    let message = `¡Perfecto! He registrado tu comida:

📝 ${args.food_name} - ${args.servings} porcion${args.servings === 1 ? '' : 'es'}
🔥 Calorías: ${Math.round(args.calories_per_serving * args.servings)} kcal
💪 Proteína: ${Math.round(args.protein_per_serving * args.servings * 10) / 10}g
🍞 Carbohidratos: ${Math.round(args.carbs_per_serving * args.servings * 10) / 10}g
🥑 Grasas: ${Math.round(args.fat_per_serving * args.servings * 10) / 10}g`;

    // Calculate updated progress if possible
    let updatedProgress = null;
    if (userContext?.goals && userContext?.today) {
      const totalCalories = args.calories_per_serving * args.servings;
      const totalProtein = args.protein_per_serving * args.servings;
      const totalCarbs = args.carbs_per_serving * args.servings;
      const totalFat = args.fat_per_serving * args.servings;

      const newConsumed = {
        calories: (userContext.today.consumed.calories || 0) + totalCalories,
        protein: (userContext.today.consumed.protein || 0) + totalProtein,
        carbs: (userContext.today.consumed.carbs || 0) + totalCarbs,
        fat: (userContext.today.consumed.fat || 0) + totalFat
      };

      const goals = userContext.goals;
      updatedProgress = {
        calories: {
          consumed: Math.round(newConsumed.calories * 10) / 10,
          goal: goals.daily_calories,
          remaining: Math.max(0, goals.daily_calories - Math.round(newConsumed.calories * 10) / 10),
          percentage: Math.round((newConsumed.calories / goals.daily_calories) * 100)
        },
        protein: {
          consumed: Math.round(newConsumed.protein * 10) / 10,
          goal: goals.daily_protein,
          remaining: Math.max(0, goals.daily_protein - Math.round(newConsumed.protein * 10) / 10),
          percentage: Math.round((newConsumed.protein / goals.daily_protein) * 100)
        },
        carbs: {
          consumed: Math.round(newConsumed.carbs * 10) / 10,
          goal: goals.daily_carbs,
          remaining: Math.max(0, goals.daily_carbs - Math.round(newConsumed.carbs * 10) / 10),
          percentage: Math.round((newConsumed.carbs / goals.daily_carbs) * 100)
        },
        fat: {
          consumed: Math.round(newConsumed.fat * 10) / 10,
          goal: goals.daily_fat,
          remaining: Math.max(0, goals.daily_fat - Math.round(newConsumed.fat * 10) / 10),
          percentage: Math.round((newConsumed.fat / goals.daily_fat) * 100)
        }
      };

      message += `

📊 Tu progreso actualizado:
`;
      message += `🔥 Calorías: ${updatedProgress.calories.consumed}/${goals.daily_calories} (${updatedProgress.calories.percentage}%)
`;
      message += `💪 Proteína: ${updatedProgress.protein.consumed}g/${goals.daily_protein}g (${updatedProgress.protein.percentage}%)
`;
      message += `🍞 Carbohidratos: ${updatedProgress.carbs.consumed}g/${goals.daily_carbs}g (${updatedProgress.carbs.percentage}%)
`;
      message += `🥑 Grasas: ${updatedProgress.fat.consumed}g/${goals.daily_fat}g (${updatedProgress.fat.percentage}%)`;
    }

    return {
      message,
      mealEntry,
      updatedProgress
    };

  } catch (error) {
    console.error('Error in executeCreateMeal:', error);
    throw error;
  }
}

async function executeCreatePlate(args: any, userContext: any) {
  console.log('🍽️ CREATE_PLATE - Executing create_plate with args:', JSON.stringify(args, null, 2));
  
  try {
    // Create Supabase client using service role key for database operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Extract user ID from auth token - FIXED METHOD
    console.log('🔍 CREATE_PLATE - Attempting user authentication...');
    console.log('🔑 CREATE_PLATE - Auth header present:', !!userContext.authHeader);
    
    if (!userContext.authHeader) {
      console.error('🚨 CREATE_PLATE - No auth header provided in userContext');
      throw new Error('No authorization header provided');
    }
    
    // Use the service role client to verify the JWT token directly
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('📞 CREATE_PLATE - Verifying JWT token...');
    
    // Extract the JWT token from the Authorization header
    const token = userContext.authHeader.replace('Bearer ', '');
    
    // Verify the JWT token using the service role client
    const { data: { user }, error: userError } = await serviceClient.auth.getUser(token);
    
    console.log('🔍 CREATE_PLATE - Token verification result:', { 
      hasUser: !!user, 
      hasError: !!userError,
      errorMessage: userError?.message,
      userId: user?.id
    });
    
    if (userError || !user) {
      console.error('🚨 CREATE_PLATE - JWT token verification failed:', userError);
      throw new Error('User not authenticated - invalid or expired token');
    }

    console.log('✅ CREATE_PLATE - User authenticated successfully:', user.id);
    console.log('🍽️ CREATE_PLATE - Creating plate with', args.foods.length, 'foods');
    console.log('🔑 CREATE_PLATE - Auth header check:', userContext.authHeader ? 'present' : 'missing');

    // Debug: Log the user ID for verification
    console.log('👤 CREATE_PLATE - User ID from auth:', user.id);
    console.log('📋 CREATE_PLATE - User email:', user.email);

    // Process each food in the plate
    const mealEntries = [];
    const consumedTotals = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0
    };

    for (let i = 0; i < args.foods.length; i++) {
      const food = args.foods[i];
      console.log(`🥘 CREATE_PLATE - Processing food ${i + 1}/${args.foods.length}: ${food.food_name}`);
      console.log(`🍽️ CREATE_PLATE - Food details:`, {
        name: food.food_name,
        servings: food.servings,
        calories: food.calories_per_serving,
        protein: food.protein_per_serving,
        carbs: food.carbs_per_serving,
        fat: food.fat_per_serving
      });

      // Create or find the food entry
      const { data: existingFood } = await supabase
        .from('foods')
        .select('*')
        .eq('food_name', food.food_name)
        .limit(1);

      let foodId;
      if (existingFood && existingFood.length > 0) {
        foodId = existingFood[0].id;
        console.log(`🔍 CREATE_PLATE - Found existing food: ${food.food_name}`);
      } else {
        // Create new food entry
        const { data: newFood, error: insertError } = await supabase
          .from('foods')
          .insert({
            food_id: `openai_plate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            food_name: food.food_name,
            calories_per_serving: food.calories_per_serving,
            protein_per_serving: food.protein_per_serving,
            carbs_per_serving: food.carbs_per_serving,
            fat_per_serving: food.fat_per_serving,
            serving_description: 'Porción estándar'
          })
          .select()
          .single();

        if (insertError) {
          console.error('🚨 CREATE_PLATE - Error inserting food:', insertError);
          throw new Error(`Error creating food entry for ${food.food_name}: ${insertError.message}`);
        }

        foodId = newFood.id;
        console.log(`➕ CREATE_PLATE - Created new food: ${food.food_name}`);
      }

      // Create meal entry for this food
      const { data: mealEntry, error: mealError } = await supabase
        .from('meal_entries')
        .insert({
          user_id: user.id,
          food_id: foodId,
          servings: food.servings || 1,
          meal_type: args.meal_type,
          consumed_at: new Date().toISOString()
        })
        .select()
        .single();

      if (mealError) {
        console.error('🚨 CREATE_PLATE - Error creating meal entry:', mealError);
        throw new Error(`Error creating meal entry for ${food.food_name}: ${mealError.message}`);
      }

      mealEntries.push(mealEntry);
      
      // Add to totals
      const foodTotals = {
        calories: food.calories_per_serving * food.servings,
        protein: food.protein_per_serving * food.servings,
        carbs: food.carbs_per_serving * food.servings,
        fat: food.fat_per_serving * food.servings
      };
      
      consumedTotals.calories += foodTotals.calories;
      consumedTotals.protein += foodTotals.protein;
      consumedTotals.carbs += foodTotals.carbs;
      consumedTotals.fat += foodTotals.fat;

      console.log(`✅ CREATE_PLATE - Meal entry created for ${food.food_name}:`, foodTotals);
    }

    console.log('🎉 CREATE_PLATE - All meal entries created successfully. Total foods:', mealEntries.length);
    console.log('📊 CREATE_PLATE - Plate totals:', consumedTotals);

    // Format a nice response for the user
    let message = `¡Excelente! He creado tu plato "${args.plate_name}" con éxito:

🍽️ **${args.plate_name}**
`;

    args.foods.forEach((food: any) => {
      const totalCals = Math.round(food.calories_per_serving * food.servings);
      const totalProtein = Math.round(food.protein_per_serving * food.servings * 10) / 10;
      const totalCarbs = Math.round(food.carbs_per_serving * food.servings * 10) / 10;
      const totalFat = Math.round(food.fat_per_serving * food.servings * 10) / 10;
      
      message += `\n• ${food.food_name} (${food.servings} porción${food.servings === 1 ? '' : 'es'})`;
      message += `\n  ${totalCals} kcal | ${totalProtein}g proteína | ${totalCarbs}g carbohidratos | ${totalFat}g grasas`;
    });

    message += `\n\n📊 **Totales del plato:**`;
    message += `\n🔥 Calorías: ${Math.round(consumedTotals.calories)} kcal`;
    message += `\n💪 Proteína: ${Math.round(consumedTotals.protein * 10) / 10}g`;
    message += `\n🍞 Carbohidratos: ${Math.round(consumedTotals.carbs * 10) / 10}g`;
    message += `\n🥑 Grasas: ${Math.round(consumedTotals.fat * 10) / 10}g`;

    // Calculate updated progress if possible
    let updatedProgress = null;
    if (userContext?.goals && userContext?.today) {
      const newConsumed = {
        calories: (userContext.today.consumed.calories || 0) + consumedTotals.calories,
        protein: (userContext.today.consumed.protein || 0) + consumedTotals.protein,
        carbs: (userContext.today.consumed.carbs || 0) + consumedTotals.carbs,
        fat: (userContext.today.consumed.fat || 0) + consumedTotals.fat
      };

      const goals = userContext.goals;
      updatedProgress = {
        calories: {
          consumed: Math.round(newConsumed.calories * 10) / 10,
          goal: goals.daily_calories,
          remaining: Math.max(0, goals.daily_calories - Math.round(newConsumed.calories * 10) / 10),
          percentage: Math.round((newConsumed.calories / goals.daily_calories) * 100)
        },
        protein: {
          consumed: Math.round(newConsumed.protein * 10) / 10,
          goal: goals.daily_protein,
          remaining: Math.max(0, goals.daily_protein - Math.round(newConsumed.protein * 10) / 10),
          percentage: Math.round((newConsumed.protein / goals.daily_protein) * 100)
        },
        carbs: {
          consumed: Math.round(newConsumed.carbs * 10) / 10,
          goal: goals.daily_carbs,
          remaining: Math.max(0, goals.daily_carbs - Math.round(newConsumed.carbs * 10) / 10),
          percentage: Math.round((newConsumed.carbs / goals.daily_carbs) * 100)
        },
        fat: {
          consumed: Math.round(newConsumed.fat * 10) / 10,
          goal: goals.daily_fat,
          remaining: Math.max(0, goals.daily_fat - Math.round(newConsumed.fat * 10) / 10),
          percentage: Math.round((newConsumed.fat / goals.daily_fat) * 100)
        }
      };

      message += `\n\n📈 **Tu progreso actualizado:**`;
      message += `\n🔥 Calorías: ${updatedProgress.calories.consumed}/${goals.daily_calories} (${updatedProgress.calories.percentage}%)`;
      message += `\n💪 Proteína: ${updatedProgress.protein.consumed}g/${goals.daily_protein}g (${updatedProgress.protein.percentage}%)`;
      message += `\n🍞 Carbohidratos: ${updatedProgress.carbs.consumed}g/${goals.daily_carbs}g (${updatedProgress.carbs.percentage}%)`;
      message += `\n🥑 Grasas: ${updatedProgress.fat.consumed}g/${goals.daily_fat}g (${updatedProgress.fat.percentage}%)`;

      console.log('📈 CREATE_PLATE - Updated progress calculated:', updatedProgress);
    }

    console.log('✨ CREATE_PLATE - Success! Plate created with', mealEntries.length, 'foods');

    return {
      message,
      mealEntries,
      updatedProgress,
      plateTotals: consumedTotals
    };

  } catch (error) {
    console.error('🚨 CREATE_PLATE - Error in executeCreatePlate:', error);
    throw error;
  }
}

async function executeCreateMealPlan(args: any, userContext: any) {
  console.log('🍽️ CREATE_MEAL_PLAN - Executing create_meal_plan with args:', JSON.stringify(args, null, 2));
  
  try {
    // Create Supabase client using service role key for database operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Extract user ID from auth token
    console.log('🔍 CREATE_MEAL_PLAN - Attempting user authentication...');
    
    if (!userContext.authHeader) {
      console.error('🚨 CREATE_MEAL_PLAN - No auth header provided in userContext');
      throw new Error('No authorization header provided');
    }
    
    // Use the service role client to verify the JWT token directly
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('📞 CREATE_MEAL_PLAN - Verifying JWT token...');
    
    // Extract the JWT token from the Authorization header
    const token = userContext.authHeader.replace('Bearer ', '');
    
    // Verify the JWT token using the service role client
    const { data: { user }, error: userError } = await serviceClient.auth.getUser(token);
    
    console.log('🔍 CREATE_MEAL_PLAN - Token verification result:', { 
      hasUser: !!user, 
      hasError: !!userError,
      errorMessage: userError?.message,
      userId: user?.id
    });
    
    if (userError || !user) {
      console.error('🚨 CREATE_MEAL_PLAN - JWT token verification failed:', userError);
      throw new Error('User not authenticated - invalid or expired token');
    }

    console.log('✅ CREATE_MEAL_PLAN - User authenticated successfully:', user.id);
    console.log('🍽️ CREATE_MEAL_PLAN - Creating meal plan with', args.plates.length, 'plates');

    // Process each plate in the meal plan
    const allMealEntries = [];
    const planTotals = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0
    };
    const plateResults = [];

    for (let plateIndex = 0; plateIndex < args.plates.length; plateIndex++) {
      const plate = args.plates[plateIndex];
      console.log(`🥘 CREATE_MEAL_PLAN - Processing plate ${plateIndex + 1}/${args.plates.length}: ${plate.plate_name}`);
      
      const plateMealEntries = [];
      const plateTotals = {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0
      };

      // Process each food in this plate
      for (let i = 0; i < plate.foods.length; i++) {
        const food = plate.foods[i];
        console.log(`🍽️ CREATE_MEAL_PLAN - Processing food ${i + 1}/${plate.foods.length} in plate "${plate.plate_name}": ${food.food_name}`);

        // Create or find the food entry
        const { data: existingFood } = await supabase
          .from('foods')
          .select('*')
          .eq('food_name', food.food_name)
          .limit(1);

        let foodId;
        if (existingFood && existingFood.length > 0) {
          foodId = existingFood[0].id;
          console.log(`🔍 CREATE_MEAL_PLAN - Found existing food: ${food.food_name}`);
        } else {
          // Create new food entry
          const { data: newFood, error: insertError } = await supabase
            .from('foods')
            .insert({
              food_id: `openai_plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              food_name: food.food_name,
              calories_per_serving: food.calories_per_serving,
              protein_per_serving: food.protein_per_serving,
              carbs_per_serving: food.carbs_per_serving,
              fat_per_serving: food.fat_per_serving,
              serving_description: 'Porción estándar'
            })
            .select()
            .single();

          if (insertError) {
            console.error('🚨 CREATE_MEAL_PLAN - Error inserting food:', insertError);
            throw new Error(`Error creating food entry for ${food.food_name}: ${insertError.message}`);
          }

          foodId = newFood.id;
          console.log(`➕ CREATE_MEAL_PLAN - Created new food: ${food.food_name}`);
        }

        // Create meal entry for this food
        const { data: mealEntry, error: mealError } = await supabase
          .from('meal_entries')
          .insert({
            user_id: user.id,
            food_id: foodId,
            servings: food.servings || 1,
            meal_type: plate.meal_type,
            consumed_at: new Date().toISOString()
          })
          .select()
          .single();

        if (mealError) {
          console.error('🚨 CREATE_MEAL_PLAN - Error creating meal entry:', mealError);
          throw new Error(`Error creating meal entry for ${food.food_name}: ${mealError.message}`);
        }

        plateMealEntries.push(mealEntry);
        allMealEntries.push(mealEntry);
        
        // Add to plate totals - VALORES EXACTOS GUARDADOS EN BD
        const foodTotals = {
          calories: food.calories_per_serving * food.servings,
          protein: food.protein_per_serving * food.servings,
          carbs: food.carbs_per_serving * food.servings,
          fat: food.fat_per_serving * food.servings
        };
        
        plateTotals.calories += foodTotals.calories;
        plateTotals.protein += foodTotals.protein;
        plateTotals.carbs += foodTotals.carbs;
        plateTotals.fat += foodTotals.fat;

        // LOG DETALLADO: Valores que se muestran vs valores guardados
        console.log(`✅ CREATE_MEAL_PLAN - FOOD ${food.food_name}:`);
        console.log(`   • Servings: ${food.servings}`);
        console.log(`   • Per serving: ${food.calories_per_serving} kcal, ${food.protein_per_serving}g proteína, ${food.carbs_per_serving}g carbos, ${food.fat_per_serving}g grasas`);
        console.log(`   • CALCULATED TOTALS: ${foodTotals.calories} kcal, ${foodTotals.protein}g proteína, ${foodTotals.carbs}g carbos, ${foodTotals.fat}g grasas`);
        
        // Verificar que los datos en BD coincidan
        const { data: savedFood } = await supabase.from('foods').select('*').eq('id', foodId).single();
        if (savedFood) {
          console.log(`   • BD VALUES: ${savedFood.calories_per_serving} kcal/porción, ${savedFood.protein_per_serving}g, ${savedFood.carbs_per_serving}g, ${savedFood.fat_per_serving}g`);
          if (savedFood.calories_per_serving !== food.calories_per_serving) {
            console.error(`   ❌ MISMATCH! Chat shows ${food.calories_per_serving} but BD has ${savedFood.calories_per_serving}`);
          }
        }
      }

      // Add plate totals to plan totals
      planTotals.calories += plateTotals.calories;
      planTotals.protein += plateTotals.protein;
      planTotals.carbs += plateTotals.carbs;
      planTotals.fat += plateTotals.fat;

      plateResults.push({
        plate_name: plate.plate_name,
        meal_type: plate.meal_type,
        foods: plate.foods,
        totals: plateTotals,
        mealEntries: plateMealEntries
      });

      console.log(`🎉 CREATE_MEAL_PLAN - Plate "${plate.plate_name}" created successfully with ${plateMealEntries.length} foods`);
      console.log('📊 CREATE_MEAL_PLAN - Plate totals:', plateTotals);
    }

    console.log('🌟 CREATE_MEAL_PLAN - All plates created successfully. Total plates:', plateResults.length);
    console.log('📊 CREATE_MEAL_PLAN - Plan totals:', planTotals);

    // Format a comprehensive response for the user
    let message = `🎉 ¡Excelente! He creado tu plan alimenticio "${args.plan_name}" completo:

📋 **${args.plan_name}**
`;

    plateResults.forEach((plateResult) => {
      const mealTypeNames: { [key: string]: string } = {
        'breakfast': 'Desayuno',
        'lunch': 'Almuerzo',
        'dinner': 'Cena',
        'snack': 'Merienda'
      };

      message += `\n\n🍽️ **${mealTypeNames[plateResult.meal_type] || plateResult.meal_type}: ${plateResult.plate_name}**`;
      
      plateResult.foods.forEach((food: any) => {
        // VALORES EXACTOS - NO redondear para que coincidan con la BD
        const totalCals = food.calories_per_serving * food.servings;
        const totalProtein = food.protein_per_serving * food.servings;
        const totalCarbs = food.carbs_per_serving * food.servings;
        const totalFat = food.fat_per_serving * food.servings;
        
        message += `\n• ${food.food_name} (${food.servings} porción${food.servings === 1 ? '' : 'es'})`;
        message += `\n  ${totalCals} kcal | ${totalProtein}g proteína | ${totalCarbs}g carbohidratos | ${totalFat}g grasas`;
      });

      message += `\n📊 **Subtotal:**`;
      message += ` ${plateResult.totals.calories} kcal, ${plateResult.totals.protein}g proteína, ${plateResult.totals.carbs}g carbohidratos, ${plateResult.totals.fat}g grasas`;
    });

    message += `\n\n📊 **TOTALES DEL PLAN COMPLETO:**`;
    message += `\n🔥 Calorías: ${planTotals.calories} kcal`;
    message += `\n💪 Proteína: ${planTotals.protein}g`;
    message += `\n🍞 Carbohidratos: ${planTotals.carbs}g`;
    message += `\n🥑 Grasas: ${planTotals.fat}g`;

    // Calculate updated progress if possible
    let updatedProgress = null;
    if (userContext?.goals && userContext?.today) {
      const newConsumed = {
        calories: (userContext.today.consumed.calories || 0) + planTotals.calories,
        protein: (userContext.today.consumed.protein || 0) + planTotals.protein,
        carbs: (userContext.today.consumed.carbs || 0) + planTotals.carbs,
        fat: (userContext.today.consumed.fat || 0) + planTotals.fat
      };

      const goals = userContext.goals;
      updatedProgress = {
        calories: {
          consumed: newConsumed.calories,
          goal: goals.daily_calories,
          remaining: Math.max(0, goals.daily_calories - newConsumed.calories),
          percentage: Math.round((newConsumed.calories / goals.daily_calories) * 100)
        },
        protein: {
          consumed: newConsumed.protein,
          goal: goals.daily_protein,
          remaining: Math.max(0, goals.daily_protein - newConsumed.protein),
          percentage: Math.round((newConsumed.protein / goals.daily_protein) * 100)
        },
        carbs: {
          consumed: newConsumed.carbs,
          goal: goals.daily_carbs,
          remaining: Math.max(0, goals.daily_carbs - newConsumed.carbs),
          percentage: Math.round((newConsumed.carbs / goals.daily_carbs) * 100)
        },
        fat: {
          consumed: newConsumed.fat,
          goal: goals.daily_fat,
          remaining: Math.max(0, goals.daily_fat - newConsumed.fat),
          percentage: Math.round((newConsumed.fat / goals.daily_fat) * 100)
        }
      };

      message += `\n\n📈 **Tu progreso actualizado:**`;
      message += `\n🔥 Calorías: ${updatedProgress.calories.consumed}/${goals.daily_calories} (${updatedProgress.calories.percentage}%)`;
      message += `\n💪 Proteína: ${updatedProgress.protein.consumed}g/${goals.daily_protein}g (${updatedProgress.protein.percentage}%)`;
      message += `\n🍞 Carbohidratos: ${updatedProgress.carbs.consumed}g/${goals.daily_carbs}g (${updatedProgress.carbs.percentage}%)`;
      message += `\n🥑 Grasas: ${updatedProgress.fat.consumed}g/${goals.daily_fat}g (${updatedProgress.fat.percentage}%)`;

      console.log('📈 CREATE_MEAL_PLAN - Updated progress calculated:', updatedProgress);
    }

    console.log('✨ CREATE_MEAL_PLAN - Success! Meal plan created with', plateResults.length, 'plates and', allMealEntries.length, 'total meal entries');

    return {
      message,
      plateResults,
      allMealEntries,
      updatedProgress,
      planTotals
    };

  } catch (error) {
    console.error('🚨 CREATE_MEAL_PLAN - Error in executeCreateMealPlan:', error);
    throw error;
  }
}

