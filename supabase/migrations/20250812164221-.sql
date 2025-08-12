-- Fix function search path security issues
-- Update cleanup_old_conversations function to set search_path
CREATE OR REPLACE FUNCTION public.cleanup_old_conversations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  DELETE FROM public.chat_conversations 
  WHERE created_at < now() - interval '7 days';
END;
$function$;

-- Update update_daily_water_intake_updated_at function to set search_path  
CREATE OR REPLACE FUNCTION public.update_daily_water_intake_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;