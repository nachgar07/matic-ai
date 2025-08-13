import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    
    console.log('🔑 Testing OpenAI connection...');
    console.log('API Key exists:', !!openAIApiKey);
    console.log('API Key length:', openAIApiKey?.length);
    console.log('API Key preview:', openAIApiKey?.substring(0, 10) + '...');

    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Simple test call to OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'user',
            content: 'Responde solo con "OK" si recibes este mensaje.'
          }
        ],
        max_tokens: 10,
        temperature: 0
      }),
    });

    console.log('🔄 OpenAI Response Status:', response.status);
    console.log('🔄 OpenAI Response Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🚨 OpenAI Error Response:', errorText);
      throw new Error(`OpenAI API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ OpenAI Success:', data);

    return new Response(JSON.stringify({
      success: true,
      status: response.status,
      message: 'OpenAI API is working correctly',
      response: data,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('🚨 Test Error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});