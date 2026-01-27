/**
 * AUTO MEAL PLANNING SERVICE
 * 
 * AI-powered automatic meal planning:
 * - Generate weekly meal plans based on family preferences
 * - Consider available ingredients and expiring items
 * - Balance nutrition and variety
 * - Adapt to dietary restrictions and allergies
 * - Learn from user feedback and preferences
 */

import { pool } from '../server';
import { AIPreferencesService } from './AIPreferencesService';
import { SmartRecipeIntelligenceService } from './SmartRecipeIntelligenceService';
import { logger } from '../utils/logger';

export interface MealPlanRequest {
  user_id: string;
  family_id?: string;
  plan_duration_days: number;
  preferences?: {
    meals_per_day?: number;
    cooking_time_limit?: number;
    difficulty_preference?: 'easy' | 'medium' | 'challenging';
    cuisine_preferences?: string[];
    avoid_ingredients?: string[];
    prioritize_expiring?: boolean;
    budget_conscious?: boolean;
  };
  dietary_restrictions?: string[];
  target_nutrition?: {
    calories_per_day?: number;
    protein_target?: number;
    carb_limit?: number;
    fat_limit?: number;
  };
}

export interface MealPlan {
  plan_id: string;
  user_id: string;
  family_id?: string;
  plan_name: string;
  start_date: string;
  end_date: string;
  total_days: number;
  daily_meals: DailyMealPlan[];
  shopping_list: ShoppingListItem[];
  nutrition_summary: NutritionSummary;
  cost_estimate?: number;
  preparation_tips: string[];
  generated_at: string;
  ai_confidence: number;
}

export interface DailyMealPlan {
  date: string;
  day_of_week: string;
  meals: MealSlot[];
  daily_nutrition: NutritionSummary;
  prep_time_total: number;
  difficulty_rating: number;
}

export interface MealSlot {
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  recipe_id?: string;
  recipe_name: string;
  recipe_source: 'fatsecret' | 'user_created' | 'ai_suggested';
  prep_time: number;
  cook_time: number;
  servings: number;
  difficulty: 'easy' | 'medium' | 'challenging';
  ingredients_needed: IngredientNeed[];
  nutrition: NutritionSummary;
  ai_reasoning: string;
  confidence: number;
}

export interface IngredientNeed {
  ingredient_name: string;
  quantity: number;
  unit: string;
  have_in_inventory: boolean;
  expiring_soon: boolean;
  estimated_cost?: number;
}

export interface ShoppingListItem {
  ingredient_name: string;
  total_quantity: number;
  unit: string;
  estimated_cost?: number;
  category: string;
  priority: 'high' | 'medium' | 'low';
  used_in_meals: string[];
}

export interface NutritionSummary {
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
}

export class AutoMealPlanningService {

  /**
   * GENERATE MEAL PLAN
   * Create an AI-powered meal plan based on user preferences
   */
  static async generateMealPlan(request: MealPlanRequest): Promise<MealPlan> {
    const startTime = Date.now();
    
    try {
      // Check if user has auto meal planning enabled
      const hasMealPlanningEnabled = await AIPreferencesService.isFeatureEnabled(
        request.user_id,
        'auto_meal_planning'
      );

      if (!hasMealPlanningEnabled) {
        throw new Error('Auto meal planning is disabled. Enable it in AI settings.');
      }

      // Get user's meal planning preferences
      const aiPreferences = await AIPreferencesService.getUserPreferences(request.user_id);
      const planningLevel = aiPreferences?.auto_meal_planning ? 'enabled' : 'disabled';

      // Gather context for meal planning
      const context = await this.gatherMealPlanningContext(request);
      
      // Generate the meal plan using AI
      const mealPlan = await this.generateIntelligentMealPlan(request, context, planningLevel);
      
      // Save the meal plan
      await this.saveMealPlan(mealPlan);
      
      // Track usage for analytics
      await AIPreferencesService.trackFeatureUsage(
        request.user_id,
        'auto_meal_planning',
        15
      );

      logger.info(`Generated meal plan for user ${request.user_id} in ${Date.now() - startTime}ms`);
      return mealPlan;

    } catch (error) {
      logger.error('Generate meal plan error:', error);
      throw new Error(`Meal plan generation failed: ${(error as Error).message}`);
    }
  }

  /**
   * GATHER MEAL PLANNING CONTEXT
   * Collect all relevant information for intelligent meal planning
   */
  private static async gatherMealPlanningContext(request: MealPlanRequest): Promise<any> {
    const client = await pool.connect();
    
    try {
      const context: any = {
        available_ingredients: [],
        expiring_ingredients: [],
        family_preferences: {},
        dietary_restrictions: request.dietary_restrictions || [],
        recent_meals: [],
        seasonal_preferences: {},
        budget_constraints: {},
      };

      // Get available ingredients
      const ingredientsResult = await client.query(`
        SELECT ingredient_name, quantity, unit, expiration_date, storage_type
        FROM user_ingredients
        WHERE user_id = $1 AND quantity > 0
        ORDER BY expiration_date ASC NULLS LAST
      `, [request.user_id]);

      context.available_ingredients = ingredientsResult.rows;

      // Identify expiring ingredients (next 3 days)
      const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      context.expiring_ingredients = ingredientsResult.rows.filter(ing => 
        ing.expiration_date && new Date(ing.expiration_date) <= threeDaysFromNow
      );

      // Get family preferences if in a family
      if (request.family_id) {
        const familyPrefsResult = await client.query(`
          SELECT 
            fm.role,
            u.dietary_preferences,
            u.allergies,
            up.cuisine_preferences,
            up.cooking_skill_level
          FROM family_members fm
          JOIN users u ON fm.user_id = u.id
          LEFT JOIN user_preferences up ON u.id = up.user_id
          WHERE fm.family_id = $1
        `, [request.family_id]);

        context.family_preferences = familyPrefsResult.rows;
      } else {
        // Get individual preferences
        const userPrefsResult = await client.query(`
          SELECT dietary_preferences, allergies
          FROM users
          WHERE id = $1
        `, [request.user_id]);

        if (userPrefsResult.rows.length > 0) {
          context.family_preferences = [userPrefsResult.rows[0]];
        }
      }

      // Get recent meals to avoid repetition
      const recentMealsResult = await client.query(`
        SELECT recipe_name, meal_type, created_at
        FROM meal_plan_meals
        WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '7 days'
        ORDER BY created_at DESC
      `, [request.user_id]);

      context.recent_meals = recentMealsResult.rows;

      // Get seasonal preferences (current month)
      const currentMonth = new Date().getMonth() + 1;
      context.seasonal_preferences = this.getSeasonalPreferences(currentMonth);

      return context;

    } finally {
      client.release();
    }
  }

  /**
   * GENERATE INTELLIGENT MEAL PLAN
   * Use AI to create an optimized meal plan
   */
  private static async generateIntelligentMealPlan(
    request: MealPlanRequest,
    context: any,
    planningLevel: string
  ): Promise<MealPlan> {
    
    const planId = `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + (request.plan_duration_days - 1) * 24 * 60 * 60 * 1000);

    const mealPlan: MealPlan = {
      plan_id: planId,
      user_id: request.user_id,
      family_id: request.family_id,
      plan_name: `AI Meal Plan - ${startDate.toLocaleDateString()}`,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      total_days: request.plan_duration_days,
      daily_meals: [],
      shopping_list: [],
      nutrition_summary: {
        calories: 0,
        protein: 0,
        carbohydrates: 0,
        fat: 0,
        fiber: 0,
        sugar: 0,
        sodium: 0,
      },
      preparation_tips: [],
      generated_at: new Date().toISOString(),
      ai_confidence: 0.8,
    };

    // Generate daily meal plans
    for (let day = 0; day < request.plan_duration_days; day++) {
      const currentDate = new Date(startDate.getTime() + day * 24 * 60 * 60 * 1000);
      const dailyPlan = await this.generateDailyMealPlan(
        currentDate,
        request,
        context,
        planningLevel,
        day === 0 // prioritize expiring ingredients on first day
      );
      
      mealPlan.daily_meals.push(dailyPlan);
      
      // Accumulate nutrition
      this.addNutrition(mealPlan.nutrition_summary, dailyPlan.daily_nutrition);
    }

    // Generate consolidated shopping list
    mealPlan.shopping_list = this.generateShoppingList(mealPlan.daily_meals, context.available_ingredients);
    
    // Add preparation tips
    mealPlan.preparation_tips = this.generatePreparationTips(mealPlan, context);
    
    // Calculate cost estimate
    mealPlan.cost_estimate = this.estimateMealPlanCost(mealPlan.shopping_list);

    return mealPlan;
  }

  /**
   * GENERATE DAILY MEAL PLAN
   * Create meals for a specific day
   */
  private static async generateDailyMealPlan(
    date: Date,
    request: MealPlanRequest,
    context: any,
    planningLevel: string,
    prioritizeExpiring: boolean
  ): Promise<DailyMealPlan> {
    
    const mealsPerDay = request.preferences?.meals_per_day || 3;
    const mealTypes = ['breakfast', 'lunch', 'dinner'].slice(0, mealsPerDay);
    
    const dailyPlan: DailyMealPlan = {
      date: date.toISOString().split('T')[0],
      day_of_week: date.toLocaleDateString('en-US', { weekday: 'long' }),
      meals: [],
      daily_nutrition: {
        calories: 0,
        protein: 0,
        carbohydrates: 0,
        fat: 0,
        fiber: 0,
        sugar: 0,
        sodium: 0,
      },
      prep_time_total: 0,
      difficulty_rating: 0,
    };

    // Generate each meal
    for (const mealType of mealTypes) {
      const meal = await this.generateMealSlot(
        mealType as any,
        request,
        context,
        planningLevel,
        prioritizeExpiring && mealType === 'dinner' // use expiring ingredients in dinner
      );
      
      dailyPlan.meals.push(meal);
      this.addNutrition(dailyPlan.daily_nutrition, meal.nutrition);
      dailyPlan.prep_time_total += meal.prep_time + meal.cook_time;
    }

    dailyPlan.difficulty_rating = dailyPlan.meals.reduce((sum, meal) => {
      const difficultyScore = meal.difficulty === 'easy' ? 1 : meal.difficulty === 'medium' ? 2 : 3;
      return sum + difficultyScore;
    }, 0) / dailyPlan.meals.length;

    return dailyPlan;
  }

  /**
   * GENERATE MEAL SLOT
   * Create a specific meal (breakfast, lunch, dinner)
   */
  private static async generateMealSlot(
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
    request: MealPlanRequest,
    context: any,
    planningLevel: string,
    prioritizeExpiring: boolean
  ): Promise<MealSlot> {
    
    try {
      // Get recipe recommendations using existing smart recipe service
      const availableIngredients = context.available_ingredients.map((ing: any) => ing.ingredient_name);
      const expiringIngredients = prioritizeExpiring 
        ? context.expiring_ingredients.map((ing: any) => ing.ingredient_name)
        : [];

      const recipeRequest = {
        user_id: request.user_id,
        available_ingredients: availableIngredients,
        expiring_ingredients: expiringIngredients,
        meal_type: mealType,
        time_constraint: request.preferences?.cooking_time_limit || 45,
        difficulty_preference: (request.preferences?.difficulty_preference === 'challenging' ? 'hard' : 
                              request.preferences?.difficulty_preference === 'easy' ? 'easy' : 'medium') as 'easy' | 'medium' | 'hard',
        dietary_restrictions: request.dietary_restrictions || [],
      };

      const recommendations = await SmartRecipeIntelligenceService.getSmartRecommendations(recipeRequest);
      
      if (recommendations.length === 0) {
        // Fallback to simple meal suggestions
        return this.generateFallbackMeal(mealType, request, context);
      }

      const selectedRecipe = recommendations[0]; // Use top recommendation

      // Create meal slot from recipe
      const meal: MealSlot = {
        meal_type: mealType,
        recipe_id: selectedRecipe.recipe_id,
        recipe_name: selectedRecipe.recipe_name,
        recipe_source: 'smart_ai' as any,
        prep_time: selectedRecipe.prep_time || 15,
        cook_time: selectedRecipe.cook_time || 30,
        servings: 4, // Default servings
        difficulty: selectedRecipe.difficulty === 'hard' ? 'challenging' : selectedRecipe.difficulty,
        ingredients_needed: this.mapIngredientsToNeeds(
          selectedRecipe.available_ingredients || [],
          context.available_ingredients
        ),
        nutrition: {
          calories: 400, // Default nutrition values
          protein: 20,
          carbohydrates: 40,
          fat: 15,
          fiber: 5,
          sugar: 10,
          sodium: 500,
        },
        ai_reasoning: `Selected based on ${selectedRecipe.ingredient_match_percentage}% ingredient match, ${selectedRecipe.difficulty} difficulty, and ${selectedRecipe.prep_time + selectedRecipe.cook_time} minutes total time.`,
        confidence: selectedRecipe.confidence || 0.8,
      };

      return meal;

    } catch (error) {
      logger.error(`Generate meal slot error for ${mealType}:`, error);
      return this.generateFallbackMeal(mealType, request, context);
    }
  }

  /**
   * GENERATE FALLBACK MEAL
   * Simple meal suggestions when AI recommendations fail
   */
  private static generateFallbackMeal(
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
    request: MealPlanRequest,
    context: any
  ): MealSlot {
    
    const fallbackMeals = {
      breakfast: {
        name: 'Scrambled Eggs with Toast',
        prep_time: 5,
        cook_time: 10,
        ingredients: ['eggs', 'bread', 'butter'],
        calories: 350,
      },
      lunch: {
        name: 'Grilled Chicken Salad',
        prep_time: 10,
        cook_time: 15,
        ingredients: ['chicken breast', 'lettuce', 'tomatoes', 'olive oil'],
        calories: 400,
      },
      dinner: {
        name: 'Spaghetti with Marinara',
        prep_time: 10,
        cook_time: 20,
        ingredients: ['spaghetti', 'marinara sauce', 'ground beef', 'onion'],
        calories: 550,
      },
      snack: {
        name: 'Apple with Peanut Butter',
        prep_time: 2,
        cook_time: 0,
        ingredients: ['apple', 'peanut butter'],
        calories: 200,
      },
    };

    const fallback = fallbackMeals[mealType];

    return {
      meal_type: mealType,
      recipe_name: fallback.name,
      recipe_source: 'ai_suggested',
      prep_time: fallback.prep_time,
      cook_time: fallback.cook_time,
      servings: 2,
      difficulty: 'easy',
      ingredients_needed: this.mapIngredientsToNeeds(
        fallback.ingredients,
        context.available_ingredients
      ),
      nutrition: {
        calories: fallback.calories,
        protein: fallback.calories * 0.15 / 4, // Rough estimate
        carbohydrates: fallback.calories * 0.5 / 4,
        fat: fallback.calories * 0.35 / 9,
        fiber: 5,
        sugar: 10,
        sodium: 400,
      },
      ai_reasoning: 'Fallback meal suggestion due to limited recipe matches.',
      confidence: 0.6,
    };
  }

  /**
   * MAP INGREDIENTS TO NEEDS
   * Convert recipe ingredients to ingredient needs with inventory check
   */
  private static mapIngredientsToNeeds(
    recipeIngredients: string[],
    availableIngredients: any[]
  ): IngredientNeed[] {
    
    return recipeIngredients.map(ingredient => {
      const available = availableIngredients.find(avail => 
        avail.ingredient_name.toLowerCase().includes(ingredient.toLowerCase()) ||
        ingredient.toLowerCase().includes(avail.ingredient_name.toLowerCase())
      );

      const isExpiring = available && available.expiration_date && 
        new Date(available.expiration_date) <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

      return {
        ingredient_name: ingredient,
        quantity: 1, // Default quantity - would be parsed from recipe
        unit: 'piece',
        have_in_inventory: !!available,
        expiring_soon: !!isExpiring,
        estimated_cost: this.estimateIngredientCost(ingredient),
      };
    });
  }

  /**
   * GENERATE SHOPPING LIST
   * Create consolidated shopping list from all meals
   */
  private static generateShoppingList(
    dailyMeals: DailyMealPlan[],
    availableIngredients: any[]
  ): ShoppingListItem[] {
    
    const shoppingMap = new Map<string, ShoppingListItem>();

    // Collect all needed ingredients
    for (const day of dailyMeals) {
      for (const meal of day.meals) {
        for (const ingredient of meal.ingredients_needed) {
          if (!ingredient.have_in_inventory) {
            const key = ingredient.ingredient_name.toLowerCase();
            
            if (shoppingMap.has(key)) {
              const existing = shoppingMap.get(key)!;
              existing.total_quantity += ingredient.quantity;
              existing.used_in_meals.push(meal.recipe_name);
            } else {
              shoppingMap.set(key, {
                ingredient_name: ingredient.ingredient_name,
                total_quantity: ingredient.quantity,
                unit: ingredient.unit,
                estimated_cost: ingredient.estimated_cost,
                category: this.categorizeIngredient(ingredient.ingredient_name),
                priority: ingredient.expiring_soon ? 'high' : 'medium',
                used_in_meals: [meal.recipe_name],
              });
            }
          }
        }
      }
    }

    return Array.from(shoppingMap.values()).sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * GENERATE PREPARATION TIPS
   * Provide helpful tips for meal plan execution
   */
  private static generatePreparationTips(mealPlan: MealPlan, context: any): string[] {
    const tips: string[] = [];

    // Expiring ingredients tip
    if (context.expiring_ingredients.length > 0) {
      tips.push(`Use ${context.expiring_ingredients.map((ing: any) => ing.ingredient_name).join(', ')} first - they're expiring soon!`);
    }

    // Prep time optimization
    const totalPrepTime = mealPlan.daily_meals.reduce((sum, day) => sum + day.prep_time_total, 0);
    if (totalPrepTime > 300) { // More than 5 hours total
      tips.push('Consider meal prepping on weekends to save time during busy weekdays.');
    }

    // Shopping efficiency
    if (mealPlan.shopping_list.length > 15) {
      tips.push('Organize your shopping list by store sections (produce, dairy, meat) for efficient shopping.');
    }

    // Difficulty balance
    const avgDifficulty = mealPlan.daily_meals.reduce((sum, day) => sum + day.difficulty_rating, 0) / mealPlan.daily_meals.length;
    if (avgDifficulty > 2.5) {
      tips.push('This plan includes some challenging recipes. Consider preparing simpler alternatives if short on time.');
    }

    // Nutrition balance
    const avgCalories = mealPlan.nutrition_summary.calories / mealPlan.total_days;
    if (avgCalories > 2500) {
      tips.push('This meal plan is calorie-dense. Consider smaller portions or adding more vegetables.');
    }

    return tips;
  }

  /**
   * HELPER METHODS
   */
  private static addNutrition(target: NutritionSummary, source: NutritionSummary): void {
    target.calories += source.calories;
    target.protein += source.protein;
    target.carbohydrates += source.carbohydrates;
    target.fat += source.fat;
    target.fiber += source.fiber;
    target.sugar += source.sugar;
    target.sodium += source.sodium;
  }

  private static estimateIngredientCost(ingredient: string): number {
    // Simple cost estimation - in production, this would use real pricing data
    const costMap: { [key: string]: number } = {
      'chicken': 6.99,
      'beef': 8.99,
      'fish': 7.99,
      'eggs': 3.49,
      'milk': 3.99,
      'bread': 2.49,
      'rice': 1.99,
      'pasta': 1.49,
    };

    const lowerIngredient = ingredient.toLowerCase();
    for (const [key, cost] of Object.entries(costMap)) {
      if (lowerIngredient.includes(key)) {
        return cost;
      }
    }

    return 2.99; // Default estimate
  }

  private static categorizeIngredient(ingredient: string): string {
    const categories = {
      produce: ['apple', 'banana', 'tomato', 'lettuce', 'onion', 'carrot', 'potato'],
      dairy: ['milk', 'cheese', 'yogurt', 'butter', 'cream'],
      meat: ['chicken', 'beef', 'pork', 'fish', 'turkey'],
      pantry: ['rice', 'pasta', 'flour', 'sugar', 'oil', 'spices'],
      frozen: ['frozen', 'ice cream'],
    };

    const lowerIngredient = ingredient.toLowerCase();
    for (const [category, items] of Object.entries(categories)) {
      if (items.some(item => lowerIngredient.includes(item))) {
        return category;
      }
    }

    return 'other';
  }

  private static estimateMealPlanCost(shoppingList: ShoppingListItem[]): number {
    return shoppingList.reduce((total, item) => total + (item.estimated_cost || 0), 0);
  }

  private static getSeasonalPreferences(month: number): any {
    const seasons = {
      winter: [12, 1, 2],
      spring: [3, 4, 5],
      summer: [6, 7, 8],
      fall: [9, 10, 11],
    };

    for (const [season, months] of Object.entries(seasons)) {
      if (months.includes(month)) {
        return { season, preferences: this.getSeasonalIngredients(season) };
      }
    }

    return { season: 'unknown', preferences: [] };
  }

  private static getSeasonalIngredients(season: string): string[] {
    const seasonalIngredients = {
      winter: ['root vegetables', 'citrus', 'hearty stews', 'warm spices'],
      spring: ['fresh herbs', 'asparagus', 'peas', 'light salads'],
      summer: ['berries', 'tomatoes', 'grilled foods', 'fresh fruits'],
      fall: ['squash', 'apples', 'pumpkin', 'warming spices'],
    };

    return seasonalIngredients[season as keyof typeof seasonalIngredients] || [];
  }

  /**
   * SAVE MEAL PLAN
   * Store the generated meal plan in the database
   */
  private static async saveMealPlan(mealPlan: MealPlan): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Save main meal plan
      await client.query(`
        INSERT INTO ai_meal_plans 
        (plan_id, user_id, family_id, plan_name, start_date, end_date, total_days, 
         nutrition_summary, cost_estimate, preparation_tips, generated_at, ai_confidence)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        mealPlan.plan_id,
        mealPlan.user_id,
        mealPlan.family_id,
        mealPlan.plan_name,
        mealPlan.start_date,
        mealPlan.end_date,
        mealPlan.total_days,
        JSON.stringify(mealPlan.nutrition_summary),
        mealPlan.cost_estimate,
        JSON.stringify(mealPlan.preparation_tips),
        mealPlan.generated_at,
        mealPlan.ai_confidence
      ]);

      // Save daily meals
      for (const dailyPlan of mealPlan.daily_meals) {
        for (const meal of dailyPlan.meals) {
          await client.query(`
            INSERT INTO meal_plan_meals
            (plan_id, user_id, meal_date, meal_type, recipe_id, recipe_name, recipe_source,
             prep_time, cook_time, servings, difficulty, ingredients_needed, nutrition,
             ai_reasoning, confidence, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
          `, [
            mealPlan.plan_id,
            mealPlan.user_id,
            dailyPlan.date,
            meal.meal_type,
            meal.recipe_id,
            meal.recipe_name,
            meal.recipe_source,
            meal.prep_time,
            meal.cook_time,
            meal.servings,
            meal.difficulty,
            JSON.stringify(meal.ingredients_needed),
            JSON.stringify(meal.nutrition),
            meal.ai_reasoning,
            meal.confidence
          ]);
        }
      }

      // Save shopping list
      for (const item of mealPlan.shopping_list) {
        await client.query(`
          INSERT INTO meal_plan_shopping_items
          (plan_id, user_id, ingredient_name, total_quantity, unit, estimated_cost,
           category, priority, used_in_meals, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        `, [
          mealPlan.plan_id,
          mealPlan.user_id,
          item.ingredient_name,
          item.total_quantity,
          item.unit,
          item.estimated_cost,
          item.category,
          item.priority,
          JSON.stringify(item.used_in_meals)
        ]);
      }

      await client.query('COMMIT');
      logger.info(`Saved meal plan ${mealPlan.plan_id} for user ${mealPlan.user_id}`);

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Save meal plan error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * GET USER MEAL PLANS
   * Retrieve user's meal plans
   */
  static async getUserMealPlans(
    userId: string,
    limit: number = 10
  ): Promise<MealPlan[]> {
    
    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          plan_id, user_id, family_id, plan_name, start_date, end_date, total_days,
          nutrition_summary, cost_estimate, preparation_tips, generated_at, ai_confidence
        FROM ai_meal_plans
        WHERE user_id = $1
        ORDER BY generated_at DESC
        LIMIT $2
      `, [userId, limit]);

      const mealPlans: MealPlan[] = [];

      for (const planRow of result.rows) {
        // Get daily meals for this plan
        const mealsResult = await client.query(`
          SELECT 
            meal_date, meal_type, recipe_id, recipe_name, recipe_source,
            prep_time, cook_time, servings, difficulty, ingredients_needed,
            nutrition, ai_reasoning, confidence
          FROM meal_plan_meals
          WHERE plan_id = $1
          ORDER BY meal_date, 
            CASE meal_type 
              WHEN 'breakfast' THEN 1 
              WHEN 'lunch' THEN 2 
              WHEN 'dinner' THEN 3 
              ELSE 4 
            END
        `, [planRow.plan_id]);

        // Get shopping list for this plan
        const shoppingResult = await client.query(`
          SELECT 
            ingredient_name, total_quantity, unit, estimated_cost,
            category, priority, used_in_meals
          FROM meal_plan_shopping_items
          WHERE plan_id = $1
          ORDER BY priority DESC, category
        `, [planRow.plan_id]);

        // Group meals by date
        const dailyMealsMap = new Map<string, DailyMealPlan>();
        
        for (const mealRow of mealsResult.rows) {
          const dateKey = mealRow.meal_date;
          
          if (!dailyMealsMap.has(dateKey)) {
            dailyMealsMap.set(dateKey, {
              date: dateKey,
              day_of_week: new Date(dateKey).toLocaleDateString('en-US', { weekday: 'long' }),
              meals: [],
              daily_nutrition: {
                calories: 0,
                protein: 0,
                carbohydrates: 0,
                fat: 0,
                fiber: 0,
                sugar: 0,
                sodium: 0,
              },
              prep_time_total: 0,
              difficulty_rating: 0,
            });
          }

          const dailyPlan = dailyMealsMap.get(dateKey)!;
          const meal: MealSlot = {
            meal_type: mealRow.meal_type,
            recipe_id: mealRow.recipe_id,
            recipe_name: mealRow.recipe_name,
            recipe_source: mealRow.recipe_source,
            prep_time: mealRow.prep_time,
            cook_time: mealRow.cook_time,
            servings: mealRow.servings,
            difficulty: mealRow.difficulty,
            ingredients_needed: JSON.parse(mealRow.ingredients_needed || '[]'),
            nutrition: JSON.parse(mealRow.nutrition || '{}'),
            ai_reasoning: mealRow.ai_reasoning,
            confidence: mealRow.confidence,
          };

          dailyPlan.meals.push(meal);
          this.addNutrition(dailyPlan.daily_nutrition, meal.nutrition);
          dailyPlan.prep_time_total += meal.prep_time + meal.cook_time;
        }

        // Calculate difficulty ratings
        for (const dailyPlan of dailyMealsMap.values()) {
          dailyPlan.difficulty_rating = dailyPlan.meals.reduce((sum, meal) => {
            const difficultyScore = meal.difficulty === 'easy' ? 1 : meal.difficulty === 'medium' ? 2 : 3;
            return sum + difficultyScore;
          }, 0) / dailyPlan.meals.length;
        }

        const mealPlan: MealPlan = {
          plan_id: planRow.plan_id,
          user_id: planRow.user_id,
          family_id: planRow.family_id,
          plan_name: planRow.plan_name,
          start_date: planRow.start_date,
          end_date: planRow.end_date,
          total_days: planRow.total_days,
          daily_meals: Array.from(dailyMealsMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
          shopping_list: shoppingResult.rows.map(row => ({
            ingredient_name: row.ingredient_name,
            total_quantity: row.total_quantity,
            unit: row.unit,
            estimated_cost: row.estimated_cost,
            category: row.category,
            priority: row.priority,
            used_in_meals: JSON.parse(row.used_in_meals || '[]'),
          })),
          nutrition_summary: JSON.parse(planRow.nutrition_summary || '{}'),
          cost_estimate: planRow.cost_estimate,
          preparation_tips: JSON.parse(planRow.preparation_tips || '[]'),
          generated_at: planRow.generated_at,
          ai_confidence: planRow.ai_confidence,
        };

        mealPlans.push(mealPlan);
      }

      return mealPlans;

    } finally {
      client.release();
    }
  }
}