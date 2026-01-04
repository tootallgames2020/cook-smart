import express from 'express';
import { pool } from '../server';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';
import { FatSecretService } from '../services/FatSecretService';

const router = express.Router();
const fatSecretService = new FatSecretService();

// Search recipes by ingredients
router.get('/search', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { ingredients, limit = 20, dietary_restrictions, allergies } = req.query;

    if (!ingredients) {
      return res.status(400).json({
        success: false,
        message: 'Ingredients parameter is required',
      });
    }

    const ingredientList = Array.isArray(ingredients) 
      ? ingredients as string[]
      : (ingredients as string).split(',').map(i => i.trim());

    logger.info(`Recipe search for user ${req.user!.id}: ${ingredientList.join(', ')}`);

    // Search recipes using FatSecret API
    const recipes = await fatSecretService.searchRecipesByIngredients(
      ingredientList,
      parseInt(limit as string)
    );

    // Apply dietary filtering if user has restrictions
    let filteredRecipes = recipes;
    if (dietary_restrictions || allergies) {
      // TODO: Implement dietary filtering logic
      logger.info('Dietary filtering requested but not yet implemented');
    }

    // Award points for recipe search
    const client = await pool.connect();
    try {
      await client.query(
        'UPDATE users SET points = points + 1 WHERE id = $1',
        [req.user!.id]
      );
    } finally {
      client.release();
    }

    return res.json({
      success: true,
      recipes: filteredRecipes,
      count: filteredRecipes.length,
      provider: 'FatSecret',
      searchedIngredients: ingredientList,
      dietaryFiltering: !!(dietary_restrictions || allergies),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Recipe search error:', error);
    return next(createError('Recipe search failed', 500));
  }
});

// Get recipe details (public endpoint for browsing)
router.get('/:id/public', async (req, res, next) => {
  try {
    const { id } = req.params;

    logger.info(`Public recipe details request: ${id}`);

    // Get recipe details from FatSecret API
    const recipe = await fatSecretService.getRecipeDetails(id);

    if (!recipe) {
      return res.status(404).json({
        success: false,
        message: 'Recipe not found',
      });
    }

    // Parse ingredients into simple string array
    let ingredientsList: string[] = [];
    if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
      ingredientsList = recipe.ingredients.map((ing: any) => 
        ing.ingredient_description || ing.food_name || ing.name || 'Unknown ingredient'
      );
    } else if (recipe.ingredients?.ingredient) {
      const ingredients = Array.isArray(recipe.ingredients.ingredient) 
        ? recipe.ingredients.ingredient 
        : [recipe.ingredients.ingredient];
      ingredientsList = ingredients.map((ing: any) => 
        ing.ingredient_description || ing.food_name || ing.name || 'Unknown ingredient'
      );
    }

    // Parse instructions into simple string
    let instructionsText = '';
    if (recipe.directions?.direction) {
      const directions = Array.isArray(recipe.directions.direction) 
        ? recipe.directions.direction 
        : [recipe.directions.direction];
      instructionsText = directions.map((dir: any, index: number) => 
        `${index + 1}. ${dir.direction_description || dir}`
      ).join('\n');
    }

    // Return mobile app compatible format
    return res.json({
      success: true,
      recipe: {
        id: parseInt(recipe.recipe_id) || parseInt(id),
        title: recipe.recipe_name || 'Unknown Recipe',
        image: recipe.recipe_image || 'https://images.unsplash.com/photo-1546548970-71785318a17b?w=400&h=300&fit=crop',
        servings: parseInt(recipe.number_of_servings) || 4,
        readyInMinutes: parseInt(recipe.cooking_time_min) || 30,
        sourceUrl: recipe.recipe_url || '',
        summary: recipe.recipe_description || '',
        cuisines: recipe.recipe_types?.recipe_type || ['Unknown'],
        dishTypes: ['main course'],
        instructions: instructionsText,
        ingredients: ingredientsList,
        provider: 'FatSecret',
        // Nutrition info
        calories: parseFloat(recipe.calories) || 0,
        protein: parseFloat(recipe.protein) || 0,
        carbs: parseFloat(recipe.carbohydrate) || 0,
        fat: parseFloat(recipe.fat) || 0,
        fiber: parseFloat(recipe.fiber) || 0,
        sugar: parseFloat(recipe.sugar) || 0,
        sodium: parseFloat(recipe.sodium) || 0,
        saturatedFat: parseFloat(recipe.saturated_fat) || 0,
        cholesterol: parseFloat(recipe.cholesterol) || 0,
      },
      provider: 'FatSecret',
      isPublic: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Public recipe details error:', error);
    return next(createError('Failed to get recipe details', 500));
  }
});

// Get recipe details
router.get('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    logger.info(`Recipe details request for user ${req.user!.id}: ${id}`);

    // Get recipe details from FatSecret API
    const recipe = await fatSecretService.getRecipeDetails(id);

    if (!recipe) {
      return res.status(404).json({
        success: false,
        message: 'Recipe not found',
      });
    }

    // Parse ingredients into simple string array
    let ingredientsList: string[] = [];
    if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
      ingredientsList = recipe.ingredients.map((ing: any) => 
        ing.ingredient_description || ing.food_name || ing.name || 'Unknown ingredient'
      );
    } else if (recipe.ingredients?.ingredient) {
      const ingredients = Array.isArray(recipe.ingredients.ingredient) 
        ? recipe.ingredients.ingredient 
        : [recipe.ingredients.ingredient];
      ingredientsList = ingredients.map((ing: any) => 
        ing.ingredient_description || ing.food_name || ing.name || 'Unknown ingredient'
      );
    }

    // Parse instructions into simple string
    let instructionsText = '';
    if (recipe.directions?.direction) {
      const directions = Array.isArray(recipe.directions.direction) 
        ? recipe.directions.direction 
        : [recipe.directions.direction];
      instructionsText = directions.map((dir: any, index: number) => 
        `${index + 1}. ${dir.direction_description || dir}`
      ).join('\n');
    }

    // Return mobile app compatible format
    return res.json({
      success: true,
      recipe: {
        id: parseInt(recipe.recipe_id) || parseInt(id),
        title: recipe.recipe_name || 'Unknown Recipe',
        image: recipe.recipe_image || 'https://images.unsplash.com/photo-1546548970-71785318a17b?w=400&h=300&fit=crop',
        servings: parseInt(recipe.number_of_servings) || 4,
        readyInMinutes: parseInt(recipe.cooking_time_min) || 30,
        sourceUrl: recipe.recipe_url || '',
        summary: recipe.recipe_description || '',
        cuisines: recipe.recipe_types?.recipe_type || ['Unknown'],
        dishTypes: ['main course'],
        instructions: instructionsText,
        ingredients: ingredientsList,
        provider: 'FatSecret',
        // Nutrition info
        calories: parseFloat(recipe.calories) || 0,
        protein: parseFloat(recipe.protein) || 0,
        carbs: parseFloat(recipe.carbohydrate) || 0,
        fat: parseFloat(recipe.fat) || 0,
        fiber: parseFloat(recipe.fiber) || 0,
        sugar: parseFloat(recipe.sugar) || 0,
        sodium: parseFloat(recipe.sodium) || 0,
        saturatedFat: parseFloat(recipe.saturated_fat) || 0,
        cholesterol: parseFloat(recipe.cholesterol) || 0,
      },
      provider: 'FatSecret',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Recipe details error:', error);
    return next(createError('Failed to get recipe details', 500));
  }
});

// Save recipe to user's collection
router.post('/save', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { recipe_id, recipe_title, recipe_data, is_private = false } = req.body;

    if (!recipe_id || !recipe_title) {
      return res.status(400).json({
        success: false,
        message: 'Recipe ID and title are required',
      });
    }

    const client = await pool.connect();
    try {
      // Check if recipe is already saved
      const existing = await client.query(
        'SELECT id FROM user_recipes WHERE user_id = $1 AND recipe_id = $2',
        [req.user!.id, recipe_id]
      );

      if (existing.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Recipe already saved',
        });
      }

      // Save recipe
      await client.query(
        `INSERT INTO user_recipes (user_id, recipe_id, recipe_title, recipe_data, is_private, saved_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [req.user!.id, recipe_id, recipe_title, JSON.stringify(recipe_data), is_private]
      );

      // Award points for saving recipe
      await client.query(
        'UPDATE users SET points = points + 5 WHERE id = $1',
        [req.user!.id]
      );

      logger.info(`Recipe saved by user ${req.user!.id}: ${recipe_id}`);

      res.json({
        success: true,
        message: 'Recipe saved successfully',
        points_awarded: 5,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Save recipe error:', error);
    return next(createError('Failed to save recipe', 500));
  }
});

// Get user's saved recipes
router.get('/user/saved', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT id, recipe_id, recipe_title, recipe_data, is_private, 
                is_favorite, saved_at
         FROM user_recipes 
         WHERE user_id = $1 
         ORDER BY saved_at DESC 
         LIMIT $2 OFFSET $3`,
        [req.user!.id, parseInt(limit as string), parseInt(offset as string)]
      );

      res.json({
        success: true,
        recipes: result.rows,
        count: result.rows.length,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Get saved recipes error:', error);
    return next(createError('Failed to get saved recipes', 500));
  }
});

// Delete saved recipe
router.delete('/user/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const client = await pool.connect();
    try {
      const result = await client.query(
        'DELETE FROM user_recipes WHERE id = $1 AND user_id = $2',
        [id, req.user!.id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Recipe not found or not owned by user',
        });
      }

      res.json({
        success: true,
        message: 'Recipe deleted successfully',
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Delete recipe error:', error);
    return next(createError('Failed to delete recipe', 500));
  }
});

// Toggle favorite status
router.post('/user/:id/favorite', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const client = await pool.connect();
    try {
      const result = await client.query(
        `UPDATE user_recipes 
         SET is_favorite = NOT is_favorite 
         WHERE id = $1 AND user_id = $2
         RETURNING is_favorite`,
        [id, req.user!.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Recipe not found or not owned by user',
        });
      }

      res.json({
        success: true,
        is_favorite: result.rows[0].is_favorite,
        message: result.rows[0].is_favorite ? 'Added to favorites' : 'Removed from favorites',
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Toggle favorite error:', error);
    return next(createError('Failed to toggle favorite', 500));
  }
});

export default router;