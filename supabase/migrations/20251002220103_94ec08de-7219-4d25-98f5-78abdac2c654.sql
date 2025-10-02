-- Create weight history table to track user's weight progress
CREATE TABLE public.weight_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  weight NUMERIC NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.weight_history ENABLE ROW LEVEL SECURITY;

-- Create policies for weight_history
CREATE POLICY "Users can view their own weight history"
ON public.weight_history
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own weight entries"
ON public.weight_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weight entries"
ON public.weight_history
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own weight entries"
ON public.weight_history
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_weight_history_updated_at
BEFORE UPDATE ON public.weight_history
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better query performance
CREATE INDEX idx_weight_history_user_date ON public.weight_history(user_id, date DESC);