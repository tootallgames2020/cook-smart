import express from 'express';
import { pool } from '../server';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';

const router = express.Router();

// Get user's dietary restrictions
router.get('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT dietary_restrictions, allergies FROM users WHERE id = $1',
        [req.user!.id]
      );

      res.json({
        success: true,
        dietary_restrictions: result.rows[0]?.dietary_restrictions || [],
        allergies: result.rows[0]?.allergies || [],
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Get dietary preferences error:', error);
    next(createError('Failed to get dietary preferences', 500));
  }
});

// Update dietary restrictions
router.post('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { dietary_restrictions } = req.body;

    const client = await pool.connect();
    try {
      await client.query(
        'UPDATE users SET dietary_restrictions = $1 WHERE id = $2',
        [JSON.stringify(dietary_restrictions || []), req.user!.id]
      );

      res.json({
        success: true,
        message: 'Dietary restrictions updated successfully',
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Update dietary restrictions error:', error);
    next(createError('Failed to update dietary restrictions', 500));
  }
});

// Update allergies
router.post('/allergies', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { allergies } = req.body;

    const client = await pool.connect();
    try {
      await client.query(
        'UPDATE users SET allergies = $1 WHERE id = $2',
        [JSON.stringify(allergies || []), req.user!.id]
      );

      res.json({
        success: true,
        message: 'Allergies updated successfully',
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Update allergies error:', error);
    next(createError('Failed to update allergies', 500));
  }
});

export default router;