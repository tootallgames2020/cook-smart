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

class MealPlanningService {
  private async getAuthHeaders(): Promise<Record<string, string>> {
    // Get auth token from storage
    const token = await this.getStoredToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  }

  private async getStoredToken(): Promise<string | null> {
    try {
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      return await AsyncStorage.default.getItem('auth_token');
    } catch (error) {
      console.error('Error getting stored token:', error);
      return null;
    }
  }

  async generateMealPlan(request: MealPlanRequest): Promise<MealPlan> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/meal-planning/generate`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate meal plan');
      }

      const data = await response.json();
      return data.meal_plan;
    } catch (error) {
      console.error('Generate meal plan error:', error);
      throw error;
    }
  }

  async getUserMealPlans(): Promise<MealPlan[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/meal-planning/plans`, {
        method: 'GET',
        headers: await this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get meal plans');
      }

      const data = await response.json();
      return data.meal_plans || [];
    } catch (error) {
      console.error('Get meal plans error:', error);
      throw error;
    }
  }

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