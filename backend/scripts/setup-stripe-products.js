const Stripe = require('stripe');
const { Pool } = require('pg');
require('dotenv').config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'cooksmartdb',
  user: process.env.DB_USER || 'cookuser',
  password: process.env.DB_PASSWORD,
});

async function setupStripeProducts() {
  console.log('🚀 Setting up Stripe products for Cook Smart...');

  try {
    // Create Cook Smart product
    const product = await stripe.products.create({
      name: 'Cook Smart Premium',
      description: 'Pre-purchase Cook Smart Premium YEARLY - Lock in $24.99/year during BETA (normally $34.99). Price locked for life on yearly plans!',
      metadata: {
        features: JSON.stringify([
          'Lock in $24.99/year price for life',
          'Unlimited recipe access (when launched)',
          'Custom recipe creation & sharing',
          'Advanced meal planning',
          'Smart shopping lists',
          'Dietary restriction support',
          'Ingredient inventory tracking',
          'Recipe scaling & unit conversion',
          'Priority customer support'
        ])
      }
    });

    console.log('✅ Created product:', product.id);

    // Create prices
    const yearlyPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: 3499, // $34.99 (post-beta full price)
      currency: 'usd',
      recurring: {
        interval: 'year'
      },
      nickname: 'Yearly Premium'
    });

    const yearlyBetaPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: 2499, // $24.99 (beta special & trial price)
      currency: 'usd',
      recurring: {
        interval: 'year'
      },
      nickname: 'Yearly Premium (Beta Special)'
    });

    const monthlyPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: 699, // $6.99
      currency: 'usd',
      recurring: {
        interval: 'month'
      },
      nickname: 'Monthly Premium'
    });

    const weeklyPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: 299, // $2.99
      currency: 'usd',
      recurring: {
        interval: 'week'
      },
      nickname: 'Weekly Premium'
    });

    console.log('✅ Created prices:');
    console.log('  Yearly:', yearlyPrice.id);
    console.log('  Yearly Beta:', yearlyBetaPrice.id);
    console.log('  Monthly:', monthlyPrice.id);
    console.log('  Weekly:', weeklyPrice.id);

    // Update database
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update yearly plan
      await client.query(`
        UPDATE subscription_plans 
        SET stripe_product_id = $1, 
            standard_price_id = $2, 
            promotional_price_id = $3,
            updated_at = NOW()
        WHERE plan_name = 'yearly'
      `, [product.id, yearlyPrice.id, yearlyBetaPrice.id]);

      // Update monthly plan
      await client.query(`
        UPDATE subscription_plans 
        SET stripe_product_id = $1, 
            standard_price_id = $2,
            updated_at = NOW()
        WHERE plan_name = 'monthly'
      `, [product.id, monthlyPrice.id]);

      // Update weekly plan
      await client.query(`
        UPDATE subscription_plans 
        SET stripe_product_id = $1, 
            standard_price_id = $2,
            updated_at = NOW()
        WHERE plan_name = 'weekly'
      `, [product.id, weeklyPrice.id]);

      await client.query('COMMIT');
      console.log('✅ Updated database with Stripe IDs');

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    console.log('🎉 Stripe products setup complete!');
    console.log('📋 Summary:');
    console.log(`  Product ID: ${product.id}`);
    console.log(`  Yearly: ${yearlyPrice.id} ($34.99/year)`);
    console.log(`  Yearly Beta: ${yearlyBetaPrice.id} ($24.99/year)`);
    console.log(`  Monthly: ${monthlyPrice.id} ($6.99/month)`);
    console.log(`  Weekly: ${weeklyPrice.id} ($2.99/week)`);

  } catch (error) {
    console.error('❌ Error setting up Stripe products:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setupStripeProducts();