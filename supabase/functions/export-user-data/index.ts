import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    const { dataType, month, userId } = await req.json();

    // Get user from authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    // Verify user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user || user.id !== userId) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate date range for the month
    const startDate = `${month}-01`;
    const endDate = new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth() + 1, 0)
      .toISOString().split('T')[0];

    let data;

    switch (dataType) {
      case 'meals':
        data = await exportMealsData(supabase, userId, startDate, endDate);
        break;
      case 'goals':
        data = await exportGoalsData(supabase, userId, startDate, endDate);
        break;
      case 'expenses':
        data = await exportExpensesData(supabase, userId, startDate, endDate);
        break;
      default:
        throw new Error('Invalid data type');
    }

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in export-user-data function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function exportMealsData(supabase: any, userId: string, startDate: string, endDate: string) {
  // Get all meal entries for the month
  const { data: meals, error: mealsError } = await supabase
    .from('meal_entries')
    .select(`
      *,
      foods (*)
    `)
    .eq('user_id', userId)
    .gte('consumed_at', `${startDate}T00:00:00`)
    .lte('consumed_at', `${endDate}T23:59:59`)
    .order('consumed_at', { ascending: true });

  if (mealsError) throw mealsError;

  // Calculate daily summary
  const dailySummary: any[] = [];
  const dayGroups = new Map();

  meals?.forEach((meal: any) => {
    const date = meal.consumed_at.split('T')[0];
    
    if (!dayGroups.has(date)) {
      dayGroups.set(date, {
        date,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        mealsCount: 0
      });
    }

    const day = dayGroups.get(date);
    const servings = meal.servings || 1;
    
    day.calories += (meal.foods?.calories_per_serving || 0) * servings;
    day.protein += (meal.foods?.protein_per_serving || 0) * servings;
    day.carbs += (meal.foods?.carbs_per_serving || 0) * servings;
    day.fat += (meal.foods?.fat_per_serving || 0) * servings;
    day.mealsCount += 1;
  });

  dayGroups.forEach((day) => {
    day.calories = Math.round(day.calories);
    day.protein = Math.round(day.protein * 10) / 10;
    day.carbs = Math.round(day.carbs * 10) / 10;
    day.fat = Math.round(day.fat * 10) / 10;
    dailySummary.push(day);
  });

  return {
    meals: meals || [],
    dailySummary: dailySummary.sort((a, b) => a.date.localeCompare(b.date))
  };
}

async function exportGoalsData(supabase: any, userId: string, startDate: string, endDate: string) {
  // Get goals
  const { data: goals, error: goalsError } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (goalsError) throw goalsError;

  // Get goal progress for the month
  const { data: progress, error: progressError } = await supabase
    .from('goal_progress')
    .select(`
      *,
      goals!inner(name)
    `)
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });

  if (progressError) throw progressError;

  // Get tasks for the month
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .or(`created_at.gte.${startDate}T00:00:00,due_date.gte.${startDate}`)
    .or(`created_at.lte.${endDate}T23:59:59,due_date.lte.${endDate}`)
    .order('created_at', { ascending: false });

  if (tasksError) throw tasksError;

  // Add goal names to progress
  const progressWithGoalNames = progress?.map((p: any) => ({
    ...p,
    goal_name: p.goals?.name || 'Objetivo eliminado'
  })) || [];

  return {
    goals: goals || [],
    progress: progressWithGoalNames,
    tasks: tasks || []
  };
}

async function exportExpensesData(supabase: any, userId: string, startDate: string, endDate: string) {
  // Get expenses for the month
  const { data: expenses, error: expensesError } = await supabase
    .from('expenses')
    .select(`
      *,
      expense_categories(name)
    `)
    .eq('user_id', userId)
    .gte('expense_date', startDate)
    .lte('expense_date', endDate)
    .order('expense_date', { ascending: false });

  if (expensesError) throw expensesError;

  // Get expense items
  const expenseIds = expenses?.map((e: any) => e.id) || [];
  let items: any[] = [];

  if (expenseIds.length > 0) {
    const { data: itemsData, error: itemsError } = await supabase
      .from('expense_items')
      .select(`
        *,
        expenses!inner(expense_date, store_name)
      `)
      .in('expense_id', expenseIds)
      .order('created_at', { ascending: false });

    if (itemsError) throw itemsError;
    items = itemsData || [];
  }

  // Calculate category stats
  const categoryStats = new Map();
  expenses?.forEach((expense: any) => {
    const categoryName = expense.expense_categories?.name || 'Sin categoría';
    
    if (!categoryStats.has(categoryName)) {
      categoryStats.set(categoryName, {
        category_name: categoryName,
        total_amount: 0,
        expense_count: 0
      });
    }

    const stats = categoryStats.get(categoryName);
    stats.total_amount += Number(expense.total_amount);
    stats.expense_count += 1;
  });

  // Calculate averages
  const categoryStatsArray = Array.from(categoryStats.values()).map((stats: any) => ({
    ...stats,
    average_amount: stats.total_amount / stats.expense_count
  }));

  // Add category names to expenses
  const expensesWithCategories = expenses?.map((expense: any) => ({
    ...expense,
    category_name: expense.expense_categories?.name || 'Sin categoría'
  })) || [];

  // Add expense info to items
  const itemsWithExpenseInfo = items.map((item: any) => ({
    ...item,
    expense_date: item.expenses?.expense_date,
    store_name: item.expenses?.store_name
  }));

  return {
    expenses: expensesWithCategories,
    items: itemsWithExpenseInfo,
    categoryStats: categoryStatsArray
  };
}