-- Permitir a los usuarios autenticados crear alimentos
CREATE POLICY "Authenticated users can create foods" ON public.foods
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Permitir a los usuarios autenticados actualizar alimentos
CREATE POLICY "Authenticated users can update foods" ON public.foods
FOR UPDATE 
TO authenticated
USING (true);