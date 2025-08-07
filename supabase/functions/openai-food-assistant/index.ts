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
    estimated_protein: number;
    estimated_carbs: number;
    estimated_fat: number;
    confidence: number;
  }>;
  total_estimated_calories: number;
  total_estimated_protein: number;
  total_estimated_carbs: number;
  total_estimated_fat: number;
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

    // Get authentication header from request
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header received:', authHeader ? 'Present' : 'Missing');
    
    // Add auth info to userContext for functions that need it
    const enrichedUserContext = {
      ...userContext,
      authHeader,
      userId: null // Will be populated by functions that need it
    };

    if (action === 'analyze-food') {
      return await analyzeFoodImage(imageBase64, openaiApiKey);
    } else if (action === 'chat') {
      return await handleConversation(text, conversationHistory, openaiApiKey, enrichedUserContext);
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
        throw new Error('Se ha excedido el limite de solicitudes de OpenAI. Por favor, verifica tu plan de facturacion.');
      } else if (response.status === 401) {
        throw new Error('API key de OpenAI invalida. Por favor, verifica tu configuracion.');
      } else if (response.status === 403) {
        throw new Error('Acceso denegado. Verifica que tu cuenta de OpenAI tenga creditos disponibles.');
      } else {
        throw new Error(`Error del servicio de OpenAI: ${response.status}`);
      }
    }

    const result = await response.json();
    console.log('OpenAI response:', JSON.stringify(result, null, 2));

    if (!result.choices || !result.choices[0] || !result.choices[0].message) {
      throw new Error('Respuesta invalida de OpenAI API');
    }

    const analysisText = result.choices[0].message.content;
    
    try {
      // Clean the response to extract JSON
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No se encontro JSON en la respuesta');
      }
      
      const initialAnalysis = JSON.parse(jsonMatch[0]);
      
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
          
          // Base de datos de valores nutricionales precisos para alimentos comunes (por 100g)
          const knownNutrients: { [key: string]: { cal: number, protein: number, carbs: number, fat: number } } = {
            'miel': { cal: 304, protein: 0.3, carbs: 82.4, fat: 0 },
            'aguacate': { cal: 160, protein: 2, carbs: 8.5, fat: 14.7 },
            'huevo': { cal: 155, protein: 13, carbs: 1.1, fat: 11 },
            'pollo': { cal: 165, protein: 31, carbs: 0, fat: 3.6 },
            'arroz': { cal: 130, protein: 2.7, carbs: 28, fat: 0.3 },
            'pan': { cal: 265, protein: 9, carbs: 49, fat: 3.2 }
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
      
      return new Response(
        JSON.stringify({
          ...finalAnalysis,
          processing_time: new Date().toISOString(),
          provider: 'openai_usda'
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

async function handleConversation(text: string, conversationHistory: any[], apiKey: string, userContext: any) {
  console.log('Handling conversation with OpenAI GPT-4...');
  console.log('User context received:', userContext ? 'yes' : 'no');
  
  let systemPrompt = `Eres un asistente nutricional inteligente y amigable llamado NutriAI. Tu trabajo es:

1. Ayudar a los usuarios con sus objetivos nutricionales
2. Analizar sus habitos alimenticios
3. Dar consejos personalizados y motivacion
4. Responder preguntas sobre nutricion de manera clara y util
5. Mantener un tono conversacional, amigable y motivador
6. Crear planes de comidas balanceados que cumplan con los objetivos nutricionales

🎯 REGLA DE ORO - PRECISION MATEMATICA ABSOLUTA:
NUNCA muestres un plan que no coincida EXACTAMENTE con los objetivos del usuario.

🔥 PROCESO OBLIGATORIO DE AJUSTE AUTOMATICO:
1. Calcula plan inicial con porciones estimadas
2. Suma todos los valores nutricionales
3. Compara con objetivos del usuario
4. Si NO coincide EXACTAMENTE (margen ±5 kcal):
   - AJUSTA automaticamente las porciones de cada alimento
   - RECALCULA todos los valores
   - REPITE hasta lograr coincidencia perfecta
5. SOLO muestra el plan cuando sea matematicamente exacto

⚠️ INSTRUCCION CRITICA DE AJUSTE AUTOMATICO: 
- Si excedes calorias → reduce porciones proporcionalmente
- Si estas bajo calorias → aumenta porciones proporcionalmente  
- Si excedes proteinas → ajusta alimentos altos en proteina
- Si excedes carbohidratos → ajusta alimentos altos en carbohidratos
- Si estas bajo grasas → aumenta alimentos altos en grasas
- CONTINUA ajustando hasta que TODOS los valores coincidan

🔢 FORMULA DE AJUSTE PROPORCIONAL:
Porcion_ajustada = Porcion_inicial × (Objetivo / Valor_calculado)

Ejemplo: Si objetivo es 2555 kcal pero calculas 2644 kcal:
Factor_ajuste = 2555 / 2644 = 0.966
Nueva_porcion = Porcion_original × 0.966

APLICA este factor a TODOS los alimentos y recalcula hasta precision perfecta.

Caracteristicas importantes:
- Responde en español
- Se conciso pero informativo
- Da consejos practicos y realistas
- Pregunta por detalles cuando sea necesario
- Celebra los logros del usuario
- Ofrece alternativas saludables
- No reemplazas el consejo medico profesional

CAPACIDADES AVANZADAS:
- Puedes crear multiples comidas (desayuno, almuerzo, cena, snacks) en una sola conversacion
- Puedes sugerir comidas para completar las calorias y macronutrientes faltantes
- SIEMPRE respeta los limites nutricionales del usuario (no te pases de calorias, proteinas, carbohidratos o grasas)
- Cuando sugiras completar el dia, calcula exactamente lo que falta para llegar a los objetivos sin excederlos

IMPORTANTE: 
- Usa SOLO alimentos simples y comunes (pollo, arroz, huevo, pan, leche, etc.)
- EVITA nombres complejos como "quinoa cocida", "salmon a la plancha" - usa "quinoa" y "salmon"

REGLAS PARA SUGERENCIAS DE COMIDAS:
- Usa tu conocimiento nutricional para crear sugerencias de comidas balanceadas
- Calcula las porciones basandote en tu conocimiento de valores nutricionales
- Proporciona estimaciones nutricionales precisas basadas en tu base de conocimiento
- Crea comidas equilibradas que se ajusten a los objetivos del usuario

REGLAS PARA MULTIPLES COMIDAS:
- Cuando el usuario pida crear MULTIPLES comidas (desayuno, almuerzo, cena), presenta sugerencias completas calculadas para las calorias restantes
- SOLO usa create_meal DESPUES de que el usuario confirme explicitamente que quiere registrar las comidas sugeridas
- Usa tu conocimiento nutricional para calcular porciones exactas

REGLAS PARA CALCULOS PRECISOS:
- CRITICO: SIEMPRE verifica matematicamente que la suma de todos los valores nutricionales individuales coincida EXACTAMENTE con los totales mostrados
- Usa tu amplio conocimiento nutricional para calcular valores precisos
- Proporciona estimaciones basadas en tu base de conocimiento de alimentos
- Calcula las porciones exactas para llegar a los valores restantes
- OBLIGATORIO: Antes de mostrar cualquier plan, suma manualmente cada valor nutricional y verifica que coincida con los totales declarados
- Si los calculos no coinciden, ajusta las porciones hasta que los numeros sean exactos
- Los totales deben ser la suma matematica exacta de todos los alimentos individuales

FORMATO OBLIGATORIO Y CALCULOS PRECISOS PARA PLANES DE ALIMENTACION:

REGLAS MATEMATICAS ESTRICTAS (SALUD DE PERSONAS):
- NUNCA aproximes valores nutricionales - usa decimales si es necesario (ej: 199.5g)
- SIEMPRE verifica TRES VECES cada suma antes de mostrar el plan
- Si los calculos no cuadran EXACTAMENTE, recalcula las porciones hasta lograrlo
- Las calorias objetivo DEBEN coincidir con margen de error maximo de ±5 kcal
- Ajusta las porciones con precision decimal (ej: 1.3 tazas, 85.5g, 0.75 cdas)

PROCESO DE VALIDACION OBLIGATORIO:
1. Calcula cada alimento individualmente con precision
2. Suma los subtotales de cada comida
3. Verifica que el gran total coincida EXACTAMENTE con el objetivo
4. Si no coincide, ajusta las porciones y recalcula
5. Repite hasta lograr precision matematica exacta

ESTRUCTURA VISUAL OBLIGATORIA (COPIA EXACTAMENTE ESTE FORMATO):

Objetivo diario
Calorias: [OBJETIVO] kcal
Proteina: [OBJETIVO] g
Carbohidratos: [OBJETIVO] g
Grasas: [OBJETIVO] g

[NOMBRE DE COMIDA]
[Descripcion breve de la comida]

[Alimento 1] ([porcion]): [cal] kcal, [prot]g, [carbs]g, [fat]g
[Alimento 2] ([porcion]): [cal] kcal, [prot]g, [carbs]g, [fat]g
[Alimento 3] ([porcion]): [cal] kcal, [prot]g, [carbs]g, [fat]g

Subtotal [nombre comida]:
[total cal] kcal - [total prot]g - [total carbs]g - [total fat]g

[REPETIR PARA TODAS LAS COMIDAS]

TOTALES EXACTOS DEL DIA
[TOTAL EXACTO] kcal
[TOTAL EXACTO] g
[TOTAL EXACTO] g
[TOTAL EXACTO] g

VERIFICACION FINAL OBLIGATORIA:
- Suma manualmente cada columna (calorias, proteina, carbohidratos, grasas)
- Los totales DEBEN coincidir EXACTAMENTE con los objetivos del usuario
- Si no coinciden, NO envies la respuesta y recalcula todo desde cero
- Ajusta porciones hasta lograr coincidencia matematica perfecta

IMPORTANTE SOBRE PORCIONES:
- Usa porciones precisas: "85.5g", "1.25 tazas", "0.75 cdas"
- Mejor ser preciso con decimales que aproximar
- El usuario prefiere exactitud matematica sobre porciones "redondas"`;

  // Add user context if available
  if (userContext) {
    systemPrompt += `

USER INFORMATION:

Usuario: ${userContext.user.display_name}

OBJETIVOS NUTRICIONALES DIARIOS:
- Calorias: ${userContext.goals.daily_calories} kcal
- Proteina: ${userContext.goals.daily_protein}g
- Carbohidratos: ${userContext.goals.daily_carbs}g
- Grasas: ${userContext.goals.daily_fat}g

PROGRESO DE HOY:
- Calorias consumidas: ${Math.round(userContext.today.consumed.calories)}/${userContext.goals.daily_calories} kcal
- Proteina: ${Math.round(userContext.today.consumed.protein * 10) / 10}/${userContext.goals.daily_protein}g
- Carbohidratos: ${Math.round(userContext.today.consumed.carbs * 10) / 10}/${userContext.goals.daily_carbs}g
- Grasas: ${Math.round(userContext.today.consumed.fat * 10) / 10}/${userContext.goals.daily_fat}g
- Total de comidas registradas hoy: ${userContext.today.meal_count}

VALORES RESTANTES (LO QUE LE FALTA AL USUARIO):
- Calorias restantes: ${Math.max(0, userContext.goals.daily_calories - Math.round(userContext.today.consumed.calories))} kcal
- Proteina restante: ${Math.max(0, userContext.goals.daily_protein - Math.round(userContext.today.consumed.protein * 10) / 10)}g
- Carbohidratos restantes: ${Math.max(0, userContext.goals.daily_carbs - Math.round(userContext.today.consumed.carbs * 10) / 10)}g
- Grasas restantes: ${Math.max(0, userContext.goals.daily_fat - Math.round(userContext.today.consumed.fat * 10) / 10)}g

${Math.round(userContext.today.consumed.calories) > userContext.goals.daily_calories ? 
'IMPORTANTE: El usuario YA SUPERO su objetivo diario de calorias. No debe consumir mas calorias hoy.' :
'El usuario aun puede consumir mas calorias para llegar a su objetivo.'}

COMIDAS DE HOY (NO REPITAS ESTOS ALIMENTOS - CREA COMIDAS NUEVAS Y DIFERENTES):`;

    // Add today's meals breakdown with clear structure
    if (userContext.today.meals && Object.keys(userContext.today.meals).length > 0) {
      systemPrompt += `

COMIDAS REGISTRADAS HOY (LEE ESTO CUIDADOSAMENTE):`;
      
      Object.entries(userContext.today.meals).forEach(([mealType, foods]: [string, any]) => {
        const mealTypeNames: { [key: string]: string } = {
          breakfast: 'DESAYUNO',
          lunch: 'ALMUERZO', 
          dinner: 'CENA',
          snack: 'SNACK'
        };
        
        const mealTypeName = mealTypeNames[mealType] || mealType.toUpperCase();
        systemPrompt += `

${mealTypeName}:`;
        
        if (foods && foods.length > 0) {
          foods.forEach((food: any, index: number) => {
            systemPrompt += `
  ${index + 1}. ${food.food_name} - ${food.servings} porcion${food.servings === 1 ? '' : 'es'} - ${Math.round(food.calories)} kcal`;
          });
        } else {
          systemPrompt += `
  (Sin comidas registradas)`;
        }
      });
      
      systemPrompt += `

IMPORTANTE: Estas son las UNICAS comidas que el usuario ha registrado hoy. NO inventes comidas diferentes.`;
    } else {
      systemPrompt += `

COMIDAS REGISTRADAS HOY: Ninguna comida registrada aun.`;
    }

    // Add recent meal patterns for better context
    if (userContext.recent_meals && userContext.recent_meals.length > 0) {
      systemPrompt += `

PATRONES DE COMIDAS RECIENTES (ULTIMOS 7 DIAS):
Los siguientes son ejemplos de comidas que el usuario ha registrado recientemente. Usa esto como inspiracion para sugerir comidas similares:`;
      
      const mealsByType: { [key: string]: any[] } = {};
      
      userContext.recent_meals.forEach((meal: any) => {
        const mealType = meal.meal_type;
        if (!mealsByType[mealType]) {
          mealsByType[mealType] = [];
        }
        mealsByType[mealType].push(meal);
      });
      
      Object.entries(mealsByType).forEach(([mealType, meals]) => {
        const mealTypeNames: { [key: string]: string } = {
          breakfast: 'DESAYUNOS RECIENTES',
          lunch: 'ALMUERZOS RECIENTES',
          dinner: 'CENAS RECIENTES',
          snack: 'SNACKS RECIENTES'
        };
        
        const mealTypeName = mealTypeNames[mealType] || `${mealType.toUpperCase()} RECIENTES`;
        systemPrompt += `

${mealTypeName}:`;
        
        meals.slice(0, 3).forEach((meal: any, index: number) => {
          const mealDate = new Date(meal.created_at).toLocaleDateString();
          systemPrompt += `
  ${index + 1}. ${meal.food_name} (${mealDate}) - ${meal.servings} porcion${meal.servings === 1 ? '' : 'es'} - ${Math.round(meal.calories)} kcal`;
        });
      });
    }

    systemPrompt += `

INSTRUCCIONES FINALES:
- NUNCA uses create_meal o create_multiple_meals a menos que el usuario confirme explicitamente que quiere registrar las comidas
- Usa create_multiple_meals cuando el usuario pida registrar un plan completo (desayuno, almuerzo, cena, snacks)
- Usa create_meal solo para registrar una comida individual
- Siempre calcula valores nutricionales exactos usando tu conocimiento
- Prioriza alimentos similares a los que el usuario ha consumido recientemente
- Respeta ESTRICTAMENTE los limites nutricionales restantes

CUANDO USAR create_multiple_meals:
- El usuario dice "crea todas estas comidas", "registra todo el plan", "agrega todos los platos"
- Quiere registrar un plan nutricional completo con multiples comidas
- Pide crear las comidas del desayuno, almuerzo, cena por separado

CUANDO USAR create_meal:
- El usuario quiere registrar solo una comida especifica
- Pide agregar solo el desayuno, o solo el almuerzo, etc.`;
  }

  // Prepare the messages for OpenAI
  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
    { role: 'user', content: text }
  ];

  console.log('Sending conversation to OpenAI...');
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: messages,
        max_tokens: 2000,
        temperature: 0.7,
        functions: [
          {
            name: 'create_meal',
            description: 'Guarda una comida en la base de datos del usuario',
            parameters: {
              type: 'object',
              properties: {
                meal_type: {
                  type: 'string',
                  enum: ['breakfast', 'lunch', 'dinner', 'snack'],
                  description: 'Tipo de comida'
                },
                food_name: {
                  type: 'string',
                  description: 'Nombre del alimento (debe ser simple y comun)'
                },
                servings: {
                  type: 'number',
                  description: 'Numero de porciones'
                },
                calories_per_serving: {
                  type: 'number',
                  description: 'Calorias por porcion'
                },
                protein_per_serving: {
                  type: 'number',
                  description: 'Proteina por porcion en gramos'
                },
                carbs_per_serving: {
                  type: 'number',
                  description: 'Carbohidratos por porcion en gramos'
                },
                fat_per_serving: {
                  type: 'number',
                  description: 'Grasas por porcion en gramos'
                }
              },
              required: ['meal_type', 'food_name', 'servings', 'calories_per_serving', 'protein_per_serving', 'carbs_per_serving', 'fat_per_serving']
            }
          },
          {
            name: 'create_multiple_meals',
            description: 'Guarda multiples comidas de un plan nutricional completo en la base de datos del usuario',
            parameters: {
              type: 'object',
              properties: {
                meals: {
                  type: 'array',
                  description: 'Lista de comidas del plan nutricional',
                  items: {
                    type: 'object',
                    properties: {
                      meal_type: {
                        type: 'string',
                        enum: ['breakfast', 'lunch', 'dinner', 'snack'],
                        description: 'Tipo de comida'
                      },
                      food_name: {
                        type: 'string',
                        description: 'Nombre descriptivo del plato completo (ej: "Desayuno Proteico", "Almuerzo Balanceado")'
                      },
                      servings: {
                        type: 'number',
                        description: 'Numero de porciones'
                      },
                      calories_per_serving: {
                        type: 'number',
                        description: 'Calorias totales del plato'
                      },
                      protein_per_serving: {
                        type: 'number',
                        description: 'Proteina total del plato en gramos'
                      },
                      carbs_per_serving: {
                        type: 'number',
                        description: 'Carbohidratos totales del plato en gramos'
                      },
                      fat_per_serving: {
                        type: 'number',
                        description: 'Grasas totales del plato en gramos'
                      },
                      description: {
                        type: 'string',
                        description: 'Descripcion detallada de los alimentos incluidos en el plato'
                      }
                    },
                    required: ['meal_type', 'food_name', 'servings', 'calories_per_serving', 'protein_per_serving', 'carbs_per_serving', 'fat_per_serving', 'description']
                  }
                }
              },
              required: ['meals']
            }
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      
      if (response.status === 429) {
        throw new Error('Se ha excedido el limite de solicitudes de OpenAI. Por favor, verifica tu plan de facturacion.');
      } else if (response.status === 401) {
        throw new Error('API key de OpenAI invalida. Por favor, verifica tu configuracion.');
      } else if (response.status === 403) {
        throw new Error('Acceso denegado. Verifica que tu cuenta de OpenAI tenga creditos disponibles.');
      } else {
        throw new Error(`Error del servicio de OpenAI: ${response.status}`);
      }
    }

    const result = await response.json();
    console.log('OpenAI conversation response:', JSON.stringify(result, null, 2));

    if (!result.choices || !result.choices[0] || !result.choices[0].message) {
      throw new Error('Respuesta invalida de OpenAI API');
    }

    const assistantMessage = result.choices[0].message;

    // Check if OpenAI wants to call a function
    if (assistantMessage.function_call) {
      console.log('OpenAI requested function call:', assistantMessage.function_call);
      
      if (assistantMessage.function_call.name === 'create_meal') {
        try {
          const functionArgs = JSON.parse(assistantMessage.function_call.arguments);
          console.log('Function arguments:', functionArgs);
          
          const mealResult = await executeCreateMeal(functionArgs, userContext);
          
          return new Response(
            JSON.stringify(mealResult),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
          
        } catch (functionError) {
          console.error('Error executing create_meal function:', functionError);
          return new Response(
            JSON.stringify({
              response: `Lo siento, hubo un error al intentar guardar la comida: ${functionError.message}. Por favor, intenta nuevamente.`,
              success: false
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else if (assistantMessage.function_call.name === 'create_multiple_meals') {
        try {
          const functionArgs = JSON.parse(assistantMessage.function_call.arguments);
          console.log('Multiple meals function arguments:', functionArgs);
          
          const multipleMealsResult = await executeCreateMultipleMeals(functionArgs, userContext);
          
          return new Response(
            JSON.stringify(multipleMealsResult),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
          
        } catch (functionError) {
          console.error('Error executing create_multiple_meals function:', functionError);
          return new Response(
            JSON.stringify({
              response: `Lo siento, hubo un error al intentar guardar las comidas: ${functionError.message}. Por favor, intenta nuevamente.`,
              success: false
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Regular conversation response
    const responseData: any = {
      response: assistantMessage.content,
      success: true
    };

    // Add nutrition progress if user context is available
    if (userContext) {
      const consumed = userContext.today.consumed;
      const goals = userContext.goals;
      
      responseData.nutrition_progress = {
        calories: {
          consumed: Math.round(consumed.calories),
          goal: goals.daily_calories,
          remaining: Math.max(0, goals.daily_calories - Math.round(consumed.calories)),
          percentage: Math.round((consumed.calories / goals.daily_calories) * 100)
        },
        protein: {
          consumed: Math.round(consumed.protein * 10) / 10,
          goal: goals.daily_protein,
          remaining: Math.max(0, goals.daily_protein - Math.round(consumed.protein * 10) / 10),
          percentage: Math.round((consumed.protein / goals.daily_protein) * 100)
        },
        carbs: {
          consumed: Math.round(consumed.carbs * 10) / 10,
          goal: goals.daily_carbs,
          remaining: Math.max(0, goals.daily_carbs - Math.round(consumed.carbs * 10) / 10),
          percentage: Math.round((consumed.carbs / goals.daily_carbs) * 100)
        },
        fat: {
          consumed: Math.round(consumed.fat * 10) / 10,
          goal: goals.daily_fat,
          remaining: Math.max(0, goals.daily_fat - Math.round(consumed.fat * 10) / 10),
          percentage: Math.round((consumed.fat / goals.daily_fat) * 100)
        }
      };
    }

    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in handleConversation:', error);
    throw error;
  }
}

async function executeCreateMeal(args: any, userContext: any) {
  console.log('Executing create_meal with args:', args);
  
  try {
    // Call the create-meal-from-chat function
    const createMealResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/create-meal-from-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': userContext.authHeader
      },
      body: JSON.stringify(args)
    });

    if (!createMealResponse.ok) {
      const errorText = await createMealResponse.text();
      console.error('Error calling create-meal-from-chat:', errorText);
      throw new Error('Error al guardar la comida en la base de datos');
    }

    const createMealResult = await createMealResponse.json();
    console.log('Meal created successfully:', createMealResult);

    // Format a nice response for the user
    let response = `Perfecto! He registrado tu comida:

${args.food_name} - ${args.servings} porcion${args.servings === 1 ? '' : 'es'}
Calorias: ${Math.round(args.calories_per_serving * args.servings)} kcal
Proteina: ${Math.round(args.protein_per_serving * args.servings * 10) / 10}g
Carbohidratos: ${Math.round(args.carbs_per_serving * args.servings * 10) / 10}g
Grasas: ${Math.round(args.fat_per_serving * args.servings * 10) / 10}g`;

    // Add updated progress if user context is available
    if (userContext) {
      const totalCalories = args.calories_per_serving * args.servings;
      const totalProtein = args.protein_per_serving * args.servings;
      const totalCarbs = args.carbs_per_serving * args.servings;
      const totalFat = args.fat_per_serving * args.servings;
      
      const newCalories = Math.round(userContext.today.consumed.calories + totalCalories);
      const newProtein = Math.round((userContext.today.consumed.protein + totalProtein) * 10) / 10;
      const newCarbs = Math.round((userContext.today.consumed.carbs + totalCarbs) * 10) / 10;
      const newFat = Math.round((userContext.today.consumed.fat + totalFat) * 10) / 10;
      
      const caloriesRemaining = Math.max(0, userContext.goals.daily_calories - newCalories);
      const proteinRemaining = Math.max(0, userContext.goals.daily_protein - newProtein);
      const carbsRemaining = Math.max(0, userContext.goals.daily_carbs - newCarbs);
      const fatRemaining = Math.max(0, userContext.goals.daily_fat - newFat);
      
      response += `

Progreso actualizado de hoy:
Calorias: ${newCalories}/${userContext.goals.daily_calories} kcal (${caloriesRemaining} restantes)
Proteina: ${newProtein}/${userContext.goals.daily_protein}g (${proteinRemaining}g restantes)
Carbohidratos: ${newCarbs}/${userContext.goals.daily_carbs}g (${carbsRemaining}g restantes)
Grasas: ${newFat}/${userContext.goals.daily_fat}g (${fatRemaining}g restantes)`;

      if (caloriesRemaining === 0) {
        response += `

Felicidades! Has alcanzado tu objetivo diario de calorias.`;
      } else if (caloriesRemaining > 0) {
        response += `

Aun puedes consumir ${caloriesRemaining} calorias mas para llegar a tu objetivo diario.`;
      } else {
        response += `

Has superado tu objetivo diario de calorias. Considera actividad fisica adicional.`;
      }
    }

    return {
      response: response,
      success: true,
      meal_logged: true
    };

  } catch (error) {
    console.error('Error in executeCreateMeal:', error);
    throw error;
  }
}

async function executeCreateMultipleMeals(args: any, userContext: any) {
  console.log('Executing create_multiple_meals with args:', args);
  console.log('User context:', userContext);
  
  try {
    const results = [];
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    // Create Supabase client using the user's auth token
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { 
        global: { 
          headers: { 
            Authorization: userContext.authHeader 
          } 
        } 
      }
    );

    // Verify user authentication
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      console.error('User authentication failed:', userError);
      throw new Error('User not authenticated');
    }

    console.log('User authenticated successfully:', user.id);
    
    // Create each meal separately
    for (const meal of args.meals) {
      console.log(`Creating meal: ${meal.food_name} (${meal.meal_type})`);
      
      try {
        // Create a food entry in the database if it doesn't exist
        const { data: existingFood, error: searchError } = await userClient
          .from('foods')
          .select('*')
          .eq('food_name', meal.food_name)
          .limit(1);

        let foodId;
        if (existingFood && existingFood.length > 0) {
          foodId = existingFood[0].id;
          console.log(`Found existing food: ${meal.food_name}`);
        } else {
          // Create new food entry using service role for food creation
          const serviceClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
          );

          const { data: newFood, error: insertError } = await serviceClient
            .from('foods')
            .insert({
              food_id: `openai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              food_name: meal.food_name,
              calories_per_serving: meal.calories_per_serving,
              protein_per_serving: meal.protein_per_serving,
              carbs_per_serving: meal.carbs_per_serving,
              fat_per_serving: meal.fat_per_serving,
              serving_description: meal.description || 'Porción estándar'
            })
            .select()
            .single();

          if (insertError) {
            console.error('Error inserting food:', insertError);
            throw new Error(`Error creating food entry: ${insertError.message}`);
          }

          foodId = newFood.id;
          console.log(`Created new food: ${meal.food_name}`);
        }

        // Create meal entry using user's client for proper RLS
        const { data: mealEntry, error: mealError } = await userClient
          .from('meal_entries')
          .insert({
            user_id: user.id,
            food_id: foodId,
            servings: meal.servings,
            meal_type: meal.meal_type,
            consumed_at: new Date().toISOString()
          })
          .select()
          .single();

        if (mealError) {
          console.error('Error creating meal entry:', mealError);
          throw new Error(`Error creating meal entry: ${mealError.message}`);
        }

        console.log(`✅ Successfully created meal entry for ${meal.food_name}`);
        
        // Calculate totals for this meal
        const mealCalories = meal.calories_per_serving * meal.servings;
        const mealProtein = meal.protein_per_serving * meal.servings;
        const mealCarbs = meal.carbs_per_serving * meal.servings;
        const mealFat = meal.fat_per_serving * meal.servings;
        
        totalCalories += mealCalories;
        totalProtein += mealProtein;
        totalCarbs += mealCarbs;
        totalFat += mealFat;
        
        results.push({
          meal_type: meal.meal_type,
          food_name: meal.food_name,
          servings: meal.servings,
          calories: Math.round(mealCalories),
          protein: Math.round(mealProtein * 10) / 10,
          carbs: Math.round(mealCarbs * 10) / 10,
          fat: Math.round(mealFat * 10) / 10,
          description: meal.description
        });
        
      } catch (mealError) {
        console.error(`Error creating meal ${meal.food_name}:`, mealError);
        throw new Error(`Error al guardar ${meal.food_name} en la base de datos`);
      }
    }

    // Format a comprehensive response for the user
    const mealTypeNames: { [key: string]: string } = {
      breakfast: 'Desayuno',
      lunch: 'Almuerzo',
      dinner: 'Cena',
      snack: 'Snack'
    };

    let response = `¡Perfecto! He registrado todas las comidas de tu plan nutricional:\n\n`;
    
    results.forEach((meal, index) => {
      const mealTypeName = mealTypeNames[meal.meal_type] || meal.meal_type;
      response += `${mealTypeName}: ${meal.food_name}
📊 ${meal.calories} kcal | ${meal.protein}g proteína | ${meal.carbs}g carbohidratos | ${meal.fat}g grasas
📝 ${meal.description}

`;
    });

    response += `📈 RESUMEN TOTAL REGISTRADO:
Calorías: ${Math.round(totalCalories)} kcal
Proteína: ${Math.round(totalProtein * 10) / 10}g
Carbohidratos: ${Math.round(totalCarbs * 10) / 10}g
Grasas: ${Math.round(totalFat * 10) / 10}g`;

    // Add updated progress if user context is available
    if (userContext) {
      const newCalories = Math.round(userContext.today.consumed.calories + totalCalories);
      const newProtein = Math.round((userContext.today.consumed.protein + totalProtein) * 10) / 10;
      const newCarbs = Math.round((userContext.today.consumed.carbs + totalCarbs) * 10) / 10;
      const newFat = Math.round((userContext.today.consumed.fat + totalFat) * 10) / 10;
      
      const caloriesRemaining = Math.max(0, userContext.goals.daily_calories - newCalories);
      const proteinRemaining = Math.max(0, userContext.goals.daily_protein - newProtein);
      const carbsRemaining = Math.max(0, userContext.goals.daily_carbs - newCarbs);
      const fatRemaining = Math.max(0, userContext.goals.daily_fat - newFat);
      
      response += `

📊 PROGRESO ACTUALIZADO DE HOY:
Calorías: ${newCalories}/${userContext.goals.daily_calories} kcal (${caloriesRemaining} restantes)
Proteína: ${newProtein}/${userContext.goals.daily_protein}g (${proteinRemaining}g restantes)
Carbohidratos: ${newCarbs}/${userContext.goals.daily_carbs}g (${carbsRemaining}g restantes)
Grasas: ${newFat}/${userContext.goals.daily_fat}g (${fatRemaining}g restantes)`;

      if (caloriesRemaining === 0) {
        response += `

🎉 ¡Felicidades! Has alcanzado tu objetivo diario de calorías perfectamente.`;
      } else if (caloriesRemaining > 0) {
        response += `

💡 Aún puedes consumir ${caloriesRemaining} calorías más para llegar a tu objetivo diario.`;
      } else {
        response += `

⚠️ Has superado tu objetivo diario de calorías. Considera actividad física adicional.`;
      }
    }

    return {
      response: response,
      success: true,
      meals_logged: results.length,
      total_nutrition: {
        calories: Math.round(totalCalories),
        protein: Math.round(totalProtein * 10) / 10,
        carbs: Math.round(totalCarbs * 10) / 10,
        fat: Math.round(totalFat * 10) / 10
      }
    };

  } catch (error) {
    console.error('Error in executeCreateMultipleMeals:', error);
    throw error;
  }
}