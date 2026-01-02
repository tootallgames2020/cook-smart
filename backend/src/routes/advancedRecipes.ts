import express from 'express';
import AdvancedRecipeService from '../services/AdvancedRecipeService';
import {authenticateToken} from '../middleware/auth';
import {RecipeProviderService} from '../services/RecipeProviderService';
import FatSecretAdapter from '../services/FatSecretProviderAdapter';

const router = express.Router();

// Nutrition
router.post('/nutrition/:recipeId', authenticateToken, async (req, res) => {
  try {
    const {recipeId} = req.params as {recipeId: string};
    const nutrition = await AdvancedRecipeService.addNutrition(
      recipeId,
      req.body,
    );
    res.json({success: true, nutrition});
  } catch (error: any) {
    res.status(500).json({error: error.message});
  }
});

router.get('/nutrition/:recipeId', async (req, res) => {
  try {
    const {recipeId} = req.params;
    const nutrition = await AdvancedRecipeService.getNutrition(recipeId);
    res.json({success: true, nutrition});
  } catch (error: any) {
    res.status(500).json({error: error.message});
  }
});

// Timers
router.post('/timers/:recipeId', authenticateToken, async (req, res) => {
  try {
    const {recipeId} = req.params as {recipeId: string};
    const {stepNumber, durationMinutes, label} = req.body;
    const timer = await AdvancedRecipeService.addTimer(
      recipeId,
      stepNumber,
      durationMinutes,
      label,
    );
    res.json({success: true, timer});
  } catch (error: any) {
    res.status(500).json({error: error.message});
  }
});

router.get('/timers/:recipeId', async (req, res) => {
  try {
    const {recipeId} = req.params;
    const timers = await AdvancedRecipeService.getTimers(recipeId);
    res.json({success: true, timers});
  } catch (error: any) {
    res.status(500).json({error: error.message});
  }
});

// Cooking Sessions
router.post('/cooking-session/start', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id as string;
    const {recipeId} = req.body;
    const session = await AdvancedRecipeService.startCookingSession(
      userId,
      recipeId,
    );
    res.json({success: true, session});
  } catch (error: any) {
    res.status(500).json({error: error.message});
  }
});

router.put(
  '/cooking-session/:sessionId',
  authenticateToken,
  async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const {currentStep, status} = req.body;
      const session = await AdvancedRecipeService.updateCookingSession(
        sessionId,
        currentStep,
        status,
      );
      res.json({success: true, session});
    } catch (error: any) {
      res.status(500).json({error: error.message});
    }
  },
);

router.post(
  '/cooking-session/:sessionId/complete',
  authenticateToken,
  async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const session =
        await AdvancedRecipeService.completeCookingSession(sessionId);
      res.json({success: true, session});
    } catch (error: any) {
      res.status(500).json({error: error.message});
    }
  },
);

router.get(
  '/cooking-session/:recipeId',
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user!.id as string;
      const {recipeId} = req.params;
      const session = await AdvancedRecipeService.getCookingSession(
        userId,
        recipeId,
      );
      res.json({success: true, session});
    } catch (error: any) {
      res.status(500).json({error: error.message});
    }
  },
);

// Tags
router.post('/tags/:recipeId', authenticateToken, async (req, res) => {
  try {
    const {recipeId} = req.params as {recipeId: string};
    const {tag, tagType} = req.body;
    const result = await AdvancedRecipeService.addTag(recipeId, tag, tagType);
    res.json({success: true, tag: result});
  } catch (error: any) {
    res.status(500).json({error: error.message});
  }
});

router.get('/tags/:recipeId', async (req, res) => {
  try {
    const {recipeId} = req.params;
    const tags = await AdvancedRecipeService.getTags(recipeId);
    res.json({success: true, tags});
  } catch (error: any) {
    res.status(500).json({error: error.message});
  }
});

router.post('/search-by-tags', async (req, res) => {
  try {
    const {tags, tagType} = req.body;
    const recipeIds = await AdvancedRecipeService.searchByTags(tags, tagType);
    res.json({success: true, recipeIds});
  } catch (error: any) {
    res.status(500).json({error: error.message});
  }
});

// Seasonal
router.post('/seasonal/:recipeId', authenticateToken, async (req, res) => {
  try {
    const {recipeId} = req.params as {recipeId: string};
    const {season, priority} = req.body;
    const result = await AdvancedRecipeService.addSeasonalRecipe(
      recipeId,
      season,
      priority,
    );
    res.json({success: true, seasonal: result});
  } catch (error: any) {
    res.status(500).json({error: error.message});
  }
});

router.get('/seasonal/:season', async (req, res) => {
  try {
    const {season} = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    const recipes = await AdvancedRecipeService.getSeasonalRecipes(
      season,
      limit,
    );
    res.json({success: true, recipes});
  } catch (error: any) {
    res.status(500).json({error: error.message});
  }
});

router.get('/seasonal/current/recipes', async (req, res) => {
  try {
    const season = AdvancedRecipeService.getCurrentSeason();
    const limit = parseInt(req.query.limit as string) || 20;
    const seasonalRecipeIds = await AdvancedRecipeService.getSeasonalRecipes(
      season,
      limit,
    );

    // Create RecipeProviderService instance
    const recipeProviderService = new RecipeProviderService([FatSecretAdapter]);

    // Fetch full recipe details for each seasonal recipe ID
    const recipesWithDetails = [];
    for (const seasonalRecipe of seasonalRecipeIds) {
      try {
        const recipeDetails = await recipeProviderService.getRecipeDetails(
          seasonalRecipe.recipe_id,
        );
        if (recipeDetails) {
          // Add seasonal metadata to the recipe
          recipesWithDetails.push({
            ...recipeDetails,
            seasonalPriority: seasonalRecipe.priority,
            addedToSeasonalAt: seasonalRecipe.created_at,
          });
        }
      } catch (error) {
        console.log(`Failed to fetch details for seasonal recipe ${seasonalRecipe.recipe_id}:`, error);
      }
    }

    console.log(`[Seasonal] Returning ${recipesWithDetails.length} seasonal recipes with full details`);
    res.json({
      success: true, 
      season, 
      recipes: recipesWithDetails,
      count: recipesWithDetails.length
    });
  } catch (error: any) {
    console.error('[Seasonal] Error:', error);
    res.status(500).json({error: error.message});
  }
});

export default router;
