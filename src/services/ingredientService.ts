import AsyncStorage from '@react-native-async-storage/async-storage';
import {API_BASE_URL} from '../config/api';

export interface Ingredient {
  id: number;
  ingredient_id?: number;
  ingredient_name?: string;
  name?: string;
  category: string;
  quantity?: number;
  unit?: string;
  expiration_date?: string;
  added_at: string;
  photo_url?: string;
}

export interface CreateIngredientDto {
  ingredientId?: number;
  customName?: string;
  category?: string;
  quantity: number;
  unit: string;
  expirationDate?: string;
}

export interface UpdateIngredientDto {
  quantity?: number;
  unit?: string;
  expirationDate?: string;
  category?: string;
}

export interface GetIngredientsResponse {
  ingredients: Ingredient[];
  customIngredients: Ingredient[];
  total: number;
}

/**
 * Service for managing user's ingredient inventory
 * Handles CRUD operations for ingredients and category management
 */
class IngredientService {
  /**
   * Retrieves the authentication token from AsyncStorage
   * @returns Promise<string> - The authentication token
   * @throws Error if no token is found
   * @private
   */
  private async getAuthToken(): Promise<string> {
    const token = await AsyncStorage.getItem('auth_token');

    if (!token) {
      throw new Error('Authorization required. Please log in again.');
    }
    return token;
  }

  /**
   * Get all ingredients in the user's inventory
   * Returns both standard and custom ingredients
   * 
   * @returns Promise<GetIngredientsResponse> - User's ingredient inventory
   * @throws Error if authentication fails or API request fails
   * 
   * @example
   * ```typescript
   * const response = await ingredientService.getUserIngredients();
   * console.log(`You have ${response.total} ingredients`);
   * response.ingredients.forEach(ing => {
   *   console.log(`${ing.ingredient_name}: ${ing.quantity} ${ing.unit}`);
   * });
   * ```
   */
  async getUserIngredients(): Promise<GetIngredientsResponse> {
    const token = await this.getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/v1/ingredients`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        console.error('🚨 Authentication failed - token may be invalid or expired');
        throw new Error('Session expired. Please log in again.');
      }
      throw new Error(data.error || 'Failed to fetch ingredients');
    }

    // Transform the response to match expected format
    return {
      ingredients: data.ingredients || [],
      customIngredients: [],
      total: (data.ingredients || []).length,
    };
  }

  /**
   * Add a new ingredient to the user's inventory
   * Can add either a standard ingredient by ID or a custom ingredient by name
   * 
   * @param ingredientData - The ingredient information to add
   * @param ingredientData.ingredientId - ID of standard ingredient (optional)
   * @param ingredientData.customName - Name for custom ingredient (optional)
   * @param ingredientData.category - Ingredient category (optional)
   * @param ingredientData.quantity - Amount of ingredient
   * @param ingredientData.unit - Unit of measurement
   * @param ingredientData.expirationDate - Expiration date (optional)
   * @returns Promise<Ingredient> - The created ingredient
   * @throws Error if API request fails
   * 
   * @example
   * ```typescript
   * const ingredient = await ingredientService.addIngredient({
   *   ingredientId: 123,
   *   quantity: 2,
   *   unit: 'cups',
   *   expirationDate: '2026-03-01'
   * });
   * ```
   */
  async addIngredient(
    ingredientData: CreateIngredientDto,
  ): Promise<Ingredient> {
    const token = await this.getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/v1/ingredients`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ingredientData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to add ingredient');
    }

    // Handle both data.ingredient and direct ingredient response
    const ingredient = data.ingredient || data;

    if (!ingredient || !ingredient.id) {
      console.error('Invalid ingredient response:', data);
      throw new Error('Invalid response from server');
    }

    return ingredient;
  }

  /**
   * Update an existing ingredient in the user's inventory
   * 
   * @param id - The unique identifier of the ingredient to update
   * @param updates - The fields to update
   * @param updates.quantity - New quantity (optional)
   * @param updates.unit - New unit of measurement (optional)
   * @param updates.expirationDate - New expiration date (optional)
   * @param updates.category - New category (optional)
   * @returns Promise<Ingredient> - The updated ingredient
   * @throws Error if API request fails
   * 
   * @example
   * ```typescript
   * const updated = await ingredientService.updateIngredient(123, {
   *   quantity: 1.5,
   *   unit: 'lbs'
   * });
   * ```
   */
  async updateIngredient(
    id: number,
    updates: UpdateIngredientDto,
  ): Promise<Ingredient> {
    const token = await this.getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/v1/ingredients/${id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to update ingredient');
    }

    return data.ingredient;
  }

  /**
   * Remove an ingredient from the user's inventory
   * 
   * @param id - The unique identifier of the ingredient to delete
   * @returns Promise<void>
   * @throws Error if API request fails
   * 
   * @example
   * ```typescript
   * await ingredientService.deleteIngredient(123);
   * console.log('Ingredient deleted successfully');
   * ```
   */
  async deleteIngredient(id: number): Promise<void> {
    const token = await this.getAuthToken();
    const url = `${API_BASE_URL}/api/v1/ingredients/${id}`;
    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        const data = await response.json();
        console.error('❌ Delete failed:', data);
        throw new Error(data.error || 'Failed to delete ingredient');
      }
    } catch (error) {
      console.error('❌ Delete error:', error);
      throw error;
    }
  }

  /**
   * Search for ingredients by name
   * Returns matching ingredients from the database
   * 
   * @param query - The search term to match against ingredient names
   * @returns Promise<Ingredient[]> - Array of matching ingredients
   * @throws Error if API request fails
   * 
   * @example
   * ```typescript
   * const results = await ingredientService.searchIngredients('chicken');
   * results.forEach(ing => console.log(ing.ingredient_name));
   * ```
   */
  async searchIngredients(query: string): Promise<Ingredient[]> {
    const token = await this.getAuthToken();

    const response = await fetch(
      `${API_BASE_URL}/api/v1/ingredients/search?q=${encodeURIComponent(query)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to search ingredients');
    }

    return data.ingredients || [];
  }

  /**
   * Automatically categorize ingredients that are missing categories
   * Uses AI to assign appropriate categories to uncategorized ingredients
   * 
   * @returns Promise<{success: boolean; message: string; updated: any[]}> - Result of categorization
   * @throws Error if API request fails
   * 
   * @example
   * ```typescript
   * const result = await ingredientService.fixUncategorizedIngredients();
   * console.log(`Fixed ${result.updated.length} ingredients`);
   * ```
   */
  async fixUncategorizedIngredients(): Promise<{success: boolean; message: string; updated: any[]}> {
    const token = await this.getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/v1/ingredients/fix-categories`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fix categories');
    }
    return data;
  }

  /**
   * Get all available ingredient categories
   * Returns categories with their icons for UI display
   * 
   * @returns Promise<Array<{id: string; name: string; icon: string}>> - Array of categories
   * @throws Error if API request fails
   * 
   * @example
   * ```typescript
   * const categories = await ingredientService.getCategories();
   * categories.forEach(cat => {
   *   console.log(`${cat.icon} ${cat.name}`);
   * });
   * ```
   */
  async getCategories(): Promise<Array<{id: string; name: string; icon: string}>> {
    const token = await this.getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/v1/ingredients/categories`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch categories');
    }

    return data.categories || [];
  }
}

export default new IngredientService();
