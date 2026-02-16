import { API_BASE_URL } from '../config/api';

export interface MealPlan {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  plan_duration_days: number;
  meals: Meal[];
  shopping_list: ShoppingItem[];
  nutrition_summary: NutritionSummary;
  created_at: string;
}

export interface Meal {
  id: string;
  day: number;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  recipe_id?: string;
  recipe_name: string;
  estimated_prep_time: number;
  nutrition: NutritionSummary;
  ingredients_needed: string[];
}

export interface ShoppingItem {
  ingredient: string;
  quantity: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  estimated_cost?: number;
}

export interface NutritionSummary {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
}

export interface MealPlanRequest {
  plan_duration_days: number;
  dietary_restrictions: string[];
  target_nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  preferences?: {
    cuisine_types: string[];
    cooking_skill_level: string;
    max_prep_time: number;
    budget_per_meal: number;
  };
}

export interface MealPlanShoppingList {
  items: ShoppingItem[];
  total_estimated_cost: number;
  categories: string[];
}

/**
 * Service for AI-powered meal planning and shopping list generation
 * Creates personalized meal plans based on dietary needs and preferences
 */
class MealPlanningService {
  /**
   * Get authentication headers for API requests
   * @returns Promise<Record<string, string>> - Headers with auth token
   * @private
   */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    // Get auth token from storage
    const token = await this.getStoredToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  }

  /**
   * Retrieve stored authentication token
   * @returns Promise<string | null> - Auth token or null
   * @private
   */
  private async getStoredToken(): Promise<string | null> {
    try {
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      return await AsyncStorage.default.getItem('auth_token');
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate a personalized meal plan using AI
   * Creates a complete meal plan with recipes, nutrition info, and shopping list
   * 
   * @param request - Meal plan generation parameters
   * @param request.plan_duration_days - Number of days to plan for
   * @param request.dietary_restrictions - Array of dietary restrictions
   * @param request.target_nutrition - Target nutrition goals
   * @param request.preferences - Optional preferences (cuisine, skill level, budget)
   * @returns Promise<MealPlan> - Generated meal plan with all details
   * @throws Error if generation fails
   * 
   * @example
   * ```typescript
   * const mealPlan = await mealPlanningService.generateMealPlan({
   *   plan_duration_days: 7,
   *   dietary_restrictions: ['vegetarian', 'gluten-free'],
   *   target_nutrition: {
   *     calories: 2000,
   *     protein: 100,
   *     carbs: 250,
   *     fat: 65
   *   },
   *   preferences: {
   *     cuisine_types: ['Italian', 'Mexican'],
   *     cooking_skill_level: 'intermediate',
   *     max_prep_time: 45,
   *     budget_per_meal: 15
   *   }
   * });
   * console.log(`Plan created with ${mealPlan.meals.length} meals`);
   * ```
   */
  async generateMealPlan(request: MealPlanRequest): Promise<MealPlan> {
    try {

      const response = await fetch(`${API_BASE_URL}/api/v1/meal-planning/generate`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify(request),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || data.details || 'Failed to generate meal plan');
      }

      return data.meal_plan;
    } catch (error) {
      console.error('Generate meal plan error:', error);
      throw error;
    }
  }

  /**
   * Get all meal plans for the current user
   * Returns empty array if no plans exist or on error
   * 
   * @returns Promise<MealPlan[]> - Array of user's meal plans
   * 
   * @example
   * ```typescript
   * const plans = await mealPlanningService.getUserMealPlans();
   * plans.forEach(plan => {
   *   console.log(`${plan.name}: ${plan.plan_duration_days} days`);
   * });
   * ```
   */
  async getUserMealPlans(): Promise<MealPlan[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/meal-planning/plans`, {
        method: 'GET',
        headers: await this.getAuthHeaders(),
      });

      if (!response.ok) {
        // Return empty array instead of throwing error
        return [];
      }

      const data = await response.json();
      return data.meal_plans || [];
    } catch (error) {
      console.error('Get meal plans error:', error);
      // Return empty array instead of throwing
      return [];
    }
  }

  /**
   * Delete a meal plan
   * 
   * @param planId - The unique identifier of the meal plan to delete
   * @returns Promise<void>
   * @throws Error if deletion fails
   * 
   * @example
   * ```typescript
   * await mealPlanningService.deleteMealPlan('plan-123');
   * console.log('Meal plan deleted');
   * ```
   */
  async deleteMealPlan(planId: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/meal-planning/plans/${planId}`, {
        method: 'DELETE',
        headers: await this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete meal plan');
      }
    } catch (error) {
      console.error('Delete meal plan error:', error);
      throw error;
    }
  }

  /**
   * Get the shopping list for a specific meal plan
   * Includes all ingredients needed with quantities and estimated costs
   * 
   * @param planId - The unique identifier of the meal plan
   * @returns Promise<MealPlanShoppingList> - Shopping list with items and cost estimate
   * @throws Error if request fails
   * 
   * @example
   * ```typescript
   * const shoppingList = await mealPlanningService.getMealPlanShoppingList('plan-123');
   * console.log(`Total cost: $${shoppingList.total_estimated_cost}`);
   * shoppingList.items.forEach(item => {
   *   console.log(`${item.ingredient}: ${item.quantity} (${item.priority})`);
   * });
   * ```
   */
  async getMealPlanShoppingList(planId: string): Promise<MealPlanShoppingList> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/meal-planning/plans/${planId}/shopping-list`, {
        method: 'GET',
        headers: await this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get shopping list');
      }

      const data = await response.json();
      return data.shopping_list;
    } catch (error) {
      console.error('Get shopping list error:', error);
      throw error;
    }
  }

  /**
   * Update an existing meal plan
   * Can modify meals, dates, or other plan properties
   * 
   * @param planId - The unique identifier of the meal plan to update
   * @param updates - Partial meal plan object with fields to update
   * @returns Promise<MealPlan> - Updated meal plan
   * @throws Error if update fails
   * 
   * @example
   * ```typescript
   * const updated = await mealPlanningService.updateMealPlan('plan-123', {
   *   name: 'Updated Weekly Plan',
   *   end_date: '2026-03-01'
   * });
   * console.log('Plan updated:', updated.name);
   * ```
   */
  async updateMealPlan(planId: string, updates: Partial<MealPlan>): Promise<MealPlan> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/meal-planning/plans/${planId}`, {
        method: 'PUT',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update meal plan');
      }

      const data = await response.json();
      return data.meal_plan;
    } catch (error) {
      console.error('Update meal plan error:', error);
      throw error;
    }
  }
}

export const mealPlanningService = new MealPlanningService();