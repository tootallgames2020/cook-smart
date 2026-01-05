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
    const ingredientName = ingredient_name || customName;
    const expDate = expiration_date || expirationDate;

    if (!ingredientName) {
      return res.status(400).json({
        success: false,
        message: 'Ingredient name is required (ingredient_name or customName)',
      });
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
          ingredientName.toLowerCase().replace(/\s+/g, '_'), // Generate simple ID
          ingredientName,
          quantity || null,
          unit || 'piece',
          expDate || null,
          notes || null,
          category || 'other',
        ]
      );

      // Award points for adding ingredient
      await client.query(
        'UPDATE users SET points = points + 2 WHERE id = $1',
        [req.user!.id]
      );

      logger.info(`Ingredient added by user ${req.user!.id}: ${ingredientName}`);

      return res.status(201).json({
        success: true,
        message: 'Ingredient added successfully',
        ingredient: result.rows[0],
        points_awarded: 2,
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
    const { quantity, unit, expiration_date, notes } = req.body;

    const client = await pool.connect();
    try {
      const result = await client.query(
        `UPDATE user_ingredients 
         SET quantity = $1, unit = $2, expiration_date = $3, notes = $4
         WHERE id = $5 AND user_id = $6
         RETURNING *`,
        [quantity, unit, expiration_date, notes, id, req.user!.id]
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
    { id: 'vegetables', name: 'Vegetables', icon: '🥬' },
    { id: 'fruits', name: 'Fruits', icon: '🍎' },
    { id: 'meat', name: 'Meat & Poultry', icon: '🥩' },
    { id: 'seafood', name: 'Seafood', icon: '🐟' },
    { id: 'dairy', name: 'Dairy', icon: '🥛' },
    { id: 'grains', name: 'Grains & Cereals', icon: '🌾' },
    { id: 'legumes', name: 'Legumes', icon: '🫘' },
    { id: 'nuts', name: 'Nuts & Seeds', icon: '🥜' },
    { id: 'oils', name: 'Oils & Fats', icon: '🫒' },
    { id: 'seasonings', name: 'Herbs & Spices', icon: '🌿' },
    { id: 'condiments', name: 'Condiments', icon: '🍯' },
    { id: 'beverages', name: 'Beverages', icon: '🥤' },
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
          shoppingItem.item_name.toLowerCase().replace(/\s+/g, '_'),
          shoppingItem.item_name,
          shoppingItem.quantity || 1,
          shoppingItem.unit || 'piece',
          expiration_date || null,
          notes || shoppingItem.notes,
          shoppingItem.category || 'other',
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

      logger.info(`Ingredient moved from shopping to inventory: ${shoppingItem.item_name}`);

      return res.status(201).json({
        success: true,
        message: 'Ingredient moved from shopping list to inventory',
        ingredient: result.rows[0],
        points_awarded: 3,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Move from shopping to inventory error:', error);
    return next(createError('Failed to move ingredient from shopping list', 500));
  }
});

// Use ingredient for cooking (reduces quantity)
router.post('/:id/use', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { quantity_used, recipe_id } = req.body;

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
      const newQuantity = Math.max(0, currentQuantity - quantity_used);

      // Update ingredient quantity
      const result = await client.query(
        `UPDATE user_ingredients 
         SET quantity = $1, updated_at = NOW()
         WHERE id = $2 AND user_id = $3
         RETURNING *`,
        [newQuantity, id, req.user!.id]
      );

      // Log ingredient usage
      await client.query(
        `INSERT INTO ingredient_usage_log 
         (user_id, ingredient_id, ingredient_name, quantity_used, recipe_id, used_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [req.user!.id, ingredient.ingredient_id, ingredient.ingredient_name, quantity_used, recipe_id]
      );

      // Award points for using ingredients
      await client.query(
        'UPDATE users SET points = points + 1 WHERE id = $1',
        [req.user!.id]
      );

      // If ingredient is completely used up, optionally remove it
      let message = 'Ingredient quantity updated';
      if (newQuantity === 0) {
        message = 'Ingredient used up completely';
      }

      return res.json({
        success: true,
        message,
        ingredient: result.rows[0],
        quantityUsed: quantity_used,
        remainingQuantity: newQuantity,
        points_awarded: 1,
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

// Fix uncategorized ingredients (admin/maintenance endpoint)
router.post('/fix-categories', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const client = await pool.connect();
    try {
      // Update ingredients with null or empty categories to 'Uncategorized'
      const result = await client.query(`
        UPDATE user_ingredients 
        SET category = 'Uncategorized' 
        WHERE (category IS NULL OR category = '' OR category = 'null' OR TRIM(category) = '')
        AND user_id = $1
        RETURNING id, ingredient_name, category
      `, [req.user!.id]);

      logger.info(`Fixed categories for ${result.rows.length} ingredients for user ${req.user!.id}`);

      return res.json({
        success: true,
        message: `Updated ${result.rows.length} ingredients to 'Uncategorized'`,
        updated: result.rows,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Fix categories error:', error);
    return next(createError('Failed to fix categories', 500));
  }
});

export default router;