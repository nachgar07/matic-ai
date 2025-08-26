-- Create a table to track user terms acceptance
CREATE TABLE public.user_terms_acceptance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  terms_version TEXT NOT NULL DEFAULT '2025-08-26',
  privacy_version TEXT NOT NULL DEFAULT '2025-08-26',
  accepted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, terms_version, privacy_version)
);

-- Enable Row Level Security
ALTER TABLE public.user_terms_acceptance ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own terms acceptance" 
ON public.user_terms_acceptance 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own terms acceptance" 
ON public.user_terms_acceptance 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_terms_acceptance_updated_at
  BEFORE UPDATE ON public.user_terms_acceptance
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();