import axios from 'axios';
import crypto from 'crypto';
import { logger } from '../utils/logger';

export interface Recipe {
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
  ingredients: string[];
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  // Match percentage fields
  matchPercentage?: number;
  matchedIngredients?: string[];
  missingIngredients?: string[];
  totalIngredients?: number;
  matchedCount?: number;
}

export class FatSecretService {
  private clientId: string;
  private clientSecret: string;
  private baseUrl: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.clientId = process.env.FATSECRET_CLIENT_ID || '';
    this.clientSecret = process.env.FATSECRET_CLIENT_SECRET || '';
    this.baseUrl = process.env.FATSECRET_BASE_URL || 'https://platform.fatsecret.com/rest/server.api';
  }

  private async getAccessToken(): Promise<string> {
    try {
      // Check if we have a valid token
      if (this.accessToken && Date.now() < this.tokenExpiry) {
        return this.accessToken;
      }

      // Get new access token
      const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      
      const response = await axios.post(
        'https://oauth.fatsecret.com/connect/token',
        'grant_type=client_credentials&scope=premier',
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000; // 1 minute buffer

      logger.info('FatSecret access token obtained');
      return this.accessToken!;
    } catch (error) {
      logger.error('Failed to get FatSecret access token:', error);
      throw new Error('Failed to authenticate with FatSecret API');
    }
  }

  private async makeRequest(method: string, params: Record<string, any> = {}): Promise<any> {
    try {
      const token = await this.getAccessToken();
      
      const requestParams = {
        method,
        format: 'json',
        ...params,
      };

      const response = await axios.post(this.baseUrl, null, {
        params: requestParams,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    } catch (error) {
      logger.error(`FatSecret API error for method ${method}:`, error);
      throw error;
    }
  }

  async searchRecipesByIngredients(ingredients: string[], maxResults: number = 20): Promise<Recipe[]> {
    try {
      const searchQuery = ingredients.join(' ');
      
      const data = await this.makeRequest('recipes.search', {
        search_expression: searchQuery,
        max_results: maxResults,
      });

      // Parse actual FatSecret API response
      if (!data || !data.recipes || !data.recipes.recipe) {
        logger.warn('No recipes found in FatSecret response');
        return this.getFallbackRecipes(ingredients);
      }

      // Handle both single recipe and array of recipes
      const recipeArray = Array.isArray(data.recipes.recipe) 
        ? data.recipes.recipe 
        : [data.recipes.recipe];

      const recipes: Recipe[] = recipeArray.map((recipe: any) => ({
        id: parseInt(recipe.recipe_id) || 0,
        title: recipe.recipe_name || 'Unknown Recipe',
        image: recipe.recipe_image || 'https://via.placeholder.com/300x200',
        servings: parseInt(recipe.number_of_servings) || 4,
        readyInMinutes: parseInt(recipe.cooking_time_min) || 30,
        sourceUrl: recipe.recipe_url || '',
        summary: recipe.recipe_description || '',
        cuisines: recipe.recipe_types ? [recipe.recipe_types] : ['Unknown'],
        dishTypes: recipe.recipe_categories ? recipe.recipe_categories.split(',') : ['main course'],
        instructions: this.parseInstructions(recipe.directions),
        ingredients: this.parseIngredients(recipe.ingredients),
        calories: parseFloat(recipe.calories) || undefined,
        protein: parseFloat(recipe.protein) || undefined,
        carbs: parseFloat(recipe.carbohydrate) || undefined,
        fat: parseFloat(recipe.fat) || undefined,
        fiber: parseFloat(recipe.fiber) || undefined,
        sugar: parseFloat(recipe.sugar) || undefined,
        sodium: parseFloat(recipe.sodium) || undefined,
      }));

      logger.info(`FatSecret recipe search completed: ${recipes.length} recipes found for ingredients: ${ingredients.join(', ')}`);
      return recipes;
    } catch (error) {
      logger.error('Recipe search error:', error);
      
      // Return fallback recipes if API fails
      return this.getFallbackRecipes(ingredients);
    }
  }

  async getRecipeDetails(recipeId: string): Promise<any> {
    try {
      const data = await this.makeRequest('recipe.get', {
        recipe_id: recipeId,
      });

      // Parse actual FatSecret API response
      if (!data || !data.recipe) {
        logger.warn(`No recipe details found for ID: ${recipeId}`);
        return null;
      }

      const recipe = data.recipe;
      
      // Transform FatSecret response to our format
      const recipeDetails = {
        recipe_id: recipe.recipe_id,
        recipe_name: recipe.recipe_name || 'Unknown Recipe',
        recipe_image: recipe.recipe_image || 'https://via.placeholder.com/400x300',
        number_of_servings: recipe.number_of_servings || '4',
        cooking_time_min: recipe.cooking_time_min || '30',
        recipe_url: recipe.recipe_url || '',
        recipe_description: recipe.recipe_description || '',
        recipe_types: recipe.recipe_types || 'main course',
        ingredients: this.parseIngredientsForDetails(recipe.ingredients),
        directions: this.parseDirectionsForDetails(recipe.directions),
        calories: recipe.calories || '0',
        protein: recipe.protein || '0',
        carbohydrate: recipe.carbohydrate || '0',
        fat: recipe.fat || '0',
        fiber: recipe.fiber || '0',
        sugar: recipe.sugar || '0',
        sodium: recipe.sodium || '0',
        saturated_fat: recipe.saturated_fat || '0',
        cholesterol: recipe.cholesterol || '0'
      };

      logger.info(`FatSecret recipe details retrieved for ID: ${recipeId}`);
      return recipeDetails;
    } catch (error) {
      logger.error(`Recipe details error for ID ${recipeId}:`, error);
      return null;
    }
  }

  private getFallbackRecipes(ingredients: string[]): Recipe[] {
    // Fallback recipes when API is unavailable
    return [
      {
        id: 999,
        title: `Simple ${ingredients[0]} Recipe`,
        image: 'https://via.placeholder.com/300x200',
        servings: 4,
        readyInMinutes: 25,
        sourceUrl: 'https://cooksmartapp.com/recipes/fallback',
        summary: `A simple recipe using ${ingredients.join(', ')}`,
        cuisines: ['Home Cooking'],
        dishTypes: ['main course'],
        instructions: 'Basic cooking instructions for when the API is unavailable.',
        ingredients: ingredients.map(ing => `1 portion ${ing}`),
        calories: 200,
        protein: 10,
        carbs: 25,
        fat: 6,
      },
    ];
  }

  private parseInstructions(directions: any): string {
    if (!directions) return '';
    
    if (typeof directions === 'string') return directions;
    
    if (directions.direction) {
      if (Array.isArray(directions.direction)) {
        return directions.direction.join(' ');
      }
      return directions.direction;
    }
    
    return '';
  }

  private parseIngredients(ingredients: any): string[] {
    if (!ingredients) return [];
    
    let ingredientList: string[] = [];
    
    if (Array.isArray(ingredients)) {
      ingredientList = ingredients.map(ing => this.cleanIngredientName(ing));
    } else if (ingredients.ingredient) {
      if (Array.isArray(ingredients.ingredient)) {
        ingredientList = ingredients.ingredient.map((ing: any) => 
          this.cleanIngredientName(ing.ingredient_description || ing.food_name || ing.name || ing)
        );
      } else {
        const ing = ingredients.ingredient;
        ingredientList = [this.cleanIngredientName(ing.ingredient_description || ing.food_name || ing.name || ing)];
      }
    }
    
    return ingredientList.filter(ing => ing && ing.length > 0);
  }

  private cleanIngredientName(ingredient: string | any): string {
    if (typeof ingredient !== 'string') {
      if (ingredient?.ingredient_description) return this.cleanIngredientName(ingredient.ingredient_description);
      if (ingredient?.food_name) return this.cleanIngredientName(ingredient.food_name);
      if (ingredient?.name) return this.cleanIngredientName(ingredient.name);
      return '';
    }

    return ingredient
      .toLowerCase()
      .replace(/^\d+\s*(cups?|tbsp|tsp|oz|lbs?|grams?|kg|ml|l|pieces?|slices?|cloves?|medium|large|small|whole|fresh|dried|chopped|diced|minced|ground|shredded|grated|cooked|raw|organic|extra|virgin|unsalted|salted|fat-free|low-fat|non-fat|reduced|light|heavy|thick|thin|fine|coarse)\s*/gi, '')
      .replace(/\s*\([^)]*\)/g, '') // Remove parenthetical content
      .replace(/\s*,.*$/g, '') // Remove everything after first comma
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  private parseIngredientsForDetails(ingredients: any): { ingredient: string[] } {
    const parsedIngredients = this.parseIngredients(ingredients);
    return { ingredient: parsedIngredients };
  }

  private parseDirectionsForDetails(directions: any): { direction: string[] } {
    if (!directions) return { direction: [] };
    
    if (typeof directions === 'string') {
      return { direction: [directions] };
    }
    
    if (directions.direction) {
      if (Array.isArray(directions.direction)) {
        return { direction: directions.direction };
      }
      return { direction: [directions.direction] };
    }
    
    return { direction: [] };
  }

  async searchFoodByBarcode(barcode: string): Promise<any> {
    try {
      const data = await this.makeRequest('food.find_id_for_barcode', {
        barcode,
      });

      if (data && data.food_id) {
        // Get detailed food information
        const foodData = await this.makeRequest('food.get', {
          food_id: data.food_id,
        });

        return foodData;
      }

      return null;
    } catch (error) {
      logger.error(`Barcode search error for ${barcode}:`, error);
      return null;
    }
  }
}

export default FatSecretService;