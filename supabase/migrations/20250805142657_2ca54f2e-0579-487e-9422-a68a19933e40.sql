-- Add new columns to profiles table for weight goal and progress speed
ALTER TABLE public.profiles 
ADD COLUMN target_weight NUMERIC,
ADD COLUMN progress_speed TEXT CHECK (progress_speed IN ('slow', 'moderate', 'fast'));