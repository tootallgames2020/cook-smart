/**
 * Recipe API - Interface for FatSecret recipes via Cook Smart backend
 * Uses the same FatSecret API as the mobile app
 */

export interface Recipe {
  id: string;
  title: string;
  description: string;
  cookingTime: number;
  servings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  dietaryTags: string[];
  approved: boolean;
  featured: boolean;
  imageUrl: string;
  createdAt: Date;
  category?: string;
  cuisine?: string;
  instructions?: string[];
  ingredients?: Array<{ name: string; amount: string }>;
  youtubeUrl?: string;
  provider: string;
  // FatSecret specific fields
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  matchPercentage?: number;
  matchingIngredients?: string[];
  missingIngredients?: string[];
}

interface RecipeFilters {
  search?: string;
  category?: string;
  dietary?: string[];
  difficulty?: string;
  maxCookingTime?: number;
}

interface PaginatedRecipes {
  recipes: Recipe[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Cook Smart API base URL - same backend as mobile app
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.cooksmartapp.com';

// Cache for recipes
const recipeCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

function getCached<T>(key: string): T | null {
  const cached = recipeCache.get(key);
  if (!cached) return null;

  const isExpired = Date.now() - cached.timestamp > CACHE_TTL;
  if (isExpired) {
    recipeCache.delete(key);
    return null;
  }

  return cached.data as T;
}

function setCache(key: string, data: any): void {
  recipeCache.set(key, { data, timestamp: Date.now() });
}

/**
 * Fetch recipes from Cook Smart backend (FatSecret API)
 */
async function fetchRecipesFromBackend(filters: RecipeFilters = {}): Promise<Recipe[]> {
  const cacheKey = `backend:${JSON.stringify(filters)}`;
  const cached = getCached<Recipe[]>(cacheKey);
  if (cached) return cached;

  try {
    const params = new URLSearchParams();
    
    // Build ingredients string for search
    if (filters.search) {
      params.append('ingredients', filters.search);
    }
    if (filters.maxCookingTime) {
      params.append('maxCalories', (filters.maxCookingTime * 50).toString()); // Rough conversion
    }
    if (filters.category) {
      params.append('mealType', filters.category);
    }

    const response = await fetch(`${API_BASE_URL}/api/recipes/search?${params.toString()}`, {
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 300 }, // Revalidate every 5 minutes
    });

    if (!response.ok) {
      console.warn('Backend API failed:', response.status, response.statusText);
      return [];
    }

    const data = await response.json();
    const recipes = (data.recipes || []).map((r: any) => ({
      id: r.id,
      title: r.title || r.name,
      description: r.description || `${r.category || 'Recipe'} with ${r.servings || 4} servings`,
      cookingTime: r.cookingTime || r.cooking_time || 30,
      servings: r.servings || 4,
      difficulty: r.difficulty || 'medium',
      dietaryTags: r.dietaryTags || r.dietary_tags || [],
      approved: true,
      featured: r.featured || false,
      imageUrl: r.imageUrl || r.image_url || r.image || '',
      createdAt: new Date(),
      category: r.category,
      cuisine: r.cuisine,
      instructions: r.instructions || [],
      ingredients: r.ingredients || [],
      youtubeUrl: r.youtubeUrl || r.youtube_url,
      provider: r.provider || 'fatsecret',
      calories: r.calories,
      protein: r.protein,
      carbs: r.carbs,
      fat: r.fat,
      fiber: r.fiber,
      sugar: r.sugar,
      sodium: r.sodium,
      matchPercentage: r.matchPercentage,
      matchingIngredients: r.matchingIngredients,
      missingIngredients: r.missingIngredients,
    }));

    setCache(cacheKey, recipes);
    return recipes;
  } catch (error) {
    console.error('Backend API error:', error);
    return [];
  }
}

/**
 * Get trending/popular recipes from backend
 */
async function fetchTrendingRecipes(limit: number = 20): Promise<Recipe[]> {
  const cacheKey = `trending:${limit}`;
  const cached = getCached<Recipe[]>(cacheKey);
  if (cached) return cached;

  try {
    // Use common ingredients to get popular recipes
    const commonIngredients = ['chicken', 'beef', 'pasta', 'rice', 'tomato'];
    const response = await fetch(`${API_BASE_URL}/api/recipes/search?ingredients=${commonIngredients.join(',')}`, {
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 600 }, // Cache for 10 minutes
    });

    if (!response.ok) {
      console.warn('Trending recipes API failed');
      return [];
    }

    const data = await response.json();
    const recipes = (data.recipes || []).slice(0, limit).map((r: any) => ({
      id: r.id,
      title: r.title || r.name,
      description: r.description || `${r.category || 'Recipe'} with ${r.servings || 4} servings`,
      cookingTime: r.cookingTime || r.cooking_time || 30,
      servings: r.servings || 4,
      difficulty: r.difficulty || 'medium',
      dietaryTags: r.dietaryTags || r.dietary_tags || [],
      approved: true,
      featured: true, // Mark trending as featured
      imageUrl: r.imageUrl || r.image_url || r.image || '',
      createdAt: new Date(),
      category: r.category,
      cuisine: r.cuisine,
      instructions: r.instructions || [],
      ingredients: r.ingredients || [],
      youtubeUrl: r.youtubeUrl || r.youtube_url,
      provider: r.provider || 'fatsecret',
      calories: r.calories,
      protein: r.protein,
      carbs: r.carbs,
      fat: r.fat,
      fiber: r.fiber,
      sugar: r.sugar,
      sodium: r.sodium,
      matchPercentage: r.matchPercentage,
      matchingIngredients: r.matchingIngredients,
      missingIngredients: r.missingIngredients,
    }));

    setCache(cacheKey, recipes);
    return recipes;
  } catch (error) {
    console.error('Trending recipes error:', error);
    return [];
  }
}

/**
 * Apply filters to recipe list
 */
function applyFilters(recipes: Recipe[], filters: RecipeFilters): Recipe[] {
  let filtered = recipes;

  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter(r =>
      r.title.toLowerCase().includes(searchLower) ||
      r.description.toLowerCase().includes(searchLower)
    );
  }

  if (filters.category) {
    filtered = filtered.filter(r =>
      r.category?.toLowerCase() === filters.category?.toLowerCase()
    );
  }

  if (filters.dietary && filters.dietary.length > 0) {
    filtered = filtered.filter(r =>
      filters.dietary!.some(tag => r.dietaryTags.includes(tag))
    );
  }

  if (filters.difficulty) {
    filtered = filtered.filter(r => r.difficulty === filters.difficulty);
  }

  if (filters.maxCookingTime) {
    filtered = filtered.filter(r => r.cookingTime <= filters.maxCookingTime!);
  }

  return filtered;
}

export const recipeApi = {
  /**
   * Get all recipes with optional filters
   * Uses Cook Smart backend (FatSecret API) - same as mobile app
   */
  async getRecipes(filters: RecipeFilters = {}): Promise<Recipe[]> {
    // Get recipes from Cook Smart backend (FatSecret)
    const recipes = await fetchRecipesFromBackend(filters);
    
    // If no specific search, get trending recipes
    if (recipes.length === 0 && !filters.search) {
      return fetchTrendingRecipes(20);
    }

    // Apply additional client-side filters
    return applyFilters(recipes, filters);
  },

  /**
   * Get paginated recipes
   */
  async getPaginatedRecipes(
    page: number = 1,
    pageSize: number = 12,
    filters: RecipeFilters = {}
  ): Promise<PaginatedRecipes> {
    const allRecipes = await this.getRecipes(filters);

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const recipes = allRecipes.slice(start, end);

    return {
      recipes,
      total: allRecipes.length,
      page,
      pageSize,
      hasMore: end < allRecipes.length,
    };
  },

  /**
   * Get recipe by ID
   * Uses Cook Smart backend (FatSecret API)
   */
  async getRecipeById(id: string): Promise<Recipe | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/recipes/${id}`, {
        headers: { 'Content-Type': 'application/json' },
        next: { revalidate: 300 },
      });

      if (response.ok) {
        const data = await response.json();
        const recipe = data.recipe;
        
        if (!recipe) return null;

        return {
          id: recipe.id,
          title: recipe.title || recipe.name,
          description: recipe.description || `${recipe.category || 'Recipe'} with ${recipe.servings || 4} servings`,
          cookingTime: recipe.cookingTime || recipe.cooking_time || 30,
          servings: recipe.servings || 4,
          difficulty: recipe.difficulty || 'medium',
          dietaryTags: recipe.dietaryTags || recipe.dietary_tags || [],
          approved: true,
          featured: recipe.featured || false,
          imageUrl: recipe.imageUrl || recipe.image_url || recipe.image || '',
          createdAt: new Date(),
          category: recipe.category,
          cuisine: recipe.cuisine,
          instructions: recipe.instructions || [],
          ingredients: recipe.ingredients || [],
          youtubeUrl: recipe.youtubeUrl || recipe.youtube_url,
          provider: recipe.provider || 'fatsecret',
          calories: recipe.calories,
          protein: recipe.protein,
          carbs: recipe.carbs,
          fat: recipe.fat,
          fiber: recipe.fiber,
          sugar: recipe.sugar,
          sodium: recipe.sodium,
          matchPercentage: recipe.matchPercentage,
          matchingIngredients: recipe.matchingIngredients,
          missingIngredients: recipe.missingIngredients,
        };
      }
    } catch (error) {
      console.error('Recipe details error:', error);
    }

    return null;
  },

  /**
   * Get featured recipes
   */
  async getFeaturedRecipes(limit: number = 6): Promise<Recipe[]> {
    return fetchTrendingRecipes(limit);
  },

  /**
   * Get categories
   */
  async getCategories(): Promise<string[]> {
    // Common meal types from FatSecret
    return [
      'Breakfast',
      'Lunch', 
      'Dinner',
      'Snack',
      'Dessert',
      'Appetizer',
      'Side Dish',
      'Soup',
      'Salad',
      'Main Course'
    ];
  },

  /**
   * Search recipes
   */
  async searchRecipes(query: string): Promise<Recipe[]> {
    return this.getRecipes({ search: query });
  },

  /**
   * Clear all caches
   */
  clearCache(): void {
    recipeCache.clear();
  },
};

