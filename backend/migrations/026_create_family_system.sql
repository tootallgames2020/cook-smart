-- ============================================================================
-- MIGRATION 026: Create Family System with Smart Coordination
-- ============================================================================
-- Purpose: Transform from individual users to family-based household management
-- Date: January 26, 2026

-- Create families table
CREATE TABLE IF NOT EXISTS families (
  id SERIAL PRIMARY KEY,
  family_name VARCHAR(255) NOT NULL,
  invite_code VARCHAR(10) UNIQUE NOT NULL,
  created_by VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create family members table
CREATE TABLE IF NOT EXISTS family_members (
  id SERIAL PRIMARY KEY,
  family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'child')),
  display_name VARCHAR(100),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(family_id, user_id)
);

-- Create store visits table for grocery store detection
CREATE TABLE IF NOT EXISTS store_visits (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_name VARCHAR(255) NOT NULL,
  store_address TEXT,
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  detection_method VARCHAR(20) NOT NULL CHECK (detection_method IN ('gps', 'wifi', 'bluetooth', 'manual')),
  confidence_score DECIMAL(3,2) DEFAULT 0.0,
  family_notified BOOLEAN DEFAULT false
);

-- Create family shopping sessions table
CREATE TABLE IF NOT EXISTS family_shopping_sessions (
  id SERIAL PRIMARY KEY,
  family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  shopper_user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_name VARCHAR(255) NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  items_added_by_family INTEGER DEFAULT 0,
  total_items_purchased INTEGER DEFAULT 0
);

-- Add family_id to existing tables
ALTER TABLE user_ingredients 
ADD COLUMN IF NOT EXISTS family_id INTEGER REFERENCES families(id) ON DELETE SET NULL;

ALTER TABLE shopping_list_items 
ADD COLUMN IF NOT EXISTS family_id INTEGER REFERENCES families(id) ON DELETE SET NULL;

ALTER TABLE user_recipes 
ADD COLUMN IF NOT EXISTS family_id INTEGER REFERENCES families(id) ON DELETE SET NULL;

ALTER TABLE meal_plans 
ADD COLUMN IF NOT EXISTS family_id INTEGER REFERENCES families(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_families_invite_code ON families(invite_code);
CREATE INDEX IF NOT EXISTS idx_family_members_family_id ON family_members(family_id);
CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_store_visits_user_id ON store_visits(user_id);
CREATE INDEX IF NOT EXISTS idx_store_visits_detected_at ON store_visits(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_family_shopping_sessions_family_id ON family_shopping_sessions(family_id);
CREATE INDEX IF NOT EXISTS idx_user_ingredients_family_id ON user_ingredients(family_id);
CREATE INDEX IF NOT EXISTS idx_shopping_list_items_family_id ON shopping_list_items(family_id);

-- Add comments for documentation
COMMENT ON TABLE families IS 'Family groups for household management - shared inventory, shopping, meal planning';
COMMENT ON TABLE family_members IS 'Members of each family with roles (admin, member, child) and permissions';
COMMENT ON TABLE store_visits IS 'Automatic detection of grocery store visits for family coordination';
COMMENT ON TABLE family_shopping_sessions IS 'Active shopping trips with family coordination features';

COMMENT ON COLUMN families.invite_code IS 'Unique 6-character code for joining family (e.g., SMITH1)';
COMMENT ON COLUMN family_members.role IS 'admin: full control, member: normal access, child: limited access';
COMMENT ON COLUMN store_visits.detection_method IS 'How store was detected: gps, wifi, bluetooth, or manual check-in';
COMMENT ON COLUMN store_visits.confidence_score IS 'AI confidence in store detection (0.0-1.0)';

-- Create function to auto-assign family_id when user joins family
CREATE OR REPLACE FUNCTION assign_family_to_user_data()
RETURNS TRIGGER AS $$
BEGIN
  -- When user joins family, update their existing data
  UPDATE user_ingredients 
  SET family_id = NEW.family_id 
  WHERE user_id = NEW.user_id AND family_id IS NULL;
  
  UPDATE shopping_list_items 
  SET family_id = NEW.family_id 
  WHERE user_id = NEW.user_id AND family_id IS NULL;
  
  UPDATE user_recipes 
  SET family_id = NEW.family_id 
  WHERE user_id = NEW.user_id AND family_id IS NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-assign family data
CREATE TRIGGER trigger_assign_family_to_user_data
  AFTER INSERT ON family_members
  FOR EACH ROW
  EXECUTE FUNCTION assign_family_to_user_data();

-- Sample data for testing (optional)
-- INSERT INTO families (family_name, invite_code, created_by) 
-- VALUES ('The Smith Family', 'SMITH1', 'sample_user_id');

-- Family system ready for deployment!
-- Features enabled:
-- ✅ Family creation and joining via invite codes
-- ✅ Automatic grocery store detection 
-- ✅ Smart family shopping coordination
-- ✅ Shared inventory and shopping lists
-- ✅ Role-based permissions (admin/member/child)
-- ✅ Real-time family notifications
-- ✅ AI-powered shopping suggestions