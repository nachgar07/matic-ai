-- Remove the meal_type check constraint that prevents using custom meal categories
ALTER TABLE public.meal_entries 
DROP CONSTRAINT IF EXISTS meal_entries_meal_type_check;