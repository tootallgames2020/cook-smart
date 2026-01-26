-- ============================================================================
-- MIGRATION 024: Add Unit Conversion Support to Ingredient Usage Log
-- ============================================================================
-- Purpose: Support cross-unit inventory management (5 lbs flour - 2 cups = remaining)
-- Date: January 26, 2026

-- Add unit tracking and conversion details to ingredient usage log
ALTER TABLE ingredient_usage_log 
ADD COLUMN IF NOT EXISTS unit_used VARCHAR(50),
ADD COLUMN IF NOT EXISTS conversion_details JSONB;

-- Add index for unit-based queries
CREATE INDEX IF NOT EXISTS idx_ingredient_usage_log_unit_used ON ingredient_usage_log(unit_used);

-- Add comments for documentation
COMMENT ON COLUMN ingredient_usage_log.unit_used IS 'Unit of measurement used when consuming ingredient (e.g., cups, tbsp, oz)';
COMMENT ON COLUMN ingredient_usage_log.conversion_details IS 'JSON details of unit conversion: original inventory, used amount, conversion factor, remaining amount';

-- Example conversion_details structure:
-- {
--   "originalInventory": "5 lb",
--   "usedAmount": "2 cups", 
--   "conversionUsed": "2 cups = 0.56 lb",
--   "remainingAmount": "4.44 lb"
-- }
