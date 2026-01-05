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

class RecipeService {
  private async getAuthToken(): Promise<string> {
    const token = await AsyncStorage.getItem('auth_token');
    if (!token) {
      throw new Error('No authentication token');
    }
    return token;
  }

  // Search recipes by ingredients
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
        console.log(
          'Using user ingredients for search:',
          searchIngredients.slice(0, 5),
        );
      } catch (error) {
        console.error('Failed to get user ingredients:', error);
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
    const recipes = (data.recipes || []).map((recipe: any) => {
      const totalIngredients = searchIngredients.length;
      const usedCount = recipe.usedIngredientCount || 0;
      const matchPercentage =
        totalIngredients > 0
          ? Math.round((usedCount / totalIngredients) * 100)
          : 0;

      console.log(
        `Recipe "${recipe.title}" - Used: ${usedCount}/${totalIngredients} = ${matchPercentage}%`,
      );

      return {
        ...recipe,
        image: recipe.recipe_image || recipe.image_url || recipe.image || '',
        imageUrl:
          recipe.recipe_image || recipe.image_url || recipe.imageUrl || '',
        matchPercentage,
      };
    });

    // Sort recipes by match percentage (highest first) for Recipe tab
    const sortedRecipes = recipes.sort((a: any, b: any) => {
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

    console.log(
      'Recipe search results sorted by match percentage:',
      sortedRecipes.slice(0, 5).map((r: any) => ({
        title: r.title,
        matchPercentage: r.matchPercentage,
        used: r.usedIngredientCount,
        missed: r.missedIngredientCount,
        totalUserIngredients: searchIngredients.length,
      })),
    );

    console.log('Search ingredients used:', searchIngredients.slice(0, 10));

    return sortedRecipes.map((recipe: Recipe) => ({
      ...recipe,
      searchIngredients, // Include for debugging
    }));
  }

  // Get recipe details
  async getRecipeDetails(recipeId: number | string): Promise<RecipeDetails> {
    try {
      console.log('[RecipeService] Getting recipe details:', recipeId);
      const token = await this.getAuthToken();

      const url = `${API_BASE_URL}/api/v1/recipes/${recipeId}`;
      console.log('[RecipeService] Fetching from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('[RecipeService] Response status:', response.status);

      // Try to parse JSON response
      let data;
      try {
        data = await response.json();
        console.log('[RecipeService] Response data:', {
          hasRecipe: !!data.recipe,
          recipeId: data.recipe?.id,
          recipeTitle: data.recipe?.title,
        });
      } catch (parseError) {
        console.error('[RecipeService] JSON parse error:', parseError);
        throw new Error('Invalid response from server');
      }

      if (!response.ok) {
        console.error('[RecipeService] Error response:', data);
        throw new Error(
          data.error || data.message || 'Failed to fetch recipe details',
        );
      }

      if (!data.recipe) {
        console.error('[RecipeService] No recipe in response');
        throw new Error('Recipe not found');
      }

      // Map recipe_image to image for consistency
      const recipe = {
        ...data.recipe,
        image:
          data.recipe.recipe_image ||
          data.recipe.image_url ||
          data.recipe.image ||
          '',
        imageUrl:
          data.recipe.recipe_image ||
          data.recipe.image_url ||
          data.recipe.imageUrl ||
          '',
      };

      console.log('[RecipeService] Recipe details received:', {
        id: recipe.id,
        title: recipe.title,
        hasIngredientsWithStatus: !!recipe.ingredientsWithStatus,
        ingredientsWithStatusCount: recipe.ingredientsWithStatus?.length || 0,
        matchPercentage: recipe.matchPercentage,
        matchedCount: recipe.matchedCount,
        totalIngredients: recipe.totalIngredients,
      });

      return recipe;
    } catch (error) {
      console.error('[RecipeService] Error in getRecipeDetails:', error);
      throw error;
    }
  }

  // Save recipe locally
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

  // Get all saved recipes
  async getSavedRecipes(): Promise<SavedRecipe[]> {
    const data = await AsyncStorage.getItem('saved_recipes');
    return data ? JSON.parse(data) : [];
  }

  // Delete saved recipe
  async deleteSavedRecipe(recipeId: number): Promise<void> {
    const savedRecipes = await this.getSavedRecipes();
    const filtered = savedRecipes.filter(r => r.recipe.id !== recipeId);
    await AsyncStorage.setItem('saved_recipes', JSON.stringify(filtered));
  }

  // Check if recipe is saved
  async isRecipeSaved(recipeId: number): Promise<boolean> {
    const savedRecipes = await this.getSavedRecipes();
    return savedRecipes.some(r => r.recipe.id === recipeId);
  }

  // Get recipe by ID (for trending/seasonal)
  async getRecipeById(recipeId: string): Promise<RecipeDetails | null> {
    try {
      return await this.getRecipeDetails(parseInt(recipeId));
    } catch (error) {
      console.error('Error getting recipe:', error);
      return null;
    }
  }
}

export default new RecipeService();
