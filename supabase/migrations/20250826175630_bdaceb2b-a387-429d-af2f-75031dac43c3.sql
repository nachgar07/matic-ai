-- Fix Function Search Path Mutable warnings
-- Update all functions to have secure search_path

-- Fix the update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix the update_daily_water_intake_updated_at function
CREATE OR REPLACE FUNCTION public.update_daily_water_intake_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix the handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$function$;

-- Fix the handle_new_user_meal_categories function
CREATE OR REPLACE FUNCTION public.handle_new_user_meal_categories()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Crear las categorías por defecto para el nuevo usuario
  INSERT INTO public.meal_categories (user_id, name, color, icon, is_default) 
  SELECT 
    NEW.id,
    name,
    color,
    icon,
    is_default
  FROM public.meal_categories 
  WHERE user_id = '00000000-0000-0000-0000-000000000000'
  ON CONFLICT (user_id, name) DO NOTHING;
  
  RETURN NEW;
END;
$function$;

-- Fix the create_default_meal_categories_for_user function
CREATE OR REPLACE FUNCTION public.create_default_meal_categories_for_user(user_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.meal_categories (user_id, name, color, icon, is_default) 
  SELECT 
    user_uuid,
    name,
    color,
    icon,
    is_default
  FROM public.meal_categories 
  WHERE user_id = '00000000-0000-0000-0000-000000000000'
  ON CONFLICT (user_id, name) DO NOTHING;
END;
$function$;

-- Fix the cleanup_old_conversations function
CREATE OR REPLACE FUNCTION public.cleanup_old_conversations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.chat_conversations 
  WHERE created_at < now() - interval '7 days';
END;
$function$;