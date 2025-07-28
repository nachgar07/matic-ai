-- Create table for favorite foods
CREATE TABLE public.favorite_foods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  food_id UUID NOT NULL REFERENCES public.foods(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.favorite_foods ENABLE ROW LEVEL SECURITY;

-- Create policies for favorite foods
CREATE POLICY "Users can view their own favorite foods" 
ON public.favorite_foods 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own favorite foods" 
ON public.favorite_foods 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorite foods" 
ON public.favorite_foods 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create unique constraint to prevent duplicate favorites
CREATE UNIQUE INDEX unique_user_food_favorite ON public.favorite_foods(user_id, food_id);

-- Create table for user nutrition goals
CREATE TABLE public.nutrition_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  daily_calories INTEGER NOT NULL DEFAULT 2000,
  daily_protein NUMERIC NOT NULL DEFAULT 150,
  daily_carbs NUMERIC NOT NULL DEFAULT 250,
  daily_fat NUMERIC NOT NULL DEFAULT 67,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.nutrition_goals ENABLE ROW LEVEL SECURITY;

-- Create policies for nutrition goals
CREATE POLICY "Users can view their own nutrition goals" 
ON public.nutrition_goals 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own nutrition goals" 
ON public.nutrition_goals 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own nutrition goals" 
ON public.nutrition_goals 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_nutrition_goals_updated_at
BEFORE UPDATE ON public.nutrition_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();