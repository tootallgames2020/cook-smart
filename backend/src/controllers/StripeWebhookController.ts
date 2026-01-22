import {Request, Response} from 'express';
import Stripe from 'stripe';
import pool from '../config/database';
import NotificationService from '../services/NotificationService';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

/**
 * StripeWebhookController
 * Handles Stripe webhook events for subscription management
 */
export class StripeWebhookController {
  /**
   * POST /api/webhooks/stripe
   * Handle Stripe webhook events
   */
  static async handleWebhook(req: Request, res: Response): Promise<void> {
    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.warn('Stripe webhook secret not configured');
      res.status(400).json({error: 'Webhook secret not configured'});
      return;
    }

    let event: Stripe.Event;

    try {
      // Verify webhook signature
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      res.status(400).json({error: 'Webhook signature verification failed'});
      return;
    }

    // Process event asynchronously
    StripeWebhookController.processWebhookEvent(event).catch(error => {
      console.error('Error processing webhook event:', error);
    });

    // Respond immediately to Stripe
    res.json({received: true});
  }

  /**
   * Process webhook event asynchronously
   */
  private static async processWebhookEvent(event: Stripe.Event): Promise<void> {
    console.log(`Processing Stripe webhook: ${event.type}`);

    try {
      switch (event.type) {
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(
            event.data.object as Stripe.Subscription,
          );
          break;

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(
            event.data.object as Stripe.Subscription,
          );
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(
            event.data.object as Stripe.Subscription,
          );
          break;

        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(
            event.data.object as Stripe.Invoice,
          );
          break;

        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(
            event.data.object as Stripe.Invoice,
          );
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(
            event.data.object as Stripe.PaymentIntent,
          );
          break;

        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(
            event.data.object as Stripe.Checkout.Session,
          );
          break;

        case 'checkout.session.expired':
          await this.handleCheckoutExpired(
            event.data.object as Stripe.Checkout.Session,
          );
          break;

        case 'customer.subscription.trial_will_end':
          await this.handleTrialWillEnd(
            event.data.object as Stripe.Subscription,
          );
          break;

        default:
          console.log(`Unhandled webhook type: ${event.type}`);
      }
    } catch (error) {
      console.error(`Error processing ${event.type}:`, error);

      // Send error notification to Discord
      const errorObj =
        error instanceof Error ? error : new Error(String(error));
      await NotificationService.sendErrorNotification(
        errorObj,
        'critical' as any,
      );
    }
  }

  /**
   * Handle subscription.created event
   */
  private static async handleSubscriptionCreated(
    subscription: Stripe.Subscription,
  ): Promise<void> {
    console.log(`Subscription created: ${subscription.id}`);

    // Log subscription creation
    const query = `
      INSERT INTO subscription_events (
        subscription_id, event_type, event_data, created_at
      ) VALUES ($1, $2, $3, NOW())
    `;

    try {
      await pool.query(query, [
        subscription.id,
        'created',
        JSON.stringify(subscription),
      ]);
    } catch (error) {
      console.error('Error logging subscription creation:', error);
    }
  }

  /**
   * Handle subscription.updated event
   */
  private static async handleSubscriptionUpdated(
    subscription: Stripe.Subscription,
  ): Promise<void> {
    console.log(`Subscription updated: ${subscription.id}`);

    const query = `
      UPDATE subscriptions
      SET 
        status = $1,
        current_period_start = $2,
        current_period_end = $3,
        cancel_at_period_end = $4,
        updated_at = NOW()
      WHERE id = $5
    `;

    try {
      const sub = subscription as any;
      await pool.query(query, [
        sub.status,
        new Date(sub.current_period_start * 1000),
        new Date(sub.current_period_end * 1000),
        sub.cancel_at_period_end,
        sub.id,
      ]);

      // Update user subscription status
      const userQuery = `
        UPDATE users u
        SET 
          subscription_status = $1,
          subscription_expires_at = $2
        FROM subscriptions s
        WHERE s.id = $3 AND u.id = s.user_id
      `;

      const sub2 = subscription as any;
      await pool.query(userQuery, [
        sub2.status,
        new Date(sub2.current_period_end * 1000),
        sub2.id,
      ]);
    } catch (error) {
      console.error('Error updating subscription:', error);
    }
  }

  /**
   * Handle subscription.deleted event
   */
  private static async handleSubscriptionDeleted(
    subscription: Stripe.Subscription,
  ): Promise<void> {
    console.log(`Subscription deleted: ${subscription.id}`);

    const query = `
      UPDATE subscriptions
      SET 
        status = 'canceled',
        canceled_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
    `;

    try {
      await pool.query(query, [subscription.id]);

      // Update user subscription status
      const userQuery = `
        UPDATE users u
        SET subscription_status = 'canceled'
        FROM subscriptions s
        WHERE s.id = $1 AND u.id = s.user_id
      `;

      await pool.query(userQuery, [subscription.id]);

      // Get user info for notification
      const userInfoQuery = `
        SELECT u.email, u.first_name
        FROM users u
        JOIN subscriptions s ON u.id = s.user_id
        WHERE s.id = $1
      `;

      const result = await pool.query(userInfoQuery, [subscription.id]);

      if (result.rows.length > 0) {
        const user = result.rows[0];
        console.log(`Subscription canceled for user: ${user.email}`);

        // Send notification
        await NotificationService.sendActivityNotification(
          'user_action' as any,
          {
            message: `User ${user.first_name} (${user.email}) canceled their subscription`,
          } as any,
        );
      }
    } catch (error) {
      console.error('Error handling subscription deletion:', error);
    }
  }

  /**
   * Handle invoice.payment_succeeded event
   */
  private static async handleInvoicePaymentSucceeded(
    invoice: Stripe.Invoice,
  ): Promise<void> {
    console.log(`Invoice payment succeeded: ${invoice.id}`);

    const inv = invoice as any;
    if (!inv.subscription) {
      return;
    }

    const subscriptionId =
      typeof inv.subscription === 'string'
        ? inv.subscription
        : inv.subscription.id;

    // Activate subscription
    const query = `
      UPDATE subscriptions
      SET 
        status = 'active',
        updated_at = NOW()
      WHERE id = $1
    `;

    try {
      await pool.query(query, [subscriptionId]);

      // Update user subscription status
      const userQuery = `
        UPDATE users u
        SET subscription_status = 'active'
        FROM subscriptions s
        WHERE s.id = $1 AND u.id = s.user_id
      `;

      await pool.query(userQuery, [subscriptionId]);

      // Record transaction
      const transactionQuery = `
        INSERT INTO subscription_transactions (
          subscription_id, user_id, amount, currency, status, created_at
        )
        SELECT 
          s.id, s.user_id, $2, $3, 'succeeded', NOW()
        FROM subscriptions s
        WHERE s.id = $1
      `;

      await pool.query(transactionQuery, [
        subscriptionId,
        invoice.amount_paid / 100, // Convert from cents
        invoice.currency,
      ]);
    } catch (error) {
      console.error('Error handling successful payment:', error);
    }
  }

  /**
   * Handle invoice.payment_failed event
   */
  private static async handleInvoicePaymentFailed(
    invoice: Stripe.Invoice,
  ): Promise<void> {
    console.log(`Invoice payment failed: ${invoice.id}`);

    const inv2 = invoice as any;
    if (!inv2.subscription) {
      return;
    }

    const subscriptionId =
      typeof inv2.subscription === 'string'
        ? inv2.subscription
        : inv2.subscription.id;

    // Update subscription status
    const query = `
      UPDATE subscriptions
      SET 
        status = 'past_due',
        updated_at = NOW()
      WHERE id = $1
    `;

    try {
      await pool.query(query, [subscriptionId]);

      // Update user subscription status
      const userQuery = `
        UPDATE users u
        SET subscription_status = 'past_due'
        FROM subscriptions s
        WHERE s.id = $1 AND u.id = s.user_id
      `;

      await pool.query(userQuery, [subscriptionId]);

      // Get user info for notification
      const userInfoQuery = `
        SELECT u.email, u.first_name
        FROM users u
        JOIN subscriptions s ON u.id = s.user_id
        WHERE s.id = $1
      `;

      const result = await pool.query(userInfoQuery, [subscriptionId]);

      if (result.rows.length > 0) {
        const user = result.rows[0];

        // Send error notification
        const paymentError = new Error(
          `Payment failed for user ${user.first_name} (${user.email})`,
        );
        await NotificationService.sendErrorNotification(
          paymentError,
          'critical' as any,
        );
      }

      // Record failed transaction
      const transactionQuery = `
        INSERT INTO subscription_transactions (
          subscription_id, user_id, amount, currency, status, failure_reason, created_at
        )
        SELECT 
          s.id, s.user_id, $2, $3, 'failed', $4, NOW()
        FROM subscriptions s
        WHERE s.id = $1
      `;

      await pool.query(transactionQuery, [
        subscriptionId,
        invoice.amount_due / 100,
        invoice.currency,
        'Payment failed',
      ]);
    } catch (error) {
      console.error('Error handling failed payment:', error);
    }
  }

  /**
   * Handle customer.subscription.trial_will_end event
   */
  private static async handleTrialWillEnd(
    subscription: Stripe.Subscription,
  ): Promise<void> {
    console.log(`Trial will end soon: ${subscription.id}`);

    try {
      // Get user info
      const userInfoQuery = `
        SELECT u.email, u.first_name
        FROM users u
        JOIN subscriptions s ON u.id = s.user_id
        WHERE s.id = $1
      `;

      const result = await pool.query(userInfoQuery, [subscription.id]);

      if (result.rows.length > 0) {
        const user = result.rows[0];
        const trialEnd = new Date(subscription.trial_end! * 1000);

        // Send notification
        await NotificationService.sendActivityNotification(
          'user_action' as any,
          {
            message: `Trial ending for ${user.first_name} (${user.email}) on ${trialEnd.toLocaleDateString()}`,
          } as any,
        );

        // Send email to user about trial ending
        try {
          const emailService = require('../services/EmailService');
          await emailService.sendTrialEndingNotification(user.email, user.first_name || 'User');
          console.log(`Trial ending email sent to user: ${user.email}`);
        } catch (emailError) {
          console.error('Failed to send trial ending email:', emailError);
        }
      }
    } catch (error) {
      console.error('Error handling trial will end:', error);
    }
  }

  /**
   * Handle payment_intent.payment_failed event
   */
  private static async handlePaymentIntentFailed(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    console.log(`Payment intent failed: ${paymentIntent.id}`);

    try {
      const metadata = paymentIntent.metadata;
      if (metadata.userId) {
        // Notify user of payment failure
        await NotificationService.sendErrorNotification(
          new Error(`Payment failed for user ${metadata.userId}`),
          'critical' as any,
        );
      }
    } catch (error) {
      console.error('Error handling payment intent failure:', error);
    }
  }

  /**
   * Handle checkout.session.completed event
   */
  private static async handleCheckoutCompleted(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    console.log(`Checkout completed: ${session.id}`);

    try {
      await pool.query(
        `UPDATE subscription_checkout_sessions 
         SET status = 'complete', updated_at = NOW() 
         WHERE checkout_session_id = $1`,
        [session.id],
      );
    } catch (error) {
      console.error('Error handling checkout completion:', error);
    }
  }

  /**
   * Handle checkout.session.expired event
   */
  private static async handleCheckoutExpired(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    console.log(`Checkout expired: ${session.id}`);

    try {
      await pool.query(
        `UPDATE subscription_checkout_sessions 
         SET status = 'expired', updated_at = NOW() 
         WHERE checkout_session_id = $1`,
        [session.id],
      );
    } catch (error) {
      console.error('Error handling checkout expiration:', error);
    }
  }
}
