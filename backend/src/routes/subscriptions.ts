import express from 'express';
import { pool } from '../server';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';
import Stripe from 'stripe';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

// Get pricing plans - /plans endpoint (what the mobile app calls)
router.get('/plans', async (req, res, next) => {
  try {
    const client = await pool.connect();
    try {
      // Check if subscription_plans table exists
      const tableExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'subscription_plans'
        );
      `);

      if (!tableExists.rows[0].exists) {
        // Fallback to hardcoded plans if table doesn't exist
        logger.warn('subscription_plans table not found, using fallback plans');
        
        const fallbackPlans = [
          {
            id: 1,
            name: 'Yearly Premium',
            displayName: 'Yearly Premium (Pre-Purchase)',
            initialPrice: 24.99,
            renewalPrice: 24.99,
            billingInterval: 'year',
            trialDays: 0,
            features: [
              'Lock in $24.99/year price for life',
              'Unlimited recipe access (when launched)',
              'Custom recipe creation & sharing',
              'Advanced meal planning',
              'Smart shopping lists',
              'Dietary restriction support',
              'Ingredient inventory tracking',
              'Recipe scaling & unit conversion',
              'Priority customer support'
            ]
          }
        ];

        return res.json({
          success: true,
          plans: fallbackPlans,
          isBeta: true,
          betaMessage: 'BETA is FREE! Pre-purchase YEARLY at $24.99 to lock in this price for LIFE - even if yearly prices increase later!',
          freeFeatures: [
            'Basic recipe search',
            'Limited ingredient tracking',
            'Basic meal planning',
            'Community recipe access'
          ],
        });
      }

      // Check if we're in beta phase
      const isBeta = true; // During beta phase
      
      let result;
      if (isBeta) {
        // During beta: only show yearly plan
        result = await client.query(`
          SELECT sp.*, 
                 CASE 
                   WHEN sp.promotional_price_id IS NOT NULL 
                   THEN sp.promotional_price_id 
                   ELSE sp.standard_price_id 
                 END as current_price_id
          FROM subscription_plans sp
          WHERE sp.plan_name = 'yearly' AND sp.available_in_beta = true
          ORDER BY sp.id
        `);
      } else {
        // Post-beta: show all plans with trial pricing logic
        result = await client.query(`
          SELECT sp.*, 
                 sp.promotional_price_id as trial_price_id,
                 sp.standard_price_id as regular_price_id
          FROM subscription_plans sp
          WHERE sp.available_in_beta = true OR $1 = false
          ORDER BY 
            CASE sp.billing_interval
              WHEN 'year' THEN 1
              WHEN 'month' THEN 2
              WHEN 'week' THEN 3
            END
        `, [isBeta]);
      }

      // Get Stripe price details for each plan
      const plansWithPricing = await Promise.all(
        result.rows.map(async (plan) => {
          try {
            // For post-beta, we need to show both trial and regular pricing for yearly
            let currentPriceId, trialPriceId, regularPriceId;
            
            if (isBeta) {
              // Beta: use promotional price
              currentPriceId = plan.current_price_id;
            } else {
              // Post-beta: show trial pricing for yearly, regular for others
              if (plan.billing_interval === 'year') {
                trialPriceId = plan.trial_price_id; // $24.99 during trial
                regularPriceId = plan.regular_price_id; // $34.99 after trial
                currentPriceId = trialPriceId; // Show trial price by default
              } else {
                currentPriceId = plan.regular_price_id; // Monthly/weekly use regular price
              }
            }

            const price = await stripe.prices.retrieve(currentPriceId);
            const product = await stripe.products.retrieve(plan.stripe_product_id);
            
            // Calculate savings for yearly plan
            let savings = null;
            let originalPrice = null;
            
            if (plan.billing_interval === 'year') {
              if (isBeta && plan.promotional_price_id) {
                const standardPrice = await stripe.prices.retrieve(plan.standard_price_id);
                originalPrice = standardPrice.unit_amount! / 100;
                const monthlyEquivalent = (standardPrice.unit_amount || 0) / 12;
                const yearlyMonthly = (price.unit_amount || 0) / 12;
                savings = Math.round(((monthlyEquivalent - yearlyMonthly) / monthlyEquivalent) * 100);
              } else if (!isBeta && trialPriceId && regularPriceId) {
                const regularPrice = await stripe.prices.retrieve(regularPriceId);
                originalPrice = regularPrice.unit_amount! / 100;
                const monthlyEquivalent = (regularPrice.unit_amount || 0) / 12;
                const yearlyMonthly = (price.unit_amount || 0) / 12;
                savings = Math.round(((monthlyEquivalent - yearlyMonthly) / monthlyEquivalent) * 100);
              }
            }
            
            return {
              id: plan.plan_name,
              name: product.name || `${plan.plan_name.charAt(0).toUpperCase() + plan.plan_name.slice(1)} Plan`,
              description: product.description || `Cook Smart ${plan.plan_name} subscription`,
              price: price.unit_amount ? price.unit_amount / 100 : 0,
              currency: price.currency.toUpperCase(),
              interval: plan.billing_interval,
              trialDays: isBeta ? 0 : plan.trial_days, // No trial during beta
              features: product.metadata?.features ? JSON.parse(product.metadata.features) : [
                'Unlimited recipe access',
                'Custom recipe creation & sharing',
                'Advanced meal planning',
                'Smart shopping lists',
                'Dietary restriction support',
                'Ingredient inventory tracking',
                'Recipe scaling & unit conversion',
                'Priority customer support'
              ],
              isPopular: plan.plan_name === 'yearly',
              isBetaSpecial: isBeta && plan.promotional_price_id,
              isTrialSpecial: !isBeta && plan.billing_interval === 'year' && trialPriceId,
              originalPrice: originalPrice,
              trialPrice: !isBeta && trialPriceId ? (await stripe.prices.retrieve(trialPriceId)).unit_amount! / 100 : null,
              regularPrice: !isBeta && regularPriceId ? (await stripe.prices.retrieve(regularPriceId)).unit_amount! / 100 : null,
              savings: savings,
              badge: plan.plan_name === 'yearly' ? (isBeta ? 'PRE-PURCHASE' : 'TRIAL SPECIAL') : null,
            };
          } catch (error) {
            logger.error(`Error fetching Stripe data for plan ${plan.plan_name}:`, error);
            return {
              id: plan.plan_name,
              name: plan.plan_name.charAt(0).toUpperCase() + plan.plan_name.slice(1),
              price: plan.plan_name === 'yearly' ? 24.99 : plan.plan_name === 'monthly' ? 6.99 : 2.99,
              currency: 'USD',
              interval: plan.billing_interval,
              trialDays: isBeta ? 0 : plan.trial_days,
              features: [
                'Unlimited recipe access',
                'Custom recipe creation',
                'Advanced meal planning',
                'Smart shopping lists',
                'Priority support'
              ],
              error: 'Live pricing temporarily unavailable',
            };
          }
        })
      );

      return res.json({
        success: true,
        plans: plansWithPricing,
        isBeta,
        betaMessage: isBeta ? 'BETA is FREE! Pre-purchase YEARLY at $24.99 to lock in this price for LIFE - even if yearly prices increase later!' : 'FREE 7-day trial! Subscribe to YEARLY during trial for $24.99 (regularly $34.99) - price locked for life!',
        freeFeatures: [
          'Basic recipe search',
          'Limited ingredient tracking',
          'Basic meal planning',
          'Community recipe access'
        ],
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Get pricing error:', error);
    return next(createError('Failed to get pricing plans', 500));
  }
});

// Get pricing plans (public endpoint) - /pricing (legacy endpoint)
router.get('/pricing', async (req, res, next) => {
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
            
            // Calculate savings for yearly plan
            let savings = null;
            if (plan.billing_interval === 'year' && plan.promotional_price_id) {
              const standardPrice = await stripe.prices.retrieve(plan.standard_price_id);
              const monthlyEquivalent = (standardPrice.unit_amount || 0) / 12;
              const yearlyMonthly = (price.unit_amount || 0) / 12;
              savings = Math.round(((monthlyEquivalent - yearlyMonthly) / monthlyEquivalent) * 100);
            }
            
            return {
              id: plan.plan_name,
              name: product.name || `${plan.plan_name.charAt(0).toUpperCase() + plan.plan_name.slice(1)} Plan`,
              description: product.description || `Cook Smart ${plan.plan_name} subscription`,
              price: price.unit_amount ? price.unit_amount / 100 : 0,
              currency: price.currency.toUpperCase(),
              interval: plan.billing_interval,
              trialDays: plan.trial_days,
              features: product.metadata?.features ? JSON.parse(product.metadata.features) : [
                'Unlimited recipe access',
                'Custom recipe creation & sharing',
                'Advanced meal planning',
                'Smart shopping lists',
                'Dietary restriction support',
                'Ingredient inventory tracking',
                'Recipe scaling & unit conversion',
                'Priority customer support'
              ],
              isPopular: plan.plan_name === 'yearly',
              isBetaSpecial: isBeta && plan.promotional_price_id,
              originalPrice: plan.promotional_price_id ? 
                (await stripe.prices.retrieve(plan.standard_price_id)).unit_amount! / 100 : null,
              savings: savings,
              badge: plan.plan_name === 'yearly' ? (isBeta ? 'PRE-PURCHASE' : 'BEST VALUE') : null,
            };
          } catch (error) {
            logger.error(`Error fetching Stripe data for plan ${plan.plan_name}:`, error);
            return {
              id: plan.plan_name,
              name: plan.plan_name.charAt(0).toUpperCase() + plan.plan_name.slice(1),
              price: plan.plan_name === 'yearly' ? 49.99 : plan.plan_name === 'monthly' ? 9.99 : 2.99,
              currency: 'USD',
              interval: plan.billing_interval,
              trialDays: plan.trial_days,
              features: [
                'Unlimited recipe access',
                'Custom recipe creation',
                'Advanced meal planning',
                'Smart shopping lists',
                'Priority support'
              ],
              error: 'Live pricing temporarily unavailable',
            };
          }
        })
      );

      return res.json({
        success: true,
        plans: plansWithPricing,
        isBeta,
        betaMessage: isBeta ? 'Limited time BETA pricing - Lock in lifetime benefits!' : null,
        freeFeatures: [
          'Basic recipe search',
          'Limited ingredient tracking',
          'Basic meal planning',
          'Community recipe access'
        ],
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Get pricing error:', error);
    return next(createError('Failed to get pricing plans', 500));
  }
});

// Get user's subscription - /me endpoint (what the mobile app calls)
router.get('/me', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const client = await pool.connect();
    try {
      // Get user's current subscription
      const subscriptionResult = await client.query(`
        SELECT s.*, sp.plan_name, sp.billing_interval, u.subscription_status
        FROM users u
        LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status IN ('active', 'trialing', 'past_due')
        LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
        WHERE u.id = $1
        ORDER BY s.created_at DESC
        LIMIT 1
      `, [req.user!.id]);

      const user = subscriptionResult.rows[0];
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      // Get usage statistics
      const usageResult = await client.query(`
        SELECT 
          (SELECT COUNT(*) FROM custom_recipes WHERE user_id = $1) as custom_recipes_created,
          (SELECT COUNT(*) FROM user_custom_recipes WHERE user_id = $1) as community_recipes_saved,
          (SELECT COUNT(*) FROM meal_plans WHERE user_id = $1) as meals_planned,
          (SELECT COUNT(*) FROM shopping_list_items WHERE user_id = $1) as shopping_items_added,
          (SELECT points FROM users WHERE id = $1) as total_points
      `, [req.user!.id]);

      const usage = usageResult.rows[0];

      const subscriptionData = user.stripe_subscription_id ? {
        id: user.stripe_subscription_id,
        planId: user.plan_name,
        status: user.status,
        currentPeriodEnd: user.current_period_end,
        cancelAtPeriodEnd: user.cancel_at_period_end,
        billingInterval: user.billing_interval,
        trialEnd: user.trial_end,
      } : null;

      return res.json({
        success: true,
        subscription: subscriptionData,
        status: user.subscription_status || 'free',
        usage: {
          customRecipesCreated: parseInt(usage.custom_recipes_created) || 0,
          communityRecipesSaved: parseInt(usage.community_recipes_saved) || 0,
          mealsPlanned: parseInt(usage.meals_planned) || 0,
          shoppingItemsAdded: parseInt(usage.shopping_items_added) || 0,
          totalPoints: parseInt(usage.total_points) || 0,
        },
        limits: user.subscription_status === 'premium' ? {
          customRecipes: 'unlimited',
          savedRecipes: 'unlimited',
          mealPlans: 'unlimited',
          shoppingLists: 'unlimited',
        } : {
          customRecipes: 5,
          savedRecipes: 20,
          mealPlans: 7, // 1 week
          shoppingLists: 3,
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Get subscription status error:', error);
    return next(createError('Failed to get subscription status', 500));
  }
});

// Get user's subscription status (legacy endpoint)
router.get('/status', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const client = await pool.connect();
    try {
      // Get user's current subscription
      const subscriptionResult = await client.query(`
        SELECT s.*, sp.plan_name, sp.billing_interval, u.subscription_status
        FROM users u
        LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status IN ('active', 'trialing', 'past_due')
        LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
        WHERE u.id = $1
        ORDER BY s.created_at DESC
        LIMIT 1
      `, [req.user!.id]);

      const user = subscriptionResult.rows[0];
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      // Get usage statistics
      const usageResult = await client.query(`
        SELECT 
          (SELECT COUNT(*) FROM custom_recipes WHERE user_id = $1) as custom_recipes_created,
          (SELECT COUNT(*) FROM user_custom_recipes WHERE user_id = $1) as community_recipes_saved,
          (SELECT COUNT(*) FROM meal_plans WHERE user_id = $1) as meals_planned,
          (SELECT COUNT(*) FROM shopping_list_items WHERE user_id = $1) as shopping_items_added,
          (SELECT points FROM users WHERE id = $1) as total_points
      `, [req.user!.id]);

      const usage = usageResult.rows[0];

      const subscriptionData = user.stripe_subscription_id ? {
        id: user.stripe_subscription_id,
        planId: user.plan_name,
        status: user.status,
        currentPeriodEnd: user.current_period_end,
        cancelAtPeriodEnd: user.cancel_at_period_end,
        billingInterval: user.billing_interval,
        trialEnd: user.trial_end,
      } : null;

      return res.json({
        success: true,
        subscription: subscriptionData,
        status: user.subscription_status || 'free',
        usage: {
          customRecipesCreated: parseInt(usage.custom_recipes_created) || 0,
          communityRecipesSaved: parseInt(usage.community_recipes_saved) || 0,
          mealsPlanned: parseInt(usage.meals_planned) || 0,
          shoppingItemsAdded: parseInt(usage.shopping_items_added) || 0,
          totalPoints: parseInt(usage.total_points) || 0,
        },
        limits: user.subscription_status === 'premium' ? {
          customRecipes: 'unlimited',
          savedRecipes: 'unlimited',
          mealPlans: 'unlimited',
          shoppingLists: 'unlimited',
        } : {
          customRecipes: 5,
          savedRecipes: 20,
          mealPlans: 7, // 1 week
          shoppingLists: 3,
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Get subscription status error:', error);
    return next(createError('Failed to get subscription status', 500));
  }
});

// Create subscription checkout session (Stripe hosted checkout)
router.post('/create-checkout-session', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { planType, referralCode, successUrl, cancelUrl } = req.body;

    if (!planType || !['yearly', 'monthly', 'weekly', 'yearly_postbeta'].includes(planType)) {
      return res.status(400).json({
        success: false,
        message: 'Valid plan type is required (yearly, monthly, weekly, yearly_postbeta)',
      });
    }

    const client = await pool.connect();
    try {
      // Check if user already has an active subscription
      const existingSubscription = await client.query(
        'SELECT id FROM subscriptions WHERE user_id = $1 AND status IN ($2, $3, $4)',
        [req.user!.id, 'active', 'trialing', 'past_due']
      );

      if (existingSubscription.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'User already has an active subscription',
        });
      }

      // Get plan details
      const isBeta = true; // During beta phase
      const planResult = await client.query(`
        SELECT sp.*, 
               CASE 
                 WHEN sp.promotional_price_id IS NOT NULL AND $2 = true 
                 THEN sp.promotional_price_id 
                 ELSE sp.standard_price_id 
               END as current_price_id
        FROM subscription_plans sp
        WHERE sp.plan_name = $1
      `, [planType, isBeta]);

      if (planResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Plan not found',
        });
      }

      const plan = planResult.rows[0];

      // Validate plan availability during beta
      if (isBeta && !plan.available_in_beta) {
        return res.status(400).json({
          success: false,
          message: `${planType} subscriptions are not available during beta phase`,
        });
      }

      // Get user details
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

      // Create or get Stripe customer
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

      // Apply referral discount if valid
      let coupon = null;
      if (referralCode) {
        // Validate referral code
        const referralResult = await client.query(
          'SELECT id FROM referrals WHERE referral_code = $1 AND status = $2',
          [referralCode, 'active']
        );

        if (referralResult.rows.length > 0) {
          // Apply 10% discount for valid referral
          try {
            coupon = await stripe.coupons.create({
              percent_off: 10,
              duration: 'once',
              metadata: {
                referralCode: referralCode,
                userId: req.user!.id,
              },
            });
          } catch (error) {
            logger.warn('Failed to create referral coupon:', error);
          }
        }
      }

      // Create Stripe Checkout session (hosted checkout page)
      const sessionData: Stripe.Checkout.SessionCreateParams = {
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
            planType: planType,
            referralCode: referralCode || '',
            isBetaSpecial: (isBeta && plan.promotional_price_id).toString(),
          },
        },
        // Use hosted Stripe checkout URLs - opens in web browser
        success_url: successUrl || `${process.env.APP_URL || 'https://cooksmartapp.com'}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl || `${process.env.APP_URL || 'https://cooksmartapp.com'}/pricing`,
        metadata: {
          userId: req.user!.id,
          planType: planType,
        },
        allow_promotion_codes: true,
        billing_address_collection: 'auto',
        customer_update: {
          address: 'auto',
          name: 'auto',
        },
        // Force external browser opening
        ui_mode: 'hosted', // This ensures it opens in browser, not embedded
      };

      // Add coupon if available
      if (coupon) {
        sessionData.discounts = [{ coupon: coupon.id }];
      }

      const session = await stripe.checkout.sessions.create(sessionData);

      return res.json({
        success: true,
        // Return the hosted checkout URL - app should open this in browser
        checkoutUrl: session.url,
        sessionId: session.id,
        planDetails: {
          name: planType,
          interval: plan.billing_interval,
          trialDays: plan.trial_days,
          hasDiscount: !!coupon,
        },
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

// Cancel subscription
router.post('/cancel', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { cancelAtPeriodEnd = true, reason } = req.body;

    const client = await pool.connect();
    try {
      // Get user's active subscription
      const subscriptionResult = await client.query(
        'SELECT stripe_subscription_id FROM subscriptions WHERE user_id = $1 AND status IN ($2, $3, $4)',
        [req.user!.id, 'active', 'trialing', 'past_due']
      );

      if (subscriptionResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No active subscription found',
        });
      }

      const stripeSubscriptionId = subscriptionResult.rows[0].stripe_subscription_id;

      // Cancel or schedule cancellation in Stripe
      let updatedSubscription;
      if (cancelAtPeriodEnd) {
        updatedSubscription = await stripe.subscriptions.update(stripeSubscriptionId, {
          cancel_at_period_end: true,
          metadata: {
            cancellation_reason: reason || 'User requested',
          },
        });
      } else {
        updatedSubscription = await stripe.subscriptions.cancel(stripeSubscriptionId);
      }

      // Update local subscription record
      await client.query(
        'UPDATE subscriptions SET cancel_at_period_end = $1, updated_at = NOW() WHERE stripe_subscription_id = $2',
        [cancelAtPeriodEnd, stripeSubscriptionId]
      );

      // Log cancellation reason
      if (reason) {
        await client.query(
          'INSERT INTO feedback (user_id, message, category, created_at) VALUES ($1, $2, $3, NOW())',
          [req.user!.id, `Subscription cancellation reason: ${reason}`, 'cancellation']
        );
      }

      return res.json({
        success: true,
        message: cancelAtPeriodEnd 
          ? 'Subscription will be canceled at the end of the current billing period'
          : 'Subscription canceled immediately',
        subscription: {
          status: updatedSubscription.status,
          cancelAtPeriodEnd: updatedSubscription.cancel_at_period_end,
          currentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000),
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Cancel subscription error:', error);
    return next(createError('Failed to cancel subscription', 500));
  }
});

// Reactivate subscription
router.post('/reactivate', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const client = await pool.connect();
    try {
      // Get user's subscription
      const subscriptionResult = await client.query(
        'SELECT stripe_subscription_id FROM subscriptions WHERE user_id = $1 AND status IN ($2, $3)',
        [req.user!.id, 'active', 'past_due']
      );

      if (subscriptionResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No subscription found to reactivate',
        });
      }

      const stripeSubscriptionId = subscriptionResult.rows[0].stripe_subscription_id;

      // Reactivate in Stripe
      const updatedSubscription = await stripe.subscriptions.update(stripeSubscriptionId, {
        cancel_at_period_end: false,
      });

      // Update local subscription record
      await client.query(
        'UPDATE subscriptions SET cancel_at_period_end = false, updated_at = NOW() WHERE stripe_subscription_id = $1',
        [stripeSubscriptionId]
      );

      return res.json({
        success: true,
        message: 'Subscription reactivated successfully',
        subscription: {
          status: updatedSubscription.status,
          cancelAtPeriodEnd: false,
          currentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000),
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Reactivate subscription error:', error);
    return next(createError('Failed to reactivate subscription', 500));
  }
});

// Update payment method
router.post('/update-payment-method', authenticateToken, async (req: AuthRequest, res, next) => {
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
      // Get user's Stripe customer ID
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

      // Attach payment method to customer
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customer.id,
      });

      // Set as default payment method
      await stripe.customers.update(customer.id, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      return res.json({
        success: true,
        message: 'Payment method updated successfully',
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Update payment method error:', error);
    return next(createError('Failed to update payment method', 500));
  }
});

export default router;