-- Fix meal_entries table to properly reference meal_categories
-- First, let's add a meal_category_id column
ALTER TABLE public.meal_entries ADD COLUMN meal_category_id UUID REFERENCES public.meal_categories(id);

-- Update existing records to match meal_type text with category names
UPDATE public.meal_entries 
SET meal_category_id = (
  SELECT mc.id 
  FROM public.meal_categories mc 
  WHERE mc.name = public.meal_entries.meal_type 
  AND mc.user_id = public.meal_entries.user_id
  LIMIT 1
);

-- For any records that couldn't be matched, try to match with default categories
UPDATE public.meal_entries 
SET meal_category_id = (
  SELECT mc.id 
  FROM public.meal_categories mc 
  WHERE mc.name = public.meal_entries.meal_type 
  AND mc.user_id = '00000000-0000-0000-0000-000000000000'
  LIMIT 1
)
WHERE meal_category_id IS NULL;

-- Drop the old meal_type column and rename the new one
ALTER TABLE public.meal_entries DROP COLUMN meal_type;
ALTER TABLE public.meal_entries RENAME COLUMN meal_category_id TO meal_type;

-- Make the column NOT NULL now that it should be populated
ALTER TABLE public.meal_entries ALTER COLUMN meal_type SET NOT NULL;