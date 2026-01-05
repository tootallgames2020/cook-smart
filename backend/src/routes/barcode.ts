import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';
import { FatSecretService } from '../services/FatSecretService';
import axios from 'axios';

const router = express.Router();
const fatSecretService = new FatSecretService();

// Map API categories to our app categories
function mapToAppCategory(apiCategory: string, productName: string): string {
  if (!apiCategory && !productName) return 'Other';
  
  const category = (apiCategory || '').toLowerCase();
  const name = (productName || '').toLowerCase();
  
  // Protein sources
  if (category.includes('meat') || category.includes('poultry') || category.includes('fish') || 
      category.includes('seafood') || category.includes('protein') || category.includes('egg') ||
      name.includes('chicken') || name.includes('beef') || name.includes('pork') || 
      name.includes('fish') || name.includes('salmon') || name.includes('tuna') || 
      name.includes('egg') || name.includes('tofu') || name.includes('beans')) {
    return 'Proteins';
  }
  
  // Dairy products
  if (category.includes('dairy') || category.includes('milk') || category.includes('cheese') ||
      name.includes('milk') || name.includes('cheese') || name.includes('yogurt') || 
      name.includes('butter') || name.includes('cream')) {
    return 'Dairy';
  }
  
  // Vegetables
  if (category.includes('vegetable') || category.includes('veggie') ||
      name.includes('tomato') || name.includes('onion') || name.includes('carrot') || 
      name.includes('pepper') || name.includes('lettuce') || name.includes('spinach') ||
      name.includes('broccoli') || name.includes('potato')) {
    return 'Vegetables';
  }
  
  // Fruits
  if (category.includes('fruit') || 
      name.includes('apple') || name.includes('banana') || name.includes('orange') || 
      name.includes('berry') || name.includes('grape') || name.includes('lemon')) {
    return 'Fruits';
  }
  
  // Grains and starches
  if (category.includes('grain') || category.includes('cereal') || category.includes('bread') ||
      category.includes('pasta') || category.includes('rice') ||
      name.includes('bread') || name.includes('rice') || name.includes('pasta') || 
      name.includes('oat') || name.includes('wheat') || name.includes('flour')) {
    return 'Grains';
  }
  
  // Spices and seasonings
  if (category.includes('spice') || category.includes('seasoning') || category.includes('herb') ||
      name.includes('salt') || name.includes('pepper') || name.includes('garlic powder') || 
      name.includes('oregano') || name.includes('basil') || name.includes('cinnamon')) {
    return 'Spices';
  }
  
  // Default to Other for everything else
  return 'Other';
}

// Fallback to Open Food Facts API
async function lookupWithOpenFoodFacts(barcode: string): Promise<any> {
  try {
    logger.info(`Trying Open Food Facts for barcode: ${barcode}`);
    const response = await axios.get(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`, {
      timeout: 5000,
    });

    if (response.data.status === 1 && response.data.product) {
      const product = response.data.product;
      return {
        food_name: product.product_name || 'Unknown Product',
        brand_name: product.brands?.split(',')[0]?.trim() || null,
        food_type: product.categories?.split(',')[0]?.trim() || 'food',
        calories: product.nutriments?.['energy-kcal_100g'] || null,
        protein: product.nutriments?.proteins_100g || null,
        carbohydrate: product.nutriments?.carbohydrates_100g || null,
        fat: product.nutriments?.fat_100g || null,
        fiber: product.nutriments?.fiber_100g || null,
        sugar: product.nutriments?.sugars_100g || null,
        sodium: product.nutriments?.sodium_100g || null,
        serving_description: product.serving_size || '100g',
      };
    }
    return null;
  } catch (error) {
    logger.error(`Open Food Facts lookup error for ${barcode}:`, error);
    return null;
  }
}

// Scan barcode
router.post('/scan', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { barcode } = req.body;

    if (!barcode) {
      return res.status(400).json({
        success: false,
        message: 'Barcode is required',
      });
    }

    logger.info(`Barcode scan by user ${req.user!.id}: ${barcode}`);

    // First try FatSecret API
    logger.info(`Trying FatSecret API for barcode: ${barcode}`);
    let product = await fatSecretService.searchFoodByBarcode(barcode);

    if (product) {
      logger.info(`FatSecret found product for ${barcode}: ${product.food_name || 'Unknown'}`);
      const mappedCategory = mapToAppCategory(product.food_type, product.food_name);
      return res.json({
        success: true,
        product: {
          barcode,
          name: product.food_name || 'Unknown Product',
          brand: product.brand_name || null,
          category: mappedCategory,
          nutrition: {
            calories: product.calories || null,
            protein: product.protein || null,
            carbs: product.carbohydrate || null,
            fat: product.fat || null,
            fiber: product.fiber || null,
            sugar: product.sugar || null,
            sodium: product.sodium || null,
          },
          serving_size: product.serving_description || null,
        },
        provider: 'FatSecret',
      });
    }

    // If FatSecret fails, try Open Food Facts
    logger.info(`FatSecret failed for ${barcode}, trying Open Food Facts`);
    product = await lookupWithOpenFoodFacts(barcode);

    if (product) {
      logger.info(`Open Food Facts found product for ${barcode}: ${product.food_name || 'Unknown'}`);
      const mappedCategory = mapToAppCategory(product.food_type, product.food_name);
      return res.json({
        success: true,
        product: {
          barcode,
          name: product.food_name || 'Unknown Product',
          brand: product.brand_name || null,
          category: mappedCategory,
          nutrition: {
            calories: product.calories || null,
            protein: product.protein || null,
            carbs: product.carbohydrate || null,
            fat: product.fat || null,
            fiber: product.fiber || null,
            sugar: product.sugar || null,
            sodium: product.sodium || null,
          },
          serving_size: product.serving_description || null,
        },
        provider: 'OpenFoodFacts',
      });
    }

    // If both fail, return mock data as fallback
    logger.warn(`No product found for barcode ${barcode}, returning fallback data`);
    return res.json({
      success: true,
      product: {
        barcode: barcode,
        name: 'Generic Product',
        brand: null,
        category: 'Other',
        nutrition: {
          calories: 100,
          protein: 5,
          carbs: 15,
          fat: 3,
          fiber: 2,
          sugar: 8,
          sodium: 200,
        },
        serving_size: '1 serving',
      },
      provider: 'Fallback',
      note: 'Product not found in databases, showing generic data',
    });
  } catch (error) {
    logger.error('Barcode scan error:', error);
    
    // Return mock data if API fails
    return res.json({
      success: true,
      product: {
        barcode: req.body.barcode,
        name: 'Generic Product',
        brand: null,
        category: 'Other',
        nutrition: {
          calories: 100,
          protein: 5,
          carbs: 15,
          fat: 3,
          fiber: 2,
          sugar: 8,
          sodium: 200,
        },
        serving_size: '1 serving',
      },
      provider: 'Fallback',
      note: 'API unavailable, showing generic data',
    });
  }
});

// Lookup product by barcode (GET method)
router.get('/lookup/:barcode', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { barcode } = req.params;

    logger.info(`Barcode lookup by user ${req.user!.id}: ${barcode}`);

    // First try FatSecret API
    logger.info(`Trying FatSecret API for barcode: ${barcode}`);
    let product = await fatSecretService.searchFoodByBarcode(barcode);

    if (product) {
      logger.info(`FatSecret found product for ${barcode}: ${product.food_name || 'Unknown'}`);
      const mappedCategory = mapToAppCategory(product.food_type, product.food_name);
      return res.json({
        success: true,
        product: {
          barcode,
          name: product.food_name || 'Unknown Product',
          brand: product.brand_name || null,
          category: mappedCategory,
          nutrition: {
            calories: product.calories || null,
            protein: product.protein || null,
            carbs: product.carbohydrate || null,
            fat: product.fat || null,
            fiber: product.fiber || null,
            sugar: product.sugar || null,
            sodium: product.sodium || null,
          },
          serving_size: product.serving_description || null,
        },
        provider: 'FatSecret',
      });
    }

    // If FatSecret fails, try Open Food Facts
    logger.info(`FatSecret failed for ${barcode}, trying Open Food Facts`);
    product = await lookupWithOpenFoodFacts(barcode);

    if (product) {
      logger.info(`Open Food Facts found product for ${barcode}: ${product.food_name || 'Unknown'}`);
      const mappedCategory = mapToAppCategory(product.food_type, product.food_name);
      return res.json({
        success: true,
        product: {
          barcode,
          name: product.food_name || 'Unknown Product',
          brand: product.brand_name || null,
          category: mappedCategory,
          nutrition: {
            calories: product.calories || null,
            protein: product.protein || null,
            carbs: product.carbohydrate || null,
            fat: product.fat || null,
            fiber: product.fiber || null,
            sugar: product.sugar || null,
            sodium: product.sodium || null,
          },
          serving_size: product.serving_description || null,
        },
        provider: 'OpenFoodFacts',
      });
    }

    // If both fail, return 404
    logger.warn(`No product found for barcode ${barcode} in either FatSecret or Open Food Facts`);
    return res.status(404).json({
      success: false,
      message: 'Product not found in our databases',
      barcode,
      tried: ['FatSecret', 'OpenFoodFacts'],
    });
  } catch (error) {
    logger.error('Barcode lookup error:', error);
    return next(createError('Failed to lookup barcode', 500));
  }
});

export default router;