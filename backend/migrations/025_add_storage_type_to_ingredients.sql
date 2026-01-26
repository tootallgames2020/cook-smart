-- ============================================================================
-- MIGRATION 025: Add Storage Type Support for Preservation Tracking
-- ============================================================================
-- Purpose: Track ingredient storage methods (fresh, frozen, canned, dried, refrigerated)
-- Date: January 26, 2026

-- Add storage_type column to user_ingredients table
ALTER TABLE user_ingredients 
ADD COLUMN IF NOT EXISTS storage_type VARCHAR(20) DEFAULT 'fresh';

-- Add check constraint to ensure valid storage types
ALTER TABLE user_ingredients 
ADD CONSTRAINT IF NOT EXISTS check_storage_type 
CHECK (storage_type IN ('fresh', 'frozen', 'canned', 'dried', 'refrigerated'));

-- Add index for storage type queries
CREATE INDEX IF NOT EXISTS idx_user_ingredients_storage_type ON user_ingredients(storage_type);

-- Add comments for documentation
COMMENT ON COLUMN user_ingredients.storage_type IS 'Storage method: fresh (1x), refrigerated (1.5x), frozen (30x), canned (365x), dried (180x) - affects expiration calculation';

-- Update existing ingredients to have 'fresh' storage type if NULL
UPDATE user_ingredients 
SET storage_type = 'fresh' 
WHERE storage_type IS NULL;

-- Example storage type effects:
-- fresh: Base expiration (milk = 7 days)
-- refrigerated: 1.5x longer (milk = 10 days) 
-- frozen: 30x longer (milk = 210 days / 7 months)
-- canned: 365x longer (milk = 7 years - theoretical)
-- dried: 180x longer (herbs = 3+ years)