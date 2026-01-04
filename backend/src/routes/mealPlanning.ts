import express from 'express';
import { pool } from '../server';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';
import { RecipeEnhancementService } from '../services/RecipeEnhancementService';

const router = express.Router();

// Get meal plans for a date range
router.get('/', authenticateToken, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      res.status(400).json({
        success: false,
        message: 'Start date and end date are required',
      });
      return;
    }

    const mealPlans = await RecipeEnhancementService.getMealPlans(
      req.user!.id,
      startDate as string,
      endDate as string
    );

    res.json({
      success: true,
      mealPlans,
      count: mealPlans.length,
    });
  } catch (error) {
    logger.error('Get meal plans error:', error);
    next(createError('Failed to get meal plans', 500));
  }
});

// Add a meal plan
router.post('/', authenticateToken, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const { recipeId, recipeType = 'api', plannedDate, mealType = 'dinner', notes } = req.body;

    if (!recipeId || !plannedDate) {
      res.status(400).json({
        success: false,
        message: 'Recipe ID and planned date are required',
      });
      return;
    }

    // Validate meal type
    const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
    if (!validMealTypes.includes(mealType)) {
      res.status(400).json({
        success: false,
        message: 'Invalid meal type. Must be: breakfast, lunch, dinner, or snack',
      });
      return;
    }

    const mealPlan = await RecipeEnhancementService.addMealPlan(
      req.user!.id,
      recipeId,
      recipeType,
      plannedDate,
      mealType,
      notes
    );

    // Award points for meal planning
    const client = await pool.connect();
    try {
      await client.query(
        'UPDATE users SET points = points + 2 WHERE id = $1',
        [req.user!.id]
      );
    } finally {
      client.release();
    }

    logger.info(`Meal plan created by user ${req.user!.id}: ${recipeId} for ${plannedDate}`);

    res.status(201).json({
      success: true,
      mealPlan,
      pointsAwarded: 2,
      message: 'Meal plan created successfully',
    });
  } catch (error) {
    logger.error('Create meal plan error:', error);
    next(createError('Failed to create meal plan', 500));
  }
});

// Update a meal plan
router.put('/:id', authenticateToken, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const { id } = req.params;
    const { plannedDate, mealType, notes, completed } = req.body;

    const client = await pool.connect();
    try {
      // Build dynamic update query
      const updates = [];
      const values = [];
      let paramCount = 1;

      if (plannedDate !== undefined) {
        updates.push(`planned_date = $${paramCount++}`);
        values.push(plannedDate);
      }

      if (mealType !== undefined) {
        const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
        if (!validMealTypes.includes(mealType)) {
          res.status(400).json({
            success: false,
            message: 'Invalid meal type. Must be: breakfast, lunch, dinner, or snack',
          });
          return;
        }
        updates.push(`meal_type = $${paramCount++}`);
        values.push(mealType);
      }

      if (notes !== undefined) {
        updates.push(`notes = $${paramCount++}`);
        values.push(notes);
      }

      if (completed !== undefined) {
        updates.push(`completed = $${paramCount++}`);
        values.push(completed);
      }

      if (updates.length === 0) {
        res.status(400).json({
          success: false,
          message: 'No valid fields to update',
        });
        return;
      }

      values.push(id, req.user!.id);

      const result = await client.query(
        `UPDATE meal_plans 
         SET ${updates.join(', ')}
         WHERE id = $${paramCount++} AND user_id = $${paramCount++}
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Meal plan not found or not owned by user',
        });
        return;
      }

      res.json({
        success: true,
        mealPlan: result.rows[0],
        message: 'Meal plan updated successfully',
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Update meal plan error:', error);
    next(createError('Failed to update meal plan', 500));
  }
});

// Delete a meal plan
router.delete('/:id', authenticateToken, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const { id } = req.params;

    const deletedMealPlan = await RecipeEnhancementService.deleteMealPlan(
      parseInt(id),
      req.user!.id
    );

    if (!deletedMealPlan) {
      res.status(404).json({
        success: false,
        message: 'Meal plan not found or not owned by user',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Meal plan deleted successfully',
    });
  } catch (error) {
    logger.error('Delete meal plan error:', error);
    next(createError('Failed to delete meal plan', 500));
  }
});

// Mark meal as completed
router.post('/:id/complete', authenticateToken, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const { id } = req.params;

    const mealPlan = await RecipeEnhancementService.markMealComplete(
      parseInt(id),
      req.user!.id
    );

    if (!mealPlan) {
      res.status(404).json({
        success: false,
        message: 'Meal plan not found or not owned by user',
      });
      return;
    }

    // Award points for completing a meal
    const client = await pool.connect();
    try {
      await client.query(
        'UPDATE users SET points = points + 5 WHERE id = $1',
        [req.user!.id]
      );
    } finally {
      client.release();
    }

    res.json({
      success: true,
      mealPlan,
      pointsAwarded: 5,
      message: 'Meal marked as completed',
    });
  } catch (error) {
    logger.error('Complete meal plan error:', error);
    next(createError('Failed to complete meal plan', 500));
  }
});

// Get meal plan statistics
router.get('/stats', authenticateToken, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT 
           COUNT(*) as total_planned,
           COUNT(*) FILTER (WHERE completed = true) as completed,
           COUNT(*) FILTER (WHERE completed = false) as pending,
           COUNT(DISTINCT meal_type) as meal_types_used,
           COUNT(*) FILTER (WHERE planned_date >= CURRENT_DATE) as upcoming
         FROM meal_plans 
         WHERE user_id = $1`,
        [req.user!.id]
      );

      const stats = result.rows[0];

      // Get meal type breakdown
      const mealTypeResult = await client.query(
        `SELECT meal_type, COUNT(*) as count
         FROM meal_plans 
         WHERE user_id = $1
         GROUP BY meal_type
         ORDER BY count DESC`,
        [req.user!.id]
      );

      res.json({
        success: true,
        stats: {
          totalPlanned: parseInt(stats.total_planned),
          completed: parseInt(stats.completed),
          pending: parseInt(stats.pending),
          upcoming: parseInt(stats.upcoming),
          completionRate: stats.total_planned > 0 
            ? Math.round((stats.completed / stats.total_planned) * 100) 
            : 0,
          mealTypeBreakdown: mealTypeResult.rows,
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Get meal plan stats error:', error);
    next(createError('Failed to get meal plan statistics', 500));
  }
});

// Get weekly meal plan template
router.get('/template/weekly', authenticateToken, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const { startDate } = req.query;
    
    if (!startDate) {
      res.status(400).json({
        success: false,
        message: 'Start date is required',
      });
      return;
    }

    // Generate 7-day template
    const template: any[] = [];
    const start = new Date(startDate as string);
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      const dateString = date.toISOString().split('T')[0];
      
      template.push({
        date: dateString,
        dayName,
        meals: {
          breakfast: null,
          lunch: null,
          dinner: null,
          snack: null,
        },
      });
    }

    // Fill in existing meal plans
    const client = await pool.connect();
    try {
      const endDate = new Date(start);
      endDate.setDate(start.getDate() + 6);
      
      const result = await client.query(
        `SELECT * FROM meal_plans 
         WHERE user_id = $1 
         AND planned_date BETWEEN $2 AND $3
         ORDER BY planned_date, meal_type`,
        [req.user!.id, start.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
      );

      // Map existing meal plans to template
      result.rows.forEach(mealPlan => {
        const templateDay = template.find(day => day.date === mealPlan.planned_date);
        if (templateDay) {
          templateDay.meals[mealPlan.meal_type as keyof typeof templateDay.meals] = mealPlan;
        }
      });

      res.json({
        success: true,
        template,
        weekStart: start.toISOString().split('T')[0],
        weekEnd: endDate.toISOString().split('T')[0],
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Get weekly template error:', error);
    next(createError('Failed to get weekly meal plan template', 500));
  }
});

export default router;