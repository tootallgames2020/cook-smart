import express from 'express';
import { pool } from '../server';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';

const router = express.Router();

// Register push notification token
router.post('/register', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { token, platform } = req.body;

    if (!token || !platform) {
      return res.status(400).json({
        success: false,
        message: 'Token and platform are required',
      });
    }

    const client = await pool.connect();
    try {
      // Insert or update push notification token
      await client.query(`
        INSERT INTO push_notification_tokens (user_id, token, platform, updated_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (user_id, token) 
        DO UPDATE SET platform = $3, updated_at = NOW()
      `, [req.user!.id, token, platform]);

      logger.info(`Push token registered for user ${req.user!.id}: ${platform}`);

      return res.json({
        success: true,
        message: 'Push notification token registered successfully',
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Register push token error:', error);
    return next(createError('Failed to register push notification token', 500));
  }
});

// Get notification preferences
router.get('/preferences', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const client = await pool.connect();
    try {
      // Get preferences from notification_preferences table, create default if not exists
      let result = await client.query(`
        SELECT expiry_alerts, recipe_suggestions, achievement_notifications, daily_reminders
        FROM notification_preferences 
        WHERE user_id = $1
      `, [req.user!.id]);

      if (result.rows.length === 0) {
        // Create default preferences for user
        await client.query(`
          INSERT INTO notification_preferences (user_id, expiry_alerts, recipe_suggestions, achievement_notifications, daily_reminders)
          VALUES ($1, true, true, true, true)
        `, [req.user!.id]);

        // Return default preferences
        return res.json({
          expiry_alerts: true,
          recipe_suggestions: true,
          achievement_notifications: true,
          daily_reminders: true,
        });
      }

      const preferences = result.rows[0];

      return res.json({
        expiry_alerts: preferences.expiry_alerts,
        recipe_suggestions: preferences.recipe_suggestions,
        achievement_notifications: preferences.achievement_notifications,
        daily_reminders: preferences.daily_reminders,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Get notification preferences error:', error);
    return next(createError('Failed to get notification preferences', 500));
  }
});

// Update notification preferences
router.put('/preferences', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { expiry_alerts, recipe_suggestions, achievement_notifications, daily_reminders } = req.body;

    const client = await pool.connect();
    try {
      // Build dynamic update query based on provided fields
      const updates: string[] = [];
      const values: any[] = [req.user!.id];
      let paramCount = 1;

      if (expiry_alerts !== undefined) {
        paramCount++;
        updates.push(`expiry_alerts = $${paramCount}`);
        values.push(expiry_alerts);
      }

      if (recipe_suggestions !== undefined) {
        paramCount++;
        updates.push(`recipe_suggestions = $${paramCount}`);
        values.push(recipe_suggestions);
      }

      if (achievement_notifications !== undefined) {
        paramCount++;
        updates.push(`achievement_notifications = $${paramCount}`);
        values.push(achievement_notifications);
      }

      if (daily_reminders !== undefined) {
        paramCount++;
        updates.push(`daily_reminders = $${paramCount}`);
        values.push(daily_reminders);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No preferences provided to update',
        });
      }

      // First, ensure the user has a preferences record
      await client.query(`
        INSERT INTO notification_preferences (user_id, expiry_alerts, recipe_suggestions, achievement_notifications, daily_reminders)
        VALUES ($1, true, true, true, true)
        ON CONFLICT (user_id) DO NOTHING
      `, [req.user!.id]);

      // Now update the preferences
      const query = `
        UPDATE notification_preferences 
        SET ${updates.join(', ')}, updated_at = NOW()
        WHERE user_id = $1
        RETURNING expiry_alerts, recipe_suggestions, achievement_notifications, daily_reminders
      `;

      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Failed to update preferences',
        });
      }

      logger.info(`Notification preferences updated for user ${req.user!.id}`);

      return res.json({
        success: true,
        message: 'Notification preferences updated successfully',
        preferences: result.rows[0],
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Update notification preferences error:', error);
    return next(createError('Failed to update notification preferences', 500));
  }
});

// Get user notifications
router.get('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { limit = 20, offset = 0, unreadOnly = false } = req.query;

    const client = await pool.connect();
    try {
      let query = `
        SELECT id, type, title, message, action_url, action_text, 
               is_read, is_urgent, expires_at, created_at, read_at
        FROM user_notifications 
        WHERE user_id = $1
      `;
      
      const params: any[] = [req.user!.id];
      
      if (unreadOnly === 'true') {
        query += ' AND is_read = false';
      }
      
      query += ' AND (expires_at IS NULL OR expires_at > NOW())';
      query += ' ORDER BY is_urgent DESC, created_at DESC';
      query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      
      params.push(parseInt(limit as string), parseInt(offset as string));

      const result = await client.query(query, params);

      // Get unread count
      const unreadResult = await client.query(
        'SELECT COUNT(*) as unread_count FROM user_notifications WHERE user_id = $1 AND is_read = false AND (expires_at IS NULL OR expires_at > NOW())',
        [req.user!.id]
      );

      return res.json({
        success: true,
        notifications: result.rows,
        unreadCount: parseInt(unreadResult.rows[0].unread_count),
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          total: result.rows.length,
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Get notifications error:', error);
    return next(createError('Failed to get notifications', 500));
  }
});

// Mark notification as read
router.patch('/:id/read', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const client = await pool.connect();
    try {
      const result = await client.query(`
        UPDATE user_notifications 
        SET is_read = true, read_at = NOW() 
        WHERE id = $1 AND user_id = $2
        RETURNING id
      `, [id, req.user!.id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found',
        });
      }

      return res.json({
        success: true,
        message: 'Notification marked as read',
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Mark notification read error:', error);
    return next(createError('Failed to mark notification as read', 500));
  }
});

// Mark all notifications as read
router.patch('/read-all', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        UPDATE user_notifications 
        SET is_read = true, read_at = NOW() 
        WHERE user_id = $1 AND is_read = false
      `, [req.user!.id]);

      return res.json({
        success: true,
        message: `${result.rowCount} notifications marked as read`,
        updatedCount: result.rowCount,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Mark all notifications read error:', error);
    return next(createError('Failed to mark notifications as read', 500));
  }
});

// Delete notification
router.delete('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const client = await pool.connect();
    try {
      const result = await client.query(
        'DELETE FROM user_notifications WHERE id = $1 AND user_id = $2 RETURNING id',
        [id, req.user!.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found',
        });
      }

      return res.json({
        success: true,
        message: 'Notification deleted',
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Delete notification error:', error);
    return next(createError('Failed to delete notification', 500));
  }
});

// Get payment failure status (for grace period info)
router.get('/payment-status', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const client = await pool.connect();
    try {
      // Check for active payment failures
      const failureResult = await client.query(`
        SELECT pf.*, s.stripe_subscription_id, sp.plan_name
        FROM payment_failures pf
        JOIN subscriptions s ON pf.subscription_id = s.id
        LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
        WHERE pf.user_id = $1 AND pf.status = 'grace_period'
        ORDER BY pf.created_at DESC
        LIMIT 1
      `, [req.user!.id]);

      if (failureResult.rows.length === 0) {
        return res.json({
          success: true,
          paymentStatus: 'current',
          message: 'No payment issues',
        });
      }

      const failure = failureResult.rows[0];
      const daysLeft = Math.ceil((new Date(failure.grace_period_end).getTime() - Date.now()) / (24 * 60 * 60 * 1000));

      return res.json({
        success: true,
        paymentStatus: 'grace_period',
        gracePeriod: {
          daysLeft: Math.max(0, daysLeft),
          endDate: failure.grace_period_end,
          attemptCount: failure.attempt_count,
          failureReason: failure.failure_reason,
          planName: failure.plan_name,
        },
        message: daysLeft > 0 
          ? `Payment failed. ${daysLeft} days remaining to update payment method.`
          : 'Grace period expired. Please update your payment method immediately.',
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Get payment status error:', error);
    return next(createError('Failed to get payment status', 500));
  }
});

// Retry failed payment
router.post('/retry-payment', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const client = await pool.connect();
    try {
      // Get active payment failure
      const failureResult = await client.query(`
        SELECT pf.*, s.stripe_subscription_id
        FROM payment_failures pf
        JOIN subscriptions s ON pf.subscription_id = s.id
        WHERE pf.user_id = $1 AND pf.status = 'grace_period'
        ORDER BY pf.created_at DESC
        LIMIT 1
      `, [req.user!.id]);

      if (failureResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No active payment failure found',
        });
      }

      const failure = failureResult.rows[0];

      // Check if grace period has expired
      if (new Date() > new Date(failure.grace_period_end)) {
        return res.status(400).json({
          success: false,
          message: 'Grace period has expired. Please contact support.',
        });
      }

      // Here you would integrate with Stripe to retry the payment
      // For now, we'll just create a notification that payment retry was requested
      await client.query(`
        INSERT INTO user_notifications (
          user_id, type, title, message, action_url, action_text, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `, [
        req.user!.id,
        'payment_retry',
        'Payment Retry Requested',
        'We will attempt to process your payment again within 24 hours. Please ensure your payment method is up to date.',
        '/subscription/payment-method',
        'Update Payment Method',
      ]);

      return res.json({
        success: true,
        message: 'Payment retry requested. We will attempt to process your payment again within 24 hours.',
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Retry payment error:', error);
    return next(createError('Failed to retry payment', 500));
  }
});

export default router;