import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ExpenseData {
  id: string;
  store_name: string;
  expense_date: string;
  category_id?: string;
  payment_method?: string;
  total_amount: number;
  receipt_image?: string;
  items?: any[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')

    // Verify the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { action, expenses, sheetId, accessToken } = await req.json()

    switch (action) {
      case 'get-config':
        return new Response(
          JSON.stringify({ 
            clientId: Deno.env.get('GOOGLE_CLIENT_ID')
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      case 'create-sheet':
        return await createExpenseSheet(expenses, accessToken)
      case 'sync-expenses':
        return await syncExpensesToSheet(expenses, sheetId, accessToken)
      case 'sync-from-sheet':
        return await syncFromSheet(sheetId, accessToken, supabase, user.id)
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // For actions that require access token, validate it
    if (action !== 'get-config') {
      if (!accessToken) {
        return new Response(
          JSON.stringify({ error: 'Access token is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function createExpenseSheet(expenses: ExpenseData[], accessToken: string) {
  try {
    // Create a new Google Sheet
    const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          title: `Registro de Gastos - ${new Date().toLocaleDateString('es-ES')}`,
        },
        sheets: [{
          properties: {
            title: 'Gastos'
          }
        }]
      })
    })

    if (!createResponse.ok) {
      throw new Error(`Failed to create sheet: ${createResponse.statusText}`)
    }

    const sheetData = await createResponse.json()
    const spreadsheetId = sheetData.spreadsheetId

    // Prepare data for the sheet
    const headers = [
      'ID Interno',
      'Fecha',
      'Establecimiento',
      'Categoría',
      'Método de Pago',
      'Total',
      'Imagen del Ticket',
      'Items'
    ]

    const rows = expenses.map(expense => [
      expense.id,
      expense.expense_date,
      expense.store_name || '',
      expense.category_id || '',
      expense.payment_method || '',
      expense.total_amount,
      expense.receipt_image || '',
      expense.items ? JSON.stringify(expense.items) : ''
    ])

    const allData = [headers, ...rows]

    // Update the sheet with data
    const updateResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Gastos!A1:H${allData.length}?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: allData
        })
      }
    )

    if (!updateResponse.ok) {
      throw new Error(`Failed to update sheet: ${updateResponse.statusText}`)
    }

    // Format the header row
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [{
            repeatCell: {
              range: {
                sheetId: 0,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: 8
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: {
                    red: 0.2,
                    green: 0.4,
                    blue: 0.8
                  },
                  textFormat: {
                    foregroundColor: {
                      red: 1.0,
                      green: 1.0,
                      blue: 1.0
                    },
                    bold: true
                  }
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)'
            }
          }, {
            updateDimensionProperties: {
              range: {
                sheetId: 0,
                dimension: 'COLUMNS',
                startIndex: 0,
                endIndex: 1
              },
              properties: {
                hiddenByUser: true
              },
              fields: 'hiddenByUser'
            }
          }]
        })
      }
    )

    return new Response(
      JSON.stringify({ 
        message: 'Sheet created successfully',
        spreadsheetId,
        url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error creating sheet:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to create sheet' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function syncExpensesToSheet(expenses: ExpenseData[], sheetId: string, accessToken: string) {
  try {
    // Clear existing data (except headers)
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Gastos!A2:H:clear`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      }
    )

    // Prepare new data
    const rows = expenses.map(expense => [
      expense.id,
      expense.expense_date,
      expense.store_name || '',
      expense.category_id || '',
      expense.payment_method || '',
      expense.total_amount,
      expense.receipt_image || '',
      expense.items ? JSON.stringify(expense.items) : ''
    ])

    // Update with new data
    const updateResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Gastos!A2:H${rows.length + 1}?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: rows
        })
      }
    )

    if (!updateResponse.ok) {
      throw new Error(`Failed to update sheet: ${updateResponse.statusText}`)
    }

    return new Response(
      JSON.stringify({ 
        message: 'Expenses synced successfully',
        updatedRows: rows.length
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error syncing expenses:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to sync expenses' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function syncFromSheet(sheetId: string, accessToken: string, supabase: any, userId: string) {
  try {
    // Get data from the sheet
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Gastos!A2:H`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to read sheet: ${response.statusText}`)
    }

    const data = await response.json()
    const rows = data.values || []

    let updatedCount = 0
    let createdCount = 0

    for (const row of rows) {
      if (row.length < 6) continue // Skip incomplete rows

      const [id, date, storeName, categoryId, paymentMethod, totalAmount, receiptImage, itemsJson] = row
      
      if (!id || !date || !totalAmount) continue // Skip invalid rows

      const expenseData = {
        store_name: storeName,
        expense_date: date,
        category_id: categoryId || null,
        payment_method: paymentMethod || null,
        total_amount: parseFloat(totalAmount),
        receipt_image: receiptImage || null,
        user_id: userId
      }

      // Check if expense exists
      const { data: existingExpense } = await supabase
        .from('expenses')
        .select('id')
        .eq('id', id)
        .single()

      if (existingExpense) {
        // Update existing expense
        const { error } = await supabase
          .from('expenses')
          .update(expenseData)
          .eq('id', id)

        if (!error) updatedCount++
      } else {
        // Create new expense
        const { data: newExpense, error } = await supabase
          .from('expenses')
          .insert({ ...expenseData, id })
          .select()
          .single()

        if (!error && newExpense) {
          createdCount++
          
          // Handle items if present
          if (itemsJson) {
            try {
              const items = JSON.parse(itemsJson)
              if (Array.isArray(items)) {
                const itemsToInsert = items.map(item => ({
                  expense_id: newExpense.id,
                  product_name: item.product_name || item.name,
                  quantity: item.quantity || '1',
                  unit_price: item.unit_price || 0,
                  total_price: item.total_price || item.price || 0
                }))

                await supabase
                  .from('expense_items')
                  .insert(itemsToInsert)
              }
            } catch (e) {
              console.error('Error parsing items:', e)
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Sheet data synced successfully',
        updatedCount,
        createdCount
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error syncing from sheet:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to sync from sheet' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}