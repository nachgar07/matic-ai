import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export interface Expense {
  id: string;
  store_name: string | null;
  expense_date: string;
  total_amount: number;
  category_id: string | null;
  expense_items: Array<{
    product_name: string;
    quantity: string;
    total_price: number;
  }>;
  category_name?: string;
  category_color?: string;
  category_icon?: string;
}

export const useExpenses = (date?: Date | null) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Don't load expenses if date is null (user not authenticated)
    if (date === null) {
      setExpenses([]);
      setLoading(false);
      return;
    }

    const loadExpenses = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setExpenses([]);
          setLoading(false);
          return;
        }

        const targetDate = date || new Date();
        const dateString = format(targetDate, 'yyyy-MM-dd');

        const { data: expensesData, error: expenseError } = await supabase
          .from('expenses')
          .select(`
            *,
            expense_items (*),
            expense_categories (
              name,
              color,
              icon
            )
          `)
          .eq('user_id', user.id)
          .eq('expense_date', dateString)
          .order('created_at', { ascending: false });

        if (expenseError) throw expenseError;

        const transformedExpenses = expensesData?.map(expense => ({
          id: expense.id,
          store_name: expense.store_name,
          expense_date: expense.expense_date,
          total_amount: parseFloat(expense.total_amount.toString()),
          category_id: expense.category_id,
          expense_items: expense.expense_items || [],
          category_name: expense.expense_categories?.name || 'Sin categoría',
          category_color: expense.expense_categories?.color || '#6b7280',
          category_icon: expense.expense_categories?.icon || '💰',
        })) || [];

        setExpenses(transformedExpenses);
      } catch (err) {
        console.error('Error loading expenses:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    loadExpenses();
  }, [date]);

  // Calcular datos para el gráfico
  const chartData = expenses.reduce((acc, expense) => {
    const categoryName = expense.category_name || 'Sin categoría';
    const existingCategory = acc.find(item => item.name === categoryName);
    
    if (existingCategory) {
      existingCategory.value += expense.total_amount;
    } else {
      acc.push({
        name: categoryName,
        value: expense.total_amount,
        color: expense.category_color || '#6b7280',
        icon: expense.category_icon || '💰'
      });
    }
    
    return acc;
  }, [] as Array<{ name: string; value: number; color: string; icon: string }>);

  const totalAmount = expenses.reduce((sum, expense) => sum + expense.total_amount, 0);

  return {
    expenses,
    loading,
    error,
    chartData,
    totalAmount
  };
};