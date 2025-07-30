-- Add plate_image column to meal_entries table to store the captured food images
ALTER TABLE public.meal_entries 
ADD COLUMN plate_image TEXT;