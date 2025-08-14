-- Update default meal categories
UPDATE public.meal_categories 
SET name = 'Merienda', icon = '🥪'
WHERE user_id = '00000000-0000-0000-0000-000000000000' AND name = 'Snack';

-- For users who already have the old "Snack" category, update it to "Merienda"
UPDATE public.meal_categories 
SET name = 'Merienda', icon = '🥪'
WHERE name = 'Snack' AND is_default = true;