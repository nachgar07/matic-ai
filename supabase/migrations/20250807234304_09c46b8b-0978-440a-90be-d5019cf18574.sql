-- Add is_recurring field to tasks table
ALTER TABLE public.tasks 
ADD COLUMN is_recurring boolean NOT NULL DEFAULT false;