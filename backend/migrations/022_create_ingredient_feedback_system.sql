-- Migration 022: Create Ingredient Categorization Feedback System
-- This enables machine learning-like improvement of ingredient categorization

-- Create feedback table for user corrections
CREATE TABLE IF NOT EXISTS ingredient_categorization_feedback (
    id SERIAL PRIMARY KEY,
    ingredient_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    confidence_score DECIMAL(3,2) DEFAULT 1.0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Prevent duplicate feedback from same user for same ingredient
    UNIQUE(ingredient_name, category, user_id)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_ingredient_feedback_name ON ingredient_categorization_feedback(LOWER(ingredient_name));
CREATE INDEX IF NOT EXISTS idx_ingredient_feedback_category ON ingredient_categorization_feedback(category);
CREATE INDEX IF NOT EXISTS idx_ingredient_feedback_user ON ingredient_categorization_feedback(user_id);

-- Create categorization accuracy tracking
CREATE TABLE IF NOT EXISTS ingredient_categorization_stats (
    id SERIAL PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    total_ingredients INTEGER DEFAULT 0,
    correct_categorizations INTEGER DEFAULT 0,
    user_corrections INTEGER DEFAULT 0,
    accuracy_percentage DECIMAL(5,2) DEFAULT 0.0,
    last_updated TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(category)
);

-- Initialize stats for existing categories
INSERT INTO ingredient_categorization_stats (category, total_ingredients, accuracy_percentage)
SELECT 
    category,
    COUNT(*) as total_ingredients,
    85.0 as accuracy_percentage -- Assume 85% baseline accuracy
FROM user_ingredients 
WHERE category IS NOT NULL AND category != ''
GROUP BY category
ON CONFLICT (category) DO NOTHING;

-- Add enhanced category mapping for better organization
CREATE TABLE IF NOT EXISTS ingredient_category_mappings (
    id SERIAL PRIMARY KEY,
    ingredient_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    confidence DECIMAL(3,2) NOT NULL DEFAULT 0.8,
    source VARCHAR(50) DEFAULT 'system', -- 'system', 'user', 'api', 'ml'
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(ingredient_name, category)
);

-- Create index for fast ingredient lookups
CREATE INDEX IF NOT EXISTS idx_category_mappings_ingredient ON ingredient_category_mappings(LOWER(ingredient_name));
CREATE INDEX IF NOT EXISTS idx_category_mappings_confidence ON ingredient_category_mappings(confidence DESC);

-- Function to update categorization stats
CREATE OR REPLACE FUNCTION update_categorization_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update stats when feedback is added
    INSERT INTO ingredient_categorization_stats (category, user_corrections, last_updated)
    VALUES (NEW.category, 1, NOW())
    ON CONFLICT (category) 
    DO UPDATE SET 
        user_corrections = ingredient_categorization_stats.user_corrections + 1,
        accuracy_percentage = CASE 
            WHEN ingredient_categorization_stats.total_ingredients > 0 THEN
                ((ingredient_categorization_stats.correct_categorizations + 1) * 100.0) / ingredient_categorization_stats.total_ingredients
            ELSE 85.0
        END,
        last_updated = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic stats updates
DROP TRIGGER IF EXISTS trigger_update_categorization_stats ON ingredient_categorization_feedback;
CREATE TRIGGER trigger_update_categorization_stats
    AFTER INSERT ON ingredient_categorization_feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_categorization_stats();

-- Add some sample high-confidence mappings for common ingredients
INSERT INTO ingredient_category_mappings (ingredient_name, category, confidence, source) VALUES
-- Proteins
('chicken breast', 'Proteins', 0.98, 'system'),
('ground beef', 'Proteins', 0.98, 'system'),
('salmon', 'Proteins', 0.98, 'system'),
('eggs', 'Dairy & Eggs', 0.98, 'system'),
('tofu', 'Proteins', 0.95, 'system'),

-- Vegetables  
('onion', 'Vegetables', 0.98, 'system'),
('tomato', 'Vegetables', 0.98, 'system'),
('bell pepper', 'Vegetables', 0.98, 'system'),
('carrot', 'Vegetables', 0.98, 'system'),
('broccoli', 'Vegetables', 0.98, 'system'),

-- Fruits
('apple', 'Fruits', 0.98, 'system'),
('banana', 'Fruits', 0.98, 'system'),
('lemon', 'Fruits', 0.98, 'system'),
('avocado', 'Fruits', 0.98, 'system'),

-- Grains
('rice', 'Grains & Starches', 0.98, 'system'),
('pasta', 'Grains & Starches', 0.98, 'system'),
('bread', 'Grains & Starches', 0.98, 'system'),
('flour', 'Grains & Starches', 0.98, 'system'),

-- Dairy
('milk', 'Dairy & Eggs', 0.98, 'system'),
('cheese', 'Dairy & Eggs', 0.98, 'system'),
('butter', 'Dairy & Eggs', 0.98, 'system'),
('yogurt', 'Dairy & Eggs', 0.98, 'system'),

-- Spices (specific to avoid conflicts)
('black pepper', 'Spices & Herbs', 0.98, 'system'),
('salt', 'Spices & Herbs', 0.98, 'system'),
('garlic powder', 'Spices & Herbs', 0.98, 'system'),
('basil', 'Spices & Herbs', 0.98, 'system'),

-- Oils
('olive oil', 'Oils & Fats', 0.98, 'system'),
('vegetable oil', 'Oils & Fats', 0.98, 'system'),

-- Condiments
('ketchup', 'Condiments & Sauces', 0.98, 'system'),
('soy sauce', 'Condiments & Sauces', 0.98, 'system'),
('honey', 'Condiments & Sauces', 0.98, 'system')

ON CONFLICT (ingredient_name, category) DO NOTHING;

-- Create view for categorization analytics
CREATE OR REPLACE VIEW ingredient_categorization_analytics AS
SELECT 
    ics.category,
    ics.total_ingredients,
    ics.correct_categorizations,
    ics.user_corrections,
    ics.accuracy_percentage,
    COUNT(icf.id) as total_feedback,
    AVG(icf.confidence_score) as avg_user_confidence,
    ics.last_updated
FROM ingredient_categorization_stats ics
LEFT JOIN ingredient_categorization_feedback icf ON ics.category = icf.category
GROUP BY ics.category, ics.total_ingredients, ics.correct_categorizations, 
         ics.user_corrections, ics.accuracy_percentage, ics.last_updated
ORDER BY ics.accuracy_percentage DESC;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON ingredient_categorization_feedback TO cookuser;
GRANT SELECT, INSERT, UPDATE ON ingredient_categorization_stats TO cookuser;
GRANT SELECT, INSERT, UPDATE ON ingredient_category_mappings TO cookuser;
GRANT SELECT ON ingredient_categorization_analytics TO cookuser;
GRANT USAGE ON SEQUENCE ingredient_categorization_feedback_id_seq TO cookuser;
GRANT USAGE ON SEQUENCE ingredient_categorization_stats_id_seq TO cookuser;
GRANT USAGE ON SEQUENCE ingredient_category_mappings_id_seq TO cookuser;

-- Add comment
COMMENT ON TABLE ingredient_categorization_feedback IS 'User feedback for improving ingredient categorization accuracy';
COMMENT ON TABLE ingredient_categorization_stats IS 'Statistics tracking for ingredient categorization performance';
COMMENT ON TABLE ingredient_category_mappings IS 'High-confidence ingredient to category mappings';