-- Create table for favorite meal plates
CREATE TABLE public.favorite_meal_plates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plate_name TEXT NOT NULL,
  plate_image TEXT,
  meal_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for favorite meal plate items
CREATE TABLE public.favorite_meal_plate_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  favorite_plate_id UUID NOT NULL REFERENCES public.favorite_meal_plates(id) ON DELETE CASCADE,
  food_id UUID NOT NULL REFERENCES public.foods(id) ON DELETE CASCADE,
  servings NUMERIC NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.favorite_meal_plates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorite_meal_plate_items ENABLE ROW LEVEL SECURITY;

-- Create policies for favorite_meal_plates
CREATE POLICY "Users can view their own favorite meal plates"
ON public.favorite_meal_plates
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own favorite meal plates"
ON public.favorite_meal_plates
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorite meal plates"
ON public.favorite_meal_plates
FOR DELETE
USING (auth.uid() = user_id);

-- Create policies for favorite_meal_plate_items
CREATE POLICY "Users can view their own favorite meal plate items"
ON public.favorite_meal_plate_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.favorite_meal_plates
    WHERE id = favorite_meal_plate_items.favorite_plate_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create their own favorite meal plate items"
ON public.favorite_meal_plate_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.favorite_meal_plates
    WHERE id = favorite_meal_plate_items.favorite_plate_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own favorite meal plate items"
ON public.favorite_meal_plate_items
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.favorite_meal_plates
    WHERE id = favorite_meal_plate_items.favorite_plate_id
    AND user_id = auth.uid()
  )
);