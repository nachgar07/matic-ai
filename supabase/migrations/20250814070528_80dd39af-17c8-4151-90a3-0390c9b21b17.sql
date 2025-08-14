-- Primero, asegurémonos de que existen las categorías template por defecto
INSERT INTO public.meal_categories (user_id, name, color, icon, is_default) VALUES
('00000000-0000-0000-0000-000000000000', 'Desayuno', '#f97316', '🌅', true),
('00000000-0000-0000-0000-000000000000', 'Almuerzo', '#10b981', '🍽️', true),  
('00000000-0000-0000-0000-000000000000', 'Merienda', '#8b5cf6', '🥪', true),
('00000000-0000-0000-0000-000000000000', 'Cena', '#3b82f6', '🌙', true)
ON CONFLICT (user_id, name) DO UPDATE SET
  color = EXCLUDED.color,
  icon = EXCLUDED.icon,
  is_default = EXCLUDED.is_default;

-- Crear las categorías por defecto para usuarios existentes que no las tengan
INSERT INTO public.meal_categories (user_id, name, color, icon, is_default)
SELECT 
  p.id as user_id,
  template.name,
  template.color, 
  template.icon,
  template.is_default
FROM public.profiles p
CROSS JOIN (
  SELECT name, color, icon, is_default 
  FROM public.meal_categories 
  WHERE user_id = '00000000-0000-0000-0000-000000000000'
) template
WHERE NOT EXISTS (
  SELECT 1 FROM public.meal_categories mc 
  WHERE mc.user_id = p.id AND mc.name = template.name
);

-- Asegurar que el trigger funcione correctamente para usuarios nuevos
CREATE OR REPLACE FUNCTION public.handle_new_user_meal_categories()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Crear el trigger si no existe
DROP TRIGGER IF EXISTS on_auth_user_created_meal_categories ON auth.users;
CREATE TRIGGER on_auth_user_created_meal_categories
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_meal_categories();