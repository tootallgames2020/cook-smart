const { cleanupOrphanedProducts } = require('./check-stripe-status');

console.log('🧹 Cook Smart - Stripe Orphan Cleanup');
console.log('=====================================\n');

cleanupOrphanedProducts().then(() => {
  console.log('\n✅ Cleanup process completed!');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Cleanup failed:', error);
  process.exit(1);
});