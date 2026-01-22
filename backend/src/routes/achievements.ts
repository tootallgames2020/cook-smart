import {Router} from 'express';
import {AchievementService} from '../services/AchievementService';
import {authenticateToken, AuthRequest} from '../middleware/auth';
import { pool } from '../server';
import { logger } from '../utils/logger';

const router = Router();

// Get user's earned achievements
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id; // Keep as string, don't parse as int
    const achievements = await AchievementService.getUserAchievements(userId);

    // Transform to match frontend expectations
    const transformedAchievements = achievements.map(achievement => ({
      id: achievement.id,
      badge_type: achievement.achievement_type,
      badge_name: achievement.achievement_name,
      badge_description: achievement.achievement_description,
      badge_icon: '🏆', // Default icon
      earned_at: achievement.earned_at,
    }));

    res.json({success: true, achievements: transformedAchievements});
  } catch (error) {
    console.error('Error getting achievements:', error);
    res.status(500).json({error: 'Failed to get achievements'});
  }
});

// Get achievement progress (available achievements with progress)
router.get('/progress', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id; // Keep as string, don't parse as int
    
    // Prevent caching to ensure fresh progress data
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    // Get current progress for different achievement types
    const progress: any = {};

    // Recipe viewing progress
    try {
      const recipeResult = await pool.query(
        'SELECT COUNT(DISTINCT recipe_id) as count FROM recipe_views WHERE user_id = $1',
        [userId]
      );
      const recipeCount = parseInt(recipeResult.rows[0]?.count || '0');
      
      progress.first_recipe = {
        name: 'First Recipe',
        description: 'View your first recipe',
        current: Math.min(recipeCount, 1),
        target: 1,
      };
      
      progress.recipe_explorer = {
        name: 'Recipe Explorer',
        description: 'View 5 different recipes',
        current: Math.min(recipeCount, 5),
        target: 5,
      };
    } catch (error) {
      // If recipe_views table doesn't exist, set to 0
      progress.first_recipe = {
        name: 'First Recipe',
        description: 'View your first recipe',
        current: 0,
        target: 1,
      };
      
      progress.recipe_explorer = {
        name: 'Recipe Explorer',
        description: 'View 5 different recipes',
        current: 0,
        target: 5,
      };
    }

    // Ingredient inventory progress
    try {
      const ingredientResult = await pool.query(
        'SELECT COUNT(*) as count FROM user_ingredients WHERE user_id = $1',
        [userId]
      );
      const ingredientCount = parseInt(ingredientResult.rows[0]?.count || '0');
      
      progress.stocked_kitchen = {
        name: 'Stocked Kitchen',
        description: 'Add 10 ingredients to inventory',
        current: Math.min(ingredientCount, 10),
        target: 10,
      };
    } catch (error) {
      progress.stocked_kitchen = {
        name: 'Stocked Kitchen',
        description: 'Add 10 ingredients to inventory',
        current: 0,
        target: 10,
      };
    }

    // Barcode scanning progress
    try {
      const scanResult = await pool.query(
        'SELECT COUNT(*) as count FROM barcode_scans WHERE user_id = $1',
        [userId]
      );
      const scanCount = parseInt(scanResult.rows[0]?.count || '0');
      
      progress.scanner_pro = {
        name: 'Scanner Pro',
        description: 'Scan your first barcode',
        current: Math.min(scanCount, 1),
        target: 1,
      };
    } catch (error) {
      progress.scanner_pro = {
        name: 'Scanner Pro',
        description: 'Scan your first barcode',
        current: 0,
        target: 1,
      };
    }

    // Cooking progress
    try {
      const cookingResult = await pool.query(
        'SELECT COUNT(*) as count FROM recipe_cooking_history WHERE user_id = $1',
        [userId]
      );
      const cookingCount = parseInt(cookingResult.rows[0]?.count || '0');
      
      progress.first_cook = {
        name: 'First Cook',
        description: 'Cook your first recipe',
        current: Math.min(cookingCount, 1),
        target: 1,
      };
      
      progress.home_chef = {
        name: 'Home Chef',
        description: 'Cook 5 different recipes',
        current: Math.min(cookingCount, 5),
        target: 5,
      };

      progress.master_chef = {
        name: 'Master Chef',
        description: 'Cook 10 different recipes',
        current: Math.min(cookingCount, 10),
        target: 10,
      };
    } catch (error) {
      progress.first_cook = {
        name: 'First Cook',
        description: 'Cook your first recipe',
        current: 0,
        target: 1,
      };
      
      progress.home_chef = {
        name: 'Home Chef',
        description: 'Cook 5 different recipes',
        current: 0,
        target: 5,
      };

      progress.master_chef = {
        name: 'Master Chef',
        description: 'Cook 10 different recipes',
        current: 0,
        target: 10,
      };
    }

    // Waste reduction progress (placeholder)
    progress.waste_warrior = {
      name: 'Waste Warrior',
      description: 'Use 10 ingredients before expiry',
      current: 0,
      target: 10,
    };

    // Login streak progress (placeholder)
    progress.week_streak = {
      name: 'Week Streak',
      description: 'Log in 7 days in a row',
      current: 0,
      target: 7,
    };

    logger.info(`Achievement progress for user ${userId}:`, progress);
    res.json(progress);
  } catch (error) {
    console.error('Error getting achievement progress:', error);
    res.status(500).json({error: 'Failed to get progress'});
  }
});

// Track recipe view for achievements
router.post('/track-view', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { recipeId, recipeType } = req.body;

    if (!recipeId) {
      return res.status(400).json({ error: 'Recipe ID is required' });
    }

    // Ensure recipe_views table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS recipe_views (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        recipe_id VARCHAR(255) NOT NULL,
        recipe_type VARCHAR(50) DEFAULT 'api',
        viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, recipe_id, recipe_type)
      )
    `);

    // Create indexes if they don't exist
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_recipe_views_user_id ON recipe_views(user_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_recipe_views_recipe_id ON recipe_views(recipe_id)
    `);

    // Insert or update recipe view
    await pool.query(
      `INSERT INTO recipe_views (user_id, recipe_id, recipe_type, viewed_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, recipe_id, recipe_type) 
       DO UPDATE SET viewed_at = NOW()`,
      [userId, recipeId.toString(), recipeType || 'api']
    );

    logger.info(`Recipe view tracked for user ${userId}: ${recipeId} (${recipeType || 'api'})`);

    // Check if user earned any new achievements
    try {
      const recipeResult = await pool.query(
        'SELECT COUNT(DISTINCT recipe_id) as count FROM recipe_views WHERE user_id = $1',
        [userId]
      );
      const recipeCount = parseInt(recipeResult.rows[0]?.count || '0');

      let newAchievements = [];
      
      // Check for first recipe achievement
      if (recipeCount === 1) {
        newAchievements.push({
          type: 'first_recipe',
          name: 'First Recipe',
          description: 'View your first recipe'
        });
      }
      
      // Check for recipe explorer achievement
      if (recipeCount === 5) {
        newAchievements.push({
          type: 'recipe_explorer',
          name: 'Recipe Explorer',
          description: 'View 5 different recipes'
        });
      }

      res.json({ 
        success: true, 
        message: 'Recipe view tracked successfully',
        recipeCount,
        newAchievements
      });
    } catch (achievementError) {
      logger.error('Error checking achievements:', achievementError);
      res.json({ 
        success: true, 
        message: 'Recipe view tracked successfully (achievement check failed)',
        recipeCount: 0
      });
    }

  } catch (error) {
    logger.error('Error tracking recipe view:', error);
    res.status(500).json({ error: 'Failed to track recipe view' });
  }
});

export default router;
