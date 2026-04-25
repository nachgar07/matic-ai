DO $$
DECLARE
  uid uuid := 'a70079e2-322d-4c83-82d6-0ff7f1270eba';
  bf uuid; ln uuid; dn uuid; sn uuid;
BEGIN
  SELECT id INTO bf FROM public.foods WHERE food_id = 'seed_en_smoothie' LIMIT 1;
  SELECT id INTO ln FROM public.foods WHERE food_id = 'seed_en_chicken_rice' LIMIT 1;
  SELECT id INTO dn FROM public.foods WHERE food_id = 'seed_en_steak' LIMIT 1;
  SELECT id INTO sn FROM public.foods WHERE food_id = 'seed_en_apple_pb' LIMIT 1;

  -- Tomorrow
  INSERT INTO public.meal_entries (user_id, food_id, meal_type, servings, consumed_at, plate_image) VALUES
    (uid, bf, 'breakfast', 1.0, (CURRENT_DATE + 1)::timestamp + time '08:30',
      'https://images.unsplash.com/photo-1490474504059-bf2db5ab2348?w=800'),
    (uid, ln, 'lunch',     1.2, (CURRENT_DATE + 1)::timestamp + time '13:15',
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800'),
    (uid, dn, 'dinner',    1.0, (CURRENT_DATE + 1)::timestamp + time '20:45',
      'https://images.unsplash.com/photo-1546964124-0cce460f38ef?w=800'),
    (uid, sn, 'snack',     1.0, (CURRENT_DATE + 1)::timestamp + time '16:30',
      'https://images.unsplash.com/photo-1568569350062-ebfa3cb195df?w=800');
END $$;