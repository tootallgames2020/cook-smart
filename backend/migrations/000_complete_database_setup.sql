-- ============================================================================
-- COOK SMART COMPLETE DATABASE SETUP
-- ============================================================================
-- This script creates ALL tables needed for Cook Smart to function completely
-- Including: Users, Recipes, Shopping Lists, Points, Dietary Restrictions, etc.
-- ============================================================================

BEGIN;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CORE USER SYSTEM
-- ============================================================================

-- Users table with ALL special user flags
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    
    -- Special User Flags
    is_admin BOOLEAN DEFAULT FALSE,
    is_co_founder BOOLEAN DEFAULT FALSE,
    is_special_user BOOLEAN DEFAULT FALSE,
    is_creator BOOLEAN DEFAULT FALSE,
    is_developer BOOLEAN DEFAULT FALSE,
    
    -- Subscription and Access
    has_lifetime_subscription BOOLEAN DEFAULT FALSE,
    subscription_status VARCHAR(50) DEFAULT 'free',
    
    -- Points System
    points INTEGER DEFAULT 0,
    
    -- User Preferences
    dietary_restrictions JSONB DEFAULT '[]',
    allergies JSONB DEFAULT '[]',
    show_nutrition BOOLEAN DEFAULT TRUE,
    preferred_units VARCHAR(20) DEFAULT 'metric',
    age_verified BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- DIETARY RESTRICTIONS AND ALLERGIES SYSTEM
-- ============================================================================

-- Dietary restrictions master list
CREATE TABLE IF NOT EXISTS dietary_restrictions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    excluded_ingredients JSONB DEFAULT '[]'::jsonb,
    excluded_tags JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Allergies master list
CREATE TABLE IF NOT EXISTS allergies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    severity VARCHAR(20) DEFAULT 'moderate',
    description TEXT,
    trigger_ingredients JSONB DEFAULT '[]'::jsonb,
    cross_reactive_ingredients JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User dietary restrictions (many-to-many)
CREATE TABLE IF NOT EXISTS user_dietary_restrictions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    restriction_id INTEGER NOT NULL REFERENCES dietary_restrictions(id) ON DELETE CASCADE,
    custom_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, restriction_id)
);

-- User allergies (many-to-many)
CREATE TABLE IF NOT EXISTS user_allergies (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    allergy_id INTEGER NOT NULL REFERENCES allergies(id) ON DELETE CASCADE,
    severity_override VARCHAR(20),
    custom_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, allergy_id)
);

-- ============================================================================
-- INGREDIENTS AND PANTRY SYSTEM
-- ============================================================================

-- Master ingredients list
CREATE TABLE IF NOT EXISTS ingredients (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    common_names JSONB DEFAULT '[]',
    barcode VARCHAR(50),
    nutrition_per_100g JSONB,
    default_unit VARCHAR(50) DEFAULT 'gram',
    is_common BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User ingredients (pantry)
CREATE TABLE IF NOT EXISTS user_ingredients (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ingredient_id VARCHAR(255),
    ingredient_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10,2),
    unit VARCHAR(50) DEFAULT 'piece',
    category VARCHAR(100) DEFAULT 'other',
    expiration_date DATE,
    notes TEXT,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- RECIPE SYSTEM
-- ============================================================================

-- User saved recipes
CREATE TABLE IF NOT EXISTS user_recipes (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipe_id VARCHAR(255),
    recipe_title VARCHAR(500) NOT NULL,
    recipe_description TEXT,
    recipe_image_url TEXT,
    recipe_data JSONB,
    is_private BOOLEAN DEFAULT false,
    is_favorite BOOLEAN DEFAULT false,
    saved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Recipe cache for performance
CREATE TABLE IF NOT EXISTS recipe_cache (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
    search_query VARCHAR(500),
    recipe_id VARCHAR(255) NOT NULL,
    recipe_data JSONB NOT NULL,
    source VARCHAR(100) DEFAULT 'fatsecret',
    cache_key VARCHAR(255) UNIQUE,
    hit_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Recipe search cache
CREATE TABLE IF NOT EXISTS recipe_search_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ingredient_hash VARCHAR(255) UNIQUE NOT NULL,
    recipe_ids JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    access_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- SHOPPING LIST SYSTEM
-- ============================================================================

-- Shopping list items
CREATE TABLE IF NOT EXISTS shopping_list_items (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ingredient VARCHAR(255) NOT NULL,
    quantity VARCHAR(50) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    category VARCHAR(100) DEFAULT 'other',
    recipe_id VARCHAR(255),
    is_completed BOOLEAN DEFAULT false,
    date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shopping lists (collections)
CREATE TABLE IF NOT EXISTS shopping_lists (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    items JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- POINTS AND ACHIEVEMENTS SYSTEM
-- ============================================================================

-- User points
CREATE TABLE IF NOT EXISTS user_points (
    user_id VARCHAR(255) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    total_points INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 0,
    last_updated TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Points transactions history
CREATE TABLE IF NOT EXISTS points_transactions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    points INTEGER NOT NULL,
    action VARCHAR(100) NOT NULL,
    description TEXT,
    date_created TIMESTAMP NOT NULL DEFAULT NOW()
);

-- User points history (legacy support)
CREATE TABLE IF NOT EXISTS user_points_history (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    points INTEGER NOT NULL,
    reason VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- SUBSCRIPTION SYSTEM
-- ============================================================================

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    billing_cycle VARCHAR(20) DEFAULT 'monthly',
    stripe_subscription_id VARCHAR(255),
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    canceled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- REFERRAL SYSTEM
-- ============================================================================

-- Referrals
CREATE TABLE IF NOT EXISTS referrals (
    id SERIAL PRIMARY KEY,
    referrer_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referred_email VARCHAR(255),
    referral_code VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    reward_points INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- User referrals (extended)
CREATE TABLE IF NOT EXISTS user_referrals (
    id SERIAL PRIMARY KEY,
    referrer_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referred_user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
    referral_code VARCHAR(50) NOT NULL UNIQUE,
    status VARCHAR(50) DEFAULT 'pending',
    reward_amount DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- FEEDBACK AND SUPPORT SYSTEM
-- ============================================================================

-- Feedback
CREATE TABLE IF NOT EXISTS feedback (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    message TEXT NOT NULL,
    category VARCHAR(100) DEFAULT 'general',
    status VARCHAR(50) DEFAULT 'open',
    priority VARCHAR(20) DEFAULT 'medium',
    admin_response TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- SECURITY AND AUTHENTICATION
-- ============================================================================

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- LOGGING AND MONITORING
-- ============================================================================

-- Error logs
CREATE TABLE IF NOT EXISTS error_logs (
    id SERIAL PRIMARY KEY,
    severity VARCHAR(20) NOT NULL,
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
    endpoint VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feature usage tracking
CREATE TABLE IF NOT EXISTS feature_usage (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
    feature_name VARCHAR(100) NOT NULL,
    usage_count INTEGER DEFAULT 1,
    session_id VARCHAR(255),
    metadata JSONB,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);
CREATE INDEX IF NOT EXISTS idx_users_is_creator ON users(is_creator);
CREATE INDEX IF NOT EXISTS idx_users_is_special_user ON users(is_special_user);
CREATE INDEX IF NOT EXISTS idx_users_is_developer ON users(is_developer);

-- Dietary restrictions indexes
CREATE INDEX IF NOT EXISTS idx_user_dietary_restrictions_user_id ON user_dietary_restrictions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_allergies_user_id ON user_allergies(user_id);
CREATE INDEX IF NOT EXISTS idx_dietary_restrictions_category ON dietary_restrictions(category);
CREATE INDEX IF NOT EXISTS idx_allergies_severity ON allergies(severity);

-- Ingredients indexes
CREATE INDEX IF NOT EXISTS idx_user_ingredients_user_id ON user_ingredients(user_id);
CREATE INDEX IF NOT EXISTS idx_user_ingredients_category ON user_ingredients(category);
CREATE INDEX IF NOT EXISTS idx_user_ingredients_added_at ON user_ingredients(added_at);

-- Recipe indexes
CREATE INDEX IF NOT EXISTS idx_user_recipes_user_id ON user_recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_recipes_recipe_id ON user_recipes(recipe_id);
CREATE INDEX IF NOT EXISTS idx_user_recipes_is_favorite ON user_recipes(is_favorite);
CREATE INDEX IF NOT EXISTS idx_recipe_cache_recipe_id ON recipe_cache(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_cache_expires_at ON recipe_cache(expires_at);

-- Shopping list indexes
CREATE INDEX IF NOT EXISTS idx_shopping_list_items_user_id ON shopping_list_items(user_id);
CREATE INDEX IF NOT EXISTS idx_shopping_list_items_recipe_id ON shopping_list_items(recipe_id);
CREATE INDEX IF NOT EXISTS idx_shopping_lists_user_id ON shopping_lists(user_id);

-- Points indexes
CREATE INDEX IF NOT EXISTS idx_user_points_total ON user_points(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_points_transactions_user ON points_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_points_transactions_date ON points_transactions(date_created DESC);

-- Other indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMPS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$ language 'plpgsql';

-- Shopping list update trigger
CREATE OR REPLACE FUNCTION update_shopping_list_updated_at()
RETURNS TRIGGER AS $
BEGIN
    NEW.date_updated = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_ingredients_updated_at BEFORE UPDATE ON user_ingredients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_recipes_updated_at BEFORE UPDATE ON user_recipes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shopping_lists_updated_at BEFORE UPDATE ON shopping_lists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER shopping_list_items_updated_at BEFORE UPDATE ON shopping_list_items
    FOR EACH ROW EXECUTE FUNCTION update_shopping_list_updated_at();

-- ============================================================================
-- DEFAULT DATA POPULATION
-- ============================================================================

-- Insert default dietary restrictions
INSERT INTO dietary_restrictions (name, category, description, excluded_ingredients) VALUES
('Vegetarian', 'diet', 'No meat, poultry, or fish', '["beef", "chicken", "pork", "fish", "meat", "poultry", "turkey", "lamb", "bacon", "ham", "sausage"]'),
('Vegan', 'diet', 'No animal products', '["beef", "chicken", "pork", "fish", "meat", "poultry", "turkey", "lamb", "bacon", "ham", "sausage", "milk", "cheese", "butter", "cream", "yogurt", "eggs", "honey"]'),
('Gluten-Free', 'diet', 'No gluten-containing grains', '["wheat", "flour", "bread", "pasta", "barley", "rye", "oats", "gluten"]'),
('Dairy-Free', 'diet', 'No dairy products', '["milk", "cheese", "butter", "cream", "yogurt", "dairy"]'),
('Keto', 'diet', 'Very low carb, high fat', '["bread", "pasta", "rice", "potato", "sugar", "flour"]'),
('Paleo', 'diet', 'No processed foods, grains, or legumes', '["bread", "pasta", "rice", "beans", "lentils", "flour", "sugar", "processed"]'),
('Low-Sodium', 'health', 'Reduced sodium intake', '["salt", "sodium", "soy sauce", "processed"]'),
('Halal', 'religious', 'Islamic dietary laws', '["pork", "bacon", "ham", "alcohol", "wine", "beer"]'),
('Kosher', 'religious', 'Jewish dietary laws', '["pork", "bacon", "ham", "shellfish", "mixing meat and dairy"]')
ON CONFLICT (name) DO NOTHING;

-- Insert default allergies
INSERT INTO allergies (name, severity, description, trigger_ingredients) VALUES
('Peanut Allergy', 'severe', 'Allergy to peanuts', '["peanut", "peanuts", "peanut butter"]'),
('Tree Nut Allergy', 'severe', 'Allergy to tree nuts', '["almond", "walnut", "cashew", "pecan", "pistachio", "hazelnut", "brazil nut", "macadamia"]'),
('Dairy Allergy', 'moderate', 'Allergy to dairy products', '["milk", "cheese", "butter", "cream", "yogurt", "dairy", "lactose"]'),
('Egg Allergy', 'moderate', 'Allergy to eggs', '["egg", "eggs", "mayonnaise"]'),
('Wheat Allergy', 'moderate', 'Allergy to wheat', '["wheat", "flour", "bread", "pasta"]'),
('Soy Allergy', 'moderate', 'Allergy to soy products', '["soy", "tofu", "soy sauce", "edamame"]'),
('Fish Allergy', 'severe', 'Allergy to fish', '["fish", "salmon", "tuna", "cod", "halibut"]'),
('Shellfish Allergy', 'severe', 'Allergy to shellfish', '["shrimp", "crab", "lobster", "oyster", "clam", "mussel"]'),
('Sesame Allergy', 'moderate', 'Allergy to sesame', '["sesame", "tahini", "sesame oil"]')
ON CONFLICT (name) DO NOTHING;

-- Insert common ingredients
INSERT INTO ingredients (id, name, category, is_common) VALUES
('chicken_breast', 'Chicken Breast', 'meat', true),
('rice', 'Rice', 'grains', true),
('broccoli', 'Broccoli', 'vegetables', true),
('tomato', 'Tomato', 'vegetables', true),
('onion', 'Onion', 'vegetables', true),
('garlic', 'Garlic', 'vegetables', true),
('olive_oil', 'Olive Oil', 'oils', true),
('salt', 'Salt', 'seasonings', true),
('black_pepper', 'Black Pepper', 'seasonings', true),
('pasta', 'Pasta', 'grains', true),
('eggs', 'Eggs', 'dairy', true),
('milk', 'Milk', 'dairy', true),
('cheese', 'Cheese', 'dairy', true),
('butter', 'Butter', 'dairy', true),
('bread', 'Bread', 'grains', true)
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Show table creation summary
SELECT 'Database setup complete!' as status;
SELECT schemaname, tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;