-- Add unique constraint for nutrition_goals user_id if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'nutrition_goals_user_id_key'
    ) THEN
        ALTER TABLE nutrition_goals ADD CONSTRAINT nutrition_goals_user_id_key UNIQUE (user_id);
    END IF;
END $$;