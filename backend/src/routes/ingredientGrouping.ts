import { Router } from 'express';
import { IngredientGroupingService } from '../services/IngredientGroupingService';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * GET /api/v1/ingredients/grouped
 * Get user's ingredients with grouping applied
 */
router.get('/grouped', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const grouped = await IngredientGroupingService.getGroupedUserIngredients(userId);
    
    res.json({
      success: true,
      data: grouped
    });
  } catch (error) {
    console.error('Get grouped ingredients error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get grouped ingredients'
    });
  }
});

/**
 * POST /api/v1/ingredients/merge
 * User merges multiple ingredients into a group
 */
router.post('/merge', authenticateToken, async (req, res): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { ingredient_ids, group_name } = req.body;
    
    if (!ingredient_ids || !Array.isArray(ingredient_ids) || ingredient_ids.length < 2) {
      res.status(400).json({
        success: false,
        message: 'Must provide at least 2 ingredient IDs to merge'
      });
      return;
    }
    
    if (!group_name) {
      res.status(400).json({
        success: false,
        message: 'Group name is required'
      });
      return;
    }
    
    await IngredientGroupingService.userMergeIngredients(userId, ingredient_ids, group_name);
    
    res.json({
      success: true,
      message: `Merged ${ingredient_ids.length} ingredients into "${group_name}"`
    });
  } catch (error) {
    console.error('Merge ingredients error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to merge ingredients'
    });
  }
});

/**
 * POST /api/v1/ingredients/split
 * User splits an ingredient from its group
 */
router.post('/split', authenticateToken, async (req, res): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { ingredient_id } = req.body;
    
    if (!ingredient_id) {
      res.status(400).json({
        success: false,
        message: 'Ingredient ID is required'
      });
      return;
    }
    
    await IngredientGroupingService.userSplitIngredient(userId, ingredient_id);
    
    res.json({
      success: true,
      message: 'Ingredient split from group'
    });
  } catch (error) {
    console.error('Split ingredient error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to split ingredient'
    });
  }
});

export default router;
