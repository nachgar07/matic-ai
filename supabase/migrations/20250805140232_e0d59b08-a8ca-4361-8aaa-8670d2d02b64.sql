-- Add personal data fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN age INTEGER,
ADD COLUMN gender TEXT CHECK (gender IN ('male', 'female')),
ADD COLUMN weight NUMERIC, -- in kg
ADD COLUMN height NUMERIC, -- in cm
ADD COLUMN goal TEXT CHECK (goal IN ('lose', 'maintain', 'gain')) DEFAULT 'maintain',
ADD COLUMN activity_level TEXT CHECK (activity_level IN ('sedentary', 'lightly_active', 'moderately_active', 'active', 'very_active')) DEFAULT 'sedentary',
ADD COLUMN calculated_tdee NUMERIC,
ADD COLUMN calculated_calories INTEGER;