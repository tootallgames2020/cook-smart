import express from 'express';
import { pool } from '../server';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { SmartExpirationService } from '../services/SmartExpirationService';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';

const router = express.Router();

// Get expiration dashboard for user
router.get('/dashboard', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const dashboard = await SmartExpirationService.getExpirationDashboard(req.user!.id);
    
    if (!dashboard) {
      return res.status(500).json({
        success: false,
        message: 'Failed to load expiration dashboard',
      });
    }

    return res.json({
      success: true,
      dashboard,
    });
  } catch (error) {
    logger.error('Get expiration dashboard error:', error);
    return next(createError('Failed to get expiration dashboard', 500));
  }
});

// Get expiring ingredients for user
router.get('/ingredients', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { days = 3 } = req.query;
    const daysAhead = parseInt(days as string);

    if (daysAhead < 1 || daysAhead > 30) {
      return res.status(400).json({
        success: false,
        message: 'Days must be between 1 and 30',
      });
    }

    const expiringIngredients = await SmartExpirationService.getExpiringIngredients(
      req.user!.id, 
      daysAhead
    );

    return res.json({
      success: true,
      ingredients: expiringIngredients,
      count: expiringIngredients.length,
      days_ahead: daysAhead,
    });
  } catch (error) {
    logger.error('Get expiring ingredients error:', error);
    return next(createError('Failed to get expiring ingredients', 500));
  }
});

// Get recipe suggestions for expiring ingredients
router.get('/recipe-suggestions', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const recipeSuggestions = await SmartExpirationService.findRecipeSuggestionsForExpiring(
      req.user!.id
    );

    return res.json({
      success: true,
      suggestions: recipeSuggestions,
      count: recipeSuggestions.length,
    });
  } catch (error) {
    logger.error('Get recipe suggestions error:', error);
    return next(createError('Failed to get recipe suggestions', 500));
  }
});

// Auto-set expiration date for ingredient with storage type
router.post('/auto-set-expiration', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { ingredient_name, storage_type = 'fresh' } = req.body;

    if (!ingredient_name) {
      return res.status(400).json({
        success: false,
        message: 'Ingredient name is required',
      });
    }

    const validStorageTypes = ['fresh', 'frozen', 'canned', 'dried', 'refrigerated'];
    if (!validStorageTypes.includes(storage_type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid storage type. Must be one of: ${validStorageTypes.join(', ')}`,
      });
    }

    const expirationDate = await SmartExpirationService.autoSetExpirationDate(
      ingredient_name, 
      storage_type
    );

    if (!expirationDate) {
      return res.status(500).json({
        success: false,
        message: 'Failed to calculate expiration date',
      });
    }

    return res.json({
      success: true,
      ingredient_name,
      storage_type,
      suggested_expiration_date: expirationDate.toISOString(),
      days_from_now: Math.ceil((expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    });
  } catch (error) {
    logger.error('Auto-set expiration error:', error);
    return next(createError('Failed to auto-set expiration date', 500));
  }
});

// Get preservation suggestions for ingredient
router.get('/preservation-suggestions/:ingredient_name', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { ingredient_name } = req.params;

    const suggestions = SmartExpirationService.getPreservationSuggestions(ingredient_name);

    return res.json({
      success: true,
      ingredient_name,
      preservation_options: suggestions,
      storage_types: {
        fresh: 'Normal storage (base expiration)',
        refrigerated: 'Refrigerated (50% longer)',
        frozen: 'Frozen (30x longer - months/years)',
        canned: 'Canned (365x longer - years)',
        dried: 'Dried/Dehydrated (180x longer - 6+ months)',
      },
    });
  } catch (error) {
    logger.error('Get preservation suggestions error:', error);
    return next(createError('Failed to get preservation suggestions', 500));
  }
});

// Update ingredient storage type and recalculate expiration
router.put('/update-storage/:ingredient_id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { ingredient_id } = req.params;
    const { new_storage_type } = req.body;

    const validStorageTypes = ['fresh', 'frozen', 'canned', 'dried', 'refrigerated'];
    if (!validStorageTypes.includes(new_storage_type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid storage type. Must be one of: ${validStorageTypes.join(', ')}`,
      });
    }

    const client = await pool.connect();
    try {
      // Get current ingredient
      const currentResult = await client.query(
        'SELECT * FROM user_ingredients WHERE id = $1 AND user_id = $2',
        [ingredient_id, req.user!.id]
      );

      if (currentResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Ingredient not found',
        });
      }

      const ingredient = currentResult.rows[0];
      const currentStorageType = ingredient.storage_type || 'fresh';

      // Calculate new expiration date
      const newExpirationDate = SmartExpirationService.calculateExtendedExpiration(
        new Date(ingredient.expiration_date),
        currentStorageType,
        new_storage_type
      );

      // Update ingredient
      const updateResult = await client.query(
        `UPDATE user_ingredients 
         SET storage_type = $1, expiration_date = $2, updated_at = NOW()
         WHERE id = $3 AND user_id = $4
         RETURNING *`,
        [new_storage_type, newExpirationDate, ingredient_id, req.user!.id]
      );

      return res.json({
        success: true,
        message: 'Storage type updated and expiration recalculated',
        ingredient: updateResult.rows[0],
        changes: {
          old_storage_type: currentStorageType,
          new_storage_type,
          old_expiration: ingredient.expiration_date,
          new_expiration: newExpirationDate.toISOString(),
          days_extended: Math.ceil((newExpirationDate.getTime() - new Date(ingredient.expiration_date).getTime()) / (1000 * 60 * 60 * 24)),
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Update storage type error:', error);
    return next(createError('Failed to update storage type', 500));
  }
});

// Trigger manual expiration check (for testing)
router.post('/check-notifications', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    // Only allow this in development or for admin users
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Manual notification checks not allowed in production',
      });
    }

    await SmartExpirationService.sendSmartExpirationNotifications();

    return res.json({
      success: true,
      message: 'Expiration notifications check completed',
    });
  } catch (error) {
    logger.error('Manual expiration check error:', error);
    return next(createError('Failed to check expiration notifications', 500));
  }
});

export default router;