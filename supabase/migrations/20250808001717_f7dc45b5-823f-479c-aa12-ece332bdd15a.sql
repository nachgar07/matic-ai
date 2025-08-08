-- Add daily_water_glasses column to nutrition_goals table
ALTER TABLE nutrition_goals 
ADD COLUMN daily_water_glasses integer NOT NULL DEFAULT 12;