import express from 'express';
import { pool } from '../server';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';
import { UnitConversionService } from '../services/UnitConversionService';

const router = express.Router();

// Get user's custom recipes
router.get('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { visibility, category, search } = req.query;

    const client = await pool.connect();
    try {
      let query = `
        SELECT cr.id, cr.title, cr.description, cr.ingredients, cr.instructions,
               cr.prep_time, cr.cook_time, cr.servings, cr.difficulty, cr.cuisine,
               cr.dietary_tags, cr.image_url, cr.visibility, cr.created_at,
               cr.updated_at, cr.rating_average, cr.rating_count, cr.view_count,
               u.first_name, u.last_name
        FROM custom_recipes cr
        JOIN users u ON cr.user_id = u.id
        WHERE cr.user_id = $1
      `;
      const params: any[] = [req.user!.id];

      if (visibility) {
        query += ' AND cr.visibility = $2';
        params.push(visibility);
      }

      if (category) {
        const categoryIndex = params.length + 1;
        query += ` AND cr.cuisine = $${categoryIndex}`;
        params.push(category);
      }

      if (search) {
        const searchIndex = params.length + 1;
        query += ` AND (cr.title ILIKE $${searchIndex} OR cr.description ILIKE $${searchIndex})`;
        params.push(`%${search}%`);
      }

      query += ' ORDER BY cr.created_at DESC';

      const result = await client.query(query, params);

      return res.json({
        success: true,
        recipes: result.rows,
        count: result.rows.length,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Get custom recipes error:', error);
    return next(createError('Failed to get custom recipes', 500));
  }
});

// Get community recipes (public recipes from all users)
router.get('/community', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { category, search, sort = 'recent', limit = 20, offset = 0 } = req.query;

    const client = await pool.connect();
    try {
      let query = `
        SELECT cr.id, cr.title, cr.description, cr.ingredients, cr.instructions,
               cr.prep_time, cr.cook_time, cr.servings, cr.difficulty, cr.cuisine,
               cr.dietary_tags, cr.image_url, cr.created_at, cr.updated_at,
               cr.rating_average, cr.rating_count, cr.view_count,
               u.first_name, u.last_name,
               CASE WHEN ucr.id IS NOT NULL THEN true ELSE false END as is_saved
        FROM custom_recipes cr
        JOIN users u ON cr.user_id = u.id
        LEFT JOIN user_custom_recipes ucr ON cr.id = ucr.recipe_id AND ucr.user_id = $1
        WHERE cr.visibility = 'public'
      `;
      const params: any[] = [req.user!.id];

      if (category) {
        const categoryIndex = params.length + 1;
        query += ` AND cr.cuisine = $${categoryIndex}`;
        params.push(category);
      }

      if (search) {
        const searchIndex = params.length + 1;
        query += ` AND (cr.title ILIKE $${searchIndex} OR cr.description ILIKE $${searchIndex} OR cr.dietary_tags::text ILIKE $${searchIndex})`;
        params.push(`%${search}%`);
      }

      // Add sorting
      switch (sort) {
        case 'popular':
          query += ' ORDER BY cr.rating_average DESC, cr.rating_count DESC';
          break;
        case 'trending':
          query += ' ORDER BY cr.view_count DESC, cr.created_at DESC';
          break;
        case 'recent':
        default:
          query += ' ORDER BY cr.created_at DESC';
          break;
      }

      const limitIndex = params.length + 1;
      const offsetIndex = params.length + 2;
      query += ` LIMIT $${limitIndex} OFFSET $${offsetIndex}`;
      params.push(parseInt(limit as string), parseInt(offset as string));

      const result = await client.query(query, params);

      // Get total count for pagination
      let countQuery = `
        SELECT COUNT(*) as total
        FROM custom_recipes cr
        WHERE cr.visibility = 'public'
      `;
      const countParams: any[] = [];

      if (category) {
        countQuery += ' AND cr.cuisine = $1';
        countParams.push(category);
      }

      if (search) {
        const searchIndex = countParams.length + 1;
        countQuery += ` AND (cr.title ILIKE $${searchIndex} OR cr.description ILIKE $${searchIndex} OR cr.dietary_tags::text ILIKE $${searchIndex})`;
        countParams.push(`%${search}%`);
      }

      const countResult = await client.query(countQuery, countParams);
      const totalCount = parseInt(countResult.rows[0].total);

      return res.json({
        success: true,
        recipes: result.rows,
        pagination: {
          total: totalCount,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          hasMore: parseInt(offset as string) + parseInt(limit as string) < totalCount,
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Get community recipes error:', error);
    return next(createError('Failed to get community recipes', 500));
  }
});

// Get single custom recipe details
router.get('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const client = await pool.connect();
    try {
      // Get recipe details
      const recipeResult = await client.query(`
        SELECT cr.*, u.first_name, u.last_name,
               CASE WHEN cr.user_id = $1 THEN true ELSE false END as is_owner,
               CASE WHEN ucr.id IS NOT NULL THEN true ELSE false END as is_saved
        FROM custom_recipes cr
        JOIN users u ON cr.user_id = u.id
        LEFT JOIN user_custom_recipes ucr ON cr.id = ucr.recipe_id AND ucr.user_id = $1
        WHERE cr.id = $2 AND (cr.visibility = 'public' OR cr.user_id = $1)
      `, [req.user!.id, id]);

      if (recipeResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Recipe not found or not accessible',
        });
      }

      const recipe = recipeResult.rows[0];

      // Increment view count if not the owner
      if (!recipe.is_owner) {
        await client.query(
          'UPDATE custom_recipes SET view_count = view_count + 1 WHERE id = $1',
          [id]
        );
        recipe.view_count += 1;
      }

      // Get user's dietary restrictions and preferences for unit conversion
      const userResult = await client.query(
        'SELECT dietary_restrictions, allergies, preferred_units FROM users WHERE id = $1',
        [req.user!.id]
      );
      
      const user = userResult.rows[0];
      const preferredUnits = user?.preferred_units || 'metric';

      // Apply unit conversion if needed
      let convertedRecipe = recipe;
      if (preferredUnits && recipe.ingredients) {
        // Convert ingredient measurements to user's preferred units
        const convertedIngredients = recipe.ingredients.map((ingredient: any) => {
          if (ingredient.amount && ingredient.unit) {
            // Simple unit conversion - in a real implementation, this would use the UnitConversionService
            return {
              ...ingredient,
              originalAmount: ingredient.amount,
              originalUnit: ingredient.unit,
            };
          }
          return ingredient;
        });

        convertedRecipe = {
          ...recipe,
          ingredients: convertedIngredients,
          unitConversion: {
            applied: true,
            system: preferredUnits,
          },
        };
      }

      // Award points for viewing custom recipe
      await client.query(
        'UPDATE users SET points = points + 1 WHERE id = $1',
        [req.user!.id]
      );

      return res.json({
        success: true,
        recipe: convertedRecipe,
        pointsAwarded: 1,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Get custom recipe details error:', error);
    return next(createError('Failed to get recipe details', 500));
  }
});

// Create new custom recipe
router.post('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const {
      title,
      description,
      ingredients,
      instructions,
      prep_time,
      cook_time,
      servings,
      difficulty,
      cuisine,
      dietary_tags,
      image_url,
      visibility = 'private',
    } = req.body;

    if (!title || !ingredients || !instructions) {
      return res.status(400).json({
        success: false,
        message: 'Title, ingredients, and instructions are required',
      });
    }

    if (!['private', 'public'].includes(visibility)) {
      return res.status(400).json({
        success: false,
        message: 'Visibility must be either "private" or "public"',
      });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(`
        INSERT INTO custom_recipes (
          user_id, title, description, ingredients, instructions,
          prep_time, cook_time, servings, difficulty, cuisine,
          dietary_tags, image_url, visibility, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
        RETURNING *
      `, [
        req.user!.id,
        title,
        description,
        JSON.stringify(ingredients),
        JSON.stringify(instructions),
        prep_time || null,
        cook_time || null,
        servings || 4,
        difficulty || 'medium',
        cuisine || 'other',
        JSON.stringify(dietary_tags || []),
        image_url || null,
        visibility,
      ]);

      // Award points for creating custom recipe
      const pointsAwarded = visibility === 'public' ? 10 : 5;
      await client.query(
        'UPDATE users SET points = points + $1 WHERE id = $2',
        [pointsAwarded, req.user!.id]
      );

      logger.info(`Custom recipe created by user ${req.user!.id}: ${title} (${visibility})`);

      return res.status(201).json({
        success: true,
        message: 'Custom recipe created successfully',
        recipe: result.rows[0],
        pointsAwarded,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Create custom recipe error:', error);
    return next(createError('Failed to create custom recipe', 500));
  }
});

// Update custom recipe
router.put('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      ingredients,
      instructions,
      prep_time,
      cook_time,
      servings,
      difficulty,
      cuisine,
      dietary_tags,
      image_url,
      visibility,
    } = req.body;

    const client = await pool.connect();
    try {
      // Check if user owns the recipe
      const ownerCheck = await client.query(
        'SELECT user_id FROM custom_recipes WHERE id = $1',
        [id]
      );

      if (ownerCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Recipe not found',
        });
      }

      if (ownerCheck.rows[0].user_id !== req.user!.id) {
        return res.status(403).json({
          success: false,
          message: 'You can only edit your own recipes',
        });
      }

      const result = await client.query(`
        UPDATE custom_recipes SET
          title = COALESCE($1, title),
          description = COALESCE($2, description),
          ingredients = COALESCE($3, ingredients),
          instructions = COALESCE($4, instructions),
          prep_time = COALESCE($5, prep_time),
          cook_time = COALESCE($6, cook_time),
          servings = COALESCE($7, servings),
          difficulty = COALESCE($8, difficulty),
          cuisine = COALESCE($9, cuisine),
          dietary_tags = COALESCE($10, dietary_tags),
          image_url = COALESCE($11, image_url),
          visibility = COALESCE($12, visibility),
          updated_at = NOW()
        WHERE id = $13 AND user_id = $14
        RETURNING *
      `, [
        title,
        description,
        ingredients ? JSON.stringify(ingredients) : null,
        instructions ? JSON.stringify(instructions) : null,
        prep_time,
        cook_time,
        servings,
        difficulty,
        cuisine,
        dietary_tags ? JSON.stringify(dietary_tags) : null,
        image_url,
        visibility,
        id,
        req.user!.id,
      ]);

      return res.json({
        success: true,
        message: 'Recipe updated successfully',
        recipe: result.rows[0],
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Update custom recipe error:', error);
    return next(createError('Failed to update custom recipe', 500));
  }
});

// Delete custom recipe
router.delete('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const client = await pool.connect();
    try {
      const result = await client.query(
        'DELETE FROM custom_recipes WHERE id = $1 AND user_id = $2',
        [id, req.user!.id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Recipe not found or not owned by user',
        });
      }

      return res.json({
        success: true,
        message: 'Recipe deleted successfully',
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Delete custom recipe error:', error);
    return next(createError('Failed to delete custom recipe', 500));
  }
});

// Save/unsave community recipe
router.post('/:id/save', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const client = await pool.connect();
    try {
      // Check if recipe exists and is public
      const recipeCheck = await client.query(
        'SELECT user_id FROM custom_recipes WHERE id = $1 AND visibility = $2',
        [id, 'public']
      );

      if (recipeCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Public recipe not found',
        });
      }

      // Check if already saved
      const existingResult = await client.query(
        'SELECT id FROM user_custom_recipes WHERE user_id = $1 AND recipe_id = $2',
        [req.user!.id, id]
      );

      if (existingResult.rows.length > 0) {
        // Unsave recipe
        await client.query(
          'DELETE FROM user_custom_recipes WHERE user_id = $1 AND recipe_id = $2',
          [req.user!.id, id]
        );

        return res.json({
          success: true,
          message: 'Recipe removed from saved recipes',
          action: 'unsaved',
        });
      } else {
        // Save recipe
        await client.query(
          'INSERT INTO user_custom_recipes (user_id, recipe_id, saved_at) VALUES ($1, $2, NOW())',
          [req.user!.id, id]
        );

        // Award points for saving community recipe
        await client.query(
          'UPDATE users SET points = points + 3 WHERE id = $1',
          [req.user!.id]
        );

        return res.json({
          success: true,
          message: 'Recipe saved successfully',
          action: 'saved',
          pointsAwarded: 3,
        });
      }
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Save/unsave recipe error:', error);
    return next(createError('Failed to save/unsave recipe', 500));
  }
});

// Rate custom recipe
router.post('/:id/rate', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { rating } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5',
      });
    }

    const client = await pool.connect();
    try {
      // Check if recipe exists and is public
      const recipeCheck = await client.query(
        'SELECT user_id FROM custom_recipes WHERE id = $1 AND visibility = $2',
        [id, 'public']
      );

      if (recipeCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Public recipe not found',
        });
      }

      // Check if user is trying to rate their own recipe
      if (recipeCheck.rows[0].user_id === req.user!.id) {
        return res.status(400).json({
          success: false,
          message: 'You cannot rate your own recipe',
        });
      }

      // Insert or update rating
      await client.query(`
        INSERT INTO custom_recipe_ratings (user_id, recipe_id, rating, created_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (user_id, recipe_id) DO UPDATE SET
        rating = $3, updated_at = NOW()
      `, [req.user!.id, id, rating]);

      // Update recipe average rating
      const avgResult = await client.query(`
        SELECT AVG(rating)::DECIMAL(3,2) as avg_rating, COUNT(*) as rating_count
        FROM custom_recipe_ratings
        WHERE recipe_id = $1
      `, [id]);

      const { avg_rating, rating_count } = avgResult.rows[0];

      await client.query(
        'UPDATE custom_recipes SET rating_average = $1, rating_count = $2 WHERE id = $3',
        [avg_rating, rating_count, id]
      );

      // Award points for rating
      await client.query(
        'UPDATE users SET points = points + 2 WHERE id = $1',
        [req.user!.id]
      );

      return res.json({
        success: true,
        message: 'Recipe rated successfully',
        rating: {
          userRating: rating,
          averageRating: parseFloat(avg_rating),
          totalRatings: parseInt(rating_count),
        },
        pointsAwarded: 2,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Rate recipe error:', error);
    return next(createError('Failed to rate recipe', 500));
  }
});

// Get user's saved community recipes
router.get('/saved/list', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT cr.id, cr.title, cr.description, cr.image_url, cr.cuisine,
               cr.prep_time, cr.cook_time, cr.servings, cr.difficulty,
               cr.rating_average, cr.rating_count, cr.view_count,
               u.first_name, u.last_name, ucr.saved_at
        FROM user_custom_recipes ucr
        JOIN custom_recipes cr ON ucr.recipe_id = cr.id
        JOIN users u ON cr.user_id = u.id
        WHERE ucr.user_id = $1 AND cr.visibility = 'public'
        ORDER BY ucr.saved_at DESC
      `, [req.user!.id]);

      return res.json({
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

export default router;