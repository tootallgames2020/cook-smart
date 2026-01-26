/**
 * AUTO MEAL PLANNING API ROUTES
 * 
 * RESTful API endpoints for AI-powered meal planning:
 * - Generate intelligent meal plans based on preferences
 * - Get user's meal plan history
 * - Update and customize meal plans
 * - Export meal plans and shopping lists
 */

import { Router, Response } from 'express';
import { AutoMealPlanningService, MealPlanRequest, MealPlan } from '../services/AutoMealPlanningService';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/v1/meal-planning/generate
 * Generate a new AI-powered meal plan
 */
router.post('/generate', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const {
      family_id,
      plan_duration_days,
      preferences,
      dietary_restrictions,
      target_nutrition,
    } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User authentication required',
      });
      return;
    }

    if (!plan_duration_days || plan_duration_days < 1 || plan_duration_days > 30) {
      res.status(400).json({
        success: false,
        error: 'plan_duration_days must be between 1 and 30',
      });
      return;
    }

    const mealPlanRequest: MealPlanRequest = {
      user_id: userId,
      family_id: family_id || undefined,
      plan_duration_days: parseInt(plan_duration_days),
      preferences: preferences || {},
      dietary_restrictions: dietary_restrictions || [],
      target_nutrition: target_nutrition || {},
    };

    const mealPlan: MealPlan = await AutoMealPlanningService.generateMealPlan(mealPlanRequest);

    res.json({
      success: true,
      meal_plan: mealPlan,
      generation_time_ms: Date.now() - parseInt(mealPlan.generated_at),
    });

  } catch (error) {
    logger.error('Generate meal plan error:', error);
    res.status(500).json({
      success: false,
      error: 'Meal plan generation failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/meal-planning/plans
 * Get user's meal plan history
 */
router.get('/plans', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User authentication required',
      });
      return;
    }

    const mealPlans = await AutoMealPlanningService.getUserMealPlans(userId, limit);

    res.json({
      success: true,
      meal_plans: mealPlans,
      total_plans: mealPlans.length,
    });

  } catch (error) {
    logger.error('Get meal plans error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve meal plans',
    });
  }
});

/**
 * GET /api/v1/meal-planning/plans/:planId
 * Get a specific meal plan by ID
 */
router.get('/plans/:planId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { planId } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User authentication required',
      });
      return;
    }

    const mealPlan = await getMealPlanById(userId, planId);

    if (!mealPlan) {
      res.status(404).json({
        success: false,
        error: 'Meal plan not found',
      });
      return;
    }

    res.json({
      success: true,
      meal_plan: mealPlan,
    });

  } catch (error) {
    logger.error('Get meal plan by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve meal plan',
    });
  }
});

/**
 * PUT /api/v1/meal-planning/plans/:planId/meals/:mealId
 * Update a specific meal in a meal plan
 */
router.put('/plans/:planId/meals/:mealId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { planId, mealId } = req.params;
    const { recipe_id, recipe_name, servings, notes } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User authentication required',
      });
      return;
    }

    const updatedMeal = await updateMealInPlan(userId, planId, mealId, {
      recipe_id,
      recipe_name,
      servings,
      notes,
    });

    res.json({
      success: true,
      updated_meal: updatedMeal,
      message: 'Meal updated successfully',
    });

  } catch (error) {
    logger.error('Update meal in plan error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update meal',
    });
  }
});

/**
 * POST /api/v1/meal-planning/plans/:planId/regenerate-day
 * Regenerate meals for a specific day
 */
router.post('/plans/:planId/regenerate-day', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { planId } = req.params;
    const { date, preferences } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User authentication required',
      });
      return;
    }

    if (!date) {
      res.status(400).json({
        success: false,
        error: 'date is required (YYYY-MM-DD format)',
      });
      return;
    }

    const regeneratedDay = await regenerateDayInPlan(userId, planId, date, preferences || {});

    res.json({
      success: true,
      regenerated_day: regeneratedDay,
      message: 'Day regenerated successfully',
    });

  } catch (error) {
    logger.error('Regenerate day in plan error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to regenerate day',
    });
  }
});

/**
 * GET /api/v1/meal-planning/plans/:planId/shopping-list
 * Get shopping list for a meal plan
 */
router.get('/plans/:planId/shopping-list', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { planId } = req.params;
    const format = req.query.format as string || 'json';

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User authentication required',
      });
      return;
    }

    const shoppingList = await getMealPlanShoppingList(userId, planId);

    if (!shoppingList) {
      res.status(404).json({
        success: false,
        error: 'Meal plan not found',
      });
      return;
    }

    if (format === 'text') {
      const textList = formatShoppingListAsText(shoppingList);
      res.setHeader('Content-Type', 'text/plain');
      res.send(textList);
    } else {
      res.json({
        success: true,
        shopping_list: shoppingList,
        total_items: shoppingList.length,
        estimated_total_cost: shoppingList.reduce((sum, item) => sum + (item.estimated_cost || 0), 0),
      });
    }

  } catch (error) {
    logger.error('Get meal plan shopping list error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve shopping list',
    });
  }
});

/**
 * POST /api/v1/meal-planning/plans/:planId/export
 * Export meal plan in various formats
 */
router.post('/plans/:planId/export', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { planId } = req.params;
    const { format, include_shopping_list, include_nutrition } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User authentication required',
      });
      return;
    }

    const exportFormat = format || 'json';
    const mealPlan = await getMealPlanById(userId, planId);

    if (!mealPlan) {
      res.status(404).json({
        success: false,
        error: 'Meal plan not found',
      });
      return;
    }

    const exportData = await exportMealPlan(mealPlan, {
      format: exportFormat,
      include_shopping_list: include_shopping_list === true,
      include_nutrition: include_nutrition === true,
    });

    switch (exportFormat) {
      case 'pdf':
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="meal-plan-${planId}.pdf"`);
        res.send(exportData);
        break;
      case 'csv':
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="meal-plan-${planId}.csv"`);
        res.send(exportData);
        break;
      case 'text':
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="meal-plan-${planId}.txt"`);
        res.send(exportData);
        break;
      default:
        res.json({
          success: true,
          export_data: exportData,
          format: exportFormat,
        });
    }

  } catch (error) {
    logger.error('Export meal plan error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export meal plan',
    });
  }
});

/**
 * DELETE /api/v1/meal-planning/plans/:planId
 * Delete a meal plan
 */
router.delete('/plans/:planId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { planId } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User authentication required',
      });
      return;
    }

    const deleted = await deleteMealPlan(userId, planId);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: 'Meal plan not found',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Meal plan deleted successfully',
    });

  } catch (error) {
    logger.error('Delete meal plan error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete meal plan',
    });
  }
});

/**
 * GET /api/v1/meal-planning/suggestions
 * Get meal suggestions based on current inventory
 */
router.get('/suggestions', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const meal_type = req.query.meal_type as string;
    const time_constraint = parseInt(req.query.time_constraint as string) || 45;
    const difficulty = req.query.difficulty as string || 'medium';

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User authentication required',
      });
      return;
    }

    const suggestions = await getMealSuggestions(userId, {
      meal_type,
      time_constraint,
      difficulty,
    });

    res.json({
      success: true,
      suggestions,
      total_suggestions: suggestions.length,
    });

  } catch (error) {
    logger.error('Get meal suggestions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get meal suggestions',
    });
  }
});

/**
 * POST /api/v1/meal-planning/quick-plan
 * Generate a quick meal plan for today/tomorrow
 */
router.post('/quick-plan', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { target_date, meal_types, use_expiring_ingredients } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User authentication required',
      });
      return;
    }

    const quickPlan = await generateQuickMealPlan(userId, {
      target_date: target_date || new Date().toISOString().split('T')[0],
      meal_types: meal_types || ['breakfast', 'lunch', 'dinner'],
      use_expiring_ingredients: use_expiring_ingredients === true,
    });

    res.json({
      success: true,
      quick_plan: quickPlan,
      message: 'Quick meal plan generated successfully',
    });

  } catch (error) {
    logger.error('Generate quick meal plan error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate quick meal plan',
    });
  }
});

/**
 * HELPER FUNCTIONS
 */

async function getMealPlanById(userId: string, planId: string): Promise<MealPlan | null> {
  // This would query the meal_plans table for a specific plan
  const userPlans = await AutoMealPlanningService.getUserMealPlans(userId, 50);
  return userPlans.find(plan => plan.plan_id === planId) || null;
}

async function updateMealInPlan(userId: string, planId: string, mealId: string, updates: any): Promise<any> {
  // This would update a specific meal in the meal_plan_meals table
  return {
    meal_id: mealId,
    ...updates,
    updated_at: new Date().toISOString(),
  };
}

async function regenerateDayInPlan(userId: string, planId: string, date: string, preferences: any): Promise<any> {
  // This would regenerate meals for a specific day using the meal planning service
  return {
    date,
    meals: [],
    regenerated_at: new Date().toISOString(),
  };
}

async function getMealPlanShoppingList(userId: string, planId: string): Promise<any[] | null> {
  // This would get the shopping list for a specific meal plan
  const mealPlan = await getMealPlanById(userId, planId);
  return mealPlan?.shopping_list || null;
}

function formatShoppingListAsText(shoppingList: any[]): string {
  let text = 'SHOPPING LIST\n';
  text += '=============\n\n';

  const categories = shoppingList.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as { [key: string]: any[] });

  for (const [category, items] of Object.entries(categories)) {
    text += `${category.toUpperCase()}:\n`;
    for (const item of items as any[]) {
      text += `  - ${item.total_quantity} ${item.unit} ${item.ingredient_name}`;
      if (item.estimated_cost) {
        text += ` ($${item.estimated_cost.toFixed(2)})`;
      }
      text += '\n';
    }
    text += '\n';
  }

  const totalCost = shoppingList.reduce((sum, item) => sum + (item.estimated_cost || 0), 0);
  if (totalCost > 0) {
    text += `ESTIMATED TOTAL: $${totalCost.toFixed(2)}\n`;
  }

  return text;
}

async function exportMealPlan(mealPlan: MealPlan, options: any): Promise<any> {
  // This would export the meal plan in the requested format
  switch (options.format) {
    case 'text':
      return formatMealPlanAsText(mealPlan, options);
    case 'csv':
      return formatMealPlanAsCSV(mealPlan, options);
    case 'pdf':
      return generateMealPlanPDF(mealPlan, options);
    default:
      return mealPlan;
  }
}

function formatMealPlanAsText(mealPlan: MealPlan, options: any): string {
  let text = `MEAL PLAN: ${mealPlan.plan_name}\n`;
  text += `Duration: ${mealPlan.start_date} to ${mealPlan.end_date}\n`;
  text += '='.repeat(50) + '\n\n';

  for (const day of mealPlan.daily_meals) {
    text += `${day.day_of_week.toUpperCase()} - ${day.date}\n`;
    text += '-'.repeat(30) + '\n';
    
    for (const meal of day.meals) {
      text += `${meal.meal_type.toUpperCase()}: ${meal.recipe_name}\n`;
      text += `  Prep: ${meal.prep_time}min | Cook: ${meal.cook_time}min | Servings: ${meal.servings}\n`;
      if (options.include_nutrition) {
        text += `  Calories: ${meal.nutrition.calories} | Protein: ${meal.nutrition.protein}g\n`;
      }
      text += '\n';
    }
    text += '\n';
  }

  if (options.include_shopping_list && mealPlan.shopping_list.length > 0) {
    text += formatShoppingListAsText(mealPlan.shopping_list);
  }

  return text;
}

function formatMealPlanAsCSV(mealPlan: MealPlan, options: any): string {
  let csv = 'Date,Day,Meal Type,Recipe Name,Prep Time,Cook Time,Servings';
  if (options.include_nutrition) {
    csv += ',Calories,Protein,Carbs,Fat';
  }
  csv += '\n';

  for (const day of mealPlan.daily_meals) {
    for (const meal of day.meals) {
      csv += `${day.date},${day.day_of_week},${meal.meal_type},${meal.recipe_name},${meal.prep_time},${meal.cook_time},${meal.servings}`;
      if (options.include_nutrition) {
        csv += `,${meal.nutrition.calories},${meal.nutrition.protein},${meal.nutrition.carbohydrates},${meal.nutrition.fat}`;
      }
      csv += '\n';
    }
  }

  return csv;
}

async function generateMealPlanPDF(mealPlan: MealPlan, options: any): Promise<Buffer> {
  // This would generate a PDF using a library like puppeteer or pdfkit
  // For now, return a placeholder
  return Buffer.from('PDF generation not implemented yet');
}

async function deleteMealPlan(userId: string, planId: string): Promise<boolean> {
  // This would delete the meal plan and associated data
  return true; // Placeholder
}

async function getMealSuggestions(userId: string, criteria: any): Promise<any[]> {
  // This would get meal suggestions based on criteria
  return []; // Placeholder
}

async function generateQuickMealPlan(userId: string, options: any): Promise<any> {
  // This would generate a quick meal plan for immediate use
  return {
    date: options.target_date,
    meals: [],
    generated_at: new Date().toISOString(),
  };
}

export default router;