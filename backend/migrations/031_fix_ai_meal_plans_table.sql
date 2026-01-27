-- ============================================================================
-- MIGRATION 031: Fix AI Meal Plans Table Structure
-- ============================================================================
-- Purpose: Create proper AI meal plans table structure separate from existing meal_plans
-- Date: January 26, 2026

-- Create AI meal plans table with correct structure
CREATE TABLE IF NOT EXISTS ai_meal_plans (
  id SERIAL PRIMARY KEY,
  plan_id VARCHAR(255) UNIQUE NOT NULL,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_id INTEGER REFERENCES families(id) ON DELETE SET NULL,
  plan_name VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days INTEGER NOT NULL,
  nutrition_summary JSONB,
  cost_estimate DECIMAL(10,2),
  preparation_tips JSONB,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ai_confidence DECIMAL(3,2)
);

-- Create indexes for ai_meal_plans
CREATE INDEX IF NOT EXISTS idx_ai_meal_plans_user_id ON ai_meal_plans(user_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_meal_plans_family_id ON ai_meal_plans(family_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_meal_plans_plan_id ON ai_meal_plans(plan_id);

-- Update foreign key constraints to reference ai_meal_plans
ALTER TABLE meal_plan_meals 
DROP CONSTRAINT IF EXISTS fk_meal_plan_meals_plan_id;

ALTER TABLE meal_plan_shopping_items 
DROP CONSTRAINT IF EXISTS fk_meal_plan_shopping_items_plan_id;

-- Add new foreign key constraints
ALTER TABLE meal_plan_meals 
ADD CONSTRAINT fk_meal_plan_meals_ai_plan_id 
FOREIGN KEY (plan_id) REFERENCES ai_meal_plans(plan_id) ON DELETE CASCADE;

ALTER TABLE meal_plan_shopping_items 
ADD CONSTRAINT fk_meal_plan_shopping_items_ai_plan_id 
FOREIGN KEY (plan_id) REFERENCES ai_meal_plans(plan_id) ON DELETE CASCADE;

-- Add comments
COMMENT ON TABLE ai_meal_plans IS 'AI-generated meal plans with nutrition and cost information';

-- Migration complete
SELECT 'AI meal plans table structure fixed successfully' as status;