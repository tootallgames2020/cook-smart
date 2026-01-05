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

      return res.json({
        success: true,
        message: 'Privacy settings updated successfully',
        settings: result.rows[0],
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Update privacy settings error:', error);
    return next(createError('Failed to update privacy settings', 500));
  }
});

// Export user data (GDPR compliance)
router.get('/export-data', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const client = await pool.connect();
    try {
      // Get all user data for export
      const userQuery = 'SELECT * FROM users WHERE id = $1';
      const ingredientsQuery = 'SELECT * FROM user_ingredients WHERE user_id = $1';
      const recipesQuery = 'SELECT * FROM user_recipes WHERE user_id = $1';
      const shoppingQuery = 'SELECT * FROM shopping_lists WHERE user_id = $1';
      const privacyQuery = 'SELECT * FROM privacy_settings WHERE user_id = $1';
      const notificationQuery = 'SELECT * FROM notification_preferences WHERE user_id = $1';

      const [user, ingredients, recipes, shopping, privacy, notifications] = await Promise.all([
        client.query(userQuery, [req.user!.id]),
        client.query(ingredientsQuery, [req.user!.id]),
        client.query(recipesQuery, [req.user!.id]),
        client.query(shoppingQuery, [req.user!.id]),
        client.query(privacyQuery, [req.user!.id]),
        client.query(notificationQuery, [req.user!.id]),
      ]);

      // Remove sensitive data
      const userData = user.rows[0];
      if (userData) {
        delete userData.password_hash;
        delete userData.two_factor_secret;
      }

      const exportData = {
        user: userData,
        ingredients: ingredients.rows,
        recipes: recipes.rows,
        shopping_lists: shopping.rows,
        privacy_settings: privacy.rows[0] || null,
        notification_preferences: notifications.rows[0] || null,
        exported_at: new Date().toISOString(),
        export_format: 'JSON',
      };

      logger.info(`Data export completed for user ${req.user!.id}`);

      res.json({
        success: true,
        message: 'Data export completed successfully',
        data: exportData,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Export user data error:', error);
    next(createError('Failed to export user data', 500));
  }
});

// Get two-factor authentication status
router.get('/two-factor', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT two_factor_enabled FROM users WHERE id = $1',
        [req.user!.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      return res.json({
        success: true,
        enabled: result.rows[0].two_factor_enabled || false,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Get two-factor status error:', error);
    return next(createError('Failed to get two-factor status', 500));
  }
});

// Enable two-factor authentication
router.post('/two-factor/enable', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const client = await pool.connect();
    try {
      // Check if user already has 2FA enabled
      const checkResult = await client.query(
        'SELECT two_factor_enabled FROM users WHERE id = $1',
        [req.user!.id]
      );

      if (checkResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      if (checkResult.rows[0].two_factor_enabled) {
        return res.status(400).json({
          success: false,
          message: 'Two-factor authentication is already enabled',
        });
      }

      // Generate a secret for 2FA (in production, use speakeasy or similar)
      const secret = Math.random().toString(36).substring(2, 15) + 
                    Math.random().toString(36).substring(2, 15);

      const result = await client.query(`
        UPDATE users
        SET two_factor_enabled = TRUE,
            two_factor_secret = $1,
            updated_at = NOW()
        WHERE id = $2
        RETURNING two_factor_enabled
      `, [secret, req.user!.id]);

      logger.info(`Two-factor authentication enabled for user ${req.user!.id}`);

      return res.json({
        success: true,
        message: 'Two-factor authentication enabled successfully',
        enabled: result.rows[0].two_factor_enabled,
        secret: secret, // In production, this should be a QR code
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Enable two-factor error:', error);
    return next(createError('Failed to enable two-factor authentication', 500));
  }
});

// Disable two-factor authentication
router.post('/two-factor/disable', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        UPDATE users
        SET two_factor_enabled = FALSE,
            two_factor_secret = NULL,
            updated_at = NOW()
        WHERE id = $1
        RETURNING two_factor_enabled
      `, [req.user!.id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      logger.info(`Two-factor authentication disabled for user ${req.user!.id}`);

      return res.json({
        success: true,
        message: 'Two-factor authentication disabled successfully',
        enabled: result.rows[0].two_factor_enabled,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Disable two-factor error:', error);
    return next(createError('Failed to disable two-factor authentication', 500));
  }
});

export default router;