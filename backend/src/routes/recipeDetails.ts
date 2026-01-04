import express from 'express';
import { pool } from '../server';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';
import { FatSecretService } from '../services/FatSecretService';
import { IngredientSubstitutionService } from '../services/IngredientSubstitutionService';
import { UnitConversionService } from '../services/UnitConversionService';
import { RecipeScalingService } from '../services/RecipeScalingService';

const router = express.Router();
const fatSecretService = new FatSecretService();

// Get enhanced recipe details with images, substitutions, and inventory matching
router.get('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { servings } = req.query;

    logger.info(`Enhanced recipe details request for user ${req.user!.id}: ${id}`);

    // Get recipe details from FatSecret API
    const baseRecipe = await fatSecretService.getRecipeDetails(id);

    if (!baseRecipe) {
      return res.status(404).json({
        success: false,
        message: 'Recipe not found',
      });
    }

    const client = await pool.connect();
    try {
      // Get user's dietary restrictions and allergies
      const userResult = await client.query(
        'SELECT dietary_restrictions, allergies, preferred_units FROM users WHERE id = $1',
        [req.user!.id]
      );
      
      const user = userResult.rows[0];
      const dietaryRestrictions = user?.dietary_restrictions || [];
      const allergies = user?.allergies || [];
      const preferredUnits = user?.preferred_units || 'metric';

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

      // Process recipe ingredients
      const recipeIngredients = baseRecipe.ingredients?.ingredient || [];
      
      interface ProcessedIngredient {
        name: string;
        available: boolean;
        inventoryQuantity?: number;
        inventoryUnit?: string;
        hasDietaryConflict: boolean;
        hasAllergyConflict: boolean;
        needsSubstitution: boolean;
      }
      
      const processedIngredients: ProcessedIngredient[] = recipeIngredients.map((ingredient: string) => {
        const ingredientName = ingredient.toLowerCase();
        
        // Check if user has this ingredient
        const inventoryMatch = userInventory.find(inv => 
          inv.name.includes(ingredientName) || ingredientName.includes(inv.name)
        );

        // Check for dietary conflicts
        const hasDietaryConflict = dietaryRestrictions.some((restriction: string) =>
          ingredientName.includes(restriction.toLowerCase())
        );

        const hasAllergyConflict = allergies.some((allergy: string) =>
          ingredientName.includes(allergy.toLowerCase())
        );

        return {
          name: ingredient,
          available: !!inventoryMatch,
          inventoryQuantity: inventoryMatch?.quantity,
          inventoryUnit: inventoryMatch?.unit,
          hasDietaryConflict,
          hasAllergyConflict,
          needsSubstitution: hasDietaryConflict || hasAllergyConflict,
        };
      });

      // Get substitutions for conflicting ingredients
      const conflictingIngredients = processedIngredients
        .filter((ing: ProcessedIngredient) => ing.needsSubstitution)
        .map((ing: ProcessedIngredient) => ing.name);

      const substitutions = conflictingIngredients.length > 0
        ? IngredientSubstitutionService.getSubstitutions(
            conflictingIngredients,
            processedIngredients.some((ing: ProcessedIngredient) => ing.hasAllergyConflict) ? 'allergy' : 'dietary'
          )
        : [];

      // Calculate ingredient availability
      const availableIngredients = processedIngredients.filter((ing: ProcessedIngredient) => ing.available).length;
      const totalIngredients = processedIngredients.length;
      const availabilityPercentage = Math.round((availableIngredients / totalIngredients) * 100);

      // Get missing ingredients for shopping list
      const missingIngredients = processedIngredients
        .filter((ing: ProcessedIngredient) => !ing.available && !ing.needsSubstitution)
        .map((ing: ProcessedIngredient) => ({
          name: ing.name,
          canAddToShoppingList: true,
        }));

      // Apply unit conversion based on user preference
      let convertedRecipe = baseRecipe;
      if (preferredUnits) {
        convertedRecipe = UnitConversionService.convertRecipeUnits(
          baseRecipe,
          preferredUnits as 'metric' | 'imperial'
        );
      }

      // Apply serving scaling if requested
      let finalRecipe = convertedRecipe;
      let servingScalingApplied = false;
      
      if (servings) {
        const validation = RecipeScalingService.validateServingSize(servings);
        if (validation.isValid) {
          finalRecipe = RecipeScalingService.scaleRecipe(convertedRecipe, validation.servings!);
          servingScalingApplied = true;
        }
      }

      // Ensure recipe has image
      const recipeImage = finalRecipe.recipe_image || 
                         finalRecipe.image || 
                         'https://images.unsplash.com/photo-1546548970-71785318a17b?w=400&h=300&fit=crop';

      // Build enhanced recipe response
      const enhancedRecipe = {
        ...finalRecipe,
        image: recipeImage,
        ingredients: {
          ...finalRecipe.ingredients,
          processed: processedIngredients,
          availability: {
            available: availableIngredients,
            total: totalIngredients,
            percentage: availabilityPercentage,
            canMake: availabilityPercentage >= 70, // Can make if 70%+ ingredients available
          },
          missing: missingIngredients,
        },
        substitutions,
        dietaryInfo: {
          hasDietaryConflicts: processedIngredients.some(ing => ing.hasDietaryConflict),
          hasAllergyConflicts: processedIngredients.some(ing => ing.hasAllergyConflict),
          userRestrictions: dietaryRestrictions,
          userAllergies: allergies,
        },
        unitConversion: {
          applied: !!preferredUnits,
          system: preferredUnits,
        },
        servingScaling: {
          applied: servingScalingApplied,
          originalServings: baseRecipe.number_of_servings || '4',
          currentServings: servings || baseRecipe.number_of_servings || '4',
        },
        actions: {
          canSave: true,
          canAddToMealPlan: true,
          canAddMissingToShoppingList: missingIngredients.length > 0,
          canMakeWithSubstitutions: substitutions.length > 0,
        },
      };

      // Award points for viewing recipe details
      await client.query(
        'UPDATE users SET points = points + 1 WHERE id = $1',
        [req.user!.id]
      );

      return res.json({
        success: true,
        recipe: enhancedRecipe,
        provider: 'FatSecret',
        enhanced: true,
        pointsAwarded: 1,
        timestamp: new Date().toISOString(),
      });

    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Enhanced recipe details error:', error);
    return next(createError('Failed to get recipe details', 500));
  }
});

// Add missing ingredients to shopping list
router.post('/:id/add-missing-to-shopping', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { ingredients } = req.body;

    if (!ingredients || !Array.isArray(ingredients)) {
      return res.status(400).json({
        success: false,
        message: 'Ingredients array is required',
      });
    }

    const client = await pool.connect();
    try {
      // Add each ingredient to shopping list
      const addedItems = [];
      
      for (const ingredient of ingredients) {
        const result = await client.query(
          `INSERT INTO shopping_list_items (user_id, item_name, category, needed_for_recipe, recipe_id, added_at)
           VALUES ($1, $2, $3, $4, $5, NOW())
           ON CONFLICT (user_id, item_name) DO UPDATE SET
           needed_for_recipe = $4, recipe_id = $5, updated_at = NOW()
           RETURNING *`,
          [req.user!.id, ingredient, 'ingredients', true, id]
        );
        
        addedItems.push(result.rows[0]);
      }

      // Award points for adding to shopping list
      await client.query(
        'UPDATE users SET points = points + 2 WHERE id = $1',
        [req.user!.id]
      );

      logger.info(`Added ${ingredients.length} missing ingredients to shopping list for user ${req.user!.id}`);

      return res.json({
        success: true,
        message: `Added ${ingredients.length} ingredients to shopping list`,
        addedItems,
        pointsAwarded: 2,
      });

    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Add missing ingredients error:', error);
    return next(createError('Failed to add ingredients to shopping list', 500));
  }
});

// Get recipe with substitutions applied
router.get('/:id/with-substitutions', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { substitutions } = req.query;

    if (!substitutions) {
      return res.status(400).json({
        success: false,
        message: 'Substitutions parameter is required',
      });
    }

    // Parse substitutions from query parameter
    const substitutionMap = JSON.parse(substitutions as string);

    // Get base recipe
    const baseRecipe = await fatSecretService.getRecipeDetails(id);
    if (!baseRecipe) {
      return res.status(404).json({
        success: false,
        message: 'Recipe not found',
      });
    }

    // Apply substitutions to ingredients
    const originalIngredients = baseRecipe.ingredients?.ingredient || [];
    const substitutedIngredients = originalIngredients.map((ingredient: string) => {
      const substitution = substitutionMap[ingredient];
      return substitution ? substitution : ingredient;
    });

    // Create modified recipe
    const modifiedRecipe = {
      ...baseRecipe,
      ingredients: {
        ...baseRecipe.ingredients,
        ingredient: substitutedIngredients,
      },
      substitutionsApplied: Object.keys(substitutionMap).length,
      originalIngredients,
      modifiedTitle: `${baseRecipe.recipe_name} (Modified)`,
      isModified: true,
    };

    return res.json({
      success: true,
      recipe: modifiedRecipe,
      substitutionsApplied: Object.keys(substitutionMap).length,
      message: 'Recipe modified with substitutions',
    });

  } catch (error) {
    logger.error('Recipe substitution error:', error);
    return next(createError('Failed to apply substitutions', 500));
  }
});

// Get serving size options for recipe
router.get('/:id/serving-options', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    // Get base recipe to determine original servings
    const recipe = await fatSecretService.getRecipeDetails(id);
    if (!recipe) {
      return res.status(404).json({
        success: false,
        message: 'Recipe not found',
      });
    }

    const originalServings = parseInt(recipe.number_of_servings) || 4;
    const servingOptions = RecipeScalingService.getServingSizeOptions(originalServings);

    return res.json({
      success: true,
      originalServings,
      servingOptions,
      message: 'Serving size options retrieved',
    });

  } catch (error) {
    logger.error('Get serving options error:', error);
    return next(createError('Failed to get serving options', 500));
  }
});

export default router;