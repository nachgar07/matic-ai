-- Create table for daily water intake tracking
CREATE TABLE public.daily_water_intake (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  glasses_consumed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure one record per user per day
  UNIQUE(user_id, date)
);

-- Enable Row Level Security
ALTER TABLE public.daily_water_intake ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own water intake" 
ON public.daily_water_intake 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own water intake" 
ON public.daily_water_intake 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own water intake" 
ON public.daily_water_intake 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_daily_water_intake_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_daily_water_intake_updated_at
BEFORE UPDATE ON public.daily_water_intake
FOR EACH ROW
EXECUTE FUNCTION public.update_daily_water_intake_updated_at();