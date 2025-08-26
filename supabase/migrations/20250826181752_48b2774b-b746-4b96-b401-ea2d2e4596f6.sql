-- Create user_terms_acceptance table
CREATE TABLE public.user_terms_acceptance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  terms_version TEXT NOT NULL,
  privacy_version TEXT NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_terms_acceptance ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own terms acceptance" 
ON public.user_terms_acceptance 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own terms acceptance" 
ON public.user_terms_acceptance 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create unique constraint to prevent duplicate acceptances
CREATE UNIQUE INDEX user_terms_acceptance_unique_idx 
ON public.user_terms_acceptance (user_id, terms_version, privacy_version);

-- Add trigger for updated_at
CREATE TRIGGER update_user_terms_acceptance_updated_at
BEFORE UPDATE ON public.user_terms_acceptance
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();