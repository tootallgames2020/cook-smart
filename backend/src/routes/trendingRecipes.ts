import express from 'express';
import RecipeCacheService from '../services/RecipeCacheService';
import FatSecretAdapter from '../services/FatSecretProviderAdapter';
import {RecipeProviderService} from '../services/RecipeProviderService';
import {authenticateToken, AuthRequest} from '../middleware/auth';
import {DietaryAwareRecipeService} from '../services/DietaryAwareRecipeService';
import {RecipeScalingService} from '../services/RecipeScalingService';

// Optional authentication middleware - works for both authenticated and anonymous users
const optionalAuth = (
  req: AuthRequest,
  res: express.Response,
  next: express.NextFunction,
) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    // If token provided, try to authenticate
    authenticateToken(req, res, _err => {
      // Continue regardless of authentication result
      next();
    });
  } else {
    // No token provided, continue as anonymous user
    next();
  }
};

const router = express.Router();

// Get trending recipes - Use EXACT same logic as main recipe search
router.get('/trending-recipes', optionalAuth, async (req: AuthRequest, res) => {
  // Disable HTTP caching
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const showConflictingRecipes = req.query.showConflictingRecipes !== 'false';
    const servings = req.query.servings;

    console.log(
      '[Trending] Using RecipeProviderService for trending recipes...',
    );

    // Use the SAME service as main recipe search for consistency
    const recipeProviderService = new RecipeProviderService([
      FatSecretAdapter, // Primary: FatSecret Premier (free, unlimited for our needs)
    ]);

    // Get trending recipes using FatSecret's popular recipe searches
    const trendingQueries = [
      'popular chicken recipes',
      'easy dinner recipes', 
      'healthy recipes',
      'quick meals',
      'comfort food',
      'pasta recipes'
    ];

    let allRecipes: any[] = [];
    
    // Get recipes from multiple trending searches to ensure variety
    for (const query of trendingQueries.slice(0, 3)) {
      try {
        const searchResults = await recipeProviderService.searchByIngredients(
          [query], // Use query as search term
          Math.ceil(limit / 3),
          {mealType: 'Main Dishes'},
        );
        allRecipes = allRecipes.concat(searchResults);
      } catch (error) {
        console.log(`[Trending] Failed to get recipes for "${query}":`, error);
      }
    }

    // Remove duplicates and limit results
    const uniqueRecipes = allRecipes.filter((recipe, index, self) => 
      index === self.findIndex(r => r.id === recipe.id)
    );
    
    const recipes = uniqueRecipes.slice(0, limit);

    console.log(
      `[Trending] RecipeProviderService returned ${recipes.length} recipes`,
    );

    // Cache each recipe
    for (const recipe of recipes) {
      await RecipeCacheService.cacheRecipe(recipe, 'fatsecret', 'all', false);
    }

    // DIETARY AWARENESS: Process recipes with user's dietary restrictions (EXACT same logic as main search)
    let processedRecipes = recipes;
    let dietaryFilteringApplied = false;

    console.log(`[Trending] req.user exists: ${!!req.user}`);
    console.log(`[Trending] req.user.id: ${req.user?.id}`);

    if (req.user?.id) {
      try {
        console.log(
          `[Trending] Starting dietary processing for user ${req.user.id}`,
        );
        console.log(
          `[Trending] showConflictingRecipes: ${showConflictingRecipes}`,
        );
        console.log(`[Trending] Processing ${recipes.length} recipes`);

        processedRecipes =
          await DietaryAwareRecipeService.processRecipesWithDietaryAwareness(
            recipes,
            {
              userId: req.user.id, // Keep as string, don't convert to number
              showConflictingRecipes,
            },
          );

        dietaryFilteringApplied = true;
        console.log(
          `[Trending] Processed ${recipes.length} → ${processedRecipes.length} recipes after dietary filtering`,
        );

        // Log first few recipes for debugging
        processedRecipes.slice(0, 3).forEach((recipe: any, i) => {
          console.log(
            `[Trending] Recipe ${i + 1}: "${recipe.title}" - Status: ${recipe.dietaryStatus || 'not set'}`,
          );
        });
      } catch (dietaryError) {
        console.error(
          '[Trending] Error processing dietary restrictions:',
          dietaryError,
        );
        // Continue with original recipes if dietary processing fails
      }
    } else {
      // Explicitly set to false for anonymous users
      dietaryFilteringApplied = false;
    }

    // SERVING SCALING: Apply serving adjustments if requested
    let finalRecipes = processedRecipes;
    let servingScalingApplied = false;

    if (servings && typeof servings === 'string') {
      const validation = RecipeScalingService.validateServingSize(servings);
      if (validation.isValid) {
        console.log(
          `[Trending] Scaling recipes to ${validation.servings} servings`,
        );
        finalRecipes = processedRecipes.map(recipe =>
          RecipeScalingService.scaleRecipe(recipe, validation.servings!),
        ) as any[];
        servingScalingApplied = true;
        console.log(
          `[Trending] Applied serving scaling to ${finalRecipes.length} recipes`,
        );
      } else {
        console.warn(`[Trending] Invalid serving size: ${validation.error}`);
      }
    }

    res.json({
      success: true,
      recipes: finalRecipes,
      count: finalRecipes.length,
      source: 'fatsecret',
      dietaryFiltering: dietaryFilteringApplied,
      servingScaling: servingScalingApplied,
      targetServings: servingScalingApplied
        ? parseInt(servings as string)
        : undefined,
      note: 'Trending recipes with full dietary awareness and serving scaling',
      version: 'v2-RecipeProviderService', // Debug: verify new code is running
    });
  } catch (error) {
    console.error('[Trending] Error:', error);
    res.status(500).json({error: 'Failed to get trending recipes'});
  }
});

// Get seasonal recipes - Use EXACT same logic as main recipe search
router.get('/seasonal-recipes', optionalAuth, async (req: AuthRequest, res) => {
  // Disable HTTP caching
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  try {
    const season = (req.query.season as string) || getCurrentSeason();
    const limit = parseInt(req.query.limit as string) || 20;
    const showConflictingRecipes = req.query.showConflictingRecipes !== 'false';
    const servings = req.query.servings;

    console.log(
      `[Seasonal] Using RecipeProviderService for ${season} recipes...`,
    );

    // Use the SAME service as main recipe search for consistency
    const recipeProviderService = new RecipeProviderService([
      FatSecretAdapter, // Primary: FatSecret Premier (free, unlimited for our needs)
    ]);

    const seasonalIngredients = getSeasonalIngredients(season);
    const recipes = await recipeProviderService.searchByIngredients(
      seasonalIngredients.slice(0, 3),
      limit,
    );

    console.log(
      `[Seasonal] RecipeProviderService returned ${recipes.length} recipes`,
    );

    // Cache each recipe
    for (const recipe of recipes) {
      await RecipeCacheService.cacheRecipe(recipe, 'fatsecret', season, true);
    }

    // DIETARY AWARENESS: Process recipes with user's dietary restrictions (EXACT same logic as main search)
    let processedRecipes = recipes;
    let dietaryFilteringApplied = false;

    console.log(`[Seasonal] req.user exists: ${!!req.user}`);
    console.log(`[Seasonal] req.user.id: ${req.user?.id}`);

    if (req.user?.id) {
      try {
        console.log(
          `[Seasonal] Starting dietary processing for user ${req.user.id}`,
        );
        console.log(
          `[Seasonal] showConflictingRecipes: ${showConflictingRecipes}`,
        );
        console.log(`[Seasonal] Processing ${recipes.length} recipes`);

        processedRecipes =
          await DietaryAwareRecipeService.processRecipesWithDietaryAwareness(
            recipes,
            {
              userId: req.user.id, // Keep as string, don't convert to number
              showConflictingRecipes,
            },
          );

        dietaryFilteringApplied = true;
        console.log(
          `[Seasonal] Processed ${recipes.length} → ${processedRecipes.length} recipes after dietary filtering`,
        );

        // Log first few recipes for debugging
        processedRecipes.slice(0, 3).forEach((recipe: any, i) => {
          console.log(
            `[Seasonal] Recipe ${i + 1}: "${recipe.title}" - Status: ${recipe.dietaryStatus || 'not set'}`,
          );
        });
      } catch (dietaryError) {
        console.error(
          '[Seasonal] Error processing dietary restrictions:',
          dietaryError,
        );
        // Continue with original recipes if dietary processing fails
      }
    } else {
      // Explicitly set to false for anonymous users
      dietaryFilteringApplied = false;
    }

    // SERVING SCALING: Apply serving adjustments if requested
    let finalRecipes = processedRecipes;
    let servingScalingApplied = false;

    if (servings && typeof servings === 'string') {
      const validation = RecipeScalingService.validateServingSize(servings);
      if (validation.isValid) {
        console.log(
          `[Seasonal] Scaling recipes to ${validation.servings} servings`,
        );
        finalRecipes = processedRecipes.map(recipe =>
          RecipeScalingService.scaleRecipe(recipe, validation.servings!),
        ) as any[];
        servingScalingApplied = true;
        console.log(
          `[Seasonal] Applied serving scaling to ${finalRecipes.length} recipes`,
        );
      } else {
        console.warn(`[Seasonal] Invalid serving size: ${validation.error}`);
      }
    }

    res.json({
      success: true,
      season,
      recipes: finalRecipes,
      count: finalRecipes.length,
      source: 'fatsecret',
      dietaryFiltering: dietaryFilteringApplied,
      servingScaling: servingScalingApplied,
      targetServings: servingScalingApplied
        ? parseInt(servings as string)
        : undefined,
      note: 'Seasonal recipes with full dietary awareness and serving scaling',
    });
  } catch (error) {
    console.error('[Seasonal] Error:', error);
    res.status(500).json({error: 'Failed to get seasonal recipes'});
  }
});

// Get seasonal recipes for current season - Use EXACT same logic as main recipe search
router.get('/seasonal/current', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const season = getCurrentSeason();
    const limit = parseInt(req.query.limit as string) || 20;
    const showConflictingRecipes = req.query.showConflictingRecipes !== 'false';
    const servings = req.query.servings;

    console.log(
      `[Seasonal Current] Using RecipeProviderService for ${season} (current season)...`,
    );

    // Use the SAME service as main recipe search for consistency
    const recipeProviderService = new RecipeProviderService([
      FatSecretAdapter, // Primary: FatSecret Premier (free, unlimited for our needs)
    ]);

    const seasonalIngredients = getSeasonalIngredients(season);
    const recipes = await recipeProviderService.searchByIngredients(
      seasonalIngredients.slice(0, 3),
      limit,
    );

    console.log(
      `[Seasonal Current] RecipeProviderService returned ${recipes.length} recipes`,
    );

    // Cache each recipe
    for (const recipe of recipes) {
      await RecipeCacheService.cacheRecipe(recipe, 'fatsecret', season, true);
    }

    // DIETARY AWARENESS: Process recipes with user's dietary restrictions (EXACT same logic as main search)
    let processedRecipes = recipes;
    let dietaryFilteringApplied = false;

    console.log(`[Seasonal Current] req.user exists: ${!!req.user}`);
    console.log(`[Seasonal Current] req.user.id: ${req.user?.id}`);

    if (req.user?.id) {
      try {
        console.log(
          `[Seasonal Current] Starting dietary processing for user ${req.user.id}`,
        );
        console.log(
          `[Seasonal Current] showConflictingRecipes: ${showConflictingRecipes}`,
        );
        console.log(`[Seasonal Current] Processing ${recipes.length} recipes`);

        processedRecipes =
          await DietaryAwareRecipeService.processRecipesWithDietaryAwareness(
            recipes,
            {
              userId: req.user.id, // Keep as string, don't convert to number
              showConflictingRecipes,
            },
          );

        dietaryFilteringApplied = true;
        console.log(
          `[Seasonal Current] Processed ${recipes.length} → ${processedRecipes.length} recipes after dietary filtering`,
        );

        // Log first few recipes for debugging
        processedRecipes.slice(0, 3).forEach((recipe: any, i) => {
          console.log(
            `[Seasonal Current] Recipe ${i + 1}: "${recipe.title}" - Status: ${recipe.dietaryStatus || 'not set'}`,
          );
        });
      } catch (dietaryError) {
        console.error(
          '[Seasonal Current] Error processing dietary restrictions:',
          dietaryError,
        );
        // Continue with original recipes if dietary processing fails
      }
    } else {
      // Explicitly set to false for anonymous users
      dietaryFilteringApplied = false;
    }

    // SERVING SCALING: Apply serving adjustments if requested
    let finalRecipes = processedRecipes;
    let servingScalingApplied = false;

    if (servings && typeof servings === 'string') {
      const validation = RecipeScalingService.validateServingSize(servings);
      if (validation.isValid) {
        console.log(
          `[Seasonal Current] Scaling recipes to ${validation.servings} servings`,
        );
        finalRecipes = processedRecipes.map(recipe =>
          RecipeScalingService.scaleRecipe(recipe, validation.servings!),
        ) as any[];
        servingScalingApplied = true;
        console.log(
          `[Seasonal Current] Applied serving scaling to ${finalRecipes.length} recipes`,
        );
      } else {
        console.warn(
          `[Seasonal Current] Invalid serving size: ${validation.error}`,
        );
      }
    }

    res.json({
      success: true,
      season,
      recipes: finalRecipes,
      count: finalRecipes.length,
      source: 'fatsecret',
      dietaryFiltering: dietaryFilteringApplied,
      servingScaling: servingScalingApplied,
      targetServings: servingScalingApplied
        ? parseInt(servings as string)
        : undefined,
      note: 'Current season recipes with full dietary awareness and serving scaling',
    });
  } catch (error) {
    console.error('[Seasonal Current] Error:', error);
    res.status(500).json({error: 'Failed to get seasonal recipes'});
  }
});

// Track recipe interaction
router.post(
  '/interaction',
  authenticateToken,
  async (req: AuthRequest, res): Promise<void> => {
    try {
      const {recipeId, interactionType, rating} = req.body;
      const userId = req.user?.id;

      if (!recipeId || !interactionType) {
        res.status(400).json({error: 'Missing required fields'});
        return;
      }

      await RecipeCacheService.trackInteraction(
        recipeId,
        interactionType,
        userId,
        rating,
      );

      res.json({success: true});
    } catch (error) {
      console.error('[Interaction] Error:', error);
      res.status(500).json({error: 'Failed to track interaction'});
    }
  },
);

// Get recipe from cache
router.get('/recipe/:id', async (req, res): Promise<void> => {
  try {
    const {id} = req.params;
    const recipe = await RecipeCacheService.getRecipeById(id);

    if (!recipe) {
      res.status(404).json({error: 'Recipe not found in cache'});
      return;
    }

    res.json({success: true, recipe});
  } catch (error) {
    console.error('[Recipe Cache] Error:', error);
    res.status(500).json({error: 'Failed to get recipe'});
  }
});

// Admin: Trigger cache refresh
router.post(
  '/admin/refresh',
  authenticateToken,
  async (req: AuthRequest, res): Promise<void> => {
    try {
      // Check if user is admin
      if (!req.user?.is_admin) {
        res.status(403).json({error: 'Admin access required'});
        return;
      }

      // Run maintenance in background
      RecipeCacheService.runDailyMaintenance().catch(err =>
        console.error('[Cache Refresh] Error:', err),
      );

      res.json({success: true, message: 'Cache refresh started'});
    } catch (error) {
      console.error('[Cache Refresh] Error:', error);
      res.status(500).json({error: 'Failed to refresh cache'});
    }
  },
);

// Helper functions
function getCurrentSeason(): string {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'fall';
  return 'winter';
}

function getSeasonalIngredients(season: string): string[] {
  const seasonalMap: Record<string, string[]> = {
    spring: ['asparagus', 'peas', 'strawberries', 'artichokes', 'radishes'],
    summer: [
      'tomatoes',
      'corn',
      'zucchini',
      'berries',
      'peaches',
      'watermelon',
    ],
    fall: ['pumpkin', 'squash', 'apples', 'sweet potato', 'brussels sprouts'],
    winter: ['kale', 'cabbage', 'citrus', 'root vegetables', 'pomegranate'],
  };
  return seasonalMap[season] || [];
}

export default router;
