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

      // If ingredient is completely used up, remove it from inventory
      let message = 'Ingredient quantity updated';
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

      return res.json({
        success: true,
        message,
        ingredient: ingredientData,
        quantityUsed: quantity_used,
        remainingQuantity: newQuantity,
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

// Fix uncategorized ingredients (admin/maintenance endpoint)
router.post('/fix-categories', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
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

      // Smart categorization with regex patterns and word boundaries
      // Order matters: more specific patterns first to avoid false matches
      const categoryPatterns: { category: string; patterns: RegExp[] }[] = [
        // Spices & Herbs (check FIRST to avoid "pepper" matching vegetables)
        {
          category: 'Spices & Herbs',
          patterns: [
            /\b(black pepper|white pepper|red pepper flakes|cayenne pepper|peppercorn|ground pepper)\b/i,
            /\b(salt|sea salt|kosher salt|table salt|himalayan salt)\b/i,
            /\b(basil|oregano|thyme|rosemary|sage|mint|dill|tarragon|marjoram)\b/i,
            /\b(cumin|coriander|cardamom|turmeric|curry|garam masala)\b/i,
            /\b(paprika|chili powder|garlic powder|onion powder)\b/i,
            /\b(cinnamon|nutmeg|cloves|allspice|ginger powder|ground ginger)\b/i,
            /\b(parsley|cilantro|chives|bay leaf|bay leaves)\b/i,
            /\b(vanilla extract|almond extract|peppermint extract)\b/i,
          ],
        },
        // Protein (meats, poultry, seafood, eggs) - check BEFORE vegetables
        {
          category: 'Protein',
          patterns: [
            /\b(chicken|turkey|duck|quail|hen|poultry)\b/i,
            /\b(beef|steak|ribeye|rib eye|rib-eye|sirloin|t-bone|t bone|filet|brisket|chuck|ground beef|hamburger)\b/i,
            /\b(pork|bacon|ham|sausage|pork chop|pork loin|ribs|pulled pork|pork shoulder)\b/i,
            /\b(lamb|mutton|veal|venison|bison|buffalo)\b/i,
            /\b(fish|salmon|tuna|cod|halibut|tilapia|trout|mahi|bass|snapper)\b/i,
            /\b(shrimp|prawn|crab|lobster|scallop|clam|mussel|oyster|squid|octopus|seafood)\b/i,
            /\b(egg|eggs|egg white|egg yolk)\b/i,
            /\b(tofu|tempeh|seitan)\b/i,
          ],
        },
        // Dairy
        {
          category: 'Dairy',
          patterns: [
            /\b(milk|whole milk|skim milk|2% milk|1% milk|buttermilk)\b/i,
            /\b(cheese|cheddar|mozzarella|parmesan|swiss|gouda|brie|feta|ricotta|provolone)\b/i,
            /\b(butter|margarine|ghee|clarified butter)\b/i,
            /\b(cream|heavy cream|whipping cream|half and half|sour cream|crème fraîche)\b/i,
            /\b(yogurt|greek yogurt|cottage cheese|cream cheese)\b/i,
          ],
        },
        // Vegetables (check AFTER spices to avoid "pepper" confusion)
        {
          category: 'Vegetables',
          patterns: [
            /\b(bell pepper|green pepper|red pepper|yellow pepper|sweet pepper|capsicum)\b/i,
            /\b(tomato|cherry tomato|grape tomato|roma tomato|beefsteak tomato|heirloom tomato)\b/i,
            /\b(onion|red onion|white onion|yellow onion|green onion|scallion|shallot|leek)\b/i,
            /\b(garlic|garlic clove|minced garlic|fresh garlic)\b/i,
            /\b(carrot|celery|broccoli|cauliflower|cabbage|brussels sprout)\b/i,
            /\b(spinach|kale|lettuce|arugula|chard|collard|romaine)\b/i,
            /\b(cucumber|zucchini|squash|eggplant|pumpkin|butternut)\b/i,
            /\b(potato|sweet potato|yam|russet|yukon gold)\b/i,
            /\b(mushroom|portobello|shiitake|button mushroom|cremini)\b/i,
            /\b(asparagus|green bean|snap pea|snow pea|edamame)\b/i,
            /\b(corn|beet|radish|turnip|parsnip|rutabaga)\b/i,
          ],
        },
        // Fruits
        {
          category: 'Fruits',
          patterns: [
            /\b(apple|banana|orange|grapefruit|tangerine|clementine)\b/i,
            /\b(lemon|lime|citrus)\b/i,
            /\b(strawberry|blueberry|raspberry|blackberry|cranberry)\b/i,
            /\b(grape|watermelon|cantaloupe|honeydew|melon)\b/i,
            /\b(pineapple|mango|papaya|kiwi|passion fruit|dragon fruit)\b/i,
            /\b(peach|pear|plum|apricot|nectarine)\b/i,
            /\b(cherry|date|fig|pomegranate)\b/i,
            /\b(avocado|coconut)\b/i,
          ],
        },
        // Grains & Pasta
        {
          category: 'Grains',
          patterns: [
            /\b(rice|white rice|brown rice|jasmine rice|basmati|wild rice|arborio)\b/i,
            /\b(pasta|spaghetti|penne|fettuccine|linguine|macaroni|rigatoni|farfalle)\b/i,
            /\b(noodle|ramen|udon|soba|rice noodle|egg noodle)\b/i,
            /\b(bread|baguette|sourdough|wheat bread|white bread|roll|bun)\b/i,
            /\b(flour|all-purpose flour|wheat flour|bread flour|cake flour)\b/i,
            /\b(oat|oatmeal|rolled oats|steel cut oats|quick oats)\b/i,
            /\b(quinoa|couscous|bulgur|farro|barley)\b/i,
            /\b(cereal|granola|cornmeal|polenta|grits)\b/i,
            /\b(tortilla|wrap|pita|flatbread|naan)\b/i,
          ],
        },
        // Oils & Fats
        {
          category: 'Oils & Fats',
          patterns: [
            /\b(olive oil|extra virgin|vegetable oil|canola oil|sunflower oil)\b/i,
            /\b(coconut oil|sesame oil|peanut oil|avocado oil|grapeseed oil)\b/i,
            /\b(cooking oil|frying oil|spray oil)\b/i,
            /\boil\b/i, // Generic "oil" as last resort
          ],
        },
        // Condiments & Sauces
        {
          category: 'Condiments',
          patterns: [
            /\b(ketchup|mustard|mayonnaise|mayo|relish)\b/i,
            /\b(soy sauce|tamari|teriyaki|hoisin|fish sauce|oyster sauce)\b/i,
            /\b(vinegar|balsamic|apple cider vinegar|white vinegar|rice vinegar|red wine vinegar)\b/i,
            /\b(hot sauce|sriracha|tabasco|salsa|pico de gallo|guacamole)\b/i,
            /\b(bbq sauce|barbecue sauce|worcestershire|steak sauce)\b/i,
            /\b(honey|maple syrup|agave|molasses|corn syrup)\b/i,
          ],
        },
        // Baking Supplies
        {
          category: 'Baking',
          patterns: [
            /\b(sugar|white sugar|granulated sugar|powdered sugar|confectioner|icing sugar)\b/i,
            /\b(brown sugar|light brown sugar|dark brown sugar)\b/i,
            /\b(baking powder|baking soda|yeast|active dry yeast|instant yeast)\b/i,
            /\b(vanilla|vanilla extract|vanilla bean|vanilla paste)\b/i,
            /\b(cocoa|cocoa powder|chocolate chip|chocolate chunk|baking chocolate)\b/i,
            /\b(cornstarch|gelatin|cream of tartar|baking mix)\b/i,
          ],
        },
        // Nuts & Seeds
        {
          category: 'Nuts & Seeds',
          patterns: [
            /\b(almond|walnut|pecan|cashew|pistachio|hazelnut|macadamia)\b/i,
            /\b(peanut|peanut butter|almond butter|cashew butter)\b/i,
            /\b(sunflower seed|pumpkin seed|chia seed|flax seed|sesame seed|hemp seed)\b/i,
          ],
        },
        // Legumes & Canned Goods
        {
          category: 'Canned Goods',
          patterns: [
            /\b(beans|black bean|kidney bean|pinto bean|navy bean|lima bean|white bean)\b/i,
            /\b(chickpea|garbanzo|lentil|split pea)\b/i,
            /\b(canned|can of)\b/i,
            /\b(broth|stock|chicken stock|beef broth|vegetable broth|bone broth)\b/i,
            /\b(tomato sauce|tomato paste|crushed tomato|diced tomato|tomato puree)\b/i,
            /\b(soup|condensed soup|cream of)\b/i,
          ],
        },
        // Beverages
        {
          category: 'Beverages',
          patterns: [
            /\b(coffee|espresso|latte|cappuccino|americano)\b/i,
            /\b(tea|green tea|black tea|herbal tea|chai|iced tea)\b/i,
            /\b(juice|orange juice|apple juice|cranberry juice|grape juice)\b/i,
            /\b(soda|cola|sprite|ginger ale|tonic water|club soda)\b/i,
            /\b(water|sparkling water|mineral water|seltzer)\b/i,
            /\b(wine|red wine|white wine|beer|ale|lager|stout)\b/i,
            /\b(liquor|vodka|rum|whiskey|tequila|gin|bourbon)\b/i,
          ],
        },
      ];

      const updated: any[] = [];

      // Categorize each ingredient using smart pattern matching
      for (const ingredient of uncategorized.rows) {
        const name = (ingredient.ingredient_name || '').toLowerCase().trim();
        let assignedCategory = 'Other';

        // Try to match against patterns in priority order
        for (const { category, patterns } of categoryPatterns) {
          if (patterns.some(pattern => pattern.test(name))) {
            assignedCategory = category;
            break; // Stop at first match
          }
        }

        // Update the ingredient
        const result = await client.query(`
          UPDATE user_ingredients 
          SET category = $1 
          WHERE id = $2 AND user_id = $3
          RETURNING id, ingredient_name, category
        `, [assignedCategory, ingredient.id, req.user!.id]);

        if (result.rows.length > 0) {
          updated.push(result.rows[0]);
        }
      }

      logger.info(`Intelligently categorized ${updated.length} ingredients for user ${req.user!.id}`);

      return res.json({
        success: true,
        message: `Categorized ${updated.length} ingredient${updated.length !== 1 ? 's' : ''}`,
        updated: updated,
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