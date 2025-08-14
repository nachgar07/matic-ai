-- Create table for custom meal categories
CREATE TABLE public.meal_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  icon TEXT NOT NULL DEFAULT '🍽️',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Enable Row Level Security
ALTER TABLE public.meal_categories ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own meal categories" 
ON public.meal_categories 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own meal categories" 
ON public.meal_categories 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own meal categories" 
ON public.meal_categories 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own meal categories" 
ON public.meal_categories 
FOR DELETE 
USING (auth.uid() = user_id AND is_default = false);

-- Insert default meal categories
INSERT INTO public.meal_categories (user_id, name, color, icon, is_default) VALUES
('00000000-0000-0000-0000-000000000000', 'Desayuno', '#ff9500', '🌅', true),
('00000000-0000-0000-0000-000000000000', 'Almuerzo', '#34c759', '🌞', true),
('00000000-0000-0000-0000-000000000000', 'Cena', '#af52de', '🌙', true),
('00000000-0000-0000-0000-000000000000', 'Snack', '#ff3b30', '🍿', true)
ON CONFLICT (user_id, name) DO NOTHING;

-- Create function to copy default categories for new users
CREATE OR REPLACE FUNCTION public.create_default_meal_categories_for_user(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.meal_categories (user_id, name, color, icon, is_default) 
  SELECT 
    user_uuid,
    name,
    color,
    icon,
    is_default
  FROM public.meal_categories 
  WHERE user_id = '00000000-0000-0000-0000-000000000000'
  ON CONFLICT (user_id, name) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create default meal categories for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_meal_categories()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.create_default_meal_categories_for_user(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that runs after user signup
CREATE TRIGGER on_auth_user_created_meal_categories
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_meal_categories();