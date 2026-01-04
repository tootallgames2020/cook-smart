/**
 * Recipe Provider Interface
 *
 * Defines the contract for all recipe API providers (Edamam, TheMealDB, etc.)
 * This allows easy switching between different recipe APIs while maintaining
 * consistent functionality throughout the application.
 */

export interface Recipe {
  id: string;
  title: string;
  image: string;
  servings: number;
  readyInMinutes: number;
  sourceUrl: string;
  summary: string;
  ingredients: string[];
  instructions: string;
  cuisines: string[];
  dishTypes: string[];
  diets: string[];
  nutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
    saturatedFat?: number;
    cholesterol?: number;
  };
  // Individual nutrition fields for easier access
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  saturatedFat?: number;
  cholesterol?: number;
  provider?: string;
  // Ingredient matching data for inventory-based search
  usedIngredientCount?: number;
  missedIngredientCount?: number;
  usedIngredients?: Array<{
    id: number;
    name: string;
    amount: number;
    unit: string;
    image: string;
  }>;
  missedIngredients?: Array<{
    id: number;
    name: string;
    amount: number;
    unit: string;
    image: string;
  }>;
  likes?: number;
  matchPercentage?: number; // Percentage of user ingredients that match this recipe
}

export interface RecipeDetails extends Recipe {
  extendedIngredients?: any[];
  analyzedInstructions?: any[];
}

export interface IRecipeProvider {
  /**
   * Search for recipes based on a list of ingredients
   * @param ingredients - Array of ingredient names
   * @param limit - Maximum number of recipes to return
   * @param options - Optional filters (maxCalories, mealType, etc.)
   * @returns Promise resolving to array of recipes
   */
  searchByIngredients(
    ingredients: string[],
    limit: number,
    options?: {maxCalories?: number; mealType?: string},
  ): Promise<Recipe[]>;

  /**
   * Get detailed information about a specific recipe
   * @param recipeId - Unique identifier for the recipe
   * @returns Promise resolving to detailed recipe information or null if not found
   */
  getRecipeDetails(recipeId: string): Promise<RecipeDetails | null>;

  /**
   * Check if the provider is currently available (within rate limits)
   * @returns Promise resolving to boolean indicating availability
   */
  isAvailable(): Promise<boolean>;

  /**
   * Get the name of the provider
   * @returns Provider name (e.g., 'Edamam', 'TheMealDB')
   */
  getProviderName(): string;
}
