import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { action, expenseData, expenseId, updateData } = await req.json();

    switch (action) {
      case 'create': {
        console.log('Creating expense with data:', expenseData);
        
        // Crear el gasto principal
        const { data: expense, error: expenseError } = await supabase
          .from('expenses')
          .insert({
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
          throw expenseError;
        }

        // Crear los items del gasto
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
            throw itemsError;
          }
        }

        return new Response(
          JSON.stringify({ success: true, expense }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'list': {
        console.log('Fetching expenses list');
        
        const { data: expenses, error } = await supabase
          .from('expenses')
          .select(`
            *,
            expense_items (*)
          `)
          .order('expense_date', { ascending: false });

        if (error) {
          console.error('Error fetching expenses:', error);
          throw error;
        }

        return new Response(
          JSON.stringify({ expenses }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get': {
        if (!expenseId) {
          throw new Error('Expense ID is required');
        }

        console.log('Fetching expense:', expenseId);
        
        const { data: expense, error } = await supabase
          .from('expenses')
          .select(`
            *,
            expense_items (*)
          `)
          .eq('id', expenseId)
          .single();

        if (error) {
          console.error('Error fetching expense:', error);
          throw error;
        }

        return new Response(
          JSON.stringify({ expense }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update': {
        if (!expenseId || !updateData) {
          throw new Error('Expense ID and update data are required');
        }

        console.log('Updating expense:', expenseId, updateData);
        
        const { data: expense, error } = await supabase
          .from('expenses')
          .update(updateData)
          .eq('id', expenseId)
          .select()
          .single();

        if (error) {
          console.error('Error updating expense:', error);
          throw error;
        }

        return new Response(
          JSON.stringify({ success: true, expense }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete': {
        if (!expenseId) {
          throw new Error('Expense ID is required');
        }

        console.log('Deleting expense:', expenseId);
        
        const { error } = await supabase
          .from('expenses')
          .delete()
          .eq('id', expenseId);

        if (error) {
          console.error('Error deleting expense:', error);
          throw error;
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error('Invalid action');
    }

  } catch (error) {
    console.error('Error in expense-manager:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});