-- Create subscription plans table for Stripe integration
-- Migration: 020_create_subscription_plans_table.sql

-- Create subscription_plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
    id SERIAL PRIMARY KEY,
    plan_name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    billing_interval VARCHAR(20) NOT NULL, -- 'month', 'year', 'week'
    stripe_product_id VARCHAR(100) NOT NULL,
    standard_price_id VARCHAR(100) NOT NULL,
    promotional_price_id VARCHAR(100),
    trial_days INTEGER DEFAULT 0,
    available_in_beta BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default subscription plans for Cook Smart
INSERT INTO subscription_plans (
    plan_name, 
    display_name, 
    description, 
    billing_interval, 
    stripe_product_id, 
    standard_price_id, 
    promotional_price_id, 
    trial_days, 
    available_in_beta
) VALUES 
-- Yearly Plan (Beta Special)
(
    'yearly', 
    'Yearly Premium', 
    'Full access to Cook Smart with yearly billing - Best Value!', 
    'year', 
    'prod_temp_yearly', 
    'price_temp_yearly_standard', 
    'price_temp_yearly_beta', 
    0, 
    true
),
-- Monthly Plan
(
    'monthly', 
    'Monthly Premium', 
    'Full access to Cook Smart with monthly billing', 
    'month', 
    'prod_temp_monthly', 
    'price_temp_monthly_standard', 
    NULL, 
    7, 
    true
),
-- Weekly Plan (for testing)
(
    'weekly', 
    'Weekly Premium', 
    'Full access to Cook Smart with weekly billing - Perfect for trying out!', 
    'week', 
    'prod_temp_weekly', 
    'price_temp_weekly_standard', 
    NULL, 
    3, 
    true
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_subscription_plans_name ON subscription_plans(plan_name);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_beta ON subscription_plans(available_in_beta);