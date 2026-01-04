import express from 'express';
import { pool } from '../server';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';

const router = express.Router();

// Get user settings
router.get('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT show_nutrition, preferred_units, dietary_restrictions, allergies
         FROM users WHERE id = $1`,
        [req.user!.id]
      );

      res.json({
        success: true,
        settings: result.rows[0] || {},
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Get settings error:', error);
    next(createError('Failed to get settings', 500));
  }
});

// Update user settings
router.put('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { show_nutrition, preferred_units } = req.body;

    const client = await pool.connect();
    try {
      await client.query(
        'UPDATE users SET show_nutrition = $1, preferred_units = $2 WHERE id = $3',
        [show_nutrition, preferred_units, req.user!.id]
      );

      res.json({
        success: true,
        message: 'Settings updated successfully',
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Update settings error:', error);
    next(createError('Failed to update settings', 500));
  }
});

export default router;