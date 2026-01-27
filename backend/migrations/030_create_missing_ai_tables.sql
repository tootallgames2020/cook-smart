-- ============================================================================
-- MIGRATION 030: Create Missing AI Tables
-- ============================================================================
-- Purpose: Add missing database tables required for AI features to function
-- Date: January 26, 2026

-- Create ingredient usage log table
CREATE TABLE IF NOT EXISTS ingredient_usage_log (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ingredient_id VARCHAR(255),
  ingredient_name VARCHAR(255) NOT NULL,
  quantity_used DECIMAL(10,2) NOT NULL,
  unit_used VARCHAR(50) NOT NULL,
  conversion_details JSONB,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for ingredient_usage_log
CREATE INDEX IF NOT EXISTS idx_ingredient_usage_log_user_id ON ingredient_usage_log(user_id, used_at DESC);
CREATE INDEX IF NOT EXISTS idx_ingredient_usage_log_ingredient ON ingredient_usage_log(ingredient_name, used_at DESC);

-- Create user ingredients history table
CREATE TABLE IF NOT EXISTS user_ingredients_history (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ingredient_name VARCHAR(255) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  expiration_date DATE,
  storage_type VARCHAR(50),
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for user_ingredients_history
CREATE INDEX IF NOT EXISTS idx_user_ingredients_history_user_id ON user_ingredients_history(user_id, added_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_ingredients_history_ingredient ON user_ingredients_history(ingredient_name, added_at DESC);

-- Create photo analysis log table
CREATE TABLE IF NOT EXISTS photo_analysis_log (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  analysis_type VARCHAR(50) NOT NULL,
  confidence DECIMAL(3,2),
  processing_time_ms INTEGER,
  results JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for photo_analysis_log
CREATE INDEX IF NOT EXISTS idx_photo_analysis_log_user_id ON photo_analysis_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_photo_analysis_log_type ON photo_analysis_log(analysis_type, created_at DESC);

-- Create meal plans table
CREATE TABLE IF NOT EXISTS meal_plans (
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

-- Create indexes for meal_plans
CREATE INDEX IF NOT EXISTS idx_meal_plans_user_id ON meal_plans(user_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_meal_plans_family_id ON meal_plans(family_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_meal_plans_plan_id ON meal_plans(plan_id);

-- Create meal plan meals table
CREATE TABLE IF NOT EXISTS meal_plan_meals (
  id SERIAL PRIMARY KEY,
  plan_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  meal_date DATE NOT NULL,
  meal_type VARCHAR(20) NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  recipe_id VARCHAR(255),
  recipe_name VARCHAR(255) NOT NULL,
  recipe_source VARCHAR(50),
  prep_time INTEGER,
  cook_time INTEGER,
  servings INTEGER,
  difficulty VARCHAR(20) CHECK (difficulty IN ('easy', 'medium', 'challenging')),
  ingredients_needed JSONB,
  nutrition JSONB,
  ai_reasoning TEXT,
  confidence DECIMAL(3,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for meal_plan_meals
CREATE INDEX IF NOT EXISTS idx_meal_plan_meals_plan_id ON meal_plan_meals(plan_id, meal_date);
CREATE INDEX IF NOT EXISTS idx_meal_plan_meals_user_id ON meal_plan_meals(user_id, meal_date DESC);
CREATE INDEX IF NOT EXISTS idx_meal_plan_meals_type ON meal_plan_meals(meal_type);

-- Create meal plan shopping items table
CREATE TABLE IF NOT EXISTS meal_plan_shopping_items (
  id SERIAL PRIMARY KEY,
  plan_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ingredient_name VARCHAR(255) NOT NULL,
  total_quantity DECIMAL(10,2) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  estimated_cost DECIMAL(10,2),
  category VARCHAR(50),
  priority VARCHAR(20) CHECK (priority IN ('high', 'medium', 'low')),
  used_in_meals JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for meal_plan_shopping_items
CREATE INDEX IF NOT EXISTS idx_meal_plan_shopping_items_plan_id ON meal_plan_shopping_items(plan_id);
CREATE INDEX IF NOT EXISTS idx_meal_plan_shopping_items_user_id ON meal_plan_shopping_items(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meal_plan_shopping_items_category ON meal_plan_shopping_items(category, priority);

-- Create family activity log table
CREATE TABLE IF NOT EXISTS family_activity_log (
  id SERIAL PRIMARY KEY,
  family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  member_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL,
  activity_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for family_activity_log
CREATE INDEX IF NOT EXISTS idx_family_activity_log_family_id ON family_activity_log(family_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_family_activity_log_member_id ON family_activity_log(member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_family_activity_log_type ON family_activity_log(activity_type, created_at DESC);

-- Add foreign key constraints
ALTER TABLE meal_plan_meals 
ADD CONSTRAINT fk_meal_plan_meals_plan_id 
FOREIGN KEY (plan_id) REFERENCES meal_plans(plan_id) ON DELETE CASCADE;

ALTER TABLE meal_plan_shopping_items 
ADD CONSTRAINT fk_meal_plan_shopping_items_plan_id 
FOREIGN KEY (plan_id) REFERENCES meal_plans(plan_id) ON DELETE CASCADE;

-- Add comments for documentation
COMMENT ON TABLE ingredient_usage_log IS 'Tracks ingredient usage for consumption analytics and predictions';
COMMENT ON TABLE user_ingredients_history IS 'Historical record of ingredient additions for trend analysis';
COMMENT ON TABLE photo_analysis_log IS 'Logs photo analysis results for AI improvement and user history';
COMMENT ON TABLE meal_plans IS 'AI-generated meal plans with nutrition and cost information';
COMMENT ON TABLE meal_plan_meals IS 'Individual meals within meal plans';
COMMENT ON TABLE meal_plan_shopping_items IS 'Shopping list items generated from meal plans';
COMMENT ON TABLE family_activity_log IS 'Family member activities for coordination and analytics';

-- Create trigger to log ingredient usage when ingredients are updated
CREATE OR REPLACE FUNCTION log_ingredient_usage()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log when quantity decreases (usage)
  IF OLD.quantity > NEW.quantity THEN
    INSERT INTO ingredient_usage_log (
      user_id, 
      ingredient_name, 
      quantity_used, 
      unit_used, 
      used_at
    ) VALUES (
      NEW.user_id,
      NEW.ingredient_name,
      OLD.quantity - NEW.quantity,
      NEW.unit,
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on user_ingredients table
CREATE TRIGGER trigger_log_ingredient_usage
  AFTER UPDATE ON user_ingredients
  FOR EACH ROW
  EXECUTE FUNCTION log_ingredient_usage();

-- Create trigger to log ingredient additions to history
CREATE OR REPLACE FUNCTION log_ingredient_addition()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_ingredients_history (
    user_id,
    ingredient_name,
    quantity,
    unit,
    expiration_date,
    storage_type,
    added_at
  ) VALUES (
    NEW.user_id,
    NEW.ingredient_name,
    NEW.quantity,
    NEW.unit,
    NEW.expiration_date,
    NEW.storage_type,
    NEW.added_at
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on user_ingredients table for additions
CREATE TRIGGER trigger_log_ingredient_addition
  AFTER INSERT ON user_ingredients
  FOR EACH ROW
  EXECUTE FUNCTION log_ingredient_addition();

-- Migration complete
SELECT 'Missing AI tables migration completed successfully' as status;