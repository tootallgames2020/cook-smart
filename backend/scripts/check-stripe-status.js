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

async function cleanupOrphanedProducts() {
  console.log('🧹 Cleaning up orphaned Stripe products...\n');

  try {
    const client = await pool.connect();
    
    try {
      // Get current products from database
      const dbPlans = await client.query(`
        SELECT stripe_product_id FROM subscription_plans WHERE stripe_product_id IS NOT NULL
      `);
      const dbProductIds = dbPlans.rows.map(p => p.stripe_product_id);

      // Get all Cook Smart products from Stripe (exclude archived)
      const allProducts = await stripe.products.list({ limit: 100 });
      const cookSmartProducts = allProducts.data.filter(p => 
        (p.name.toLowerCase().includes('cook smart') || 
         p.description?.toLowerCase().includes('cook smart')) &&
        !p.name.toLowerCase().includes('[archived]')
      );

      // Find orphaned products (exclude archived ones)
      const orphanedProducts = cookSmartProducts.filter(p => 
        !dbProductIds.includes(p.id) && 
        !p.name.toLowerCase().includes('[archived]')
      );

      if (orphanedProducts.length === 0) {
        console.log('✅ No orphaned products found to clean up');
        return;
      }

      console.log(`Found ${orphanedProducts.length} orphaned products to clean up:`);
      orphanedProducts.forEach(p => {
        console.log(`   - ${p.id}: ${p.name}`);
      });

      console.log('\n🗑️  Archiving orphaned products...');

      // Archive each orphaned product (safer than deleting)
      for (const product of orphanedProducts) {
        try {
          await stripe.products.update(product.id, {
            active: false,
            name: `[ARCHIVED] ${product.name}`,
            description: `Archived on ${new Date().toISOString()} - ${product.description || 'No description'}`
          });
          console.log(`   ✅ Archived: ${product.id}`);
        } catch (error) {
          console.log(`   ❌ Failed to archive ${product.id}: ${error.message}`);
        }
      }

      console.log('\n✅ Cleanup complete! Orphaned products have been archived.');
      console.log('   Note: Products are archived (not deleted) for safety. They can be reactivated if needed.');

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

async function checkStripeStatus() {
  console.log('🔍 Checking Stripe setup status for Cook Smart...\n');

  try {
    // Check database connection and subscription_plans table
    console.log('📊 DATABASE STATUS:');
    const client = await pool.connect();
    
    try {
      // Check if table exists
      const tableExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'subscription_plans'
        );
      `);

      if (!tableExists.rows[0].exists) {
        console.log('❌ subscription_plans table does not exist');
        return;
      }

      console.log('✅ subscription_plans table exists');

      // Get all plans from database
      const dbPlans = await client.query(`
        SELECT plan_name, stripe_product_id, standard_price_id, promotional_price_id, 
               billing_interval, trial_days, available_in_beta, is_active
        FROM subscription_plans 
        ORDER BY 
          CASE billing_interval
            WHEN 'year' THEN 1
            WHEN 'month' THEN 2
            WHEN 'week' THEN 3
          END
      `);

      console.log(`📋 Found ${dbPlans.rows.length} plans in database:\n`);

      // Check each plan in Stripe
      console.log('🔗 STRIPE INTEGRATION STATUS:');
      
      for (const plan of dbPlans.rows) {
        console.log(`\n📦 Plan: ${plan.plan_name.toUpperCase()}`);
        console.log(`   Database ID: ${plan.stripe_product_id}`);
        console.log(`   Billing: ${plan.billing_interval}`);
        console.log(`   Trial Days: ${plan.trial_days}`);
        console.log(`   Beta Available: ${plan.available_in_beta ? 'Yes' : 'No'}`);
        console.log(`   Active: ${plan.is_active ? 'Yes' : 'No'}`);

        // Check Stripe product
        try {
          const product = await stripe.products.retrieve(plan.stripe_product_id);
          console.log(`   ✅ Stripe Product: ${product.name}`);
          console.log(`   📝 Description: ${product.description}`);
          
          // Check standard price
          if (plan.standard_price_id) {
            try {
              const standardPrice = await stripe.prices.retrieve(plan.standard_price_id);
              console.log(`   💰 Standard Price: $${(standardPrice.unit_amount / 100).toFixed(2)}/${standardPrice.recurring.interval}`);
            } catch (error) {
              console.log(`   ❌ Standard Price Error: ${error.message}`);
            }
          }

          // Check promotional price
          if (plan.promotional_price_id) {
            try {
              const promoPrice = await stripe.prices.retrieve(plan.promotional_price_id);
              console.log(`   🎉 Promotional Price: $${(promoPrice.unit_amount / 100).toFixed(2)}/${promoPrice.recurring.interval}`);
            } catch (error) {
              console.log(`   ❌ Promotional Price Error: ${error.message}`);
            }
          }

        } catch (error) {
          console.log(`   ❌ Stripe Product Error: ${error.message}`);
        }
      }

      // Check for any orphaned Stripe products
      console.log('\n🔍 CHECKING FOR ORPHANED STRIPE PRODUCTS:');
      const allProducts = await stripe.products.list({ limit: 100 });
      const cookSmartProducts = allProducts.data.filter(p => 
        p.name.toLowerCase().includes('cook smart') || 
        p.description?.toLowerCase().includes('cook smart')
      );

      const dbProductIds = dbPlans.rows.map(p => p.stripe_product_id);
      const orphanedProducts = cookSmartProducts.filter(p => 
        !dbProductIds.includes(p.id) && 
        !p.name.toLowerCase().includes('[archived]')
      );

      if (orphanedProducts.length > 0) {
        console.log(`⚠️  Found ${orphanedProducts.length} orphaned Cook Smart products in Stripe:`);
        orphanedProducts.forEach(p => {
          console.log(`   - ${p.id}: ${p.name}`);
        });
      } else {
        console.log('✅ No orphaned products found');
      }

      // Summary
      console.log('\n📊 SUMMARY:');
      console.log(`   Database Plans: ${dbPlans.rows.length}`);
      console.log(`   Stripe Products: ${cookSmartProducts.length}`);
      console.log(`   Active Plans: ${dbPlans.rows.filter(p => p.is_active).length}`);
      console.log(`   Beta Available: ${dbPlans.rows.filter(p => p.available_in_beta).length}`);

      // Check API endpoint
      console.log('\n🌐 API ENDPOINT TEST:');
      try {
        const fetch = require('node-fetch');
        const response = await fetch('https://api.cooksmartapp.com/api/v1/subscriptions/plans');
        const data = await response.json();
        
        if (data.success) {
          console.log(`✅ API endpoint working - returned ${data.plans.length} plans`);
          console.log(`   Beta Mode: ${data.isBeta ? 'Yes' : 'No'}`);
          console.log(`   Message: ${data.betaMessage}`);
        } else {
          console.log(`❌ API endpoint error: ${data.message}`);
        }
      } catch (error) {
        console.log(`❌ API endpoint test failed: ${error.message}`);
      }

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ Error checking Stripe status:', error);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--cleanup') || args.includes('-c')) {
    cleanupOrphanedProducts();
  } else if (args.includes('--help') || args.includes('-h')) {
    console.log('Cook Smart Stripe Status Checker');
    console.log('');
    console.log('Usage:');
    console.log('  node check-stripe-status.js           Check status only');
    console.log('  node check-stripe-status.js --cleanup  Clean up orphaned products');
    console.log('  node check-stripe-status.js -c         Clean up orphaned products (short)');
    console.log('  node check-stripe-status.js --help     Show this help');
  } else {
    checkStripeStatus();
  }
}

module.exports = { checkStripeStatus, cleanupOrphanedProducts };