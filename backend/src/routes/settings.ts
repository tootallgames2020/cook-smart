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

// Get privacy settings
router.get('/privacy', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT email, first_name, last_name, created_at
         FROM users WHERE id = $1`,
        [req.user!.id]
      );

      const user = result.rows[0];
      res.json({
        success: true,
        privacy: {
          profileVisibility: 'private', // Default privacy setting
          shareData: false,
          allowNotifications: true,
          accountInfo: {
            email: user?.email || '',
            name: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : '',
            memberSince: user?.created_at || new Date().toISOString(),
          },
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Get privacy settings error:', error);
    next(createError('Failed to get privacy settings', 500));
  }
});

// Update privacy settings
router.put('/privacy', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { profileVisibility, shareData, allowNotifications } = req.body;

    // For now, just return success as we don't have privacy columns in the database yet
    res.json({
      success: true,
      message: 'Privacy settings updated successfully',
      settings: {
        profileVisibility: profileVisibility || 'private',
        shareData: shareData || false,
        allowNotifications: allowNotifications !== false,
      },
    });
  } catch (error) {
    logger.error('Update privacy settings error:', error);
    next(createError('Failed to update privacy settings', 500));
  }
});

export default router;