import express from 'express';
import { pool } from '../server';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';

const router = express.Router();

// Get user's shopping list
router.get('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { category, completed } = req.query;

    const client = await pool.connect();
    try {
      let query = `
        SELECT sli.id, sli.ingredient, sli.quantity, sli.unit, sli.category,
               sli.recipe_id, sli.is_completed, sli.date_added, sli.date_updated
        FROM shopping_list_items sli
        WHERE sli.user_id = $1
      `;
      const params: any[] = [req.user!.id];

      if (category) {
        query += ' AND sli.category = $2';
        params.push(category);
      }

      if (completed !== undefined) {
        const completedIndex = params.length + 1;
        query += ` AND sli.is_completed = $${completedIndex}`;
        params.push(completed === 'true');
      }

      query += ' ORDER BY sli.is_completed ASC, sli.date_added DESC';

      const result = await client.query(query, params);

      // Map database fields to mobile app expected format
      const mappedItems = result.rows.map((item: any) => ({
        id: item.id.toString(),
        userId: item.user_id,
        ingredient: item.ingredient,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
        isCompleted: item.is_completed,
        recipeId: item.recipe_id,
        dateCreated: item.date_added,
        dateUpdated: item.date_updated,
      }));

      // Group items by category for better organization
      const itemsByCategory = mappedItems.reduce((acc: any, item: any) => {
        const category = item.category || 'other';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(item);
        return acc;
      }, {});

      return res.json({
        success: true,
        items: mappedItems,
        shopping_list: {
          items: mappedItems,
          itemsByCategory,
          totalItems: mappedItems.length,
          completedItems: mappedItems.filter((item: any) => item.isCompleted).length,
          pendingItems: mappedItems.filter((item: any) => !item.isCompleted).length,
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Get shopping list error:', error);
    return next(createError('Failed to get shopping list', 500));
  }
});

// Add item to shopping list
router.post('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { item_name, quantity, unit, category, notes, needed_for_recipe, recipe_id } = req.body;

    if (!item_name) {
      return res.status(400).json({
        success: false,
        message: 'Item name is required',
      });
    }

    const client = await pool.connect();
    try {
      // Check if item already exists in shopping list
      const existingItem = await client.query(
        'SELECT id FROM shopping_list_items WHERE user_id = $1 AND item_name = $2 AND completed = false',
        [req.user!.id, item_name]
      );

      if (existingItem.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Item already exists in shopping list',
          existingItemId: existingItem.rows[0].id,
        });
      }

      const result = await client.query(
        `INSERT INTO shopping_list_items 
         (user_id, item_name, quantity, unit, category, notes, needed_for_recipe, recipe_id, added_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         RETURNING *`,
        [
          req.user!.id,
          item_name,
          quantity || null,
          unit || 'piece',
          category || 'other',
          notes || null,
          needed_for_recipe || false,
          recipe_id || null,
        ]
      );

      // Award points for adding to shopping list
      await client.query(
        'UPDATE users SET points = points + 1 WHERE id = $1',
        [req.user!.id]
      );

      logger.info(`Shopping list item added by user ${req.user!.id}: ${item_name}`);

      return res.status(201).json({
        success: true,
        message: 'Item added to shopping list',
        item: result.rows[0],
        points_awarded: 1,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Add shopping list item error:', error);
    return next(createError('Failed to add item to shopping list', 500));
  }
});

// Mark item as bought (moves to inventory)
router.post('/:id/mark-bought', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { expiration_date, notes } = req.body;

    const client = await pool.connect();
    try {
      // Get the shopping list item
      const shoppingItem = await client.query(
        'SELECT * FROM shopping_list_items WHERE id = $1 AND user_id = $2',
        [id, req.user!.id]
      );

      if (shoppingItem.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Shopping list item not found',
        });
      }

      const item = shoppingItem.rows[0];

      // Mark shopping list item as completed
      await client.query(
        'UPDATE shopping_list_items SET completed = true, completed_at = NOW() WHERE id = $1',
        [id]
      );

      // Add item to user's inventory
      const inventoryResult = await client.query(
        `INSERT INTO user_ingredients 
         (user_id, ingredient_id, ingredient_name, quantity, unit, expiration_date, notes, category, added_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         ON CONFLICT (user_id, ingredient_name) DO UPDATE SET
         quantity = COALESCE(user_ingredients.quantity, 0) + COALESCE($4, 1),
         updated_at = NOW()
         RETURNING *`,
        [
          req.user!.id,
          item.item_name.toLowerCase().replace(/\s+/g, '_'),
          item.item_name,
          item.quantity || 1,
          item.unit || 'piece',
          expiration_date || null,
          notes || item.notes,
          item.category || 'other',
        ]
      );

      // Award points for completing shopping
      await client.query(
        'UPDATE users SET points = points + 2 WHERE id = $1',
        [req.user!.id]
      );

      logger.info(`Shopping item marked as bought and moved to inventory: ${item.item_name}`);

      return res.json({
        success: true,
        message: 'Item marked as bought and added to inventory',
        shoppingItem: { ...item, completed: true, completed_at: new Date() },
        inventoryItem: inventoryResult.rows[0],
        points_awarded: 2,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Mark item as bought error:', error);
    return next(createError('Failed to mark item as bought', 500));
  }
});

// Toggle item completion status
router.patch('/:id/toggle', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const client = await pool.connect();
    try {
      // Get current item
      const currentItem = await client.query(
        'SELECT * FROM shopping_list_items WHERE id = $1 AND user_id = $2',
        [id, req.user!.id]
      );

      if (currentItem.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Shopping list item not found',
        });
      }

      const item = currentItem.rows[0];
      const newCompletedStatus = !item.is_completed;

      // Update completion status
      const result = await client.query(
        'UPDATE shopping_list_items SET is_completed = $1, date_updated = NOW() WHERE id = $2 AND user_id = $3 RETURNING *',
        [newCompletedStatus, id, req.user!.id]
      );

      const updatedItem = result.rows[0];

      // Map to mobile app format
      const mappedItem = {
        id: updatedItem.id.toString(),
        userId: updatedItem.user_id,
        ingredient: updatedItem.ingredient,
        quantity: updatedItem.quantity,
        unit: updatedItem.unit,
        category: updatedItem.category,
        isCompleted: updatedItem.is_completed,
        recipeId: updatedItem.recipe_id,
        dateCreated: updatedItem.date_added,
        dateUpdated: updatedItem.date_updated,
      };

      logger.info(`Toggled shopping list item ${id} to ${newCompletedStatus ? 'completed' : 'pending'} for user ${req.user!.id}`);

      return res.json({
        success: true,
        message: `Item marked as ${newCompletedStatus ? 'completed' : 'pending'}`,
        item: mappedItem,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Toggle shopping list item error:', error);
    return next(createError('Failed to toggle item', 500));
  }
});

// Update shopping list item
router.put('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { quantity, unit, notes, category } = req.body;

    const client = await pool.connect();
    try {
      const result = await client.query(
        `UPDATE shopping_list_items 
         SET quantity = $1, unit = $2, notes = $3, category = $4, updated_at = NOW()
         WHERE id = $5 AND user_id = $6
         RETURNING *`,
        [quantity, unit, notes, category, id, req.user!.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Shopping list item not found or not owned by user',
        });
      }

      return res.json({
        success: true,
        message: 'Shopping list item updated',
        item: result.rows[0],
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Update shopping list item error:', error);
    return next(createError('Failed to update shopping list item', 500));
  }
});

// Delete shopping list item
router.delete('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const client = await pool.connect();
    try {
      const result = await client.query(
        'DELETE FROM shopping_list_items WHERE id = $1 AND user_id = $2',
        [id, req.user!.id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Shopping list item not found or not owned by user',
        });
      }

      return res.json({
        success: true,
        message: 'Shopping list item deleted',
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Delete shopping list item error:', error);
    return next(createError('Failed to delete shopping list item', 500));
  }
});

// Clear completed items from shopping list
router.delete('/completed/clear', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'DELETE FROM shopping_list_items WHERE user_id = $1 AND completed = true',
        [req.user!.id]
      );

      return res.json({
        success: true,
        message: `Cleared ${result.rowCount} completed items from shopping list`,
        itemsCleared: result.rowCount,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Clear completed items error:', error);
    return next(createError('Failed to clear completed items', 500));
  }
});

// Delete all shopping list items
router.delete('/all/items', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'DELETE FROM shopping_list_items WHERE user_id = $1',
        [req.user!.id]
      );

      logger.info(`Deleted all ${result.rowCount} shopping list items for user ${req.user!.id}`);

      return res.json({
        success: true,
        message: `Deleted all ${result.rowCount} items from shopping list`,
        itemsDeleted: result.rowCount,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Delete all shopping list items error:', error);
    return next(createError('Failed to delete all shopping list items', 500));
  }
});

// Get shopping list statistics
router.get('/stats', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const client = await pool.connect();
    try {
      const stats = await client.query(`
        SELECT 
          COUNT(*) as total_items,
          COUNT(*) FILTER (WHERE completed = true) as completed_items,
          COUNT(*) FILTER (WHERE completed = false) as pending_items,
          COUNT(*) FILTER (WHERE needed_for_recipe = true) as recipe_items,
          COUNT(DISTINCT category) as categories_count
        FROM shopping_list_items 
        WHERE user_id = $1
      `, [req.user!.id]);

      const categoryBreakdown = await client.query(`
        SELECT category, COUNT(*) as count
        FROM shopping_list_items 
        WHERE user_id = $1 AND completed = false
        GROUP BY category
        ORDER BY count DESC
      `, [req.user!.id]);

      return res.json({
        success: true,
        stats: {
          ...stats.rows[0],
          categoryBreakdown: categoryBreakdown.rows,
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Get shopping list stats error:', error);
    return next(createError('Failed to get shopping list statistics', 500));
  }
});

// Add multiple items (bulk endpoint)
router.post('/bulk', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: 'Items array is required',
      });
    }

    const client = await pool.connect();
    try {
      const addedItems = [];
      const skippedItems = [];

      for (const item of items) {
        const { ingredient, quantity, unit, category, recipeId } = item;

        logger.info(`Processing item: ${JSON.stringify(item)}`);

        if (!ingredient) {
          logger.info(`Skipping item - missing ingredient name: ${JSON.stringify(item)}`);
          skippedItems.push({ item, reason: 'Missing ingredient name' });
          continue;
        }

        // Check if item already exists
        const existingItem = await client.query(
          'SELECT id FROM shopping_list_items WHERE user_id = $1 AND ingredient = $2 AND is_completed = false',
          [req.user!.id, ingredient]
        );

        if (existingItem.rows.length > 0) {
          logger.info(`Skipping item - already exists: ${ingredient}`);
          skippedItems.push({ item: ingredient, reason: 'Already exists' });
          continue;
        }

        logger.info(`Adding item to shopping list: ${ingredient}`);

        // Add new item
        const result = await client.query(
          `INSERT INTO shopping_list_items 
           (user_id, ingredient, quantity, unit, category, recipe_id, date_added)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())
           RETURNING *`,
          [
            req.user!.id,
            ingredient,
            quantity || '1',
            unit || 'piece',
            category || 'other',
            recipeId || null,
          ]
        );

        logger.info(`Successfully added item: ${JSON.stringify(result.rows[0])}`);
        addedItems.push(result.rows[0]);
      }

      // Award points for adding items
      if (addedItems.length > 0) {
        await client.query(
          'UPDATE users SET points = points + $1 WHERE id = $2',
          [addedItems.length, req.user!.id]
        );
      }

      logger.info(`Bulk added ${addedItems.length} items to shopping list for user ${req.user!.id}`);

      return res.json({
        success: true,
        message: `Added ${addedItems.length} items to shopping list`,
        items: addedItems,
        skipped: skippedItems,
        points_awarded: addedItems.length,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Bulk add shopping list items error:', error);
    return next(createError('Failed to add items to shopping list', 500));
  }
});

// Add multiple items from recipe
router.post('/add-from-recipe', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { recipe_id, ingredients } = req.body;

    if (!recipe_id || !ingredients || !Array.isArray(ingredients)) {
      return res.status(400).json({
        success: false,
        message: 'Recipe ID and ingredients array are required',
      });
    }

    const client = await pool.connect();
    try {
      const addedItems = [];
      const skippedItems = [];

      for (const ingredient of ingredients) {
        // Check if item already exists
        const existingItem = await client.query(
          'SELECT id FROM shopping_list_items WHERE user_id = $1 AND item_name = $2 AND completed = false',
          [req.user!.id, ingredient]
        );

        if (existingItem.rows.length > 0) {
          skippedItems.push(ingredient);
          continue;
        }

        // Add new item
        const result = await client.query(
          `INSERT INTO shopping_list_items 
           (user_id, item_name, category, needed_for_recipe, recipe_id, added_at)
           VALUES ($1, $2, $3, $4, $5, NOW())
           RETURNING *`,
          [req.user!.id, ingredient, 'ingredients', true, recipe_id]
        );

        addedItems.push(result.rows[0]);
      }

      // Award points for adding recipe ingredients
      if (addedItems.length > 0) {
        await client.query(
          'UPDATE users SET points = points + $1 WHERE id = $2',
          [addedItems.length, req.user!.id]
        );
      }

      logger.info(`Added ${addedItems.length} recipe ingredients to shopping list for user ${req.user!.id}`);

      return res.json({
        success: true,
        message: `Added ${addedItems.length} ingredients to shopping list`,
        addedItems,
        skippedItems,
        points_awarded: addedItems.length,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Add recipe ingredients error:', error);
    return next(createError('Failed to add recipe ingredients to shopping list', 500));
  }
});

export default router;