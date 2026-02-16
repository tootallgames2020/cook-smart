import AsyncStorage from '@react-native-async-storage/async-storage';
import {API_BASE_URL} from '../config/api';
import ingredientService from './ingredientService';

export interface Recipe {
  id: number;
  title: string;
  image: string;
  usedIngredientCount: number;
  missedIngredientCount: number;
  missedIngredients: MissedIngredient[];
  usedIngredients: UsedIngredient[];
  likes: number;
  provider?: string;
  // Comprehensive nutrition info from FatSecret
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  saturatedFat?: number;
  cholesterol?: number;
  // Ingredient match percentage for better sorting
  matchPercentage?: number;
}

export interface MissedIngredient {
  id: number;
  name: string;
  amount: number;
  unit: string;
  image: string;
}

export interface UsedIngredient {
  id: number;
  name: string;
  amount: number;
  unit: string;
  image: string;
}

export interface RecipeDetails {
  id: number;
  title: string;
  image: string;
  servings: number;
  readyInMinutes: number;
  sourceUrl: string;
  summary: string;
  cuisines: string[];
  dishTypes: string[];
  instructions: string;
  ingredients: string[]; // Array of ingredient strings
  ingredientsWithStatus?: Array<{
    name: string;
    hasIngredient: boolean;
  }>; // Backend-provided ingredient matching data
  matchPercentage?: number;
  matchedCount?: number;
  totalIngredients?: number;
  provider?: string;
  // Comprehensive nutrition info
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  saturatedFat?: number;
  cholesterol?: number;
}

export interface SavedRecipe {
  recipe: RecipeDetails;
  savedAt: string;
}

/**
 * Service for managing recipe search, retrieval, and local storage
 * Handles communication with the backend API and local AsyncStorage
 */
class RecipeService {
  /**
   * Retrieves the authentication token from AsyncStorage
   * @returns Promise<string> - The authentication token
   * @throws Error if no token is found
   * @private
   */
  private async getAuthToken(): Promise<string> {
    const token = await AsyncStorage.getItem('auth_token');
    if (!token) {
      throw new Error('No authentication token');
    }
    return token;
  }

  /**
   * Search for recipes based on available ingredients
   * If no ingredients provided, uses user's inventory from database
   * Results are sorted by match percentage (highest first)
   * 
   * @param ingredients - Array of ingredient names to search with
   * @param filters - Optional filters for the search
   * @param filters.maxCalories - Maximum calories per serving
   * @param filters.mealType - Type of meal (breakfast, lunch, dinner, etc.)
   * @returns Promise<Recipe[]> - Array of matching recipes sorted by match percentage
   * @throws Error if authentication fails or API request fails
   * 
   * @example
   * ```typescript
   * const recipes = await recipeService.searchByIngredients(
   *   ['chicken', 'rice', 'broccoli'],
   *   { maxCalories: 500, mealType: 'dinner' }
   * );
   * ```
   */
  async searchByIngredients(
    ingredients: string[],
    filters?: {maxCalories?: number; mealType?: string},
  ): Promise<Recipe[]> {
    const token = await this.getAuthToken();

    // If no ingredients provided, get user's ingredients from database
    let searchIngredients = ingredients;
    if (!ingredients || ingredients.length === 0) {
      try {
        const userIngredients = await ingredientService.getUserIngredients();
        searchIngredients = userIngredients.ingredients
          .map(ing => ing.ingredient_name || ing.name || '')
          .filter(name => name.length > 0);
        
      } catch (error) {
        searchIngredients = [];
      }
    }

    // Build query string
    const params = new URLSearchParams({
      ingredients: searchIngredients.join(','),
    });

    if (filters?.maxCalories) {
      params.append('maxCalories', filters.maxCalories.toString());
    }

    if (filters?.mealType) {
      params.append('mealType', filters.mealType);
    }

    const response = await fetch(
      `${API_BASE_URL}/api/v1/recipes/search?${params.toString()}`,
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
      throw new Error(data.error || 'Failed to search recipes');
    }

    // Map recipe_image to image for consistency and calculate match percentage
    const recipes = (data.recipes || []).map((recipe: Recipe) => {
      const totalIngredients = searchIngredients.length;
      const usedCount = recipe.usedIngredientCount || 0;
      const matchPercentage =
        totalIngredients > 0
          ? Math.round((usedCount / totalIngredients) * 100)
          : 0;
      return {
        ...recipe,
        image: recipe.image || '',
        matchPercentage,
      };
    });

    // Sort recipes by match percentage (highest first) for Recipe tab
    const sortedRecipes = recipes.sort((a: Recipe, b: Recipe) => {
      // Primary sort: match percentage (higher is better)
      const aMatch = a.matchPercentage || 0;
      const bMatch = b.matchPercentage || 0;
      if (aMatch !== bMatch) {
        return bMatch - aMatch;
      }

      // Secondary sort: fewer missing ingredients (lower is better)
      const aMissed = a.missedIngredientCount || 0;
      const bMissed = b.missedIngredientCount || 0;
      return aMissed - bMissed;
    });

    return sortedRecipes;
  }

  /**
   * Get detailed information about a specific recipe
   * 
   * @param recipeId - The unique identifier of the recipe (number or string)
   * @returns Promise<RecipeDetails> - Complete recipe information including ingredients and instructions
   * @throws Error if recipe not found or API request fails
   * 
   * @example
   * ```typescript
   * const recipe = await recipeService.getRecipeDetails(12345);
   * console.log(recipe.title, recipe.ingredients);
   * ```
   */
  async getRecipeDetails(recipeId: number | string): Promise<RecipeDetails> {
    try {
      const token = await this.getAuthToken();

      const url = `${API_BASE_URL}/api/v1/recipes/${recipeId}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      // Try to parse JSON response
      let data: { recipe?: RecipeDetails; error?: string; message?: string };
      try {
        data = await response.json();
      } catch (parseError) {
        throw new Error('Invalid response from server');
      }

      if (!response.ok) {
        throw new Error(
          data.error || data.message || 'Failed to fetch recipe details',
        );
      }

      if (!data.recipe) {
        throw new Error('Recipe not found');
      }

      return data.recipe;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Save a recipe to local storage for offline access
   * 
   * @param recipe - The complete recipe details to save
   * @returns Promise<void>
   * @throws Error if recipe is already saved
   * 
   * @example
   * ```typescript
   * await recipeService.saveRecipe(recipeDetails);
   * ```
   */
  async saveRecipe(recipe: RecipeDetails): Promise<void> {
    const savedRecipes = await this.getSavedRecipes();

    // Check if already saved
    if (savedRecipes.some(r => r.recipe.id === recipe.id)) {
      throw new Error('Recipe already saved');
    }

    const savedRecipe: SavedRecipe = {
      recipe,
      savedAt: new Date().toISOString(),
    };

    savedRecipes.push(savedRecipe);
    await AsyncStorage.setItem('saved_recipes', JSON.stringify(savedRecipes));
  }

  /**
   * Retrieve all recipes saved in local storage
   * 
   * @returns Promise<SavedRecipe[]> - Array of saved recipes with timestamps
   * 
   * @example
   * ```typescript
   * const saved = await recipeService.getSavedRecipes();
   * console.log(`You have ${saved.length} saved recipes`);
   * ```
   */
  async getSavedRecipes(): Promise<SavedRecipe[]> {
    const data = await AsyncStorage.getItem('saved_recipes');
    return data ? JSON.parse(data) : [];
  }

  /**
   * Remove a recipe from local storage
   * 
   * @param recipeId - The unique identifier of the recipe to delete
   * @returns Promise<void>
   * 
   * @example
   * ```typescript
   * await recipeService.deleteSavedRecipe(12345);
   * ```
   */
  async deleteSavedRecipe(recipeId: number): Promise<void> {
    const savedRecipes = await this.getSavedRecipes();
    const filtered = savedRecipes.filter(r => r.recipe.id !== recipeId);
    await AsyncStorage.setItem('saved_recipes', JSON.stringify(filtered));
  }

  /**
   * Check if a recipe is currently saved in local storage
   * 
   * @param recipeId - The unique identifier of the recipe
   * @returns Promise<boolean> - True if recipe is saved, false otherwise
   * 
   * @example
   * ```typescript
   * const isSaved = await recipeService.isRecipeSaved(12345);
   * if (isSaved) {
   *   console.log('Recipe is already saved');
   * }
   * ```
   */
  async isRecipeSaved(recipeId: number): Promise<boolean> {
    const savedRecipes = await this.getSavedRecipes();
    return savedRecipes.some(r => r.recipe.id === recipeId);
  }

  /**
   * Get recipe details by ID (convenience method for trending/seasonal recipes)
   * Returns null if recipe not found instead of throwing error
   * 
   * @param recipeId - The unique identifier of the recipe as a string
   * @returns Promise<RecipeDetails | null> - Recipe details or null if not found
   * 
   * @example
   * ```typescript
   * const recipe = await recipeService.getRecipeById('12345');
   * if (recipe) {
   *   console.log('Found recipe:', recipe.title);
   * }
   * ```
   */
  async getRecipeById(recipeId: string): Promise<RecipeDetails | null> {
    try {
      return await this.getRecipeDetails(parseInt(recipeId));
    } catch (error) {
      return null;
    }
  }
}

export default new RecipeService();
