-- Habilitar realtime para la tabla expenses
ALTER TABLE public.expenses REPLICA IDENTITY FULL;

-- Agregar la tabla expenses a la publicación de realtime
ALTER publication supabase_realtime ADD TABLE public.expenses;

-- Habilitar realtime para la tabla expense_items también
ALTER TABLE public.expense_items REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.expense_items;