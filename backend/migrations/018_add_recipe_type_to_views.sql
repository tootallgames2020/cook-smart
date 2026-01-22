-- Add recipe_type column to recipe_views table
ALTER TABLE recipe_views 
ADD COLUMN IF NOT EXISTS recipe_type VARCHAR(50) DEFAULT 'api';

-- Update the unique constraint to include recipe_type
ALTER TABLE recipe_views 
DROP CONSTRAINT IF EXISTS recipe_views_user_id_recipe_id_key;

ALTER TABLE recipe_views 
ADD CONSTRAINT recipe_views_user_id_recipe_id_recipe_type_key 
UNIQUE (user_id, recipe_id, recipe_type);