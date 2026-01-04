import express from 'express';
import {authenticateToken, AuthRequest} from '../middleware/auth';
import RecipeCacheService from '../services/RecipeCacheService';
import {RecipeFilterService} from '../services/RecipeFilterService';
import {IngredientSubstitutionService} from '../services/IngredientSubstitutionService';
import {RecipeScalingService} from '../services/RecipeScalingService';
import FatSecretService from '../services/FatSecretService';

const router = express.Router();
const fatSecretService = new FatSecretService();

interface ModifiedIngredient {
  original: {
    name: string;
    amount: number;
    unit: string;
  };
  modified: {
    name: string;
    amount: number;
    unit: string;
  };
  substitution?: {
    ingredient: string;
    ratio: string;
    notes?: string;
  };
  hasSubstitution: boolean;
}

// Get recipe with substitutions applied
router.get(
  '/:id/modified',
  authenticateToken,
  async (req: AuthRequest, res): Promise<void> => {
    try {
      const userId = req.user?.id;
      const recipeId = req.params.id;

      if (!userId) {
        res.status(401).json({error: 'User not authenticated'});
        return;
      }

      // Get recipe
      const recipe = await RecipeCacheService.getRecipeById(recipeId);
      if (!recipe) {
        res.status(404).json({error: 'Recipe not found'});
        return;
      }

      // Analyze recipe for conflicts
      const ingredients = Array.isArray(recipe.ingredients)
        ? recipe.ingredients
        : [];
      const ingredientNames = ingredients.map((i: any) => i.name);

      const analysis = await RecipeFilterService.analyzeRecipe(
        userId,
        ingredientNames,
      );

      // Get substitutions
      const allConflicts = analysis.conflicts.flatMap(
        c => c.conflictingIngredients,
      );
      const substitutions = IngredientSubstitutionService.getSubstitutions(
        allConflicts,
        analysis.conflicts[0]?.type || 'dietary',
      );

      // Apply substitutions to ingredients
      const modifiedIngredients: ModifiedIngredient[] = ingredients.map(
        (ing: any) => {
          const sub = substitutions.find(s =>
            ing.name.toLowerCase().includes(s.original.toLowerCase()),
          );

          if (sub && sub.substitutes.length > 0) {
            const bestSub = sub.substitutes[0];
            const ratio = parseRatio(bestSub.ratio);

            return {
              original: {
                name: ing.name,
                amount: ing.amount,
                unit: ing.unit,
              },
              modified: {
                name: bestSub.ingredient,
                amount: Math.round(ing.amount * ratio * 100) / 100,
                unit: ing.unit,
              },
              substitution: bestSub,
              hasSubstitution: true,
            };
          }

          return {
            original: {
              name: ing.name,
              amount: ing.amount,
              unit: ing.unit,
            },
            modified: {
              name: ing.name,
              amount: ing.amount,
              unit: ing.unit,
            },
            hasSubstitution: false,
          };
        },
      );

      // Calculate difficulty increase
      const difficulty = calculateDifficulty(substitutions);

      // Generate modification notes
      const notes = generateNotes(analysis.conflicts, substitutions);

      res.json({
        recipe: {
          ...recipe,
          ingredients: modifiedIngredients,
        },
        modifications: {
          count: substitutions.length,
          difficulty,
          notes,
          conflicts: analysis.conflicts,
        },
        original: {
          ...recipe,
          ingredients: ingredients,
        },
      });
    } catch (error) {
      console.error('[Recipe Modification] Error:', error);
      res.status(500).json({error: 'Failed to modify recipe'});
    }
  },
);

// Helper function to parse ratio strings like "1:1", "3:4"
function parseRatio(ratio: string): number {
  const parts = ratio.split(':');
  if (parts.length !== 2) return 1;

  const numerator = parseFloat(parts[0]);
  const denominator = parseFloat(parts[1]);

  if (isNaN(numerator) || isNaN(denominator) || denominator === 0) return 1;

  return numerator / denominator;
}

// Calculate difficulty increase based on number of substitutions
function calculateDifficulty(
  substitutions: any[],
): 'none' | 'low' | 'medium' | 'high' {
  if (substitutions.length === 0) return 'none';
  if (substitutions.length <= 2) return 'low';
  if (substitutions.length <= 4) return 'medium';
  return 'high';
}

// Generate helpful notes about modifications
function generateNotes(conflicts: any[], substitutions: any[]): string[] {
  const notes: string[] = [];

  // Add conflict summary
  const allergyConflicts = conflicts.filter(c => c.type === 'allergy').length;
  const dietaryConflicts = conflicts.filter(c => c.type === 'dietary').length;

  if (allergyConflicts > 0) {
    notes.push(
      `⚠️ ${allergyConflicts} allergy conflict(s) resolved with substitutions`,
    );
  }
  if (dietaryConflicts > 0) {
    notes.push(`🥗 ${dietaryConflicts} dietary restriction(s) addressed`);
  }

  // Add substitution tips
  substitutions.forEach(sub => {
    const bestSub = sub.substitutes[0];
    if (bestSub && bestSub.notes) {
      notes.push(
        `💡 ${sub.original} → ${bestSub.ingredient}: ${bestSub.notes}`,
      );
    }
  });

  if (notes.length === 0) {
    notes.push('✅ This recipe is already compatible with your preferences');
  }

  return notes;
}

// Scale recipe to different serving size
router.get('/:id/scale/:servings', async (req, res): Promise<void> => {
  try {
    const recipeId = req.params.id;
    const targetServings = req.params.servings;

    // Validate serving size
    const validation = RecipeScalingService.validateServingSize(targetServings);
    if (!validation.isValid) {
      res.status(400).json({error: validation.error});
      return;
    }

    // Get recipe from FatSecret directly (more reliable than cache)
    let recipe: any = null;
    try {
      recipe = await RecipeCacheService.getRecipeById(recipeId);
      if (!recipe) {
        // Fallback: try to get from FatSecret directly
        const fatSecretRecipe =
          await fatSecretService.getRecipeDetails(recipeId);
        if (fatSecretRecipe) {
          recipe = {
            id: parseInt(recipeId),
            recipe_id: recipeId,
            title: fatSecretRecipe.recipe_name,
            servings: parseInt(fatSecretRecipe.number_of_servings) || 4,
            ready_in_minutes: parseInt(fatSecretRecipe.cooking_time_min) || 30,
            ingredients: fatSecretRecipe.ingredients?.ingredient || [],
            instructions: fatSecretRecipe.directions?.direction?.join('\n') || '',
            // Add other required fields with defaults
            source: 'fatsecret',
            description: fatSecretRecipe.recipe_description || '',
            image_url: fatSecretRecipe.recipe_image || '',
            nutrition: {},
            dietary_info: {},
            meal_type: '',
            cuisine: '',
            season: '',
            view_count: 0,
            save_count: 0,
            trending_score: 0,
          };
        }
      }
    } catch (error) {
      console.error('[Recipe Scaling] Error fetching recipe:', error);
    }

    if (!recipe) {
      res.status(404).json({error: 'Recipe not found'});
      return;
    }

    // Scale the recipe
    let scaledRecipe;
    try {
      // Ensure recipe has required fields for scaling
      const recipeForScaling = {
        ...recipe,
        servings: recipe.servings || 4,
        ingredients: recipe.ingredients || [],
        readyInMinutes: recipe.ready_in_minutes || recipe.readyInMinutes || 30,
        calories: recipe.calories || 0,
        protein: recipe.protein || 0,
        carbs: recipe.carbs || 0,
        fat: recipe.fat || 0,
      };

      scaledRecipe = RecipeScalingService.scaleRecipe(
        recipeForScaling,
        validation.servings!,
      );
    } catch (scalingError) {
      console.error('[Recipe Scaling] Scaling service error:', scalingError);
      console.error(
        '[Recipe Scaling] Recipe data:',
        JSON.stringify(recipe, null, 2),
      );

      // Return a basic scaled response even if detailed scaling fails
      const basicScaledRecipe = {
        ...recipe,
        servings: validation.servings!,
        originalServings: recipe.servings || 4,
        scaleFactor: validation.servings! / (recipe.servings || 4),
      };

      res.json({
        success: true,
        recipe: basicScaledRecipe,
        scaling: {
          originalServings: recipe.servings || 4,
          targetServings: validation.servings!,
          scaleFactor: basicScaledRecipe.scaleFactor,
        },
        note: 'Basic scaling applied - detailed ingredient scaling unavailable',
        servingSizeOptions: RecipeScalingService.getServingSizeOptions(
          recipe.servings || 4,
        ),
      });
      return;
    }

    res.json({
      success: true,
      recipe: scaledRecipe,
      scaling: {
        originalServings: recipe.servings || 4,
        targetServings: validation.servings!,
        scaleFactor: scaledRecipe.scaleFactor,
      },
      servingSizeOptions: RecipeScalingService.getServingSizeOptions(
        recipe.servings || 4,
      ),
    });
  } catch (error) {
    console.error('[Recipe Scaling] Error:', error);
    res.status(500).json({error: 'Failed to scale recipe'});
  }
});

// Get serving size options for a recipe
router.get('/:id/serving-options', async (req, res): Promise<void> => {
  try {
    const recipeId = req.params.id;

    // Get recipe to determine original serving size
    let recipe: any = null;
    try {
      recipe = await RecipeCacheService.getRecipeById(recipeId);
      if (!recipe) {
        // Fallback: try to get from FatSecret directly
        const fatSecretRecipe =
          await fatSecretService.getRecipeDetails(recipeId);
        if (fatSecretRecipe) {
          recipe = {
            servings: parseInt(fatSecretRecipe.number_of_servings) || 4,
          };
        }
      }
    } catch (error) {
      console.error('[Recipe Serving Options] Error fetching recipe:', error);
    }

    if (!recipe) {
      res.status(404).json({error: 'Recipe not found'});
      return;
    }

    const options = RecipeScalingService.getServingSizeOptions(
      recipe.servings || 4,
    );

    res.json({
      success: true,
      originalServings: recipe.servings || 4,
      options: options.map(servings => ({
        servings,
        label: `${servings} ${servings === 1 ? 'serving' : 'servings'}`,
        scaleFactor: servings / (recipe.servings || 4),
      })),
    });
  } catch (error) {
    console.error('[Recipe Serving Options] Error:', error);
    res.status(500).json({error: 'Failed to get serving options'});
  }
});

export default router;
