-- Add nationality field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN nationality TEXT,
ADD COLUMN currency TEXT DEFAULT 'USD';

-- Create index for better performance
CREATE INDEX idx_profiles_nationality ON public.profiles(nationality);