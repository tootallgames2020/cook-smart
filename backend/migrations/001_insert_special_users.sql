-- ============================================================================
-- INSERT SPECIAL USERS - CRITICAL FOR DEPLOYMENT
-- ============================================================================
-- This script creates the 4 special user accounts that must exist for Cook Smart
-- to function properly with all welcome screens and special features.
-- ============================================================================

BEGIN;

-- Insert Brad Turnbough (Developer)
INSERT INTO users (
    id, email, password_hash, first_name, last_name,
    is_admin, is_co_founder, is_special_user, is_creator, is_developer,
    has_lifetime_subscription, subscription_status, points,
    dietary_restrictions, allergies, show_nutrition, preferred_units, age_verified,
    created_at, updated_at
) VALUES (
    'brad-turnbough-dev-001',
    'bradturnbough80@gmail.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSn9Vu/.',  -- password: CookSmart2024!
    'Brad',
    'Turnbough',
    true,   -- is_admin
    false,  -- is_co_founder  
    false,  -- is_special_user
    false,  -- is_creator
    true,   -- is_developer
    true,   -- has_lifetime_subscription
    'lifetime',
    0,
    '[]'::jsonb,
    '[]'::jsonb,
    true,
    'metric',
    true,
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    is_admin = EXCLUDED.is_admin,
    is_developer = EXCLUDED.is_developer,
    has_lifetime_subscription = EXCLUDED.has_lifetime_subscription,
    subscription_status = EXCLUDED.subscription_status;

-- Insert Briana Olszewski (Creator & Co-Founder)
INSERT INTO users (
    id, email, password_hash, first_name, last_name,
    is_admin, is_co_founder, is_special_user, is_creator, is_developer,
    has_lifetime_subscription, subscription_status, points,
    dietary_restrictions, allergies, show_nutrition, preferred_units, age_verified,
    created_at, updated_at
) VALUES (
    'briana-olszewski-creator-001',
    'brianaolszewski1@gmail.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSn9Vu/.',  -- password: CookSmart2024!
    'Briana',
    'Olszewski',
    false,  -- is_admin
    true,   -- is_co_founder
    false,  -- is_special_user
    true,   -- is_creator
    false,  -- is_developer
    true,   -- has_lifetime_subscription
    'lifetime',
    0,
    '[]'::jsonb,
    '[]'::jsonb,
    true,
    'metric',
    true,
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    is_co_founder = EXCLUDED.is_co_founder,
    is_creator = EXCLUDED.is_creator,
    has_lifetime_subscription = EXCLUDED.has_lifetime_subscription,
    subscription_status = EXCLUDED.subscription_status;

-- Insert Donna Woods (Brad's Mom - Special User)
INSERT INTO users (
    id, email, password_hash, first_name, last_name,
    is_admin, is_co_founder, is_special_user, is_creator, is_developer,
    has_lifetime_subscription, subscription_status, points,
    dietary_restrictions, allergies, show_nutrition, preferred_units, age_verified,
    created_at, updated_at
) VALUES (
    'donna-woods-special-001',
    'dwoodswoods2@gmail.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSn9Vu/.',  -- password: CookSmart2024!
    'Donna',
    'Woods',
    false,  -- is_admin
    false,  -- is_co_founder
    true,   -- is_special_user
    false,  -- is_creator
    false,  -- is_developer
    true,   -- has_lifetime_subscription
    'lifetime',
    0,
    '[]'::jsonb,
    '[]'::jsonb,
    true,
    'metric',
    true,
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    is_special_user = EXCLUDED.is_special_user,
    has_lifetime_subscription = EXCLUDED.has_lifetime_subscription,
    subscription_status = EXCLUDED.subscription_status;

-- Insert Lori Sears (Briana's Mom - Special User)
INSERT INTO users (
    id, email, password_hash, first_name, last_name,
    is_admin, is_co_founder, is_special_user, is_creator, is_developer,
    has_lifetime_subscription, subscription_status, points,
    dietary_restrictions, allergies, show_nutrition, preferred_units, age_verified,
    created_at, updated_at
) VALUES (
    'lori-sears-special-001',
    'boldtcu@gmail.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSn9Vu/.',  -- password: CookSmart2024!
    'Lori',
    'Sears',
    false,  -- is_admin
    false,  -- is_co_founder
    true,   -- is_special_user
    false,  -- is_creator
    false,  -- is_developer
    true,   -- has_lifetime_subscription
    'lifetime',
    0,
    '[]'::jsonb,
    '[]'::jsonb,
    true,
    'metric',
    true,
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    is_special_user = EXCLUDED.is_special_user,
    has_lifetime_subscription = EXCLUDED.has_lifetime_subscription,
    subscription_status = EXCLUDED.subscription_status;

-- Initialize points for all special users
INSERT INTO user_points (user_id, total_points, level, last_updated)
VALUES 
    ('brad-turnbough-dev-001', 0, 0, NOW()),
    ('briana-olszewski-creator-001', 0, 0, NOW()),
    ('donna-woods-special-001', 0, 0, NOW()),
    ('lori-sears-special-001', 0, 0, NOW())
ON CONFLICT (user_id) DO NOTHING;

COMMIT;

-- Verification query
SELECT 
    email,
    first_name,
    last_name,
    is_admin,
    is_co_founder,
    is_special_user,
    is_creator,
    is_developer,
    has_lifetime_subscription,
    subscription_status
FROM users 
WHERE email IN (
    'bradturnbough80@gmail.com',
    'brianaolszewski1@gmail.com', 
    'dwoodswoods2@gmail.com',
    'boldtcu@gmail.com'
)
ORDER BY email;