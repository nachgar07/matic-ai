import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReceiptAnalysisResult {
  store_name: string;
  date: string;
  total_amount: number;
  items: Array<{
    product_name: string;
    quantity: string;
    unit_price: number;
    total_price: number;
  }>;
  payment_method?: string;
  confidence: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    return await analyzeReceiptImage(imageBase64, openaiApiKey);

  } catch (error) {
    console.error('Error in receipt-analyzer:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function analyzeReceiptImage(imageBase64: string, apiKey: string) {
  console.log('Analyzing receipt image with OpenAI GPT-4 Vision...');
  
  const prompt = `Analiza este recibo/ticket de compra y extrae la siguiente información en formato JSON exacto:

{
  "store_name": "nombre del establecimiento",
  "date": "fecha en formato YYYY-MM-DD",
  "total_amount": monto_total_numérico,
  "items": [
    {
      "product_name": "nombre del producto",
      "quantity": "cantidad (ej: 1x, 2 unidades, 500g)",
      "unit_price": precio_unitario_numérico,
      "total_price": precio_total_numérico
    }
  ],
  "payment_method": "método de pago (efectivo, tarjeta, etc.)",
  "confidence": nivel_de_confianza_del_0_al_1
}

Instrucciones importantes:
- Extrae TODOS los productos visibles en el recibo
- Para la fecha: busca la fecha EXACTA del ticket/recibo (no la fecha de vencimiento). Usa el formato YYYY-MM-DD considerando zona horaria Argentina (GMT-3)
- Si encuentras una fecha como "27/7/2025" o "27/07/2025", conviértela exactamente a "2025-07-27" 
- Si el texto no es completamente claro, haz tu mejor estimación
- Para cantidades, usa el formato más claro posible
- Convierte todos los precios a números sin símbolos de moneda
- Si no puedes determinar algún campo, usa null
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
        max_tokens: 1500,
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
    console.log('OpenAI response received');

    if (!result.choices || !result.choices[0] || !result.choices[0].message) {
      throw new Error('Respuesta inválida de OpenAI API');
    }

    const analysisText = result.choices[0].message.content;
    console.log('Raw response:', analysisText);
    
    try {
      // Clean the response to extract JSON - handle markdown code blocks
      let jsonText = analysisText.trim();
      
      // Remove markdown code blocks if present
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      // Try to extract JSON object
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        // If OpenAI responded with text instead of JSON, create a fallback response
        console.log('OpenAI returned text response, creating fallback analysis');
        const fallbackAnalysis: ReceiptAnalysisResult = {
          store_name: 'Análisis manual requerido',
          date: new Date().toISOString().split('T')[0],
          total_amount: 0,
          items: [{
            product_name: 'Producto no identificado',
            quantity: '1x',
            unit_price: 0,
            total_price: 0
          }],
          payment_method: 'No especificado',
          confidence: 0.1
        };
        
        return new Response(
          JSON.stringify({
            ...fallbackAnalysis,
            processing_time: new Date().toISOString(),
            provider: 'openai',
            raw_response: analysisText,
            note: 'El análisis automático no pudo procesar esta imagen. Por favor revise manualmente.'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const analysis: ReceiptAnalysisResult = JSON.parse(jsonMatch[0]);
      
      return new Response(
        JSON.stringify({
          ...analysis,
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
    console.error('Error in analyzeReceiptImage:', error);
    throw error;
  }
}