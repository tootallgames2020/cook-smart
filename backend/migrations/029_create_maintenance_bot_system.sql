-- AUTONOMOUS MAINTENANCE BOT DATABASE MIGRATION
-- Creates tables for system monitoring, maintenance actions, and bot operations

-- System Health Log Table
CREATE TABLE IF NOT EXISTS system_health_log (
    id SERIAL PRIMARY KEY,
    health_score DECIMAL(3,2) NOT NULL CHECK (health_score >= 0 AND health_score <= 1),
    metrics_data JSONB NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Extracted metrics for easier querying
    api_avg_response_time INTEGER,
    database_performance_score DECIMAL(3,2),
    ai_model_avg_accuracy DECIMAL(3,2),
    error_rate DECIMAL(5,4),
    cpu_usage_percent DECIMAL(5,2),
    memory_usage_percent DECIMAL(5,2)
);

-- Create indexes for system_health_log
CREATE INDEX IF NOT EXISTS idx_system_health_recorded_at ON system_health_log (recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_health_score ON system_health_log (health_score DESC);

-- Maintenance Actions Log Table
CREATE TABLE IF NOT EXISTS maintenance_actions_log (
    id SERIAL PRIMARY KEY,
    action_id VARCHAR(255) NOT NULL UNIQUE,
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('repair', 'optimize', 'update', 'prevent')),
    target_system VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    
    -- Execution details
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    execution_time_ms INTEGER NOT NULL,
    success BOOLEAN NOT NULL DEFAULT FALSE,
    error_message TEXT,
    
    -- Action metadata
    estimated_impact TEXT,
    success_probability DECIMAL(3,2),
    rollback_plan TEXT,
    rollback_executed BOOLEAN DEFAULT FALSE,
    
    -- Results
    actual_impact TEXT,
    performance_improvement DECIMAL(5,2)
);

-- Create indexes for maintenance_actions_log
CREATE INDEX IF NOT EXISTS idx_maintenance_actions_executed_at ON maintenance_actions_log (executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_actions_type ON maintenance_actions_log (action_type);
CREATE INDEX IF NOT EXISTS idx_maintenance_actions_success ON maintenance_actions_log (success);
CREATE INDEX IF NOT EXISTS idx_maintenance_actions_priority ON maintenance_actions_log (priority);

-- System Issues Log Table
CREATE TABLE IF NOT EXISTS system_issues_log (
    id SERIAL PRIMARY KEY,
    issue_id VARCHAR(255) NOT NULL UNIQUE,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    component VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    
    -- Detection details
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    auto_fixable BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Impact assessment
    impact_assessment TEXT,
    affected_users_count INTEGER DEFAULT 0,
    estimated_downtime_minutes INTEGER DEFAULT 0,
    
    -- Resolution details
    resolution_method VARCHAR(50), -- 'automatic', 'manual', 'ignored'
    resolution_actions JSONB,
    resolution_success BOOLEAN,
    
    -- Recurrence tracking
    first_occurrence TIMESTAMP WITH TIME ZONE,
    occurrence_count INTEGER DEFAULT 1
);

-- Create indexes for system_issues_log
CREATE INDEX IF NOT EXISTS idx_system_issues_detected_at ON system_issues_log (detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_issues_severity ON system_issues_log (severity);
CREATE INDEX IF NOT EXISTS idx_system_issues_component ON system_issues_log (component);
CREATE INDEX IF NOT EXISTS idx_system_issues_resolved ON system_issues_log (resolved_at);
CREATE INDEX IF NOT EXISTS idx_system_issues_auto_fixable ON system_issues_log (auto_fixable);

-- AI Model Performance Log Table
CREATE TABLE IF NOT EXISTS ai_model_performance_log (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(100) NOT NULL,
    model_version VARCHAR(50) NOT NULL,
    
    -- Performance metrics
    accuracy_score DECIMAL(5,4) NOT NULL CHECK (accuracy_score >= 0 AND accuracy_score <= 1),
    precision_score DECIMAL(5,4),
    recall_score DECIMAL(5,4),
    f1_score DECIMAL(5,4),
    
    -- Usage metrics
    predictions_made INTEGER DEFAULT 0,
    correct_predictions INTEGER DEFAULT 0,
    user_feedback_count INTEGER DEFAULT 0,
    positive_feedback_count INTEGER DEFAULT 0,
    
    -- Training details
    training_data_size INTEGER,
    training_duration_minutes INTEGER,
    last_trained_at TIMESTAMP WITH TIME ZONE,
    
    -- Performance tracking
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    response_time_ms INTEGER
);

-- Create indexes for ai_model_performance_log
CREATE INDEX IF NOT EXISTS idx_ai_model_performance_recorded_at ON ai_model_performance_log (recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_model_performance_model ON ai_model_performance_log (model_name, model_version);
CREATE INDEX IF NOT EXISTS idx_ai_model_performance_accuracy ON ai_model_performance_log (accuracy_score DESC);

-- Bot Configuration Table
CREATE TABLE IF NOT EXISTS maintenance_bot_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value JSONB NOT NULL,
    description TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by VARCHAR(255),
    
    -- Validation
    is_active BOOLEAN DEFAULT TRUE,
    validation_schema JSONB
);

-- Create indexes for maintenance_bot_config
CREATE INDEX IF NOT EXISTS idx_maintenance_bot_config_key ON maintenance_bot_config (config_key);
CREATE INDEX IF NOT EXISTS idx_maintenance_bot_config_active ON maintenance_bot_config (is_active);

-- System Alerts Table
CREATE TABLE IF NOT EXISTS system_alerts (
    id SERIAL PRIMARY KEY,
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    
    -- Alert details
    component VARCHAR(100),
    metric_name VARCHAR(100),
    threshold_value DECIMAL(10,4),
    actual_value DECIMAL(10,4),
    
    -- Status tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by VARCHAR(255),
    
    -- Alert metadata
    alert_data JSONB,
    escalation_level INTEGER DEFAULT 1,
    notification_sent BOOLEAN DEFAULT FALSE
);

-- Create indexes for system_alerts
CREATE INDEX IF NOT EXISTS idx_system_alerts_created_at ON system_alerts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_alerts_severity ON system_alerts (severity);
CREATE INDEX IF NOT EXISTS idx_system_alerts_resolved ON system_alerts (resolved_at);
CREATE INDEX IF NOT EXISTS idx_system_alerts_component ON system_alerts (component);

-- Performance Baselines Table
CREATE TABLE IF NOT EXISTS performance_baselines (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    component VARCHAR(100) NOT NULL,
    
    -- Baseline values
    baseline_value DECIMAL(10,4) NOT NULL,
    acceptable_range_min DECIMAL(10,4),
    acceptable_range_max DECIMAL(10,4),
    warning_threshold DECIMAL(10,4),
    critical_threshold DECIMAL(10,4),
    
    -- Metadata
    established_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sample_size INTEGER DEFAULT 0,
    confidence_level DECIMAL(3,2) DEFAULT 0.95,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    UNIQUE(metric_name, component)
);

-- Create indexes for performance_baselines
CREATE INDEX IF NOT EXISTS idx_performance_baselines_metric ON performance_baselines (metric_name, component);
CREATE INDEX IF NOT EXISTS idx_performance_baselines_active ON performance_baselines (is_active);

-- Insert default configuration
INSERT INTO maintenance_bot_config (config_key, config_value, description) VALUES
('monitoring_intervals', '{
    "health_check_seconds": 60,
    "performance_analysis_seconds": 300,
    "ai_model_update_seconds": 3600,
    "deep_system_scan_seconds": 86400
}', 'Monitoring intervals for different types of checks'),

('auto_fix_settings', '{
    "enabled": true,
    "max_concurrent_actions": 3,
    "rollback_on_failure": true,
    "require_confirmation_for_critical": false,
    "success_probability_threshold": 0.7
}', 'Settings for automatic fix execution'),

('alert_thresholds', '{
    "api_response_time_ms": 2000,
    "database_query_time_ms": 1000,
    "error_rate_percent": 5.0,
    "memory_usage_percent": 85.0,
    "cpu_usage_percent": 80.0,
    "ai_accuracy_threshold": 0.80
}', 'Thresholds for triggering alerts and automatic actions'),

('notification_settings', '{
    "email_alerts": true,
    "slack_notifications": false,
    "discord_webhooks": true,
    "sms_critical_only": false
}', 'Notification preferences for different alert types')

ON CONFLICT (config_key) DO UPDATE SET
    config_value = EXCLUDED.config_value,
    updated_at = NOW();

-- Insert default performance baselines
INSERT INTO performance_baselines (metric_name, component, baseline_value, acceptable_range_min, acceptable_range_max, warning_threshold, critical_threshold) VALUES
('response_time_ms', 'api_gateway', 500, 200, 800, 1000, 2000),
('query_time_ms', 'database', 100, 50, 200, 500, 1000),
('accuracy_score', 'ai_nutrition', 0.90, 0.85, 0.95, 0.80, 0.75),
('accuracy_score', 'ai_photo', 0.88, 0.82, 0.92, 0.78, 0.70),
('accuracy_score', 'ai_voice', 0.89, 0.84, 0.94, 0.79, 0.72),
('accuracy_score', 'ai_predictive', 0.85, 0.80, 0.90, 0.75, 0.65),
('error_rate', 'api_gateway', 0.02, 0.00, 0.03, 0.05, 0.10),
('memory_usage_percent', 'system', 45.0, 20.0, 60.0, 75.0, 85.0),
('cpu_usage_percent', 'system', 35.0, 15.0, 50.0, 70.0, 85.0)

ON CONFLICT (metric_name, component) DO UPDATE SET
    baseline_value = EXCLUDED.baseline_value,
    last_updated = NOW();

-- Create views for monitoring dashboards
CREATE OR REPLACE VIEW system_health_summary AS
SELECT 
    DATE(recorded_at) as date,
    AVG(health_score) as avg_health_score,
    MIN(health_score) as min_health_score,
    MAX(health_score) as max_health_score,
    COUNT(*) as measurements,
    AVG(api_avg_response_time) as avg_api_response_time,
    AVG(database_performance_score) as avg_db_performance,
    AVG(ai_model_avg_accuracy) as avg_ai_accuracy,
    AVG(error_rate) as avg_error_rate
FROM system_health_log
WHERE recorded_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(recorded_at)
ORDER BY date DESC;

CREATE OR REPLACE VIEW maintenance_actions_summary AS
SELECT 
    action_type,
    target_system,
    COUNT(*) as total_actions,
    COUNT(*) FILTER (WHERE success = true) as successful_actions,
    ROUND(COUNT(*) FILTER (WHERE success = true) * 100.0 / COUNT(*), 2) as success_rate,
    AVG(execution_time_ms) as avg_execution_time,
    AVG(performance_improvement) as avg_improvement
FROM maintenance_actions_log
WHERE executed_at >= NOW() - INTERVAL '30 days'
GROUP BY action_type, target_system
ORDER BY total_actions DESC;

CREATE OR REPLACE VIEW current_system_issues AS
SELECT 
    issue_id,
    severity,
    component,
    description,
    detected_at,
    auto_fixable,
    impact_assessment,
    occurrence_count,
    EXTRACT(EPOCH FROM (NOW() - detected_at))/3600 as hours_since_detection
FROM system_issues_log
WHERE resolved_at IS NULL
ORDER BY 
    CASE severity 
        WHEN 'critical' THEN 4 
        WHEN 'error' THEN 3 
        WHEN 'warning' THEN 2 
        ELSE 1 
    END DESC,
    detected_at ASC;

CREATE OR REPLACE VIEW ai_model_performance_summary AS
SELECT 
    model_name,
    model_version,
    accuracy_score,
    predictions_made,
    CASE 
        WHEN predictions_made > 0 
        THEN ROUND(correct_predictions * 100.0 / predictions_made, 2)
        ELSE 0 
    END as actual_accuracy_percent,
    user_feedback_count,
    CASE 
        WHEN user_feedback_count > 0 
        THEN ROUND(positive_feedback_count * 100.0 / user_feedback_count, 2)
        ELSE 0 
    END as positive_feedback_percent,
    last_trained_at,
    recorded_at
FROM ai_model_performance_log
WHERE recorded_at >= NOW() - INTERVAL '7 days'
ORDER BY recorded_at DESC;

-- Add comments for documentation
COMMENT ON TABLE system_health_log IS 'Continuous monitoring of overall system health and performance metrics';
COMMENT ON TABLE maintenance_actions_log IS 'Log of all automatic maintenance actions performed by the bot';
COMMENT ON TABLE system_issues_log IS 'Detected system issues and their resolution status';
COMMENT ON TABLE ai_model_performance_log IS 'Performance tracking for all AI models in the system';
COMMENT ON TABLE maintenance_bot_config IS 'Configuration settings for the autonomous maintenance bot';
COMMENT ON TABLE system_alerts IS 'System alerts generated by monitoring thresholds';
COMMENT ON TABLE performance_baselines IS 'Baseline performance metrics for anomaly detection';

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO cook_smart_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO cook_smart_app;

-- Migration complete
SELECT 'Autonomous Maintenance Bot system migration completed successfully' as status;