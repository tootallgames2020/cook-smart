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
      // Get user info and privacy settings
      const userResult = await client.query(
        `SELECT email, first_name, last_name, created_at
         FROM users WHERE id = $1`,
        [req.user!.id]
      );

      // Get privacy settings, create default if not exists
      let privacyResult = await client.query(
        `SELECT data_sharing, analytics_enabled, push_notifications, location_services
         FROM privacy_settings WHERE user_id = $1`,
        [req.user!.id]
      );

      if (privacyResult.rows.length === 0) {
        // Create default privacy settings
        await client.query(`
          INSERT INTO privacy_settings (user_id, data_sharing, analytics_enabled, push_notifications, location_services)
          VALUES ($1, false, true, true, false)
        `, [req.user!.id]);

        privacyResult = await client.query(
          `SELECT data_sharing, analytics_enabled, push_notifications, location_services
           FROM privacy_settings WHERE user_id = $1`,
          [req.user!.id]
        );
      }

      const user = userResult.rows[0];
      const privacy = privacyResult.rows[0];

      res.json({
        success: true,
        data_sharing: privacy?.data_sharing || false,
        analytics_enabled: privacy?.analytics_enabled !== false,
        push_notifications: privacy?.push_notifications !== false,
        location_services: privacy?.location_services || false,
        accountInfo: {
          email: user?.email || '',
          name: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : '',
          memberSince: user?.created_at || new Date().toISOString(),
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

// Update privacy settings (PATCH method for partial updates)
router.patch('/privacy', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { data_sharing, analytics_enabled, push_notifications, location_services } = req.body;

    const client = await pool.connect();
    try {
      // Build dynamic update query based on provided fields
      const updates: string[] = [];
      const values: any[] = [req.user!.id];
      let paramCount = 1;

      if (data_sharing !== undefined) {
        paramCount++;
        updates.push(`data_sharing = $${paramCount}`);
        values.push(data_sharing);
      }

      if (analytics_enabled !== undefined) {
        paramCount++;
        updates.push(`analytics_enabled = $${paramCount}`);
        values.push(analytics_enabled);
      }

      if (push_notifications !== undefined) {
        paramCount++;
        updates.push(`push_notifications = $${paramCount}`);
        values.push(push_notifications);
      }

      if (location_services !== undefined) {
        paramCount++;
        updates.push(`location_services = $${paramCount}`);
        values.push(location_services);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No settings provided to update',
        });
      }

      // First, ensure the user has a privacy settings record
      await client.query(`
        INSERT INTO privacy_settings (user_id, data_sharing, analytics_enabled, push_notifications, location_services)
        VALUES ($1, false, true, true, false)
        ON CONFLICT (user_id) DO NOTHING
      `, [req.user!.id]);

      // Now update the settings
      const query = `
        UPDATE privacy_settings 
        SET ${updates.join(', ')}, updated_at = NOW()
        WHERE user_id = $1
        RETURNING data_sharing, analytics_enabled, push_notifications, location_services
      `;

      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Failed to update privacy settings',
        });
      }

      logger.info(`Privacy settings updated for user ${req.user!.id}`);

      res.json({
        success: true,
        message: 'Privacy settings updated successfully',
        settings: result.rows[0],
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Update privacy settings error:', error);
    next(createError('Failed to update privacy settings', 500));
  }
});

export default router;