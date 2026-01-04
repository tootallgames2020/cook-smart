import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';
import { FatSecretService } from '../services/FatSecretService';

const router = express.Router();
const fatSecretService = new FatSecretService();

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

    // Search for product using FatSecret API
    const product = await fatSecretService.searchFoodByBarcode(barcode);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found for this barcode',
        barcode,
      });
    }

    return res.json({
      success: true,
      product: {
        barcode,
        name: product.food_name || 'Unknown Product',
        brand: product.brand_name || null,
        category: product.food_type || 'food',
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
  } catch (error) {
    logger.error('Barcode scan error:', error);
    
    // Return mock data if API fails
    return res.json({
      success: true,
      product: {
        barcode: req.body.barcode,
        name: 'Generic Product',
        brand: null,
        category: 'food',
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

    // Search for product using FatSecret API
    const product = await fatSecretService.searchFoodByBarcode(barcode);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found for this barcode',
        barcode,
      });
    }

    return res.json({
      success: true,
      product: {
        barcode,
        name: product.food_name || 'Unknown Product',
        brand: product.brand_name || null,
        category: product.food_type || 'food',
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
  } catch (error) {
    logger.error('Barcode lookup error:', error);
    return next(createError('Failed to lookup barcode', 500));
  }
});

export default router;