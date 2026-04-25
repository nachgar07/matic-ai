-- Update meal plate images for nacho_garin7@hotmail.com seed data
-- Replace with photos showing real food with multiple ingredients visible
UPDATE public.meal_entries
SET plate_image = CASE meal_type
  -- Breakfast: avocado toast with eggs, tomato, herbs (multi-ingredient)
  WHEN 'breakfast' THEN 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&q=80'
  -- Lunch: bowl with chicken, rice, vegetables, beans
  WHEN 'lunch' THEN 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80'
  -- Dinner: steak plate with potatoes, asparagus, salad
  WHEN 'dinner' THEN 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&q=80'
  -- Snack: cheese, fruit, nuts board (multiple items)
  WHEN 'snack' THEN 'https://images.unsplash.com/photo-1452251889946-8ff5ea7b27ab?w=800&q=80'
  ELSE plate_image
END
WHERE user_id = 'a70079e2-322d-4c83-82d6-0ff7f1270eba'
  AND food_id IN (SELECT id FROM public.foods WHERE food_id LIKE 'seed_en_%');