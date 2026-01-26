import express from 'express';
import { pool } from '../server';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';

const router = express.Router();

// Get user's ingredients (pantry)
router.get('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { category, search } = req.query;

    const client = await pool.connect();
    try {
      let query = `
        SELECT ui.id, ui.ingredient_id, ui.ingredient_name, ui.quantity, 
               ui.unit, ui.expiration_date, ui.notes, ui.category, ui.added_at
        FROM user_ingredients ui
        WHERE ui.user_id = $1
      `;
      const params: any[] = [req.user!.id];

      if (category) {
        query += ' AND ui.category = $2';
        params.push(category);
      }

      if (search) {
        const searchIndex = params.length + 1;
        query += ` AND ui.ingredient_name ILIKE $${searchIndex}`;
        params.push(`%${search}%`);
      }

      query += ' ORDER BY ui.added_at DESC';

      const result = await client.query(query, params);

      return res.json({
        success: true,
        ingredients: result.rows,
        count: result.rows.length,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Get ingredients error:', error);
    return next(createError('Failed to get ingredients', 500));
  }
});

// Add ingredient to pantry
router.post('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { ingredient_name, customName, quantity, unit, expiration_date, expirationDate, notes, category } = req.body;

    // Handle both field name formats (mobile app uses customName, web might use ingredient_name)
    const rawIngredientName = ingredient_name || customName;
    const expDate = expiration_date || expirationDate;

    if (!rawIngredientName) {
      return res.status(400).json({
        success: false,
        message: 'Ingredient name is required (ingredient_name or customName)',
      });
    }

    // 🚀 APPLY ADVANCED INGREDIENT STANDARDIZATION
    const { ComprehensiveIngredientStandardizer } = await import('../services/ComprehensiveIngredientStandardizer');
    
    let standardizedName: string;
    let detectedCategory: string;
    let standardizedUnit: string;
    
    try {
      const standardized = await ComprehensiveIngredientStandardizer.standardizeIngredient(rawIngredientName);
      standardizedName = standardized.standardName;
      detectedCategory = standardized.category;
      standardizedUnit = standardized.standardUnit;
      
      logger.info(`Ingredient standardized: "${rawIngredientName}" → "${standardizedName}" (${detectedCategory})`);
    } catch (error) {
      // Fallback to raw name if standardization fails
      logger.warn(`Ingredient standardization failed for "${rawIngredientName}":`, error);
      standardizedName = rawIngredientName;
      detectedCategory = category || 'other';
      standardizedUnit = unit || 'piece';
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO user_ingredients 
         (user_id, ingredient_id, ingredient_name, quantity, unit, expiration_date, notes, category, added_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         RETURNING *`,
        [
          req.user!.id,
          standardizedName.toLowerCase().replace(/\s+/g, '_'), // Generate ID from standardized name
          standardizedName, // Use standardized name
          quantity || null,
          standardizedUnit, // Use standardized unit
          expDate || null,
          notes || null,
          category || detectedCategory, // Use provided category or detected category
        ]
      );

      // Award points for adding ingredient
      await client.query(
        'UPDATE users SET points = points + 2 WHERE id = $1',
        [req.user!.id]
      );

      logger.info(`Ingredient added by user ${req.user!.id}: "${rawIngredientName}" → "${standardizedName}"`);

      return res.status(201).json({
        success: true,
        message: 'Ingredient added successfully',
        ingredient: result.rows[0],
        points_awarded: 2,
        standardization: {
          original: rawIngredientName,
          standardized: standardizedName,
          category: detectedCategory,
          unit: standardizedUnit,
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Add ingredient error:', error);
    return next(createError('Failed to add ingredient', 500));
  }
});

// Update ingredient
router.put('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { quantity, unit, expiration_date, notes, category } = req.body;

    const client = await pool.connect();
    try {
      const result = await client.query(
        `UPDATE user_ingredients 
         SET quantity = $1, unit = $2, expiration_date = $3, notes = $4, category = $5
         WHERE id = $6 AND user_id = $7
         RETURNING *`,
        [quantity, unit, expiration_date, notes, category, id, req.user!.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Ingredient not found or not owned by user',
        });
      }

      return res.json({
        success: true,
        message: 'Ingredient updated successfully',
        ingredient: result.rows[0],
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Update ingredient error:', error);
    return next(createError('Failed to update ingredient', 500));
  }
});

// Delete ingredient
router.delete('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const client = await pool.connect();
    try {
      const result = await client.query(
        'DELETE FROM user_ingredients WHERE id = $1 AND user_id = $2',
        [id, req.user!.id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Ingredient not found or not owned by user',
        });
      }

      return res.json({
        success: true,
        message: 'Ingredient deleted successfully',
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Delete ingredient error:', error);
    return next(createError('Failed to delete ingredient', 500));
  }
});

// Search ingredients (for adding new ones)
router.get('/search', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { q, limit = 20 } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required',
      });
    }

    // Mock ingredient search - in production, this would query a comprehensive ingredient database
    const mockIngredients = [
      { id: 'chicken_breast', name: 'Chicken Breast', category: 'meat' },
      { id: 'rice', name: 'Rice', category: 'grains' },
      { id: 'broccoli', name: 'Broccoli', category: 'vegetables' },
      { id: 'tomato', name: 'Tomato', category: 'vegetables' },
      { id: 'onion', name: 'Onion', category: 'vegetables' },
      { id: 'garlic', name: 'Garlic', category: 'vegetables' },
      { id: 'olive_oil', name: 'Olive Oil', category: 'oils' },
      { id: 'salt', name: 'Salt', category: 'seasonings' },
      { id: 'pepper', name: 'Black Pepper', category: 'seasonings' },
      { id: 'pasta', name: 'Pasta', category: 'grains' },
    ].filter(ingredient => 
      ingredient.name.toLowerCase().includes((q as string).toLowerCase())
    ).slice(0, parseInt(limit as string));

    return res.json({
      success: true,
      ingredients: mockIngredients,
      count: mockIngredients.length,
    });
  } catch (error) {
    logger.error('Search ingredients error:', error);
    return next(createError('Failed to search ingredients', 500));
  }
});

// Get ingredient categories
router.get('/categories', authenticateToken, async (req: AuthRequest, res) => {
  const categories = [
    { id: 'vegetables', name: 'Vegetables', icon: '🥕' },
    { id: 'fruits', name: 'Fruits', icon: '🍓' },
    { id: 'meat', name: 'Meat & Poultry', icon: '🍗' },
    { id: 'seafood', name: 'Seafood', icon: '🦐' },
    { id: 'dairy', name: 'Dairy', icon: '🧀' },
    { id: 'grains', name: 'Grains & Cereals', icon: '🍞' },
    { id: 'legumes', name: 'Legumes', icon: '🫘' },
    { id: 'nuts', name: 'Nuts & Seeds', icon: '🌰' },
    { id: 'oils', name: 'Oils & Fats', icon: '🫒' },
    { id: 'seasonings', name: 'Herbs & Spices', icon: '🧂' },
    { id: 'condiments', name: 'Condiments', icon: '🍯' },
    { id: 'beverages', name: 'Beverages', icon: '☕' },
    { id: 'other', name: 'Other', icon: '📦' },
  ];

  return res.json({
    success: true,
    categories,
  });
});

// Add ingredient from shopping list (when marked as bought)
router.post('/from-shopping/:shopping_id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { shopping_id } = req.params;
    const { expiration_date, notes } = req.body;

    const client = await pool.connect();
    try {
      // Get shopping list item
      const shoppingResult = await client.query(
        'SELECT * FROM shopping_list_items WHERE id = $1 AND user_id = $2',
        [shopping_id, req.user!.id]
      );

      if (shoppingResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Shopping list item not found',
        });
      }

      const shoppingItem = shoppingResult.rows[0];

      // 🚀 APPLY ADVANCED INGREDIENT STANDARDIZATION
      const { ComprehensiveIngredientStandardizer } = await import('../services/ComprehensiveIngredientStandardizer');
      
      let standardizedName: string;
      let detectedCategory: string;
      let standardizedUnit: string;
      
      try {
        const standardized = await ComprehensiveIngredientStandardizer.standardizeIngredient(shoppingItem.item_name);
        standardizedName = standardized.standardName;
        detectedCategory = standardized.category;
        standardizedUnit = standardized.standardUnit;
        
        logger.info(`Shopping item standardized: "${shoppingItem.item_name}" → "${standardizedName}" (${detectedCategory})`);
      } catch (error) {
        // Fallback to raw name if standardization fails
        logger.warn(`Shopping item standardization failed for "${shoppingItem.item_name}":`, error);
        standardizedName = shoppingItem.item_name;
        detectedCategory = shoppingItem.category || 'other';
        standardizedUnit = shoppingItem.unit || 'piece';
      }

      // Add to inventory
      const result = await client.query(
        `INSERT INTO user_ingredients 
         (user_id, ingredient_id, ingredient_name, quantity, unit, expiration_date, notes, category, added_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         ON CONFLICT (user_id, ingredient_name) DO UPDATE SET
         quantity = COALESCE(user_ingredients.quantity, 0) + COALESCE($4, 1),
         updated_at = NOW()
         RETURNING *`,
        [
          req.user!.id,
          standardizedName.toLowerCase().replace(/\s+/g, '_'), // Use standardized name for ID
          standardizedName, // Use standardized name
          shoppingItem.quantity || 1,
          standardizedUnit, // Use standardized unit
          expiration_date || null,
          notes || shoppingItem.notes,
          shoppingItem.category || detectedCategory, // Use detected category if none provided
        ]
      );

      // Mark shopping item as completed
      await client.query(
        'UPDATE shopping_list_items SET completed = true, completed_at = NOW() WHERE id = $1',
        [shopping_id]
      );

      // Award points
      await client.query(
        'UPDATE users SET points = points + 3 WHERE id = $1',
        [req.user!.id]
      );

      logger.info(`Ingredient moved from shopping to inventory: "${shoppingItem.item_name}" → "${standardizedName}"`);

      return res.status(201).json({
        success: true,
        message: 'Ingredient moved from shopping list to inventory',
        ingredient: result.rows[0],
        points_awarded: 3,
        standardization: {
          original: shoppingItem.item_name,
          standardized: standardizedName,
          category: detectedCategory,
          unit: standardizedUnit,
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Move from shopping to inventory error:', error);
    return next(createError('Failed to move ingredient from shopping list', 500));
  }
});

// Use ingredient for cooking (reduces quantity with cross-unit conversion support)
router.post('/:id/use', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { quantity_used, unit_used, recipe_id } = req.body;

    if (!quantity_used || quantity_used <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid quantity_used is required',
      });
    }

    const client = await pool.connect();
    try {
      // Get current ingredient
      const ingredientResult = await client.query(
        'SELECT * FROM user_ingredients WHERE id = $1 AND user_id = $2',
        [id, req.user!.id]
      );

      if (ingredientResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Ingredient not found',
        });
      }

      const ingredient = ingredientResult.rows[0];
      const currentQuantity = ingredient.quantity || 0;
      const inventoryUnit = ingredient.unit || 'piece';
      const usedUnit = unit_used || inventoryUnit; // Default to inventory unit if not specified

      // 🚀 APPLY CROSS-UNIT INVENTORY CONVERSION
      const { InventoryUnitConverter } = await import('../services/InventoryUnitConverter');
      
      const conversionResult = InventoryUnitConverter.subtractUsage(
        currentQuantity,
        inventoryUnit,
        quantity_used,
        usedUnit,
        ingredient.ingredient_name
      );

      if (!conversionResult.success) {
        return res.status(400).json({
          success: false,
          message: `Unit conversion failed: ${conversionResult.error}`,
          details: {
            inventoryQuantity: currentQuantity,
            inventoryUnit,
            usedQuantity: quantity_used,
            usedUnit,
            ingredient: ingredient.ingredient_name,
          },
        });
      }

      const newQuantity = conversionResult.remainingQuantity!;
      const finalUnit = conversionResult.remainingUnit!;

      // Update ingredient quantity with potentially converted unit
      const result = await client.query(
        `UPDATE user_ingredients 
         SET quantity = $1, unit = $2, updated_at = NOW()
         WHERE id = $3 AND user_id = $4
         RETURNING *`,
        [newQuantity, finalUnit, id, req.user!.id]
      );

      // Log ingredient usage with conversion details
      await client.query(
        `INSERT INTO ingredient_usage_log 
         (user_id, ingredient_id, ingredient_name, quantity_used, unit_used, recipe_id, conversion_details, used_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
          req.user!.id, 
          ingredient.ingredient_id, 
          ingredient.ingredient_name, 
          quantity_used, 
          usedUnit,
          recipe_id,
          JSON.stringify({
            originalInventory: `${currentQuantity} ${inventoryUnit}`,
            usedAmount: `${quantity_used} ${usedUnit}`,
            conversionUsed: conversionResult.conversionUsed,
            remainingAmount: `${newQuantity} ${finalUnit}`,
          })
        ]
      );

      // Award points for using ingredients
      await client.query(
        'UPDATE users SET points = points + 1 WHERE id = $1',
        [req.user!.id]
      );

      // If ingredient is completely used up, remove it from inventory
      let message = 'Ingredient quantity updated with unit conversion';
      let ingredientData = result.rows[0];
      
      if (newQuantity === 0) {
        // Delete the ingredient from inventory when it hits 0
        await client.query(
          'DELETE FROM user_ingredients WHERE id = $1 AND user_id = $2',
          [id, req.user!.id]
        );
        
        message = 'Ingredient used up completely and removed from inventory';
        ingredientData = null; // Indicate ingredient was removed
      }

      logger.info(`Ingredient usage with conversion: ${ingredient.ingredient_name} - ${conversionResult.conversionUsed}`);

      return res.json({
        success: true,
        message,
        ingredient: ingredientData,
        usage: {
          quantityUsed: quantity_used,
          unitUsed: usedUnit,
          conversionUsed: conversionResult.conversionUsed,
          convertedQuantity: conversionResult.convertedQuantity,
        },
        inventory: {
          previousQuantity: currentQuantity,
          previousUnit: inventoryUnit,
          remainingQuantity: newQuantity,
          remainingUnit: finalUnit,
        },
        points_awarded: 1,
        removed: newQuantity === 0,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Use ingredient error:', error);
    return next(createError('Failed to use ingredient', 500));
  }
});

// Check recipe availability based on current inventory
router.post('/check-recipe-availability', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { recipe_ingredients } = req.body;

    if (!recipe_ingredients || !Array.isArray(recipe_ingredients)) {
      return res.status(400).json({
        success: false,
        message: 'Recipe ingredients array is required',
      });
    }

    const client = await pool.connect();
    try {
      // Get user's current inventory
      const inventoryResult = await client.query(
        'SELECT ingredient_name, quantity, unit FROM user_ingredients WHERE user_id = $1',
        [req.user!.id]
      );

      const userInventory = inventoryResult.rows.map(row => ({
        name: row.ingredient_name.toLowerCase(),
        quantity: row.quantity,
        unit: row.unit,
      }));

      // Check availability for each recipe ingredient
      const availabilityCheck = recipe_ingredients.map((ingredient: string) => {
        const ingredientName = ingredient.toLowerCase();
        const inventoryMatch = userInventory.find(inv => 
          inv.name.includes(ingredientName) || ingredientName.includes(inv.name)
        );

        return {
          ingredient,
          available: !!inventoryMatch,
          inventoryQuantity: inventoryMatch?.quantity,
          inventoryUnit: inventoryMatch?.unit,
        };
      });

      const availableCount = availabilityCheck.filter(item => item.available).length;
      const totalCount = recipe_ingredients.length;
      const availabilityPercentage = Math.round((availableCount / totalCount) * 100);

      return res.json({
        success: true,
        availability: {
          ingredients: availabilityCheck,
          available: availableCount,
          total: totalCount,
          percentage: availabilityPercentage,
          canMake: availabilityPercentage >= 70,
          missing: availabilityCheck.filter(item => !item.available),
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Check recipe availability error:', error);
    return next(createError('Failed to check recipe availability', 500));
  }
});

// Enhanced categorization endpoint using new service
router.post('/fix-categories', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { EnhancedIngredientCategorizationService } = await import('../services/EnhancedIngredientCategorizationService');
    
    const client = await pool.connect();
    try {
      // Get all uncategorized ingredients for the user
      const uncategorized = await client.query(`
        SELECT id, ingredient_name, category
        FROM user_ingredients 
        WHERE (category IS NULL OR category = '' OR category = 'null' OR TRIM(category) = '' OR category = 'Uncategorized')
        AND user_id = $1
      `, [req.user!.id]);

      if (uncategorized.rows.length === 0) {
        return res.json({
          success: true,
          message: 'No uncategorized ingredients found',
          updated: [],
        });
      }

      const updated: any[] = [];

      // Use enhanced categorization service
      for (const ingredient of uncategorized.rows) {
        const analysis = await EnhancedIngredientCategorizationService.categorizeIngredient(
          ingredient.ingredient_name
        );

        // Only update if we have reasonable confidence
        if (analysis.primaryCategory.confidence >= 0.3) {
          const result = await client.query(`
            UPDATE user_ingredients 
            SET category = $1 
            WHERE id = $2 AND user_id = $3
            RETURNING id, ingredient_name, category
          `, [analysis.primaryCategory.category, ingredient.id, req.user!.id]);

          if (result.rows.length > 0) {
            updated.push({
              ...result.rows[0],
              confidence: analysis.primaryCategory.confidence,
              reason: analysis.primaryCategory.reason,
              alternatives: analysis.alternativeCategories
            });
          }
        }
      }

      logger.info(`Enhanced categorization processed ${updated.length} ingredients for user ${req.user!.id}`);

      return res.json({
        success: true,
        message: `Categorized ${updated.length} ingredient${updated.length !== 1 ? 's' : ''} using enhanced AI`,
        updated: updated,
        totalProcessed: uncategorized.rows.length,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Enhanced categorization error:', error);
    return next(createError('Failed to categorize ingredients', 500));
  }
});

// Analyze ingredient categorization (new endpoint)
router.post('/analyze-categorization', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { ingredient_name } = req.body;
    
    if (!ingredient_name) {
      return res.status(400).json({
        success: false,
        message: 'Ingredient name is required'
      });
    }

    const { EnhancedIngredientCategorizationService } = await import('../services/EnhancedIngredientCategorizationService');
    
    const analysis = await EnhancedIngredientCategorizationService.categorizeIngredient(ingredient_name);
    
    return res.json({
      success: true,
      analysis
    });
  } catch (error) {
    logger.error('Analyze categorization error:', error);
    return next(createError('Failed to analyze ingredient categorization', 500));
  }
});

// Submit categorization feedback (new endpoint)
router.post('/categorization-feedback', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { ingredient_name, correct_category } = req.body;
    
    if (!ingredient_name || !correct_category) {
      return res.status(400).json({
        success: false,
        message: 'Ingredient name and correct category are required'
      });
    }

    const { EnhancedIngredientCategorizationService } = await import('../services/EnhancedIngredientCategorizationService');
    
    await EnhancedIngredientCategorizationService.recordUserFeedback(
      ingredient_name, 
      correct_category, 
      req.user!.id.toString()
    );
    
    return res.json({
      success: true,
      message: 'Feedback recorded successfully'
    });
  } catch (error) {
    logger.error('Categorization feedback error:', error);
    return next(createError('Failed to record feedback', 500));
  }
});

// Get categorization statistics (new endpoint)
router.get('/categorization-stats', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { EnhancedIngredientCategorizationService } = await import('../services/EnhancedIngredientCategorizationService');
    
    const stats = await EnhancedIngredientCategorizationService.getCategoryStatistics();
    
    return res.json({
      success: true,
      statistics: stats
    });
  } catch (error) {
    logger.error('Get categorization stats error:', error);
    return next(createError('Failed to get categorization statistics', 500));
  }
});

// Test unit conversion endpoint (for debugging and validation)
router.post('/test-conversion', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { 
      inventory_quantity, 
      inventory_unit, 
      used_quantity, 
      used_unit, 
      ingredient_name 
    } = req.body;

    if (!inventory_quantity || !inventory_unit || !used_quantity || !used_unit || !ingredient_name) {
      return res.status(400).json({
        success: false,
        message: 'All parameters required: inventory_quantity, inventory_unit, used_quantity, used_unit, ingredient_name',
      });
    }

    const { InventoryUnitConverter } = await import('../services/InventoryUnitConverter');
    
    const conversionResult = InventoryUnitConverter.subtractUsage(
      inventory_quantity,
      inventory_unit,
      used_quantity,
      used_unit,
      ingredient_name
    );

    // Also test if conversion is possible
    const canConvert = InventoryUnitConverter.canConvert(
      used_unit,
      inventory_unit,
      ingredient_name
    );

    // Get supported conversions for this ingredient
    const supportedConversions = InventoryUnitConverter.getSupportedConversions(ingredient_name);

    return res.json({
      success: true,
      test: {
        input: {
          inventory: `${inventory_quantity} ${inventory_unit}`,
          used: `${used_quantity} ${used_unit}`,
          ingredient: ingredient_name,
        },
        result: conversionResult,
        canConvert,
        supportedConversions: supportedConversions.slice(0, 10), // Limit for readability
      },
    });
  } catch (error) {
    logger.error('Test conversion error:', error);
    return next(createError('Failed to test conversion', 500));
  }
});

export default router;