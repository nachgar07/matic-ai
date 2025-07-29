import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CalendarEvent {
  summary: string
  description: string
  start: {
    dateTime: string
    timeZone: string
  }
  end: {
    dateTime: string
    timeZone: string
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { action, meals, date, accessToken } = await req.json()

    if (action === 'sync-meals') {
      if (!accessToken) {
        return new Response(
          JSON.stringify({ error: 'Google access token required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Create calendar events for each meal
      const events = []
      const mealTypeToTime = {
        breakfast: '08:00',
        lunch: '13:00', 
        dinner: '19:00',
        snack: '16:00'
      }

      for (const meal of meals) {
        const mealTime = mealTypeToTime[meal.meal_type as keyof typeof mealTypeToTime] || '12:00'
        const startDateTime = `${date}T${mealTime}:00`
        const endDateTime = `${date}T${mealTime.split(':')[0]}:30:00` // 30 min duration

        const event: CalendarEvent = {
          summary: `🍽️ ${meal.food_name}`,
          description: `Comida registrada en NutriTracker\n\nPorciones: ${meal.servings}\nCalorías: ${Math.round(meal.calories || 0)}\nProteína: ${Math.round(meal.protein || 0)}g\nCarbohidratos: ${Math.round(meal.carbs || 0)}g\nGrasas: ${Math.round(meal.fat || 0)}g`,
          start: {
            dateTime: startDateTime,
            timeZone: 'America/Mexico_City'
          },
          end: {
            dateTime: endDateTime,
            timeZone: 'America/Mexico_City'
          }
        }

        // Create the event in Google Calendar
        const calendarResponse = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event)
        })

        if (calendarResponse.ok) {
          const createdEvent = await calendarResponse.json()
          events.push(createdEvent)
        } else {
          console.error('Failed to create calendar event:', await calendarResponse.text())
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          events_created: events.length,
          message: `${events.length} comidas sincronizadas con Google Calendar` 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})