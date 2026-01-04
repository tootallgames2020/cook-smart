-- ============================================================================
-- ADD MISSING TABLES FOR COOK SMART
-- ============================================================================

BEGIN;

-- ============================================================================
-- RECIPE RATINGS AND REVIEWS
-- ============================================================================

-- Recipe ratings table
CREATE TABLE IF NOT EXISTS recipe_ratings (
    id SERIAL PRIMARY KEY,
    recipe_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(recipe_id, user_id)
);

-- Recipe rating aggregates for performance
CREATE TABLE IF NOT EXISTS recipe_rating_aggregates (
    recipe_id VARCHAR(255) PRIMARY KEY,
    average_rating DECIMAL(3,2) DEFAULT 0,
    total_ratings INTEGER DEFAULT 0,
    rating_distribution JSONB DEFAULT '{"1":0,"2":0,"3":0,"4":0,"5":0}',
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- CACHED RECIPES FOR PERFORMANCE
-- ============================================================================

-- Cached recipes table (different from recipe_cache)
CREATE TABLE IF NOT EXISTS cached_recipes (
    id SERIAL PRIMARY KEY,
    recipe_id VARCHAR(255) NOT NULL UNIQUE,
    recipe_data JSONB NOT NULL,
    source VARCHAR(100) DEFAULT 'fatsecret',
    ingredients_parsed JSONB DEFAULT '[]',
    directions_parsed JSONB DEFAULT '[]',
    nutrition_info JSONB DEFAULT '{}',
    cache_version INTEGER DEFAULT 1,
    hit_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
);

-- ============================================================================
-- API USAGE TRACKING
-- ============================================================================

-- API usage logs for monitoring
CREATE TABLE IF NOT EXISTS api_usage_logs (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER,
    response_time_ms INTEGER,
    request_size INTEGER,
    response_size INTEGER,
    user_agent TEXT,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- WELCOME CONTENT SYSTEM
-- ============================================================================

-- Welcome content table
CREATE TABLE IF NOT EXISTS welcome_content (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    welcome_message TEXT,
    welcome_video_url TEXT,
    welcome_music_file TEXT,
    personalization_data JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- ============================================================================
-- MEAL PLANNING SYSTEM
-- ============================================================================

-- Meal plans
CREATE TABLE IF NOT EXISTS meal_plans (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    meals JSONB DEFAULT '{}',
    shopping_list JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Meal plan recipes (many-to-many)
CREATE TABLE IF NOT EXISTS meal_plan_recipes (
    id SERIAL PRIMARY KEY,
    meal_plan_id INTEGER NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
    recipe_id VARCHAR(255) NOT NULL,
    meal_type VARCHAR(50) NOT NULL, -- breakfast, lunch, dinner, snack
    planned_date DATE NOT NULL,
    servings INTEGER DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- ACHIEVEMENTS SYSTEM
-- ============================================================================

-- Achievements master list
CREATE TABLE IF NOT EXISTS achievements (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    icon VARCHAR(255),
    category VARCHAR(100) DEFAULT 'general',
    points_reward INTEGER DEFAULT 0,
    requirements JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User achievements
CREATE TABLE IF NOT EXISTS user_achievements (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id INTEGER NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    progress JSONB DEFAULT '{}',
    UNIQUE(user_id, achievement_id)
);

-- ============================================================================
-- TRENDING AND SEASONAL RECIPES
-- ============================================================================

-- Trending recipes tracking
CREATE TABLE IF NOT EXISTS trending_recipes (
    id SERIAL PRIMARY KEY,
    recipe_id VARCHAR(255) NOT NULL UNIQUE,
    recipe_data JSONB NOT NULL,
    trend_score DECIMAL(10,2) DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    save_count INTEGER DEFAULT 0,
    search_count INTEGER DEFAULT 0,
    last_trending_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seasonal recipes
CREATE TABLE IF NOT EXISTS seasonal_recipes (
    id SERIAL PRIMARY KEY,
    recipe_id VARCHAR(255) NOT NULL,
    recipe_data JSONB NOT NULL,
    season VARCHAR(20) NOT NULL, -- spring, summer, fall, winter
    month_start INTEGER, -- 1-12
    month_end INTEGER, -- 1-12
    popularity_score DECIMAL(10,2) DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- NOTIFICATIONS SYSTEM
-- ============================================================================

-- User notifications
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info', -- info, success, warning, error
    category VARCHAR(100) DEFAULT 'general',
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    is_sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    marketing_emails BOOLEAN DEFAULT FALSE,
    recipe_recommendations BOOLEAN DEFAULT TRUE,
    meal_plan_reminders BOOLEAN DEFAULT TRUE,
    achievement_alerts BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- ============================================================================
-- INDEXES FOR NEW TABLES
-- ============================================================================

-- Recipe ratings indexes
CREATE INDEX IF NOT EXISTS idx_recipe_ratings_recipe_id ON recipe_ratings(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ratings_user_id ON recipe_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ratings_rating ON recipe_ratings(rating);

-- Cached recipes indexes
CREATE INDEX IF NOT EXISTS idx_cached_recipes_recipe_id ON cached_recipes(recipe_id);
CREATE INDEX IF NOT EXISTS idx_cached_recipes_source ON cached_recipes(source);
CREATE INDEX IF NOT EXISTS idx_cached_recipes_expires_at ON cached_recipes(expires_at);

-- API usage indexes
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_user_id ON api_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_endpoint ON api_usage_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_created_at ON api_usage_logs(created_at);

-- Welcome content indexes
CREATE INDEX IF NOT EXISTS idx_welcome_content_user_id ON welcome_content(user_id);

-- Meal planning indexes
CREATE INDEX IF NOT EXISTS idx_meal_plans_user_id ON meal_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_plan_recipes_meal_plan_id ON meal_plan_recipes(meal_plan_id);
CREATE INDEX IF NOT EXISTS idx_meal_plan_recipes_planned_date ON meal_plan_recipes(planned_date);

-- Achievements indexes
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON user_achievements(achievement_id);

-- Trending recipes indexes
CREATE INDEX IF NOT EXISTS idx_trending_recipes_trend_score ON trending_recipes(trend_score DESC);
CREATE INDEX IF NOT EXISTS idx_seasonal_recipes_season ON seasonal_recipes(season);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================================================
-- DEFAULT ACHIEVEMENTS DATA
-- ============================================================================

-- Insert default achievements
INSERT INTO achievements (name, description, icon, category, points_reward, requirements) VALUES
('First Recipe', 'Save your first recipe', 'recipe', 'recipes', 10, '{"recipes_saved": 1}'),
('Recipe Explorer', 'Save 10 recipes', 'collection', 'recipes', 50, '{"recipes_saved": 10}'),
('Recipe Master', 'Save 50 recipes', 'crown', 'recipes', 200, '{"recipes_saved": 50}'),
('Ingredient Hunter', 'Add 20 ingredients to pantry', 'pantry', 'ingredients', 30, '{"ingredients_added": 20}'),
('Meal Planner', 'Create your first meal plan', 'calendar', 'meal_planning', 25, '{"meal_plans_created": 1}'),
('Shopping Pro', 'Complete 5 shopping lists', 'cart', 'shopping', 40, '{"shopping_lists_completed": 5}'),
('Early Adopter', 'Join during beta period', 'star', 'special', 100, '{"joined_during_beta": true}'),
('Social Butterfly', 'Share 3 recipes', 'share', 'social', 20, '{"recipes_shared": 3}'),
('Nutrition Conscious', 'View nutrition info 25 times', 'health', 'nutrition', 15, '{"nutrition_views": 25}'),
('Consistent User', 'Use app for 7 consecutive days', 'streak', 'engagement', 75, '{"consecutive_days": 7}')
ON CONFLICT (name) DO NOTHING;

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 'Missing tables added successfully!' as status;
SELECT COUNT(*) as total_tables FROM information_schema.tables WHERE table_schema = 'public';
