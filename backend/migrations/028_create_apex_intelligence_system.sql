-- APEX INTELLIGENCE SYSTEM DATABASE MIGRATION
-- Adds support for the most advanced AI system ever built for consumer apps

-- Add Apex Intelligence features to AI preferences
ALTER TABLE user_ai_preferences 
ADD COLUMN IF NOT EXISTS apex_nutrition_intelligence BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS apex_photo_intelligence BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS apex_voice_intelligence BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS apex_predictive_intelligence BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS nutrition_coaching_level VARCHAR(20) DEFAULT 'advanced',
ADD COLUMN IF NOT EXISTS photo_analysis_depth VARCHAR(20) DEFAULT 'complete',
ADD COLUMN IF NOT EXISTS voice_intelligence_mode VARCHAR(20) DEFAULT 'contextual',
ADD COLUMN IF NOT EXISTS predictive_confidence_level VARCHAR(20) DEFAULT 'advanced';

-- Create Apex Nutrition Analysis Log
CREATE TABLE IF NOT EXISTS apex_nutrition_analysis_log (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    family_id VARCHAR(255),
    analysis_type VARCHAR(50) NOT NULL,
    analysis_period_days INTEGER NOT NULL,
    nutrition_score DECIMAL(3,2),
    deficiencies_detected INTEGER DEFAULT 0,
    optimization_opportunities INTEGER DEFAULT 0,
    confidence_score DECIMAL(3,2),
    processing_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create Apex Photo Analysis Log
CREATE TABLE IF NOT EXISTS apex_photo_analysis_log (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    family_id VARCHAR(255),
    analysis_type VARCHAR(50) NOT NULL,
    photo_size_kb INTEGER,
    foods_detected INTEGER DEFAULT 0,
    nutrition_calculated BOOLEAN DEFAULT FALSE,
    meal_quality_score DECIMAL(3,2),
    confidence_score DECIMAL(3,2),
    processing_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create Apex Voice Command Log
CREATE TABLE IF NOT EXISTS apex_voice_command_log (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    family_id VARCHAR(255),
    command_text TEXT,
    intent_detected VARCHAR(100),
    confidence_score DECIMAL(3,2),
    actions_executed INTEGER DEFAULT 0,
    success BOOLEAN DEFAULT FALSE,
    language_detected VARCHAR(10) DEFAULT 'en',
    processing_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create Apex Predictive Analysis Log
CREATE TABLE IF NOT EXISTS apex_predictive_analysis_log (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    family_id VARCHAR(255),
    prediction_type VARCHAR(50) NOT NULL,
    time_horizon_days INTEGER NOT NULL,
    model_accuracy DECIMAL(3,2),
    predictions_generated INTEGER DEFAULT 0,
    actionable_insights INTEGER DEFAULT 0,
    risk_assessments INTEGER DEFAULT 0,
    processing_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create Nutrition Coaching Sessions
CREATE TABLE IF NOT EXISTS nutrition_coaching_sessions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    coaching_level VARCHAR(20) NOT NULL,
    session_type VARCHAR(50) NOT NULL,
    insights_provided INTEGER DEFAULT 0,
    recommendations_given INTEGER DEFAULT 0,
    user_engagement_score DECIMAL(3,2),
    health_improvements TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create Photo Intelligence Results
CREATE TABLE IF NOT EXISTS photo_intelligence_results (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    analysis_id INTEGER NOT NULL,
    detected_foods JSONB,
    nutrition_breakdown JSONB,
    meal_insights JSONB,
    coaching_feedback JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (analysis_id) REFERENCES apex_photo_analysis_log(id) ON DELETE CASCADE
);

-- Create Voice Intelligence Context
CREATE TABLE IF NOT EXISTS voice_intelligence_context (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    session_id VARCHAR(255) NOT NULL,
    cooking_mode VARCHAR(50),
    current_recipe_id VARCHAR(255),
    current_step INTEGER,
    context_data JSONB,
    active_timers JSONB,
    family_coordination JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create Predictive Intelligence Models
CREATE TABLE IF NOT EXISTS predictive_intelligence_models (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    model_type VARCHAR(50) NOT NULL,
    model_version VARCHAR(20) DEFAULT '1.0',
    training_data_points INTEGER DEFAULT 0,
    accuracy_score DECIMAL(3,2),
    last_trained TIMESTAMP DEFAULT NOW(),
    model_parameters JSONB,
    performance_metrics JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create Apex Intelligence Feedback
CREATE TABLE IF NOT EXISTS apex_intelligence_feedback (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    feature_type VARCHAR(50) NOT NULL,
    feedback_type VARCHAR(50) NOT NULL,
    accuracy_rating INTEGER CHECK (accuracy_rating >= 1 AND accuracy_rating <= 5),
    usefulness_rating INTEGER CHECK (usefulness_rating >= 1 AND usefulness_rating <= 5),
    feedback_text TEXT,
    improvement_suggestions TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_apex_nutrition_analysis_user_date ON apex_nutrition_analysis_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_apex_photo_analysis_user_date ON apex_photo_analysis_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_apex_voice_command_user_date ON apex_voice_command_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_apex_predictive_analysis_user_date ON apex_predictive_analysis_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nutrition_coaching_user_date ON nutrition_coaching_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_context_user_session ON voice_intelligence_context(user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_predictive_models_user_type ON predictive_intelligence_models(user_id, model_type);
CREATE INDEX IF NOT EXISTS idx_apex_feedback_user_feature ON apex_intelligence_feedback(user_id, feature_type);

-- Add constraints for data integrity
ALTER TABLE apex_nutrition_analysis_log 
ADD CONSTRAINT chk_nutrition_score CHECK (nutrition_score >= 0 AND nutrition_score <= 1),
ADD CONSTRAINT chk_nutrition_confidence CHECK (confidence_score >= 0 AND confidence_score <= 1);

ALTER TABLE apex_photo_analysis_log 
ADD CONSTRAINT chk_photo_meal_score CHECK (meal_quality_score >= 0 AND meal_quality_score <= 1),
ADD CONSTRAINT chk_photo_confidence CHECK (confidence_score >= 0 AND confidence_score <= 1);

ALTER TABLE apex_voice_command_log 
ADD CONSTRAINT chk_voice_confidence CHECK (confidence_score >= 0 AND confidence_score <= 1);

ALTER TABLE apex_predictive_analysis_log 
ADD CONSTRAINT chk_predictive_accuracy CHECK (model_accuracy >= 0 AND model_accuracy <= 1);

-- Create views for analytics and reporting
CREATE OR REPLACE VIEW apex_intelligence_usage_summary AS
SELECT 
    u.id as user_id,
    u.name as user_name,
    COUNT(DISTINCT nan.id) as nutrition_analyses,
    COUNT(DISTINCT pal.id) as photo_analyses,
    COUNT(DISTINCT vcl.id) as voice_commands,
    COUNT(DISTINCT pal2.id) as predictive_analyses,
    AVG(nan.nutrition_score) as avg_nutrition_score,
    AVG(pal.meal_quality_score) as avg_meal_quality,
    AVG(vcl.confidence_score) as avg_voice_confidence,
    AVG(pal2.model_accuracy) as avg_predictive_accuracy,
    MAX(GREATEST(
        COALESCE(nan.created_at, '1970-01-01'::timestamp),
        COALESCE(pal.created_at, '1970-01-01'::timestamp),
        COALESCE(vcl.created_at, '1970-01-01'::timestamp),
        COALESCE(pal2.created_at, '1970-01-01'::timestamp)
    )) as last_activity
FROM users u
LEFT JOIN apex_nutrition_analysis_log nan ON u.id = nan.user_id
LEFT JOIN apex_photo_analysis_log pal ON u.id = pal.user_id
LEFT JOIN apex_voice_command_log vcl ON u.id = vcl.user_id
LEFT JOIN apex_predictive_analysis_log pal2 ON u.id = pal2.user_id
GROUP BY u.id, u.name;

-- Create view for feature adoption rates
CREATE OR REPLACE VIEW apex_feature_adoption AS
SELECT 
    'apex_nutrition_intelligence' as feature_name,
    COUNT(*) FILTER (WHERE apex_nutrition_intelligence = true) as enabled_users,
    COUNT(*) as total_users,
    ROUND(
        COUNT(*) FILTER (WHERE apex_nutrition_intelligence = true) * 100.0 / COUNT(*), 
        2
    ) as adoption_rate_percent
FROM user_ai_preferences
UNION ALL
SELECT 
    'apex_photo_intelligence' as feature_name,
    COUNT(*) FILTER (WHERE apex_photo_intelligence = true) as enabled_users,
    COUNT(*) as total_users,
    ROUND(
        COUNT(*) FILTER (WHERE apex_photo_intelligence = true) * 100.0 / COUNT(*), 
        2
    ) as adoption_rate_percent
FROM user_ai_preferences
UNION ALL
SELECT 
    'apex_voice_intelligence' as feature_name,
    COUNT(*) FILTER (WHERE apex_voice_intelligence = true) as enabled_users,
    COUNT(*) as total_users,
    ROUND(
        COUNT(*) FILTER (WHERE apex_voice_intelligence = true) * 100.0 / COUNT(*), 
        2
    ) as adoption_rate_percent
FROM user_ai_preferences
UNION ALL
SELECT 
    'apex_predictive_intelligence' as feature_name,
    COUNT(*) FILTER (WHERE apex_predictive_intelligence = true) as enabled_users,
    COUNT(*) as total_users,
    ROUND(
        COUNT(*) FILTER (WHERE apex_predictive_intelligence = true) * 100.0 / COUNT(*), 
        2
    ) as adoption_rate_percent
FROM user_ai_preferences;

-- Insert sample data for testing (optional)
-- This would be removed in production
INSERT INTO user_ai_preferences (
    user_id, 
    apex_nutrition_intelligence, 
    apex_photo_intelligence, 
    apex_voice_intelligence, 
    apex_predictive_intelligence,
    nutrition_coaching_level,
    photo_analysis_depth,
    voice_intelligence_mode,
    predictive_confidence_level
) VALUES 
('test-user-1', true, true, false, true, 'expert', 'expert', 'genius', 'expert'),
('test-user-2', true, false, true, false, 'advanced', 'complete', 'contextual', 'advanced')
ON CONFLICT (user_id) DO UPDATE SET
    apex_nutrition_intelligence = EXCLUDED.apex_nutrition_intelligence,
    apex_photo_intelligence = EXCLUDED.apex_photo_intelligence,
    apex_voice_intelligence = EXCLUDED.apex_voice_intelligence,
    apex_predictive_intelligence = EXCLUDED.apex_predictive_intelligence,
    nutrition_coaching_level = EXCLUDED.nutrition_coaching_level,
    photo_analysis_depth = EXCLUDED.photo_analysis_depth,
    voice_intelligence_mode = EXCLUDED.voice_intelligence_mode,
    predictive_confidence_level = EXCLUDED.predictive_confidence_level;

-- Add comments for documentation
COMMENT ON TABLE apex_nutrition_analysis_log IS 'Logs all Apex Nutrition Intelligence analyses for performance tracking and improvement';
COMMENT ON TABLE apex_photo_analysis_log IS 'Logs all Apex Photo Intelligence analyses with detection and nutrition results';
COMMENT ON TABLE apex_voice_command_log IS 'Logs all Apex Voice Intelligence commands with intent detection and execution results';
COMMENT ON TABLE apex_predictive_analysis_log IS 'Logs all Apex Predictive Intelligence analyses with model performance metrics';
COMMENT ON TABLE nutrition_coaching_sessions IS 'Tracks nutrition coaching sessions and user engagement';
COMMENT ON TABLE photo_intelligence_results IS 'Stores detailed results from photo intelligence analyses';
COMMENT ON TABLE voice_intelligence_context IS 'Maintains cooking context for intelligent voice interactions';
COMMENT ON TABLE predictive_intelligence_models IS 'Stores user-specific predictive models and their performance';
COMMENT ON TABLE apex_intelligence_feedback IS 'Collects user feedback to improve Apex Intelligence features';

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO cook_smart_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO cook_smart_app;

-- Migration complete
SELECT 'Apex Intelligence System migration completed successfully' as status;