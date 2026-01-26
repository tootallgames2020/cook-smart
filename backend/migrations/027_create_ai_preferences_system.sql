-- ============================================================================
-- MIGRATION 027: Create AI Preferences System
-- ============================================================================
-- Purpose: User-controlled AI features with granular privacy controls
-- Date: January 26, 2026
-- Impact: ZERO pricing changes - all AI features included free

-- Create AI preferences table
CREATE TABLE IF NOT EXISTS user_ai_preferences (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Core AI Features (default enabled for good UX)
  smart_recipe_suggestions BOOLEAN DEFAULT true,
  expiration_intelligence BOOLEAN DEFAULT true,
  family_coordination BOOLEAN DEFAULT true,
  shopping_predictions BOOLEAN DEFAULT true,
  
  -- Advanced AI Features (default disabled for privacy)
  auto_meal_planning BOOLEAN DEFAULT false,
  voice_commands BOOLEAN DEFAULT false,
  photo_analysis BOOLEAN DEFAULT false,
  predictive_analytics BOOLEAN DEFAULT false,
  
  -- AI Assistance Level
  ai_assistance_level VARCHAR(20) DEFAULT 'helpful' CHECK (ai_assistance_level IN ('minimal', 'helpful', 'genius')),
  
  -- Privacy Controls
  location_sharing VARCHAR(20) DEFAULT 'family_only' CHECK (location_sharing IN ('off', 'family_only', 'full')),
  voice_processing VARCHAR(20) DEFAULT 'local_only' CHECK (voice_processing IN ('off', 'local_only', 'cloud_enhanced')),
  photo_processing VARCHAR(20) DEFAULT 'manual' CHECK (photo_processing IN ('off', 'manual', 'automatic')),
  
  -- Notification Preferences
  smart_notifications BOOLEAN DEFAULT true,
  notification_timing VARCHAR(20) DEFAULT 'smart' CHECK (notification_timing IN ('immediate', 'smart', 'scheduled', 'minimal')),
  suggestion_frequency VARCHAR(20) DEFAULT 'moderate' CHECK (suggestion_frequency IN ('minimal', 'moderate', 'frequent')),
  
  -- Learning & Analytics
  usage_analytics BOOLEAN DEFAULT true,
  pattern_learning BOOLEAN DEFAULT true,
  community_insights BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Create AI feature usage tracking (for optimization)
CREATE TABLE IF NOT EXISTS ai_feature_usage (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature_name VARCHAR(100) NOT NULL,
  usage_count INTEGER DEFAULT 1,
  last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  feedback TEXT,
  
  UNIQUE(user_id, feature_name)
);

-- Create AI suggestions log (for learning and improvement)
CREATE TABLE IF NOT EXISTS ai_suggestions_log (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  suggestion_type VARCHAR(50) NOT NULL, -- recipe, shopping, expiration, meal_plan
  suggestion_content JSONB NOT NULL,
  suggested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_action VARCHAR(20), -- accepted, rejected, ignored, modified
  action_at TIMESTAMP WITH TIME ZONE,
  confidence_score DECIMAL(3,2) DEFAULT 0.0,
  
  -- Index for analytics
  INDEX(user_id, suggestion_type, suggested_at)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_ai_preferences_user_id ON user_ai_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_feature_usage_user_id ON ai_feature_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_feature_usage_feature ON ai_feature_usage(feature_name);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_log_user_id ON ai_suggestions_log(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_log_type ON ai_suggestions_log(suggestion_type);

-- Add comments for documentation
COMMENT ON TABLE user_ai_preferences IS 'User-controlled AI feature preferences - all features included free in existing plans';
COMMENT ON TABLE ai_feature_usage IS 'Track AI feature usage for optimization and user experience improvement';
COMMENT ON TABLE ai_suggestions_log IS 'Log AI suggestions and user responses for machine learning improvement';

COMMENT ON COLUMN user_ai_preferences.ai_assistance_level IS 'minimal: basic features, helpful: smart suggestions, genius: full AI power';
COMMENT ON COLUMN user_ai_preferences.location_sharing IS 'Controls how location data is used for family coordination';
COMMENT ON COLUMN user_ai_preferences.voice_processing IS 'Controls where voice commands are processed (privacy vs features)';

-- Function to create default AI preferences for new users
CREATE OR REPLACE FUNCTION create_default_ai_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_ai_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create AI preferences for new users
CREATE TRIGGER trigger_create_default_ai_preferences
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_ai_preferences();

-- Create AI preferences for existing users (safe migration)
INSERT INTO user_ai_preferences (user_id)
SELECT id FROM users
ON CONFLICT (user_id) DO NOTHING;

-- AI Preferences System Ready!
-- ✅ All AI features included free in existing pricing
-- ✅ Granular user control over privacy and features  
-- ✅ Safe defaults that respect user privacy
-- ✅ Analytics to improve AI over time
-- ✅ Backward compatible - no breaking changes