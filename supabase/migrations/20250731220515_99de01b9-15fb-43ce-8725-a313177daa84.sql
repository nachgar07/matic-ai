-- Create expense categories table
CREATE TABLE public.expense_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  icon TEXT DEFAULT '💰',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on expense_categories
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for expense_categories
CREATE POLICY "Users can view their own expense categories" 
ON public.expense_categories 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own expense categories" 
ON public.expense_categories 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expense categories" 
ON public.expense_categories 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expense categories" 
ON public.expense_categories 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_expense_categories_updated_at
BEFORE UPDATE ON public.expense_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add category_id to expenses table
ALTER TABLE public.expenses 
ADD COLUMN category_id UUID REFERENCES public.expense_categories(id);

-- Insert default categories for existing users
INSERT INTO public.expense_categories (user_id, name, color, icon)
SELECT DISTINCT user_id, 'General', '#6366f1', '💰'
FROM public.expenses
WHERE user_id IS NOT NULL;

-- Update existing expenses to use the default category
UPDATE public.expenses 
SET category_id = (
  SELECT id 
  FROM public.expense_categories 
  WHERE expense_categories.user_id = expenses.user_id 
  AND name = 'General'
  LIMIT 1
)
WHERE category_id IS NULL;