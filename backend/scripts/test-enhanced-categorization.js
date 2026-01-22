/**
 * Test script for Enhanced Ingredient Categorization System
 * 
 * This script:
 * 1. Runs the feedback system migration
 * 2. Tests the enhanced categorization service
 * 3. Provides sample categorizations with confidence scores
 * 4. Shows improvement suggestions
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Test ingredients with various complexity levels
const TEST_INGREDIENTS = [
  // Clear cases
  'chicken breast',
  'olive oil',
  'tomato',
  'black pepper',
  
  // Ambiguous cases
  'pepper', // Could be spice or vegetable
  'milk chocolate', // Could be dairy or candy
  'coconut', // Could be fruit or nut
  
  // Complex cases
  'extra virgin olive oil',
  'organic free-range chicken breast',
  'fresh basil leaves',
  'canned diced tomatoes',
  
  // Edge cases
  'bell pepper',
  'red pepper flakes',
  'coconut milk',
  'almond milk',
  
  // Messy input
  '2 cups chopped onions',
  'fl oz vanilla extract',
  'serving ground beef',
  '1/2 lb fresh salmon fillet',
];

async function runMigration() {
  console.log('🔧 Running Enhanced Categorization Migration...');
  
  try {
    const migrationPath = path.join(__dirname, '../migrations/022_create_ingredient_feedback_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    await pool.query(migrationSQL);
    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

async function testEnhancedCategorization() {
  console.log('\n🧪 Testing Enhanced Categorization Service...');
  
  // Import the service (using dynamic import for ES modules)
  const { EnhancedIngredientCategorizationService } = require('../dist/services/EnhancedIngredientCategorizationService');
  
  const results = [];
  
  for (const ingredient of TEST_INGREDIENTS) {
    try {
      console.log(`\n🔍 Analyzing: "${ingredient}"`);
      
      const analysis = await EnhancedIngredientCategorizationService.categorizeIngredient(ingredient);
      
      console.log(`   → Cleaned: "${analysis.cleanedName}"`);
      console.log(`   → Primary: ${analysis.primaryCategory.category} (${Math.round(analysis.primaryCategory.confidence * 100)}%)`);
      console.log(`   → Reason: ${analysis.primaryCategory.reason}`);
      
      if (analysis.alternativeCategories.length > 0) {
        console.log(`   → Alternatives:`);
        analysis.alternativeCategories.forEach(alt => {
          console.log(`     - ${alt.category} (${Math.round(alt.confidence * 100)}%)`);
        });
      }
      
      results.push({
        original: ingredient,
        analysis
      });
      
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
    }
  }
  
  return results;
}

async function analyzeResults(results) {
  console.log('\n📊 Analysis Summary:');
  
  const categoryDistribution = {};
  const confidenceStats = {
    high: 0, // > 80%
    medium: 0, // 50-80%
    low: 0 // < 50%
  };
  
  results.forEach(result => {
    const category = result.analysis.primaryCategory.category;
    const confidence = result.analysis.primaryCategory.confidence;
    
    categoryDistribution[category] = (categoryDistribution[category] || 0) + 1;
    
    if (confidence > 0.8) confidenceStats.high++;
    else if (confidence > 0.5) confidenceStats.medium++;
    else confidenceStats.low++;
  });
  
  console.log('\n📈 Category Distribution:');
  Object.entries(categoryDistribution)
    .sort(([,a], [,b]) => b - a)
    .forEach(([category, count]) => {
      console.log(`   ${category}: ${count} ingredients`);
    });
  
  console.log('\n🎯 Confidence Distribution:');
  console.log(`   High (>80%): ${confidenceStats.high} ingredients`);
  console.log(`   Medium (50-80%): ${confidenceStats.medium} ingredients`);
  console.log(`   Low (<50%): ${confidenceStats.low} ingredients`);
  
  const avgConfidence = results.reduce((sum, r) => sum + r.analysis.primaryCategory.confidence, 0) / results.length;
  console.log(`   Average Confidence: ${Math.round(avgConfidence * 100)}%`);
}

async function showImprovementSuggestions(results) {
  console.log('\n💡 Improvement Suggestions:');
  
  const lowConfidenceItems = results.filter(r => r.analysis.primaryCategory.confidence < 0.6);
  
  if (lowConfidenceItems.length > 0) {
    console.log('\n⚠️  Low Confidence Items (need attention):');
    lowConfidenceItems.forEach(item => {
      console.log(`   "${item.original}" → ${item.analysis.primaryCategory.category} (${Math.round(item.analysis.primaryCategory.confidence * 100)}%)`);
      console.log(`     Suggestion: Add more specific patterns or user feedback`);
    });
  }
  
  console.log('\n🔧 Recommended Improvements:');
  console.log('   1. Add more specific regex patterns for ambiguous ingredients');
  console.log('   2. Integrate nutritional data from FatSecret API');
  console.log('   3. Implement user feedback learning system');
  console.log('   4. Add context-aware categorization (recipe context)');
  console.log('   5. Implement multi-language support');
}

async function testUserFeedback() {
  console.log('\n👥 Testing User Feedback System...');
  
  try {
    // Simulate user feedback
    await pool.query(`
      INSERT INTO ingredient_categorization_feedback 
      (ingredient_name, category, user_id, confidence_score)
      VALUES 
      ('bell pepper', 'Vegetables', 1, 1.0),
      ('red pepper flakes', 'Spices & Herbs', 1, 1.0),
      ('coconut milk', 'Dairy & Eggs', 1, 0.8),
      ('almond milk', 'Dairy & Eggs', 1, 0.9)
      ON CONFLICT (ingredient_name, category, user_id) DO NOTHING
    `);
    
    console.log('✅ Sample feedback recorded');
    
    // Check feedback stats
    const stats = await pool.query(`
      SELECT category, COUNT(*) as feedback_count
      FROM ingredient_categorization_feedback
      GROUP BY category
      ORDER BY feedback_count DESC
    `);
    
    console.log('📊 Feedback Statistics:');
    stats.rows.forEach(row => {
      console.log(`   ${row.category}: ${row.feedback_count} feedback entries`);
    });
    
  } catch (error) {
    console.error('❌ Feedback test failed:', error.message);
  }
}

async function main() {
  console.log('🚀 Enhanced Ingredient Categorization Test Suite');
  console.log('================================================');
  
  try {
    // Step 1: Run migration
    await runMigration();
    
    // Step 2: Test categorization
    const results = await testEnhancedCategorization();
    
    // Step 3: Analyze results
    await analyzeResults(results);
    
    // Step 4: Show improvement suggestions
    await showImprovementSuggestions(results);
    
    // Step 5: Test user feedback system
    await testUserFeedback();
    
    console.log('\n🎉 Test suite completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('   1. Deploy the enhanced categorization service');
    console.log('   2. Update mobile app to use new feedback component');
    console.log('   3. Monitor categorization accuracy in production');
    console.log('   4. Collect user feedback to improve the system');
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
  } finally {
    await pool.end();
  }
}

// Run the test suite
if (require.main === module) {
  main();
}

module.exports = { 
  runMigration, 
  testEnhancedCategorization, 
  analyzeResults 
};