import express from 'express';
import { pool } from '../server';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';
import { PaymentFailureService } from '../services/PaymentFailureService';
import Stripe from 'stripe';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

// Get pricing plans
router.get('/plans', async (req, res, next) => {
  try {
    const client = await pool.connect();
    try {
      // Check if we're in beta phase
      const isBeta = true; // During beta phase
      
      const result = await client.query(`
        SELECT sp.*, 
               CASE 
                 WHEN sp.promotional_price_id IS NOT NULL AND $1 = true 
                 THEN sp.promotional_price_id 
                 ELSE sp.standard_price_id 
               END as current_price_id
        FROM subscription_plans sp
        WHERE sp.available_in_beta = true OR $1 = false
        ORDER BY 
          CASE sp.billing_interval
            WHEN 'year' THEN 1
            WHEN 'month' THEN 2
            WHEN 'week' THEN 3
          END
      `, [isBeta]);

      // Get Stripe price details for each plan
      const plansWithPricing = await Promise.all(
        result.rows.map(async (plan) => {
          try {
            const price = await stripe.prices.retrieve(plan.current_price_id);
            const product = await stripe.products.retrieve(plan.stripe_product_id);
            
            return {
              id: plan.plan_name,
              name: product.name || `${plan.plan_name} Plan`,
              description: product.description || `Cook Smart ${plan.plan_name} subscription`,
              price: price.unit_amount ? price.unit_amount / 100 : 0,
              currency: price.currency.toUpperCase(),
              interval: plan.billing_interval,
              trialDays: plan.trial_days,
              features: product.metadata?.features ? JSON.parse(product.metadata.features) : [
                'Unlimited recipe access',
                'Custom recipe creation',
                'Advanced meal planning',
                'Shopping list integration',
                'Dietary restriction support',
                'Priority customer support'
              ],
              isPopular: plan.plan_name === 'yearly',
              isBetaSpecial: isBeta && plan.promotional_price_id,
              originalPrice: plan.promotional_price_id ? 
                (await stripe.prices.retrieve(plan.standard_price_id)).unit_amount! / 100 : null,
            };
          } catch (error) {
            logger.error(`Error fetching Stripe data for plan ${plan.plan_name}:`, error);
            // Fallback pricing based on correct pricing structure
            let fallbackPrice = 0;
            if (plan.plan_name === 'yearly') {
              fallbackPrice = isBeta ? 24.99 : 34.99;
            } else if (plan.plan_name === 'monthly') {
              fallbackPrice = 6.99;
            } else if (plan.plan_name === 'weekly') {
              fallbackPrice = 2.99;
            } else if (plan.plan_name === 'yearly_postbeta') {
              // During trial: $24.99, after trial: $34.99
              fallbackPrice = 24.99; // This would be determined by trial status
            }
            
            return {
              id: plan.plan_name,
              name: plan.plan_name.charAt(0).toUpperCase() + plan.plan_name.slice(1),
              price: fallbackPrice,
              currency: 'USD',
              interval: plan.billing_interval,
              trialDays: plan.trial_days,
              features: ['Basic features'],
              error: 'Pricing temporarily unavailable',
            };
          }
        })
      );

      return res.json({
        success: true,
        plans: plansWithPricing,
        isBeta,
        message: isBeta ? 'Special BETA pricing available!' : 'Standard pricing',
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Get pricing plans error:', error);
    return next(createError('Failed to get pricing plans', 500));
  }
});

// Create payment intent for one-time payments
router.post('/create-payment-intent', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { planId, amount } = req.body;

    if (!planId && !amount) {
      return res.status(400).json({
        success: false,
        message: 'Plan ID or amount is required',
      });
    }

    const client = await pool.connect();
    try {
      let paymentAmount = amount;
      
      if (planId && !amount) {
        // Get plan pricing
        const planResult = await client.query(
          'SELECT standard_price_id FROM subscription_plans WHERE plan_name = $1',
          [planId]
        );
        
        if (planResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'Plan not found',
          });
        }

        const price = await stripe.prices.retrieve(planResult.rows[0].standard_price_id);
        paymentAmount = price.unit_amount;
      }

      // Create or get Stripe customer
      const userResult = await client.query(
        'SELECT email FROM users WHERE id = $1',
        [req.user!.id]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      const userEmail = userResult.rows[0].email;
      
      let customer;
      const existingCustomers = await stripe.customers.list({
        email: userEmail,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        customer = existingCustomers.data[0];
      } else {
        customer = await stripe.customers.create({
          email: userEmail,
          metadata: {
            userId: req.user!.id,
          },
        });
      }

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: paymentAmount,
        currency: 'usd',
        customer: customer.id,
        metadata: {
          userId: req.user!.id,
          planId: planId || 'custom',
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return res.json({
        success: true,
        paymentIntent: {
          id: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          status: paymentIntent.status,
          clientSecret: paymentIntent.client_secret,
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Create payment intent error:', error);
    return next(createError('Failed to create payment intent', 500));
  }
});

// Create subscription checkout session (Stripe hosted checkout)
router.post('/create-checkout-session', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { planId, successUrl, cancelUrl } = req.body;

    if (!planId) {
      return res.status(400).json({
        success: false,
        message: 'Plan ID is required',
      });
    }

    const client = await pool.connect();
    try {
      // Get plan details
      const planResult = await client.query(`
        SELECT sp.*, 
               CASE 
                 WHEN sp.promotional_price_id IS NOT NULL 
                 THEN sp.promotional_price_id 
                 ELSE sp.standard_price_id 
               END as current_price_id
        FROM subscription_plans sp
        WHERE sp.plan_name = $1
      `, [planId]);

      if (planResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Plan not found',
        });
      }

      const plan = planResult.rows[0];

      // Get user details
      const userResult = await client.query(
        'SELECT email FROM users WHERE id = $1',
        [req.user!.id]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      const userEmail = userResult.rows[0].email;

      // Create or get Stripe customer
      let customer;
      const existingCustomers = await stripe.customers.list({
        email: userEmail,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        customer = existingCustomers.data[0];
      } else {
        customer = await stripe.customers.create({
          email: userEmail,
          metadata: {
            userId: req.user!.id,
          },
        });
      }

      // Create Stripe Checkout session (hosted checkout page)
      const session = await stripe.checkout.sessions.create({
        customer: customer.id,
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [
          {
            price: plan.current_price_id,
            quantity: 1,
          },
        ],
        subscription_data: {
          trial_period_days: plan.trial_days > 0 ? plan.trial_days : undefined,
          metadata: {
            userId: req.user!.id,
            planId: planId,
          },
        },
        // Use hosted Stripe checkout URLs - opens in web browser
        success_url: successUrl || `${process.env.APP_URL || 'https://cooksmartapp.com'}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl || `${process.env.APP_URL || 'https://cooksmartapp.com'}/payment-cancelled`,
        metadata: {
          userId: req.user!.id,
          planId: planId,
        },
        // Force external browser opening
        ui_mode: 'hosted', // This ensures it opens in browser, not embedded
        allow_promotion_codes: true,
        billing_address_collection: 'auto',
      });

      return res.json({
        success: true,
        // Return the hosted checkout URL - app should open this in browser
        checkoutUrl: session.url,
        sessionId: session.id,
        // Instructions for the app
        instructions: {
          action: 'open_browser',
          message: 'Opening secure payment page in your browser...',
          url: session.url,
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Create checkout session error:', error);
    return next(createError('Failed to create checkout session', 500));
  }
});

// Stripe webhook handler
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res): Promise<void> => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    logger.warn('Stripe webhook secret not configured');
    res.status(400).json({ error: 'Webhook secret not configured' });
    return;
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    logger.error('Webhook signature verification failed:', err);
    res.status(400).json({ error: 'Invalid signature' });
    return;
  }

  // Log webhook event
  const client = await pool.connect();
  try {
    await client.query(
      'INSERT INTO stripe_webhook_events (stripe_event_id, event_type, created_at) VALUES ($1, $2, NOW())',
      [event.id, event.type]
    );
  } catch (error) {
    logger.error('Error logging webhook event:', error);
  } finally {
    client.release();
  }

  // Process webhook event asynchronously
  processWebhookEvent(event).catch(error => {
    logger.error('Error processing webhook event:', error);
  });

  // Respond immediately to Stripe
  res.json({ received: true });
});

// Process webhook events
async function processWebhookEvent(event: Stripe.Event): Promise<void> {
  logger.info(`Processing Stripe webhook: ${event.type}`);

  const client = await pool.connect();
  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        logger.info(`Unhandled webhook event type: ${event.type}`);
        break;
    }

    // Mark webhook as processed
    await client.query(
      'UPDATE stripe_webhook_events SET processed = true, processed_at = NOW() WHERE stripe_event_id = $1',
      [event.id]
    );
  } catch (error) {
    logger.error('Error processing webhook:', error);
    
    // Mark webhook as failed
    await client.query(
      'UPDATE stripe_webhook_events SET processing_error = $1 WHERE stripe_event_id = $2',
      [error instanceof Error ? error.message : 'Unknown error', event.id]
    );
  } finally {
    client.release();
  }
}

async function handleSubscriptionChange(subscription: Stripe.Subscription): Promise<void> {
  const client = await pool.connect();
  try {
    const userId = subscription.metadata.userId;
    if (!userId) return;

    // Upsert subscription
    await client.query(`
      INSERT INTO subscriptions (
        user_id, stripe_subscription_id, stripe_customer_id, status,
        current_period_start, current_period_end, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      ON CONFLICT (stripe_subscription_id) DO UPDATE SET
        status = $4,
        current_period_start = $5,
        current_period_end = $6,
        updated_at = NOW()
    `, [
      userId,
      subscription.id,
      subscription.customer,
      subscription.status,
      new Date(subscription.current_period_start * 1000),
      new Date(subscription.current_period_end * 1000),
    ]);

    // Update user subscription status
    await client.query(
      'UPDATE users SET subscription_status = $1 WHERE id = $2',
      [subscription.status === 'active' ? 'premium' : 'free', userId]
    );

    logger.info(`Subscription ${subscription.status} for user ${userId}`);
  } finally {
    client.release();
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const client = await pool.connect();
  try {
    const userId = subscription.metadata.userId;
    if (!userId) return;

    // Update subscription status
    await client.query(
      'UPDATE subscriptions SET status = $1, canceled_at = NOW() WHERE stripe_subscription_id = $2',
      ['canceled', subscription.id]
    );

    // Update user subscription status
    await client.query(
      'UPDATE users SET subscription_status = $1 WHERE id = $2',
      ['free', userId]
    );

    logger.info(`Subscription canceled for user ${userId}`);
  } finally {
    client.release();
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  const client = await pool.connect();
  try {
    if (!invoice.subscription) return;

    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
    const userId = subscription.metadata.userId;
    if (!userId) return;

    // Record payment
    await client.query(`
      INSERT INTO payment_history (
        user_id, stripe_invoice_id, amount, currency, status, description, receipt_url, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    `, [
      userId,
      invoice.id,
      invoice.amount_paid / 100,
      invoice.currency.toUpperCase(),
      'succeeded',
      `Payment for ${subscription.metadata.planId || 'subscription'}`,
      invoice.hosted_invoice_url,
    ]);

    logger.info(`Payment succeeded for user ${userId}: $${invoice.amount_paid / 100}`);

    // Resolve any active payment failures
    const subscriptionResult = await client.query(
      'SELECT id FROM subscriptions WHERE stripe_subscription_id = $1',
      [subscription.id]
    );

    if (subscriptionResult.rows.length > 0) {
      await PaymentFailureService.resolvePaymentFailure(
        userId,
        subscriptionResult.rows[0].id
      );
    }
  } finally {
    client.release();
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const client = await pool.connect();
  try {
    if (!invoice.subscription) return;

    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
    const userId = subscription.metadata.userId;
    if (!userId) return;

    // Record failed payment
    await client.query(`
      INSERT INTO payment_history (
        user_id, stripe_invoice_id, amount, currency, status, description, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `, [
      userId,
      invoice.id,
      invoice.amount_due / 100,
      invoice.currency.toUpperCase(),
      'failed',
      `Failed payment for ${subscription.metadata.planId || 'subscription'}`,
    ]);

    logger.warn(`Payment failed for user ${userId}: $${invoice.amount_due / 100}`);

    // Handle payment failure with grace period
    const subscriptionResult = await client.query(
      'SELECT id FROM subscriptions WHERE stripe_subscription_id = $1',
      [subscription.id]
    );

    if (subscriptionResult.rows.length > 0) {
      await PaymentFailureService.handlePaymentFailure(
        userId,
        subscriptionResult.rows[0].id,
        invoice.id,
        (invoice as any).last_payment_error?.message || 'Payment failed'
      );
    }
  } finally {
    client.release();
  }
}

// Get user's payment history
router.get('/history', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT ph.*, s.stripe_subscription_id
        FROM payment_history ph
        LEFT JOIN subscriptions s ON ph.subscription_id = s.id
        WHERE ph.user_id = $1
        ORDER BY ph.created_at DESC
        LIMIT 50
      `, [req.user!.id]);

      return res.json({
        success: true,
        payments: result.rows,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Get payment history error:', error);
    return next(createError('Failed to get payment history', 500));
  }
});

// Get user's billing history (alias for frontend compatibility)
router.get('/billing-history', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          ph.id,
          ph.stripe_invoice_id,
          ph.amount,
          ph.currency,
          ph.status,
          ph.description,
          ph.receipt_url,
          ph.created_at,
          s.stripe_subscription_id
        FROM payment_history ph
        LEFT JOIN subscriptions s ON ph.subscription_id = s.id
        WHERE ph.user_id = $1
        ORDER BY ph.created_at DESC
        LIMIT 50
      `, [req.user!.id]);

      return res.json({
        success: true,
        billingHistory: result.rows.map(row => ({
          id: row.id,
          invoiceId: row.stripe_invoice_id,
          amount: row.amount,
          currency: row.currency,
          status: row.status,
          description: row.description,
          receiptUrl: row.receipt_url,
          date: row.created_at,
          subscriptionId: row.stripe_subscription_id
        }))
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Get billing history error:', error);
    return next(createError('Failed to get billing history', 500));
  }
});

// Get user's payment methods
router.get('/payment-methods', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const client = await pool.connect();
    try {
      // Get user's email to find Stripe customer
      const userResult = await client.query(
        'SELECT email FROM users WHERE id = $1',
        [req.user!.id]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      const userEmail = userResult.rows[0].email;

      // Get Stripe customer
      const customers = await stripe.customers.list({
        email: userEmail,
        limit: 1,
      });

      if (customers.data.length === 0) {
        return res.json({
          success: true,
          paymentMethods: [],
        });
      }

      const customer = customers.data[0];

      // Get payment methods from Stripe
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customer.id,
        type: 'card',
      });

      // Get default payment method
      const customerDetails = await stripe.customers.retrieve(customer.id);
      const defaultPaymentMethodId = (customerDetails as any).invoice_settings?.default_payment_method;

      const formattedPaymentMethods = paymentMethods.data.map(pm => ({
        id: pm.id,
        type: 'card',
        last4: pm.card?.last4,
        brand: pm.card?.brand,
        expiryMonth: pm.card?.exp_month,
        expiryYear: pm.card?.exp_year,
        isDefault: pm.id === defaultPaymentMethodId,
      }));

      return res.json({
        success: true,
        paymentMethods: formattedPaymentMethods,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Get payment methods error:', error);
    return next(createError('Failed to get payment methods', 500));
  }
});

// Add payment method
router.post('/payment-methods', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { paymentMethodId } = req.body;

    if (!paymentMethodId) {
      return res.status(400).json({
        success: false,
        message: 'Payment method ID is required',
      });
    }

    const client = await pool.connect();
    try {
      // Get user's email to find/create Stripe customer
      const userResult = await client.query(
        'SELECT email, first_name, last_name FROM users WHERE id = $1',
        [req.user!.id]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      const user = userResult.rows[0];

      // Get or create Stripe customer
      let customer;
      const existingCustomers = await stripe.customers.list({
        email: user.email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        customer = existingCustomers.data[0];
      } else {
        customer = await stripe.customers.create({
          email: user.email,
          name: `${user.first_name} ${user.last_name}`.trim(),
          metadata: {
            userId: req.user!.id,
          },
        });
      }

      // Attach payment method to customer
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customer.id,
      });

      // Get the attached payment method details
      const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

      const formattedPaymentMethod = {
        id: paymentMethod.id,
        type: 'card',
        last4: paymentMethod.card?.last4,
        brand: paymentMethod.card?.brand,
        expiryMonth: paymentMethod.card?.exp_month,
        expiryYear: paymentMethod.card?.exp_year,
        isDefault: false,
      };

      return res.json({
        success: true,
        paymentMethod: formattedPaymentMethod,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Add payment method error:', error);
    return next(createError('Failed to add payment method', 500));
  }
});

// Set default payment method
router.post('/payment-methods/:paymentMethodId/default', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { paymentMethodId } = req.params;

    const client = await pool.connect();
    try {
      // Get user's email to find Stripe customer
      const userResult = await client.query(
        'SELECT email FROM users WHERE id = $1',
        [req.user!.id]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      const userEmail = userResult.rows[0].email;

      // Get Stripe customer
      const customers = await stripe.customers.list({
        email: userEmail,
        limit: 1,
      });

      if (customers.data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Stripe customer not found',
        });
      }

      const customer = customers.data[0];

      // Set as default payment method
      await stripe.customers.update(customer.id, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      return res.json({
        success: true,
        message: 'Default payment method updated successfully',
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Set default payment method error:', error);
    return next(createError('Failed to set default payment method', 500));
  }
});

// Delete payment method
router.delete('/payment-methods/:paymentMethodId', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { paymentMethodId } = req.params;

    const client = await pool.connect();
    try {
      // Get user's email to find Stripe customer
      const userResult = await client.query(
        'SELECT email FROM users WHERE id = $1',
        [req.user!.id]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      const userEmail = userResult.rows[0].email;

      // Get Stripe customer
      const customers = await stripe.customers.list({
        email: userEmail,
        limit: 1,
      });

      if (customers.data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Stripe customer not found',
        });
      }

      const customer = customers.data[0];

      // Check if this is the default payment method
      const customerDetails = await stripe.customers.retrieve(customer.id);
      const defaultPaymentMethodId = (customerDetails as any).invoice_settings?.default_payment_method;

      if (paymentMethodId === defaultPaymentMethodId) {
        // Get other payment methods
        const paymentMethods = await stripe.paymentMethods.list({
          customer: customer.id,
          type: 'card',
        });

        if (paymentMethods.data.length <= 1) {
          return res.status(400).json({
            success: false,
            message: 'Cannot delete the only payment method. Please add another payment method first.',
          });
        }

        // Set another payment method as default
        const otherPaymentMethod = paymentMethods.data.find(pm => pm.id !== paymentMethodId);
        if (otherPaymentMethod) {
          await stripe.customers.update(customer.id, {
            invoice_settings: {
              default_payment_method: otherPaymentMethod.id,
            },
          });
        }
      }

      // Detach payment method from customer
      await stripe.paymentMethods.detach(paymentMethodId);

      return res.json({
        success: true,
        message: 'Payment method deleted successfully',
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Delete payment method error:', error);
    return next(createError('Failed to delete payment method', 500));
  }
});

// Get user's current subscription
router.get('/subscription', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT s.*, sp.plan_name, sp.billing_interval
        FROM subscriptions s
        LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
        WHERE s.user_id = $1 AND s.status IN ('active', 'trialing', 'past_due')
        ORDER BY s.created_at DESC
        LIMIT 1
      `, [req.user!.id]);

      if (result.rows.length === 0) {
        return res.json({
          success: true,
          subscription: null,
          status: 'free',
        });
      }

      const subscription = result.rows[0];

      return res.json({
        success: true,
        subscription: {
          id: subscription.stripe_subscription_id,
          planId: subscription.plan_name,
          status: subscription.status,
          currentPeriodEnd: subscription.current_period_end,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          billingInterval: subscription.billing_interval,
        },
        status: subscription.status === 'active' ? 'premium' : 'free',
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Get subscription error:', error);
    return next(createError('Failed to get subscription', 500));
  }
});

export default router;