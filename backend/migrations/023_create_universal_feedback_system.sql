-- Migration 023: Universal Smart Feedback System
-- Creates a comprehensive feedback system for all app features

-- Universal feedback table for all types of user corrections
CREATE TABLE IF NOT EXISTS user_feedback (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    feedback_type VARCHAR(50) NOT NULL, -- 'ingredient_category', 'recipe_match', 'dietary_flag', etc.
    feature_area VARCHAR(50) NOT NULL, -- 'ingredients', 'recipes', 'shopping', 'meal_planning'
    
    -- Original system values
    original_data JSONB NOT NULL,
    
    -- User corrections
    corrected_data JSONB NOT NULL,
    
    -- Context information
    context_data JSONB DEFAULT '{}',
    
    -- Feedback metadata
    confidence_score DECIMAL(3,2) DEFAULT 1.0, -- How confident user is in correction
    feedback_quality VARCHAR(20) DEFAULT 'pending', -- 'pending', 'validated', 'disputed', 'applied'
    
    -- Tracking
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    applied_at TIMESTAMP NULL, -- When correction was applied to system
    
    -- Prevent duplicate feedback
    UNIQUE(user_id, feedback_type, original_data, corrected_data)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_feedback_type ON user_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_user_feedback_feature ON user_feedback(feature_area);
CREATE INDEX IF NOT EXISTS idx_user_feedback_user ON user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_quality ON user_feedback(feedback_quality);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created ON user_feedback(created_at);

-- Learning patterns table - tracks what the system has learned
CREATE TABLE IF NOT EXISTS learning_patterns (
    id SERIAL PRIMARY KEY,
    pattern_type VARCHAR(50) NOT NULL, -- 'ingredient_category', 'recipe_match', etc.
    pattern_key VARCHAR(255) NOT NULL, -- The thing being learned about
    pattern_value JSONB NOT NULL, -- What we learned
    confidence DECIMAL(5,2) DEFAULT 0.0, -- Confidence in this pattern (0-100)
    evidence_count INTEGER DEFAULT 1, -- How many feedbacks support this
    last_reinforced TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(pattern_type, pattern_key)
);

-- Indexes for learning patterns
CREATE INDEX IF NOT EXISTS idx_learning_patterns_type ON learning_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_learning_patterns_confidence ON learning_patterns(confidence DESC);
CREATE INDEX IF NOT EXISTS idx_learning_patterns_evidence ON learning_patterns(evidence_count DESC);

-- Feedback analytics for monitoring system performance
CREATE TABLE IF NOT EXISTS feedback_analytics (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    feedback_type VARCHAR(50) NOT NULL,
    
    -- Daily metrics
    total_feedback INTEGER DEFAULT 0,
    positive_feedback INTEGER DEFAULT 0,
    negative_feedback INTEGER DEFAULT 0,
    applied_corrections INTEGER DEFAULT 0,
    
    -- Accuracy metrics
    system_accuracy DECIMAL(5,2) DEFAULT 0.0,
    user_satisfaction DECIMAL(5,2) DEFAULT 0.0,
    
    -- Performance metrics
    avg_confidence DECIMAL(5,2) DEFAULT 0.0,
    improvement_rate DECIMAL(5,2) DEFAULT 0.0,
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(date, feedback_type)
);

-- Function to update learning patterns when feedback is received
CREATE OR REPLACE FUNCTION update_learning_patterns()
RETURNS TRIGGER AS $$
BEGIN
    -- Update or create learning pattern
    INSERT INTO learning_patterns (
        pattern_type, 
        pattern_key, 
        pattern_value, 
        confidence, 
        evidence_count,
        last_reinforced
    )
    VALUES (
        NEW.feedback_type,
        (NEW.original_data->>'key')::VARCHAR, -- Extract key from original data
        NEW.corrected_data,
        LEAST(NEW.confidence_score * 10, 100), -- Convert to 0-100 scale
        1,
        NOW()
    )
    ON CONFLICT (pattern_type, pattern_key) 
    DO UPDATE SET 
        pattern_value = CASE 
            WHEN learning_patterns.confidence < EXCLUDED.confidence THEN EXCLUDED.pattern_value
            ELSE learning_patterns.pattern_value
        END,
        confidence = LEAST(
            (learning_patterns.confidence * learning_patterns.evidence_count + EXCLUDED.confidence) / 
            (learning_patterns.evidence_count + 1), 
            100
        ),
        evidence_count = learning_patterns.evidence_count + 1,
        last_reinforced = NOW();
    
    -- Update daily analytics
    INSERT INTO feedback_analytics (
        date, 
        feedback_type, 
        total_feedback,
        positive_feedback,
        avg_confidence
    )
    VALUES (
        CURRENT_DATE,
        NEW.feedback_type,
        1,
        CASE WHEN NEW.confidence_score >= 0.7 THEN 1 ELSE 0 END,
        NEW.confidence_score * 100
    )
    ON CONFLICT (date, feedback_type)
    DO UPDATE SET
        total_feedback = feedback_analytics.total_feedback + 1,
        positive_feedback = feedback_analytics.positive_feedback + 
            CASE WHEN NEW.confidence_score >= 0.7 THEN 1 ELSE 0 END,
        avg_confidence = (
            (feedback_analytics.avg_confidence * feedback_analytics.total_feedback) + 
            (NEW.confidence_score * 100)
        ) / (feedback_analytics.total_feedback + 1);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update learning patterns
DROP TRIGGER IF EXISTS trigger_update_learning_patterns ON user_feedback;
CREATE TRIGGER trigger_update_learning_patterns
    AFTER INSERT ON user_feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_learning_patterns();

-- Function to get learning insights for a specific pattern type
CREATE OR REPLACE FUNCTION get_learning_insights(pattern_type_param VARCHAR)
RETURNS TABLE (
    pattern_key VARCHAR,
    learned_value JSONB,
    confidence DECIMAL,
    evidence_count INTEGER,
    last_seen TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        lp.pattern_key,
        lp.pattern_value,
        lp.confidence,
        lp.evidence_count,
        lp.last_reinforced
    FROM learning_patterns lp
    WHERE lp.pattern_type = pattern_type_param
    AND lp.confidence >= 60.0 -- Only return high-confidence patterns
    ORDER BY lp.confidence DESC, lp.evidence_count DESC;
END;
$$ LANGUAGE plpgsql;

-- View for feedback dashboard
CREATE OR REPLACE VIEW feedback_dashboard AS
SELECT 
    fa.feedback_type,
    fa.date,
    fa.total_feedback,
    fa.positive_feedback,
    fa.applied_corrections,
    fa.system_accuracy,
    fa.avg_confidence,
    ROUND(
        (fa.positive_feedback::DECIMAL / NULLIF(fa.total_feedback, 0)) * 100, 2
    ) as satisfaction_rate,
    COUNT(lp.id) as active_patterns
FROM feedback_analytics fa
LEFT JOIN learning_patterns lp ON lp.pattern_type = fa.feedback_type 
    AND lp.confidence >= 60.0
WHERE fa.date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY fa.feedback_type, fa.date, fa.total_feedback, fa.positive_feedback, 
         fa.applied_corrections, fa.system_accuracy, fa.avg_confidence
ORDER BY fa.date DESC, fa.feedback_type;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON user_feedback TO cookuser;
GRANT SELECT, INSERT, UPDATE ON learning_patterns TO cookuser;
GRANT SELECT, INSERT, UPDATE ON feedback_analytics TO cookuser;
GRANT SELECT ON feedback_dashboard TO cookuser;
GRANT USAGE ON SEQUENCE user_feedback_id_seq TO cookuser;
GRANT USAGE ON SEQUENCE learning_patterns_id_seq TO cookuser;
GRANT USAGE ON SEQUENCE feedback_analytics_id_seq TO cookuser;

-- Add comments
COMMENT ON TABLE user_feedback IS 'Universal feedback system for all user corrections across the app';
COMMENT ON TABLE learning_patterns IS 'Machine learning patterns derived from user feedback';
COMMENT ON TABLE feedback_analytics IS 'Daily analytics for monitoring feedback system performance';
COMMENT ON VIEW feedback_dashboard IS 'Dashboard view for feedback system monitoring';