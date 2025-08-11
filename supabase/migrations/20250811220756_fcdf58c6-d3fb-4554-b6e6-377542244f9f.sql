-- Add frequency_data column to goals table to store advanced frequency configurations
ALTER TABLE public.goals 
ADD COLUMN frequency_data JSONB;