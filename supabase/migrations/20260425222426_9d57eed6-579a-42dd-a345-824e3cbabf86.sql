-- Seed English foods, meals (last 14 days), weight history (last 30 days), and tasks for nacho_garin7@hotmail.com
-- user_id: a70079e2-322d-4c83-82d6-0ff7f1270eba

-- 1) English foods with realistic nutrition
INSERT INTO public.foods (food_id, food_name, brand_name, serving_description, calories_per_serving, protein_per_serving, carbs_per_serving, fat_per_serving) VALUES
('seed_en_oatmeal',         'Oatmeal with Banana & Honey',          'Generic',    '1 bowl (250g)',         380, 12, 65, 8),
('seed_en_eggs_avocado',    'Scrambled Eggs with Avocado Toast',    'Generic',    '1 plate',               520, 24, 38, 30),
('seed_en_greek_yogurt',    'Greek Yogurt with Berries & Granola',  'Generic',    '1 cup (200g)',          290, 18, 35, 9),
('seed_en_pancakes',        'Pancakes with Maple Syrup',            'Generic',    '3 pancakes',            450, 10, 72, 14),
('seed_en_smoothie',        'Protein Smoothie Bowl',                'Generic',    '1 bowl (350ml)',        420, 28, 55, 10),
('seed_en_chicken_rice',    'Grilled Chicken with Rice & Broccoli', 'Generic',    '1 plate (400g)',        620, 48, 65, 14),
('seed_en_salmon',          'Baked Salmon with Sweet Potato',       'Generic',    '1 plate (350g)',        580, 38, 45, 24),
('seed_en_pasta_bolognese', 'Spaghetti Bolognese',                  'Generic',    '1 plate (400g)',        720, 32, 85, 22),
('seed_en_caesar_salad',    'Chicken Caesar Salad',                 'Generic',    '1 large bowl',          480, 35, 18, 28),
('seed_en_burger',          'Beef Burger with Fries',               'Generic',    '1 burger + fries',      950, 42, 78, 48),
('seed_en_sushi',           'Salmon Sushi Set',                     'Generic',    '12 pieces',             540, 28, 72, 14),
('seed_en_pizza',           'Margherita Pizza',                     'Generic',    '2 slices',              560, 22, 68, 22),
('seed_en_steak',           'Steak with Roasted Vegetables',        'Generic',    '1 plate (400g)',        720, 52, 28, 42),
('seed_en_tacos',           'Beef Tacos (3 pieces)',                'Generic',    '3 tacos',               620, 32, 58, 28),
('seed_en_protein_bar',     'Protein Bar',                          'MyProtein',  '1 bar (60g)',           220, 20, 22, 7),
('seed_en_almonds',         'Mixed Nuts (Almonds & Cashews)',       'Generic',    '30g',                   180, 6,  8,  15),
('seed_en_apple_pb',        'Apple with Peanut Butter',             'Generic',    '1 apple + 2 tbsp PB',   280, 8,  30, 16),
('seed_en_coffee_latte',    'Cappuccino',                           'Starbucks',  '1 medium (350ml)',      120, 8,  12, 4)
ON CONFLICT DO NOTHING;

-- 2) Meal entries — last 14 days, breakfast/lunch/dinner/snack with real Unsplash images
DO $$
DECLARE
  uid uuid := 'a70079e2-322d-4c83-82d6-0ff7f1270eba';
  d   int;
  base_date date := CURRENT_DATE;
  bf_ids   text[] := ARRAY['seed_en_oatmeal','seed_en_eggs_avocado','seed_en_greek_yogurt','seed_en_pancakes','seed_en_smoothie'];
  bf_imgs  text[] := ARRAY[
    'https://images.unsplash.com/photo-1517673132405-a56a62b18caf?w=800',
    'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800',
    'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800',
    'https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=800',
    'https://images.unsplash.com/photo-1490474504059-bf2db5ab2348?w=800'
  ];
  ln_ids   text[] := ARRAY['seed_en_chicken_rice','seed_en_caesar_salad','seed_en_sushi','seed_en_pasta_bolognese','seed_en_tacos'];
  ln_imgs  text[] := ARRAY[
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800',
    'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=800',
    'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800',
    'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800',
    'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800'
  ];
  dn_ids   text[] := ARRAY['seed_en_salmon','seed_en_steak','seed_en_pizza','seed_en_burger','seed_en_chicken_rice'];
  dn_imgs  text[] := ARRAY[
    'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800',
    'https://images.unsplash.com/photo-1546964124-0cce460f38ef?w=800',
    'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800',
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800',
    'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800'
  ];
  sn_ids   text[] := ARRAY['seed_en_protein_bar','seed_en_almonds','seed_en_apple_pb','seed_en_coffee_latte','seed_en_greek_yogurt'];
  sn_imgs  text[] := ARRAY[
    'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=800',
    'https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=800',
    'https://images.unsplash.com/photo-1568569350062-ebfa3cb195df?w=800',
    'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=800',
    'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800'
  ];
  bf_id uuid; ln_id uuid; dn_id uuid; sn_id uuid;
  i int;
BEGIN
  FOR d IN 0..13 LOOP
    i := (d % 5) + 1;

    SELECT id INTO bf_id FROM public.foods WHERE food_id = bf_ids[i] LIMIT 1;
    SELECT id INTO ln_id FROM public.foods WHERE food_id = ln_ids[i] LIMIT 1;
    SELECT id INTO dn_id FROM public.foods WHERE food_id = dn_ids[i] LIMIT 1;
    SELECT id INTO sn_id FROM public.foods WHERE food_id = sn_ids[i] LIMIT 1;

    INSERT INTO public.meal_entries (user_id, food_id, meal_type, servings, consumed_at, plate_image) VALUES
      (uid, bf_id, 'breakfast', 1.0, (base_date - d)::timestamp + time '08:15', bf_imgs[i]),
      (uid, ln_id, 'lunch',     1.0, (base_date - d)::timestamp + time '13:20', ln_imgs[i]),
      (uid, dn_id, 'dinner',    1.0, (base_date - d)::timestamp + time '20:30', dn_imgs[i]),
      (uid, sn_id, 'snack',     1.0, (base_date - d)::timestamp + time '17:00', sn_imgs[i]);
  END LOOP;
END $$;

-- 3) Weight history — last 30 days, gradual gain from 64.2 → 65.1 kg (goal: gain)
DO $$
DECLARE
  uid uuid := 'a70079e2-322d-4c83-82d6-0ff7f1270eba';
  d int;
  w numeric;
BEGIN
  FOR d IN 0..29 LOOP
    -- start lower 30 days ago, trend upward with small noise
    w := 64.2 + ((29 - d) * 0.03) + ((d % 3) * 0.05) - ((d % 4) * 0.04);
    INSERT INTO public.weight_history (user_id, weight, date, notes)
    VALUES (uid, ROUND(w::numeric, 1), CURRENT_DATE - d,
            CASE WHEN d % 7 = 0 THEN 'Weekly check-in' ELSE NULL END)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- 4) Tasks & reminders
INSERT INTO public.tasks (user_id, title, description, category, priority, is_completed, due_date, due_time, reminder_time, is_recurring) VALUES
('a70079e2-322d-4c83-82d6-0ff7f1270eba', 'Drink 2L of water',          'Stay hydrated through the day',                'health',    2, false, CURRENT_DATE,             '09:00', (CURRENT_DATE + time '09:00')::timestamptz, true),
('a70079e2-322d-4c83-82d6-0ff7f1270eba', 'Morning workout',            '45 min strength training at the gym',          'fitness',   3, false, CURRENT_DATE,             '07:00', (CURRENT_DATE + time '06:45')::timestamptz, true),
('a70079e2-322d-4c83-82d6-0ff7f1270eba', 'Log breakfast',              'Track macros for breakfast',                   'nutrition', 1, true,  CURRENT_DATE,             '08:30', NULL, true),
('a70079e2-322d-4c83-82d6-0ff7f1270eba', 'Meal prep for the week',     'Prepare chicken, rice and vegetables',         'nutrition', 2, false, CURRENT_DATE + 1,         '18:00', (CURRENT_DATE + 1 + time '17:30')::timestamptz, false),
('a70079e2-322d-4c83-82d6-0ff7f1270eba', 'Weekly weigh-in',            'Check progress on the scale',                  'health',    2, false, CURRENT_DATE + 2,         '07:30', (CURRENT_DATE + 2 + time '07:30')::timestamptz, true),
('a70079e2-322d-4c83-82d6-0ff7f1270eba', 'Buy protein powder',         'Whey isolate, vanilla flavor',                 'shopping',  1, false, CURRENT_DATE + 3,         NULL,    NULL, false),
('a70079e2-322d-4c83-82d6-0ff7f1270eba', 'Doctor appointment',         'Annual check-up with Dr. Smith',               'health',    3, false, CURRENT_DATE + 5,         '10:00', (CURRENT_DATE + 5 + time '09:00')::timestamptz, false),
('a70079e2-322d-4c83-82d6-0ff7f1270eba', 'Evening run',                '5km easy pace',                                'fitness',   2, false, CURRENT_DATE,             '19:00', (CURRENT_DATE + time '18:45')::timestamptz, true),
('a70079e2-322d-4c83-82d6-0ff7f1270eba', 'Read 20 pages',              'Atomic Habits',                                'personal',  1, false, CURRENT_DATE,             '22:00', NULL, true),
('a70079e2-322d-4c83-82d6-0ff7f1270eba', 'Take vitamins',              'Multivitamin + Omega 3',                       'health',    2, true,  CURRENT_DATE,             '08:00', (CURRENT_DATE + time '08:00')::timestamptz, true),
('a70079e2-322d-4c83-82d6-0ff7f1270eba', 'Review weekly progress',     'Check goals and adjust nutrition plan',        'personal',  2, false, CURRENT_DATE + 6,         '20:00', (CURRENT_DATE + 6 + time '20:00')::timestamptz, true),
('a70079e2-322d-4c83-82d6-0ff7f1270eba', 'Grocery shopping',           'Eggs, oats, chicken, vegetables, fruit',       'shopping',  2, false, CURRENT_DATE + 1,         '11:00', (CURRENT_DATE + 1 + time '10:30')::timestamptz, false);