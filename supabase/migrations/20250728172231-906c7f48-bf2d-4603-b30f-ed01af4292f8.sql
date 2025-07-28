-- Create tables for FatSecret integration
CREATE TABLE public.foods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  food_id TEXT NOT NULL UNIQUE,
  food_name TEXT NOT NULL,
  brand_name TEXT,
  serving_description TEXT,
  calories_per_serving DECIMAL(8,2),
  carbs_per_serving DECIMAL(8,2),
  protein_per_serving DECIMAL(8,2),
  fat_per_serving DECIMAL(8,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for user meal entries
CREATE TABLE public.meal_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  food_id UUID REFERENCES public.foods(id),
  servings DECIMAL(5,2) NOT NULL DEFAULT 1,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  consumed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_entries ENABLE ROW LEVEL SECURITY;

-- RLS policies for foods (public read)
CREATE POLICY "Foods are viewable by everyone" 
ON public.foods 
FOR SELECT 
USING (true);

-- RLS policies for meal_entries (user-specific)
CREATE POLICY "Users can view their own meal entries" 
ON public.meal_entries 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own meal entries" 
ON public.meal_entries 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own meal entries" 
ON public.meal_entries 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own meal entries" 
ON public.meal_entries 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_foods_food_id ON public.foods(food_id);
CREATE INDEX idx_foods_name ON public.foods(food_name);
CREATE INDEX idx_meal_entries_user_id ON public.meal_entries(user_id);
CREATE INDEX idx_meal_entries_consumed_at ON public.meal_entries(consumed_at);

-- Update trigger for meal_entries
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_meal_entries_updated_at
BEFORE UPDATE ON public.meal_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();