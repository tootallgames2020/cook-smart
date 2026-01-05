import {Router} from 'express';
import {RecipeEnhancementService} from '../services/RecipeEnhancementService';
import {authenticateToken, AuthRequest} from '../middleware/auth';
import { pool } from '../server';
import { logger } from '../utils/logger';

const router = Router();

// RATINGS
router.post('/ratings', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id as string;
    const {recipeId, recipeType, rating, review} = req.body;
    const result = await RecipeEnhancementService.rateRecipe(
      userId,
      recipeId,
      recipeType,
      rating,
      review,
    );
    res.json({success: true, rating: result});
  } catch (error) {
    console.error('Error rating recipe:', error);
    res.status(500).json({error: 'Failed to rate recipe'});
  }
});

router.get('/ratings/:recipeId/:recipeType', async (req, res) => {
  try {
    const {recipeId, recipeType} = req.params;
    const ratings = await RecipeEnhancementService.getRecipeRatings(
      recipeId,
      recipeType as 'api' | 'user',
    );
    const reviews = await RecipeEnhancementService.getRecipeReviews(
      recipeId,
      recipeType as 'api' | 'user',
    );
    res.json({success: true, ratings, reviews});
  } catch (error) {
    console.error('Error getting ratings:', error);
    res.status(500).json({error: 'Failed to get ratings'});
  }
});

// COLLECTIONS
router.post(
  '/collections',
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id as string;
      const {name, description, icon} = req.body;
      const collection = await RecipeEnhancementService.createCollection(
        userId,
        name,
        description,
        icon,
      );
      res.json({success: true, collection});
    } catch (error) {
      console.error('Error creating collection:', error);
      res.status(500).json({error: 'Failed to create collection'});
    }
  },
);

router.get('/collections', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id as string;
    const collections =
      await RecipeEnhancementService.getUserCollections(userId);
    res.json({success: true, collections});
  } catch (error) {
    console.error('Error getting collections:', error);
    res.status(500).json({error: 'Failed to get collections'});
  }
});

router.post(
  '/collections/:id/recipes',
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const collectionId = parseInt(req.params.id);
      const {recipeId, recipeType} = req.body;
      await RecipeEnhancementService.addToCollection(
        collectionId,
        recipeId,
        recipeType,
      );
      res.json({success: true});
    } catch (error) {
      console.error('Error adding to collection:', error);
      res.status(500).json({error: 'Failed to add to collection'});
    }
  },
);

router.get(
  '/collections/:id/recipes',
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const collectionId = parseInt(req.params.id);
      const recipes =
        await RecipeEnhancementService.getCollectionRecipes(collectionId);
      res.json({success: true, recipes});
    } catch (error) {
      console.error('Error getting collection recipes:', error);
      res.status(500).json({error: 'Failed to get recipes'});
    }
  },
);

// MEAL PLANNING
router.post('/meal-plans', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id as string;
    const {recipeId, recipeType, plannedDate, mealType, notes} = req.body;
    const mealPlan = await RecipeEnhancementService.addMealPlan(
      userId,
      recipeId,
      recipeType,
      plannedDate,
      mealType,
      notes,
    );
    res.json({success: true, mealPlan});
  } catch (error) {
    console.error('Error creating meal plan:', error);
    res.status(500).json({error: 'Failed to create meal plan'});
  }
});

router.get('/meal-plans', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id as string;
    const {startDate, endDate} = req.query;
    const mealPlans = await RecipeEnhancementService.getMealPlans(
      userId,
      startDate as string,
      endDate as string,
    );
    res.json({success: true, mealPlans});
  } catch (error) {
    console.error('Error getting meal plans:', error);
    res.status(500).json({error: 'Failed to get meal plans'});
  }
});

router.delete(
  '/meal-plans/:id',
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id as string;
      const mealPlanId = parseInt(req.params.id);
      await RecipeEnhancementService.deleteMealPlan(mealPlanId, userId);
      res.json({success: true});
    } catch (error) {
      console.error('Error deleting meal plan:', error);
      res.status(500).json({error: 'Failed to delete meal plan'});
    }
  },
);

router.put(
  '/meal-plans/:id/complete',
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id as string;
      const mealPlanId = parseInt(req.params.id);
      await RecipeEnhancementService.markMealComplete(mealPlanId, userId);
      res.json({success: true});
    } catch (error) {
      console.error('Error marking meal complete:', error);
      res.status(500).json({error: 'Failed to mark complete'});
    }
  },
);

router.delete(
  '/meal-plans/:id',
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id as string;
      const mealPlanId = parseInt(req.params.id);
      await RecipeEnhancementService.deleteMealPlan(mealPlanId, userId);
      res.json({success: true});
    } catch (error) {
      console.error('Error deleting meal plan:', error);
      res.status(500).json({error: 'Failed to delete meal plan'});
    }
  },
);

// MARK RECIPE AS COOKED (Frontend expects this endpoint)
router.post('/mark-cooked', authenticateToken, async (req: AuthRequest, res): Promise<void> => {
  try {
    const userId = req.user!.id as string;
    const { recipeId, recipeType } = req.body;

    if (!recipeId) {
      res.status(400).json({ error: 'Recipe ID is required' });
      return;
    }

    // Mark recipe as cooked in cooking history
    const history = await RecipeEnhancementService.markRecipeCooked(
      userId,
      recipeId,
      recipeType || 'api',
      undefined, // rating (optional)
      undefined, // notes (optional)
    );

    // Track cooking for achievements
    try {
      const client = await pool.connect();
      try {
        // Insert into recipe cooking tracking for achievements
        await client.query(
          'INSERT INTO recipe_views (user_id, recipe_id, recipe_type, viewed_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT DO NOTHING',
          [userId, recipeId, recipeType || 'api']
        );

        // Check if this is their first cooked recipe for achievement
        const cookingCountResult = await client.query(
          'SELECT COUNT(*) as count FROM recipe_cooking_history WHERE user_id = $1',
          [userId]
        );
        const cookingCount = parseInt(cookingCountResult.rows[0]?.count || '0');

        logger.info(`User ${userId} has cooked ${cookingCount} recipes total`);

        // Award achievements based on cooking milestones
        if (cookingCount === 1) {
          // First recipe cooked achievement
          await client.query(
            `INSERT INTO user_achievements (user_id, achievement_type, achievement_name, achievement_description, earned_at) 
             VALUES ($1, $2, $3, $4, NOW()) 
             ON CONFLICT (user_id, achievement_type) DO NOTHING`,
            [userId, 'first_cook', 'First Cook', 'Cooked your first recipe']
          );
          logger.info(`Achievement awarded: First Cook for user ${userId}`);
        }

        if (cookingCount === 5) {
          // Home chef achievement
          await client.query(
            `INSERT INTO user_achievements (user_id, achievement_type, achievement_name, achievement_description, earned_at) 
             VALUES ($1, $2, $3, $4, NOW()) 
             ON CONFLICT (user_id, achievement_type) DO NOTHING`,
            [userId, 'home_chef', 'Home Chef', 'Cooked 5 different recipes']
          );
          logger.info(`Achievement awarded: Home Chef for user ${userId}`);
        }

        if (cookingCount === 10) {
          // Master chef achievement
          await client.query(
            `INSERT INTO user_achievements (user_id, achievement_type, achievement_name, achievement_description, earned_at) 
             VALUES ($1, $2, $3, $4, NOW()) 
             ON CONFLICT (user_id, achievement_type) DO NOTHING`,
            [userId, 'master_chef', 'Master Chef', 'Cooked 10 different recipes']
          );
          logger.info(`Achievement awarded: Master Chef for user ${userId}`);
        }

      } finally {
        client.release();
      }
    } catch (trackingError) {
      logger.error('Recipe cooking tracking error:', trackingError);
      // Don't fail the main request if tracking fails
    }

    // Award points for cooking the recipe
    try {
      const client = await pool.connect();
      try {
        await client.query(
          'UPDATE users SET points = points + 10 WHERE id = $1',
          [userId]
        );
        logger.info(`Awarded 10 points to user ${userId} for cooking recipe`);
      } finally {
        client.release();
      }
    } catch (pointsError) {
      logger.error('Points awarding error:', pointsError);
      // Don't fail the main request if points fail
    }

    res.json({
      success: true,
      message: 'Recipe marked as cooked successfully!',
      history,
      pointsAwarded: 10, // Award points for cooking
    });
  } catch (error) {
    logger.error('Error marking recipe cooked:', error);
    res.status(500).json({ error: 'Failed to track your cooking' });
  }
});

// COOKING HISTORY
router.post(
  '/cooking-history',
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id as string;
      const {recipeId, recipeType, rating, notes} = req.body;
      const history = await RecipeEnhancementService.markRecipeCooked(
        userId,
        recipeId,
        recipeType,
        rating,
        notes,
      );
      res.json({success: true, history});
    } catch (error) {
      console.error('Error marking recipe cooked:', error);
      res.status(500).json({error: 'Failed to mark recipe cooked'});
    }
  },
);

router.get(
  '/cooking-history',
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id as string;
      const history = await RecipeEnhancementService.getCookingHistory(userId);
      res.json({success: true, history});
    } catch (error) {
      console.error('Error getting cooking history:', error);
      res.status(500).json({error: 'Failed to get history'});
    }
  },
);

export default router;
