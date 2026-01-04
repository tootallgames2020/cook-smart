import { pool } from '../server';
import { logger } from '../utils/logger';

export class PaymentFailureService {
  // Create or update payment failure record
  static async handlePaymentFailure(
    userId: string,
    subscriptionId: number,
    stripeInvoiceId: string,
    failureReason: string
  ): Promise<void> {
    const client = await pool.connect();
    try {
      // Check if this is a new failure or existing one
      const existingFailure = await client.query(`
        SELECT id, attempt_count, grace_period_end, status 
        FROM payment_failures 
        WHERE user_id = $1 AND subscription_id = $2 AND status = 'grace_period'
      `, [userId, subscriptionId]);

      if (existingFailure.rows.length > 0) {
        // Update existing failure
        const failure = existingFailure.rows[0];
        await client.query(`
          UPDATE payment_failures 
          SET attempt_count = attempt_count + 1,
              failure_reason = $1,
              last_notification_sent = NOW()
          WHERE id = $2
        `, [failureReason, failure.id]);

        // Send escalated notification
        await this.sendPaymentFailureNotification(userId, failure.attempt_count + 1, failure.grace_period_end);
      } else {
        // Create new payment failure record with 7-day grace period
        const gracePeriodEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
        
        await client.query(`
          INSERT INTO payment_failures (
            user_id, subscription_id, stripe_invoice_id, failure_reason,
            attempt_count, grace_period_start, grace_period_end, status,
            last_notification_sent, created_at
          ) VALUES ($1, $2, $3, $4, 1, NOW(), $5, 'grace_period', NOW(), NOW())
        `, [
          userId,
          subscriptionId,
          stripeInvoiceId,
          failureReason,
          gracePeriodEnd,
        ]);

        // Send initial payment failure notification
        await this.sendPaymentFailureNotification(userId, 1, gracePeriodEnd);
      }

      logger.info(`Payment failure handled for user ${userId} - Grace period active`);
    } finally {
      client.release();
    }
  }

  // Send payment failure notifications
  static async sendPaymentFailureNotification(
    userId: string, 
    attemptCount: number, 
    gracePeriodEnd: Date
  ): Promise<void> {
    const client = await pool.connect();
    try {
      // Get user details
      const userResult = await client.query(
        'SELECT email, first_name FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) return;
      
      const user = userResult.rows[0];
      const daysLeft = Math.ceil((gracePeriodEnd.getTime() - Date.now()) / (24 * 60 * 60 * 1000));

      let title, message, urgency;
      
      if (attemptCount === 1) {
        title = 'Payment Failed - Action Required';
        message = `Hi ${user.first_name}, your subscription payment failed. You have ${daysLeft} days to update your payment method before your subscription is suspended.`;
        urgency = false;
      } else if (attemptCount <= 3) {
        title = `Payment Failed Again (Attempt ${attemptCount})`;
        message = `Hi ${user.first_name}, we've tried to process your payment ${attemptCount} times. Please update your payment method within ${daysLeft} days to avoid service interruption.`;
        urgency = daysLeft <= 2;
      } else {
        title = 'Urgent: Subscription Will Be Suspended Soon';
        message = `Hi ${user.first_name}, your payment has failed ${attemptCount} times. Your subscription will be suspended in ${daysLeft} days if payment is not resolved.`;
        urgency = true;
      }

      // Create in-app notification
      await client.query(`
        INSERT INTO user_notifications (
          user_id, type, title, message, action_url, action_text, 
          is_urgent, expires_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      `, [
        userId,
        'payment_failed',
        title,
        message,
        '/subscription/payment-method',
        'Update Payment Method',
        urgency,
        gracePeriodEnd,
      ]);

      // Queue email notification
      await client.query(`
        INSERT INTO email_notifications (
          user_id, email, subject, template, template_data, priority, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `, [
        userId,
        user.email,
        title,
        'payment_failed',
        JSON.stringify({
          firstName: user.first_name,
          attemptCount: attemptCount,
          daysLeft: daysLeft,
          gracePeriodEnd: gracePeriodEnd.toISOString(),
          updatePaymentUrl: `${process.env.APP_URL || 'https://cooksmartapp.com'}/subscription/payment-method`,
        }),
        urgency ? 1 : 3, // High priority if urgent
      ]);

      logger.info(`Payment failure notification sent to user ${userId} (attempt ${attemptCount})`);
    } finally {
      client.release();
    }
  }

  // Resolve payment failure (when payment succeeds)
  static async resolvePaymentFailure(userId: string, subscriptionId: number): Promise<void> {
    const client = await pool.connect();
    try {
      // Mark payment failure as resolved
      await client.query(`
        UPDATE payment_failures 
        SET status = 'resolved', resolved_at = NOW()
        WHERE user_id = $1 AND subscription_id = $2 AND status = 'grace_period'
      `, [userId, subscriptionId]);

      // Create success notification
      await client.query(`
        INSERT INTO user_notifications (
          user_id, type, title, message, is_urgent, created_at
        ) VALUES ($1, $2, $3, $4, false, NOW())
      `, [
        userId,
        'subscription_renewed',
        'Payment Successful',
        'Your subscription has been renewed successfully. Thank you for your payment!',
      ]);

      logger.info(`Payment failure resolved for user ${userId}`);
    } finally {
      client.release();
    }
  }

  // Check and expire grace periods
  static async processExpiredGracePeriods(): Promise<void> {
    const client = await pool.connect();
    try {
      // Find expired grace periods
      const expiredFailures = await client.query(`
        SELECT pf.*, s.stripe_subscription_id, u.email, u.first_name
        FROM payment_failures pf
        JOIN subscriptions s ON pf.subscription_id = s.id
        JOIN users u ON pf.user_id = u.id
        WHERE pf.status = 'grace_period' AND pf.grace_period_end < NOW()
      `);

      for (const failure of expiredFailures.rows) {
        // Mark as expired
        await client.query(
          'UPDATE payment_failures SET status = $1 WHERE id = $2',
          ['expired', failure.id]
        );

        // Suspend subscription
        await client.query(
          'UPDATE subscriptions SET status = $1 WHERE id = $2',
          ['past_due', failure.subscription_id]
        );

        // Update user subscription status
        await client.query(
          'UPDATE users SET subscription_status = $1 WHERE id = $2',
          ['free', failure.user_id]
        );

        // Send suspension notification
        await client.query(`
          INSERT INTO user_notifications (
            user_id, type, title, message, action_url, action_text, 
            is_urgent, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, true, NOW())
        `, [
          failure.user_id,
          'subscription_suspended',
          'Subscription Suspended',
          `Hi ${failure.first_name}, your subscription has been suspended due to payment failure. Please update your payment method to restore access.`,
          '/subscription/payment-method',
          'Update Payment Method',
        ]);

        logger.warn(`Subscription suspended for user ${failure.user_id} due to expired grace period`);
      }

      if (expiredFailures.rows.length > 0) {
        logger.info(`Processed ${expiredFailures.rows.length} expired grace periods`);
      }
    } finally {
      client.release();
    }
  }

  // Get user's payment failure status
  static async getPaymentFailureStatus(userId: string): Promise<any> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT pf.*, s.stripe_subscription_id, sp.plan_name
        FROM payment_failures pf
        JOIN subscriptions s ON pf.subscription_id = s.id
        LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
        WHERE pf.user_id = $1 AND pf.status = 'grace_period'
        ORDER BY pf.created_at DESC
        LIMIT 1
      `, [userId]);

      if (result.rows.length === 0) {
        return { status: 'current', message: 'No payment issues' };
      }

      const failure = result.rows[0];
      const daysLeft = Math.ceil((new Date(failure.grace_period_end).getTime() - Date.now()) / (24 * 60 * 60 * 1000));

      return {
        status: 'grace_period',
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
      };
    } finally {
      client.release();
    }
  }
}