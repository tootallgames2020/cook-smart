-- ============================================================================
-- COOK SMART CUSTOM RECIPES AND ENHANCED PAYMENTS MIGRATION
-- ============================================================================
-- This migration adds custom recipes system and enhances payment/subscription tables
-- ============================================================================

BEGIN;

-- ============================================================================
-- CUSTOM RECIPES SYSTEM
-- ============================================================================

-- Custom recipes table
CREATE TABLE IF NOT EXISTS custom_recipes (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    ingredients JSONB NOT NULL,
    instructions JSONB NOT NULL,
    prep_time INTEGER, -- in minutes
    cook_time INTEGER, -- in minutes
    servings INTEGER DEFAULT 4,
    difficulty VARCHAR(20) DEFAULT 'medium', -- easy, medium, hard
    cuisine VARCHAR(100) DEFAULT 'other',
    dietary_tags JSONB DEFAULT '[]'::jsonb,
    image_url TEXT,
    visibility VARCHAR(20) DEFAULT 'private', -- private, public
    rating_average DECIMAL(3,2) DEFAULT 0.00,
    rating_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_visibility CHECK (visibility IN ('private', 'public')),
    CONSTRAINT valid_difficulty CHECK (difficulty IN ('easy', 'medium', 'hard')),
    CONSTRAINT valid_rating CHECK (rating_average >= 0 AND rating_average <= 5),
    CONSTRAINT valid_servings CHECK (servings > 0 AND servings <= 50)
);

-- User saved custom recipes (for community recipes)
CREATE TABLE IF NOT EXISTS user_custom_recipes (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipe_id INTEGER NOT NULL REFERENCES custom_recipes(id) ON DELETE CASCADE,
    saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, recipe_id)
);

-- Custom recipe ratings
CREATE TABLE IF NOT EXISTS custom_recipe_ratings (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipe_id INTEGER NOT NULL REFERENCES custom_recipes(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, recipe_id)
);

-- ============================================================================
-- ENHANCED SUBSCRIPTION AND PAYMENT SYSTEM
-- ============================================================================

-- Subscription plans table (enhanced)
CREATE TABLE IF NOT EXISTS subscription_plans (
    id SERIAL PRIMARY KEY,
    plan_name VARCHAR(100) NOT NULL UNIQUE,
    stripe_product_id VARCHAR(255) NOT NULL,
    promotional_price_id VARCHAR(255),
    standard_price_id VARCHAR(255) NOT NULL,
    billing_interval VARCHAR(20) NOT NULL, -- year, month, week
    available_in_beta BOOLEAN DEFAULT true,
    trial_days INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_billing_interval CHECK (billing_interval IN ('year', 'month', 'week'))
);

-- Enhanced subscriptions table
DROP TABLE IF EXISTS subscriptions CASCADE;
CREATE TABLE subscriptions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_subscription_id VARCHAR(255) UNIQUE,
    stripe_customer_id VARCHAR(255),
    plan_id INTEGER REFERENCES subscription_plans(id),
    status VARCHAR(50) DEFAULT 'active',
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    billing_cycle VARCHAR(20) DEFAULT 'monthly',
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    trial_start TIMESTAMP WITH TIME ZONE,
    trial_end TIMESTAMP WITH TIME ZONE,
    canceled_at TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_status CHECK (status IN ('active', 'canceled', 'past_due', 'incomplete', 'trialing', 'unpaid'))
);

-- Payment methods table
CREATE TABLE IF NOT EXISTS payment_methods (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_payment_method_id VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(20) DEFAULT 'card',
    last4 VARCHAR(4),
    brand VARCHAR(20),
    exp_month INTEGER,
    exp_year INTEGER,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment history table
CREATE TABLE IF NOT EXISTS payment_history (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_payment_intent_id VARCHAR(255),
    stripe_invoice_id VARCHAR(255),
    subscription_id INTEGER REFERENCES subscriptions(id),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) NOT NULL,
    description TEXT,
    receipt_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_payment_status CHECK (status IN ('succeeded', 'failed', 'pending', 'canceled', 'refunded'))
);

-- Stripe webhook events log
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
    id SERIAL PRIMARY KEY,
    stripe_event_id VARCHAR(255) NOT NULL UNIQUE,
    event_type VARCHAR(100) NOT NULL,
    processed BOOLEAN DEFAULT false,
    processing_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- SHOPPING LIST ENHANCEMENTS
-- ============================================================================

-- Enhanced shopping list items (update existing table)
ALTER TABLE shopping_list_items 
ADD COLUMN IF NOT EXISTS item_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS needed_for_recipe BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS recipe_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Update existing columns if they exist with different names
UPDATE shopping_list_items SET item_name = ingredient WHERE item_name IS NULL AND ingredient IS NOT NULL;
UPDATE shopping_list_items SET completed = is_completed WHERE completed IS NULL AND is_completed IS NOT NULL;

-- ============================================================================
-- INGREDIENT USAGE TRACKING
-- ============================================================================

-- Ingredient usage log for cooking tracking
CREATE TABLE IF NOT EXISTS ingredient_usage_log (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ingredient_id VARCHAR(255),
    ingredient_name VARCHAR(255) NOT NULL,
    quantity_used DECIMAL(10,2) NOT NULL,
    recipe_id VARCHAR(255), -- Can be FatSecret ID or custom recipe ID
    recipe_type VARCHAR(20) DEFAULT 'fatsecret', -- fatsecret, custom
    used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- MEAL PLANNING ENHANCEMENTS
-- ============================================================================

-- Meal plans table (enhanced)
CREATE TABLE IF NOT EXISTS meal_plans (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    meal_type VARCHAR(20) NOT NULL, -- breakfast, lunch, dinner, snack
    recipe_id VARCHAR(255),
    recipe_type VARCHAR(20) DEFAULT 'fatsecret', -- fatsecret, custom
    recipe_title VARCHAR(500),
    servings INTEGER DEFAULT 1,
    notes TEXT,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_meal_type CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
    CONSTRAINT valid_recipe_type CHECK (recipe_type IN ('fatsecret', 'custom')),
    UNIQUE(user_id, date, meal_type)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Custom recipes indexes
CREATE INDEX IF NOT EXISTS idx_custom_recipes_user_id ON custom_recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_recipes_visibility ON custom_recipes(visibility);
CREATE INDEX IF NOT EXISTS idx_custom_recipes_cuisine ON custom_recipes(cuisine);
CREATE INDEX IF NOT EXISTS idx_custom_recipes_rating ON custom_recipes(rating_average DESC, rating_count DESC);
CREATE INDEX IF NOT EXISTS idx_custom_recipes_created_at ON custom_recipes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_custom_recipes_view_count ON custom_recipes(view_count DESC);

-- User custom recipes indexes
CREATE INDEX IF NOT EXISTS idx_user_custom_recipes_user_id ON user_custom_recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_custom_recipes_recipe_id ON user_custom_recipes(recipe_id);

-- Custom recipe ratings indexes
CREATE INDEX IF NOT EXISTS idx_custom_recipe_ratings_recipe_id ON custom_recipe_ratings(recipe_id);
CREATE INDEX IF NOT EXISTS idx_custom_recipe_ratings_user_id ON custom_recipe_ratings(user_id);

-- Subscription indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Payment indexes
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_default ON payment_methods(user_id, is_default);
CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_status ON payment_history(status);

-- Shopping list indexes
CREATE INDEX IF NOT EXISTS idx_shopping_list_items_user_id_completed ON shopping_list_items(user_id, completed);
CREATE INDEX IF NOT EXISTS idx_shopping_list_items_recipe_id ON shopping_list_items(recipe_id);

-- Ingredient usage indexes
CREATE INDEX IF NOT EXISTS idx_ingredient_usage_log_user_id ON ingredient_usage_log(user_id);
CREATE INDEX IF NOT EXISTS idx_ingredient_usage_log_recipe_id ON ingredient_usage_log(recipe_id);
CREATE INDEX IF NOT EXISTS idx_ingredient_usage_log_used_at ON ingredient_usage_log(used_at DESC);

-- Meal planning indexes
CREATE INDEX IF NOT EXISTS idx_meal_plans_user_date ON meal_plans(user_id, date);
CREATE INDEX IF NOT EXISTS idx_meal_plans_recipe_id ON meal_plans(recipe_id);

-- Payment failures indexes
CREATE INDEX IF NOT EXISTS idx_payment_failures_user_id ON payment_failures(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_failures_status ON payment_failures(status);
CREATE INDEX IF NOT EXISTS idx_payment_failures_grace_period_end ON payment_failures(grace_period_end);
CREATE INDEX IF NOT EXISTS idx_payment_failures_subscription_id ON payment_failures(subscription_id);

-- User notifications indexes
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_type ON user_notifications(type);
CREATE INDEX IF NOT EXISTS idx_user_notifications_is_read ON user_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON user_notifications(created_at DESC);

-- Email notifications indexes
CREATE INDEX IF NOT EXISTS idx_email_notifications_status ON email_notifications(status);
CREATE INDEX IF NOT EXISTS idx_email_notifications_scheduled_for ON email_notifications(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_email_notifications_priority ON email_notifications(priority);

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMPS
-- ============================================================================

-- Custom recipes update trigger
CREATE TRIGGER update_custom_recipes_updated_at BEFORE UPDATE ON custom_recipes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Custom recipe ratings update trigger
CREATE TRIGGER update_custom_recipe_ratings_updated_at BEFORE UPDATE ON custom_recipe_ratings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Subscription plans update trigger
CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Subscriptions update trigger
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Payment methods update trigger
CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON payment_methods
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Meal plans update trigger
CREATE TRIGGER update_meal_plans_updated_at BEFORE UPDATE ON meal_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- DEFAULT SUBSCRIPTION PLANS DATA
-- ============================================================================

-- Insert Cook Smart subscription plans (CORRECTED PRICING STRUCTURE)
INSERT INTO subscription_plans (
    plan_name, stripe_product_id, promotional_price_id, standard_price_id, 
    billing_interval, available_in_beta, trial_days
) VALUES 
-- BETA ONLY: Yearly at $24.99 (locked in forever if subscription doesn't expire)
('yearly', 'prod_CookSmartYearly', 'price_BetaYearly2499', 'price_YearlyStandard3499', 'year', true, 0),

-- POST-BETA ONLY: All plans get 7-day free trial (except BETA pre-purchasers)
-- During 7-day trial: Yearly available at $24.99, after trial: normal pricing
-- Weekly Plan: $2.99/week after 7-day trial
('weekly', 'prod_CookSmartWeekly', null, 'price_WeeklyStandard299', 'week', false, 7),

-- Monthly Plan: $6.99/month after 7-day trial  
('monthly', 'prod_CookSmartMonthly', null, 'price_MonthlyStandard699', 'month', false, 7),

-- Yearly Plan (Post-BETA): $24.99 during trial, $34.99 after trial (price lock-in if yearly)
('yearly_postbeta', 'prod_CookSmartYearlyPostBeta', 'price_TrialYearly2499', 'price_YearlyStandard3499', 'year', false, 7)

ON CONFLICT (plan_name) DO UPDATE SET
    stripe_product_id = EXCLUDED.stripe_product_id,
    promotional_price_id = EXCLUDED.promotional_price_id,
    standard_price_id = EXCLUDED.standard_price_id,
    billing_interval = EXCLUDED.billing_interval,
    available_in_beta = EXCLUDED.available_in_beta,
    trial_days = EXCLUDED.trial_days,
    updated_at = NOW();

-- ============================================================================
-- REFERRAL SYSTEM ENHANCEMENTS
-- ============================================================================

-- Enhanced referrals table
DROP TABLE IF EXISTS referrals CASCADE;
CREATE TABLE referrals (
    id SERIAL PRIMARY KEY,
    referrer_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referral_code VARCHAR(50) UNIQUE NOT NULL,
    referred_user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
    referred_email VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending', -- pending, completed, expired
    subscription_purchased BOOLEAN DEFAULT false,
    reward_granted BOOLEAN DEFAULT false,
    reward_months INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '90 days'),
    
    CONSTRAINT valid_referral_status CHECK (status IN ('pending', 'completed', 'expired'))
);

-- Referral rewards tracking
CREATE TABLE IF NOT EXISTS referral_rewards (
    id SERIAL PRIMARY KEY,
    referrer_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referral_id INTEGER NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
    reward_type VARCHAR(50) DEFAULT 'subscription_extension', -- subscription_extension, points, etc.
    reward_value INTEGER NOT NULL, -- months added, points awarded, etc.
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(referral_id) -- One reward per referral
);

-- User subscription pricing lock-in
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS locked_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS price_locked_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_beta_purchase BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS referral_months_added INTEGER DEFAULT 0;

-- Phase management for BETA/post-BETA
CREATE TABLE IF NOT EXISTS app_phases (
    id SERIAL PRIMARY KEY,
    phase_name VARCHAR(50) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT false,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_phase_name CHECK (phase_name IN ('beta', 'post_beta', 'production'))
);

-- Insert initial phase data
INSERT INTO app_phases (phase_name, is_active, started_at) VALUES 
('beta', true, NOW()),
('post_beta', false, null),
('production', false, null)
ON CONFLICT (phase_name) DO NOTHING;

-- ============================================================================
-- PAYMENT FAILURE HANDLING AND GRACE PERIODS
-- ============================================================================

-- Payment failure tracking and grace periods
CREATE TABLE IF NOT EXISTS payment_failures (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id INTEGER REFERENCES subscriptions(id) ON DELETE CASCADE,
    stripe_invoice_id VARCHAR(255),
    failure_reason TEXT,
    attempt_count INTEGER DEFAULT 1,
    grace_period_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    grace_period_end TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    status VARCHAR(50) DEFAULT 'grace_period', -- grace_period, resolved, expired
    last_notification_sent TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT valid_failure_status CHECK (status IN ('grace_period', 'resolved', 'expired'))
);

-- User notifications for payment issues
CREATE TABLE IF NOT EXISTS user_notifications (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- payment_failed, grace_period_warning, subscription_suspended, etc.
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    action_url TEXT,
    action_text VARCHAR(100),
    is_read BOOLEAN DEFAULT false,
    is_urgent BOOLEAN DEFAULT false,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT valid_notification_type CHECK (type IN (
        'payment_failed', 'grace_period_warning', 'subscription_suspended', 
        'payment_retry', 'subscription_renewed', 'referral_reward', 'general'
    ))
);

-- Email notification queue
CREATE TABLE IF NOT EXISTS email_notifications (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    template VARCHAR(100) NOT NULL,
    template_data JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'pending', -- pending, sent, failed
    priority INTEGER DEFAULT 5, -- 1 = highest, 10 = lowest
    scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_email_status CHECK (status IN ('pending', 'sent', 'failed'))
);

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Show migration completion summary
SELECT 'Custom recipes and enhanced payments migration complete!' as status;

-- Show new tables created
SELECT schemaname, tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'custom_recipes', 
    'user_custom_recipes', 
    'custom_recipe_ratings',
    'subscription_plans',
    'payment_methods',
    'payment_history',
    'stripe_webhook_events',
    'ingredient_usage_log',
    'meal_plans'
)
ORDER BY tablename;