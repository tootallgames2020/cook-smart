/**
 * TheMealDB API Client
 * Free recipe API integration with caching
 * https://www.themealdb.com/api.php
 */

interface MealDBRecipe {
  idMeal: string;
  strMeal: string;
  strCategory: string;
  strArea: string;
  strInstructions: string;
  strMealThumb: string;
  strTags: string | null;
  strYoutube: string;
  [key: string]: string | null;
}

interface Recipe {
  id: string;
  name: string;
  description: string;
  cookingTime: number;
  servings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  dietaryTags: string[];
  approved: boolean;
  featured: boolean;
  imageUrl: string;
  createdAt: Date;
  category: string;
  cuisine: string;
  instructions: string[];
  ingredients: Array<{ name: string; amount: string }>;
  youtubeUrl?: string;
  source: 'themealdb' | 'internal';
}

// In-memory cache with TTL
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

function getCached<T>(key: string): T | null {
  const cached = cache.get(key);
  if (!cached) return null;

  const isExpired = Date.now() - cached.timestamp > CACHE_TTL;
  if (isExpired) {
    cache.delete(key);
    return null;
  }

  return cached.data as T;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

function estimateCookingTime(instructions: string): number {
  const words = instructions.split(' ').length;
  // Rough estimate: 200 words = 30 minutes
  return Math.max(15, Math.min(120, Math.round((words / 200) * 30)));
}

function estimateDifficulty(instructions: string): 'easy' | 'medium' | 'hard' {
  const steps = instructions.split('.').filter(s => s.trim().length > 10).length;
  if (steps <= 5) return 'easy';
  if (steps <= 10) return 'medium';
  return 'hard';
}

function extractDietaryTags(tags: string | null, category: string): string[] {
  const dietaryTags: string[] = [];
  const tagStr = (tags || '').toLowerCase();
  const categoryStr = category.toLowerCase();

  if (tagStr.includes('vegetarian') || categoryStr.includes('vegetarian')) {
    dietaryTags.push('vegetarian');
  }
  if (tagStr.includes('vegan') || categoryStr.includes('vegan')) {
    dietaryTags.push('vegan');
  }
  if (categoryStr.includes('seafood') || categoryStr.includes('fish')) {
    dietaryTags.push('pescatarian');
  }
  if (tagStr.includes('gluten') || categoryStr.includes('pasta')) {
    // Note: Most meals contain gluten, we'd need more specific data
  }

  return dietaryTags;
}

function transformMealDBRecipe(meal: MealDBRecipe): Recipe {
  // Extract ingredients
  const ingredients: Array<{ name: string; amount: string }> = [];
  for (let i = 1; i <= 20; i++) {
    const ingredient = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];
    if (ingredient && ingredient.trim()) {
      ingredients.push({
        name: ingredient.trim(),
        amount: measure?.trim() || '',
      });
    }
  }

  // Split instructions into steps
  const instructions = meal.strInstructions
    .split(/\r?\n/)
    .filter(step => step.trim().length > 0)
    .map(step => step.trim());

  return {
    id: meal.idMeal,
    name: meal.strMeal,
    description: `${meal.strCategory} dish from ${meal.strArea} cuisine`,
    cookingTime: estimateCookingTime(meal.strInstructions),
    servings: 4, // Default, TheMealDB doesn't provide this
    difficulty: estimateDifficulty(meal.strInstructions),
    dietaryTags: extractDietaryTags(meal.strTags, meal.strCategory),
    approved: true,
    featured: false,
    imageUrl: meal.strMealThumb,
    createdAt: new Date(),
    category: meal.strCategory,
    cuisine: meal.strArea,
    instructions,
    ingredients,
    youtubeUrl: meal.strYoutube || undefined,
    source: 'themealdb',
  };
}

export const themealdb = {
  /**
   * Search recipes by name
   */
  async searchByName(query: string): Promise<Recipe[]> {
    const cacheKey = `search:${query}`;
    const cached = getCached<Recipe[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(
        `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`
      );
      const data = await response.json();

      if (!data.meals) return [];

      const recipes = data.meals.map(transformMealDBRecipe);
      setCache(cacheKey, recipes);
      return recipes;
    } catch (error) {
      console.error('TheMealDB search error:', error);
      return [];
    }
  },

  /**
   * Get recipe by ID
   */
  async getById(id: string): Promise<Recipe | null> {
    const cacheKey = `recipe:${id}`;
    const cached = getCached<Recipe>(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(
        `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`
      );
      const data = await response.json();

      if (!data.meals || data.meals.length === 0) return null;

      const recipe = transformMealDBRecipe(data.meals[0]);
      setCache(cacheKey, recipe);
      return recipe;
    } catch (error) {
      console.error('TheMealDB getById error:', error);
      return null;
    }
  },

  /**
   * Get random recipes
   */
  async getRandom(count: number = 10): Promise<Recipe[]> {
    const recipes: Recipe[] = [];
    const promises: Promise<Recipe | null>[] = [];

    for (let i = 0; i < count; i++) {
      promises.push(
        fetch('https://www.themealdb.com/api/json/v1/1/random.php')
          .then(res => res.json())
          .then(data => data.meals ? transformMealDBRecipe(data.meals[0]) : null)
          .catch(() => null)
      );
    }

    const results = await Promise.all(promises);
    return results.filter((r): r is Recipe => r !== null);
  },

  /**
   * Get recipes by category
   */
  async getByCategory(category: string): Promise<Recipe[]> {
    const cacheKey = `category:${category}`;
    const cached = getCached<Recipe[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(
        `https://www.themealdb.com/api/json/v1/1/filter.php?c=${encodeURIComponent(category)}`
      );
      const data = await response.json();

      if (!data.meals) return [];

      // Filter endpoint returns limited data, need to fetch full details
      const detailPromises = data.meals.slice(0, 20).map((meal: { idMeal: string }) =>
        this.getById(meal.idMeal)
      );

      const recipes = await Promise.all(detailPromises);
      const validRecipes = recipes.filter((r): r is Recipe => r !== null);

      setCache(cacheKey, validRecipes);
      return validRecipes;
    } catch (error) {
      console.error('TheMealDB category error:', error);
      return [];
    }
  },

  /**
   * Get all categories
   */
  async getCategories(): Promise<string[]> {
    const cacheKey = 'categories';
    const cached = getCached<string[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(
        'https://www.themealdb.com/api/json/v1/1/categories.php'
      );
      const data = await response.json();

      if (!data.categories) return [];

      const categories = data.categories.map((cat: { strCategory: string }) => cat.strCategory);
      setCache(cacheKey, categories);
      return categories;
    } catch (error) {
      console.error('TheMealDB categories error:', error);
      return [];
    }
  },

  /**
   * Clear cache (useful for testing or manual refresh)
   */
  clearCache(): void {
    cache.clear();
  },
};

