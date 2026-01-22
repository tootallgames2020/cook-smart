-- Fix referrals table - add missing columns expected by backend code
-- Migration: 019_fix_referrals_table.sql

-- Add missing columns to referrals table
ALTER TABLE referrals 
ADD COLUMN IF NOT EXISTS referred_user_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS subscription_purchased BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reward_granted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reward_months INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 year');

-- Add foreign key constraint for referred_user_id (PostgreSQL doesn't support IF NOT EXISTS for constraints)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'referrals_referred_user_id_fkey' 
        AND table_name = 'referrals'
    ) THEN
        ALTER TABLE referrals 
        ADD CONSTRAINT referrals_referred_user_id_fkey 
        FOREIGN KEY (referred_user_id) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create referral_rewards table if it doesn't exist (referenced in backend code)
CREATE TABLE IF NOT EXISTS referral_rewards (
    id SERIAL PRIMARY KEY,
    referrer_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referral_id INTEGER NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
    reward_type VARCHAR(50) NOT NULL,
    reward_value INTEGER NOT NULL,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_referrals_referred_user_id ON referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer_id ON referral_rewards(referrer_id);

-- Update existing referrals to have proper status
UPDATE referrals SET status = 'active' WHERE status = 'pending' AND referred_user_id IS NULL;
