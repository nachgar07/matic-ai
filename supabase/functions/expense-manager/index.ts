import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header found');
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Auth header received:', authHeader.substring(0, 20) + '...');

    // Create Supabase client with service role key for database operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from JWT token
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
    
    if (userError || !user) {
      console.error('Authentication failed:', userError);
      return new Response(
        JSON.stringify({ error: 'User not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User authenticated successfully:', user.id);

    const { action, expenseData, expenseId, updateData } = await req.json();
    console.log('Action requested:', action);

    switch (action) {
      case 'create': {
        console.log('Creating expense with data:', expenseData);
        
        // Create the main expense
        const { data: expense, error: expenseError } = await supabase
          .from('expenses')
          .insert({
            user_id: user.id,
            store_name: expenseData.store_name,
            expense_date: expenseData.date,
            total_amount: expenseData.total_amount,
            payment_method: expenseData.payment_method,
            receipt_image: expenseData.receipt_image,
            confidence: expenseData.confidence
          })
          .select()
          .single();

        if (expenseError) {
          console.error('Error creating expense:', expenseError);
          return new Response(
            JSON.stringify({ error: expenseError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Create expense items
        if (expenseData.items && expenseData.items.length > 0) {
          const items = expenseData.items.map((item: any) => ({
            expense_id: expense.id,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price
          }));

          const { error: itemsError } = await supabase
            .from('expense_items')
            .insert(items);

          if (itemsError) {
            console.error('Error creating expense items:', itemsError);
            return new Response(
              JSON.stringify({ error: itemsError.message }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }

        console.log('Expense created successfully:', expense.id);
        return new Response(
          JSON.stringify({ success: true, expense }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'list': {
        console.log('Fetching expenses for user:', user.id);
        
        const { data: expenses, error } = await supabase
          .from('expenses')
          .select(`
            *,
            expense_items (*)
          `)
          .eq('user_id', user.id)
          .order('expense_date', { ascending: false });

        if (error) {
          console.error('Error fetching expenses:', error);
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('Found', expenses?.length || 0, 'expenses');
        return new Response(
          JSON.stringify({ expenses }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get': {
        if (!expenseId) {
          return new Response(
            JSON.stringify({ error: 'Expense ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('Fetching expense:', expenseId);
        
        const { data: expense, error } = await supabase
          .from('expenses')
          .select(`
            *,
            expense_items (*)
          `)
          .eq('id', expenseId)
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching expense:', error);
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ expense }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update': {
        if (!expenseId || !updateData) {
          return new Response(
            JSON.stringify({ error: 'Expense ID and update data are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('Updating expense:', expenseId, updateData);
        
        const { data: expense, error } = await supabase
          .from('expenses')
          .update(updateData)
          .eq('id', expenseId)
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) {
          console.error('Error updating expense:', error);
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, expense }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete': {
        if (!expenseId) {
          return new Response(
            JSON.stringify({ error: 'Expense ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('Deleting expense:', expenseId);
        
        const { error } = await supabase
          .from('expenses')
          .delete()
          .eq('id', expenseId)
          .eq('user_id', user.id);

        if (error) {
          console.error('Error deleting expense:', error);
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('Unexpected error in expense-manager:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error: ' + error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});