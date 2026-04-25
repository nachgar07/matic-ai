-- Per-dish images that clearly show multiple ingredients
UPDATE public.meal_entries me
SET plate_image = sub.img
FROM (
  VALUES
    -- BREAKFAST
    ('seed_en_eggs_avocado',  'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&q=80'), -- avocado toast + eggs + tomato + herbs
    ('seed_en_oatmeal',       'https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=800&q=80'), -- oatmeal bowl with banana, berries, nuts, honey
    ('seed_en_pancakes',      'https://images.unsplash.com/photo-1565299543923-37dd37887442?w=800&q=80'), -- pancakes stack with berries, syrup, butter
    ('seed_en_smoothie',      'https://images.unsplash.com/photo-1502741338009-cac2772e18bc?w=800&q=80'), -- smoothie bowl topped with fruit, granola, seeds
    ('seed_en_greek_yogurt',  'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&q=80'), -- yogurt with berries, granola, honey
    -- LUNCH
    ('seed_en_chicken_rice',  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80'), -- chicken bowl with rice, broccoli, veggies
    ('seed_en_caesar_salad',  'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=800&q=80'), -- salad with chicken, lettuce, parmesan, croutons
    ('seed_en_pasta_bolognese','https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800&q=80'), -- pasta with meat sauce, parmesan, basil
    ('seed_en_sushi',         'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&q=80'), -- sushi platter (multiple pieces, ginger, wasabi)
    ('seed_en_tacos',         'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&q=80'), -- tacos with meat, lettuce, cheese, salsa
    -- DINNER
    ('seed_en_salmon',        'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&q=80'), -- salmon with sweet potato + greens
    ('seed_en_steak',         'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80'), -- steak with potatoes, asparagus, salad
    ('seed_en_burger',        'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80'), -- burger with fries, lettuce, tomato, cheese
    ('seed_en_pizza',         'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=800&q=80'), -- pizza margherita slices with basil, tomato, mozzarella
    -- SNACK
    ('seed_en_apple_pb',      'https://images.unsplash.com/photo-1568093858174-0f391ea21c45?w=800&q=80'), -- apple slices with peanut butter, honey, nuts
    ('seed_en_almonds',       'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=800&q=80'), -- mixed nuts: almonds, cashews, pistachios
    ('seed_en_protein_bar',   'https://images.unsplash.com/photo-1622484212850-eb596d769edc?w=800&q=80'), -- protein bar with oats, nuts, chocolate visible
    ('seed_en_coffee_latte',  'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=80')  -- cappuccino with foam art, beans, biscotti
) AS sub(food_code, img)
WHERE me.user_id = 'a70079e2-322d-4c83-82d6-0ff7f1270eba'
  AND me.food_id IN (SELECT id FROM public.foods WHERE food_id = sub.food_code);