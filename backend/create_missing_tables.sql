-- Create missing tables for recipe caching and API usage logging

-- Recipe cache table
CREATE TABLE IF NOT EXISTS cached_recipes (
    id SERIAL PRIMARY KEY,
    recipe_id VARCHAR(255) UNIQUE NOT NULL,
    recipe_data JSONB NOT NULL,
    provider VARCHAR(100) NOT NULL,
    search_query VARCHAR(500),
    is_seasonal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    access_count INTEGER DEFAULT 0
);

-- API usage logs table
CREATE TABLE IF NOT EXISTS api_usage_logs (
    id SERIAL PRIMARY KEY,
    provider VARCHAR(100) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER,
    response_time_ms INTEGER,
    user_id VARCHAR(255) REFERENCES users(id),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cached_recipes_recipe_id ON cached_recipes(recipe_id);
CREATE INDEX IF NOT EXISTS idx_cached_recipes_provider ON cached_recipes(provider);
CREATE INDEX IF NOT EXISTS idx_cached_recipes_created_at ON cached_recipes(created_at);
CREATE INDEX IF NOT EXISTS idx_cached_recipes_expires_at ON cached_recipes(expires_at);

CREATE INDEX IF NOT EXISTS idx_api_usage_logs_provider ON api_usage_logs(provider);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_created_at ON api_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_user_id ON api_usage_logs(user_id);
