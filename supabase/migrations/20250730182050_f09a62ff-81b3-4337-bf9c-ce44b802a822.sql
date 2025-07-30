-- Crear tabla para gastos/recibos
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  store_name TEXT,
  expense_date DATE NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL,
  payment_method TEXT,
  receipt_image TEXT,
  confidence NUMERIC(3,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla para los items de cada gasto
CREATE TABLE public.expense_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  quantity TEXT NOT NULL,
  unit_price NUMERIC(10,2),
  total_price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_items ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para expenses
CREATE POLICY "Users can view their own expenses" 
ON public.expenses 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own expenses" 
ON public.expenses 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expenses" 
ON public.expenses 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expenses" 
ON public.expenses 
FOR DELETE 
USING (auth.uid() = user_id);

-- Políticas RLS para expense_items
CREATE POLICY "Users can view their own expense items" 
ON public.expense_items 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.expenses 
    WHERE expenses.id = expense_items.expense_id 
    AND expenses.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create their own expense items" 
ON public.expense_items 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.expenses 
    WHERE expenses.id = expense_items.expense_id 
    AND expenses.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own expense items" 
ON public.expense_items 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.expenses 
    WHERE expenses.id = expense_items.expense_id 
    AND expenses.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own expense items" 
ON public.expense_items 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.expenses 
    WHERE expenses.id = expense_items.expense_id 
    AND expenses.user_id = auth.uid()
  )
);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_expenses_updated_at
BEFORE UPDATE ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para mejor rendimiento
CREATE INDEX idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX idx_expenses_date ON public.expenses(expense_date);
CREATE INDEX idx_expense_items_expense_id ON public.expense_items(expense_id);