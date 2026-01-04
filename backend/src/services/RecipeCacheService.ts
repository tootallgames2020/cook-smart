import pool from '../config/database';
import FatSecretService from './FatSecretService';

const fatSecretService = new FatSecretService();

interface CachedRecipe {
  id: number;
  recipe_id: string;
  source: string;
  title: string;
  description: string;
  image_url: string;
  ready_in_minutes: number;
  servings: number;
  ingredients: any;
  instructions: string;
  nutrition: any;
  dietary_info: any;
  meal_type: string;
  cuisine: string;
  season: string;
  view_count: number;
  save_count: number;
  trending_score: number;
}

class RecipeCacheService {
  // ============================================
  // SEASONAL RECIPES
  // ============================================

  async fetchSeasonalRecipes(
    season: string,
    count: number = 50,
  ): Promise<void> {
    console.log(
      `[RecipeCache] Fetching ${count} seasonal recipes for ${season}...`,
    );

    try {
      const seasonalIngredients = this.getSeasonalIngredients(season);
      const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack', 'dessert'];

      for (const mealType of mealTypes) {
        const recipes = await fatSecretService.searchRecipesByIngredients(
          seasonalIngredients.slice(0, 3),
          Math.ceil(count / mealTypes.length)
        );

        for (const recipe of recipes) {
          // Fetch full recipe details including ingredients and instructions
          const fullRecipe = await fatSecretService.getRecipeDetails(
            recipe.id.toString()
          );
          if (fullRecipe) {
            await this.cacheRecipe(fullRecipe, 'fatsecret', season, true);
          } else {
            // Fallback to basic recipe if details fetch fails
            await this.cacheRecipe(recipe, 'fatsecret', season, true);
          }
        }
      }

      console.log(
        `[RecipeCache] Cached ${count} seasonal recipes for ${season}`,
      );
    } catch (error) {
      console.error('[RecipeCache] Seasonal fetch error:', error);
    }
  }

  async getSeasonalRecipes(
    season: string,
    limit: number = 20,
  ): Promise<CachedRecipe[]> {
    try {
      const result = await pool.query(
        `SELECT *, image_url as recipe_image FROM recipe_cache 
         WHERE season = $1 OR season = 'all'
         ORDER BY is_seasonal DESC, view_count DESC, trending_score DESC
         LIMIT $2`,
        [season, limit],
      );

      return result.rows;
    } catch (error) {
      console.error('[RecipeCache] Get seasonal error:', error);
      return [];
    }
  }

  async getSeasonalCacheAge(season: string): Promise<number | null> {
    try {
      const result = await pool.query(
        `SELECT MAX(updated_at) as last_update FROM recipe_cache 
         WHERE season = $1 AND is_seasonal = true`,
        [season],
      );

      if (result.rows[0]?.last_update) {
        const lastUpdate = new Date(result.rows[0].last_update);
        return Date.now() - lastUpdate.getTime();
      }

      return null;
    } catch (error) {
      console.error('[RecipeCache] Get seasonal cache age error:', error);
      return null;
    }
  }

  private getSeasonalIngredients(season: string): string[] {
    const seasonalMap: Record<string, string[]> = {
      spring: ['asparagus', 'peas', 'strawberries', 'artichokes', 'radishes'],
      summer: [
        'tomatoes',
        'corn',
        'zucchini',
        'berries',
        'peaches',
        'watermelon',
      ],
      fall: ['pumpkin', 'squash', 'apples', 'sweet potato', 'brussels sprouts'],
      winter: ['kale', 'cabbage', 'citrus', 'root vegetables', 'pomegranate'],
    };

    return seasonalMap[season] || [];
  }

  // ============================================
  // TRENDING RECIPES
  // ============================================

  async updateTrendingScores(): Promise<void> {
    console.log('[RecipeCache] Updating trending scores...');

    try {
      // Calculate trending score based on recent activity
      // Formula: (views * 1) + (saves * 3) + (shares * 5) with time decay
      await pool.query(`
        UPDATE recipe_cache
        SET trending_score = (
          (view_count * 1.0) + 
          (save_count * 3.0) + 
          (share_count * 5.0)
        ) * (
          CASE 
            WHEN updated_at > NOW() - INTERVAL '7 days' THEN 1.0
            WHEN updated_at > NOW() - INTERVAL '14 days' THEN 0.7
            WHEN updated_at > NOW() - INTERVAL '30 days' THEN 0.4
            ELSE 0.2
          END
        ),
        last_trending_update = NOW()
      `);

      console.log('[RecipeCache] Trending scores updated');
    } catch (error) {
      console.error('[RecipeCache] Update trending error:', error);
    }
  }

  async getTrendingRecipes(limit: number = 20): Promise<CachedRecipe[]> {
    try {
      const result = await pool.query(
        `SELECT * FROM recipe_cache 
         WHERE trending_score > 0
         ORDER BY trending_score DESC, view_count DESC
         LIMIT $1`,
        [limit],
      );

      return result.rows;
    } catch (error) {
      console.error('[RecipeCache] Get trending error:', error);
      return [];
    }
  }

  async getTrendingCacheAge(): Promise<number | null> {
    try {
      const result = await pool.query(
        `SELECT MAX(last_trending_update) as last_update FROM recipe_cache 
         WHERE trending_score > 0`,
      );

      if (result.rows[0]?.last_update) {
        const lastUpdate = new Date(result.rows[0].last_update);
        return Date.now() - lastUpdate.getTime();
      }

      return null;
    } catch (error) {
      console.error('[RecipeCache] Get trending cache age error:', error);
      return null;
    }
  }

  async fetchTrendingFromFatSecret(): Promise<void> {
    console.log('[RecipeCache] Fetching popular recipes from FatSecret...');

    try {
      // Fetch popular recipe categories
      const categories = ['dinner', 'dessert', 'breakfast', 'lunch'];

      for (const category of categories) {
        const recipes = await fatSecretService.searchRecipesByIngredients(
          [category], // Use category as ingredient search
          10
        );

        for (const recipe of recipes) {
          // Fetch full recipe details including ingredients and instructions
          const fullRecipe = await fatSecretService.getRecipeDetails(
            recipe.id.toString()
          );
          if (fullRecipe) {
            await this.cacheRecipe(fullRecipe, 'fatsecret', 'all', false);
          } else {
            // Fallback to basic recipe if details fetch fails
            await this.cacheRecipe(recipe, 'fatsecret', 'all', false);
          }
        }
      }

      console.log('[RecipeCache] Fetched popular recipes from FatSecret');
    } catch (error) {
      console.error('[RecipeCache] Fetch trending error:', error);
    }
  }

  // ============================================
  // CACHE MANAGEMENT
  // ============================================

  async cacheRecipe(
    recipe: any,
    source: string,
    season: string = 'all',
    isSeasonal: boolean = false,
  ): Promise<void> {
    try {
      const recipeId = `${source}_${recipe.recipe_id || recipe.id}`;

      // Parse ingredients
      const ingredients = this.parseIngredients(recipe);
      const instructions = this.parseInstructions(recipe);
      const nutrition = this.parseNutrition(recipe);
      const dietaryInfo = this.parseDietaryInfo(recipe);

      await pool.query(
        `INSERT INTO recipe_cache (
          recipe_id, source, title, description, image_url,
          ready_in_minutes, servings, ingredients, instructions,
          nutrition, dietary_info, meal_type, cuisine, season,
          is_seasonal, cache_priority
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (recipe_id) 
        DO UPDATE SET
          updated_at = CURRENT_TIMESTAMP,
          last_fetched_at = CURRENT_TIMESTAMP,
          is_seasonal = EXCLUDED.is_seasonal,
          season = EXCLUDED.season`,
        [
          recipeId,
          source,
          recipe.recipe_name || recipe.title || 'Untitled',
          recipe.recipe_description || recipe.summary || '',
          recipe.recipe_image || recipe.image || '',
          parseInt(recipe.cooking_time_min) || 30,
          parseInt(recipe.number_of_servings) || 4,
          JSON.stringify(ingredients),
          instructions,
          JSON.stringify(nutrition),
          JSON.stringify(dietaryInfo),
          recipe.recipe_types || 'dinner',
          recipe.cuisine || 'international',
          season,
          isSeasonal,
          isSeasonal ? 10 : 5,
        ],
      );
    } catch (error) {
      console.error('[RecipeCache] Cache recipe error:', error);
    }
  }

  async getRecipeById(recipeId: string): Promise<CachedRecipe | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM recipe_cache WHERE recipe_id = $1',
        [recipeId],
      );

      if (result.rows.length > 0) {
        // Increment view count
        await this.trackInteraction(recipeId, 'view');
        return result.rows[0];
      }

      return null;
    } catch (error) {
      console.error('[RecipeCache] Get by ID error:', error);
      return null;
    }
  }

  async searchCachedRecipes(
    query: string,
    filters: any = {},
  ): Promise<CachedRecipe[]> {
    try {
      let sql = 'SELECT * FROM recipe_cache WHERE 1=1';
      const params: any[] = [];
      let paramCount = 0;

      if (query) {
        paramCount++;
        sql += ` AND (title ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
        params.push(`%${query}%`);
      }

      if (filters.mealType) {
        paramCount++;
        sql += ` AND meal_type = $${paramCount}`;
        params.push(filters.mealType);
      }

      if (filters.season) {
        paramCount++;
        sql += ` AND (season = $${paramCount} OR season = 'all')`;
        params.push(filters.season);
      }

      sql += ' ORDER BY trending_score DESC, view_count DESC LIMIT 50';

      const result = await pool.query(sql, params);
      return result.rows;
    } catch (error) {
      console.error('[RecipeCache] Search error:', error);
      return [];
    }
  }

  // ============================================
  // USER INTERACTIONS
  // ============================================

  async trackInteraction(
    recipeId: string,
    interactionType: 'view' | 'save' | 'share' | 'rate' | 'cook',
    userId?: string,
    rating?: number,
  ): Promise<void> {
    try {
      // Track user interaction
      if (userId) {
        await pool.query(
          `INSERT INTO user_recipe_interactions (user_id, recipe_id, interaction_type, rating)
           VALUES ($1, $2, $3, $4)`,
          [userId, recipeId, interactionType, rating],
        );
      }

      // Update recipe cache metrics
      const updateField =
        interactionType === 'view'
          ? 'view_count'
          : interactionType === 'save'
            ? 'save_count'
            : interactionType === 'share'
              ? 'share_count'
              : null;

      if (updateField) {
        await pool.query(
          `UPDATE recipe_cache 
           SET ${updateField} = ${updateField} + 1, updated_at = CURRENT_TIMESTAMP
           WHERE recipe_id = $1`,
          [recipeId],
        );
      }

      if (interactionType === 'rate' && rating) {
        await pool.query(
          `UPDATE recipe_cache 
           SET rating_count = rating_count + 1,
               rating_average = ((rating_average * rating_count) + $2) / (rating_count + 1)
           WHERE recipe_id = $1`,
          [recipeId, rating],
        );
      }
    } catch (error) {
      console.error('[RecipeCache] Track interaction error:', error);
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private parseIngredients(recipe: any): any[] {
    if (!recipe.ingredients) return [];

    const ingredientList = Array.isArray(recipe.ingredients.ingredient)
      ? recipe.ingredients.ingredient
      : [recipe.ingredients.ingredient];

    return ingredientList.map((ing: any) => ({
      name: ing.ingredient_description || ing.food_name || '',
      amount: parseFloat(ing.number_of_units) || 1,
      unit: ing.measurement_description || '',
    }));
  }

  private parseInstructions(recipe: any): string {
    if (!recipe.directions || !recipe.directions.direction) return '';

    const directionList = Array.isArray(recipe.directions.direction)
      ? recipe.directions.direction
      : [recipe.directions.direction];

    return directionList
      .map(
        (d: any, index: number) =>
          `${index + 1}. ${d.direction_description || d}`,
      )
      .join('\n');
  }

  private parseNutrition(recipe: any): any {
    if (!recipe.serving_sizes?.serving) return null;

    const serving = recipe.serving_sizes.serving;
    return {
      calories: parseFloat(serving.calories) || 0,
      protein: parseFloat(serving.protein) || 0,
      carbs: parseFloat(serving.carbohydrate) || 0,
      fat: parseFloat(serving.fat) || 0,
    };
  }

  private parseDietaryInfo(recipe: any): any {
    const recipeTypes = recipe.recipe_types || '';
    const typesString =
      typeof recipeTypes === 'string' ? recipeTypes : String(recipeTypes);

    return {
      vegetarian: typesString.toLowerCase().includes('vegetarian') || false,
      vegan: typesString.toLowerCase().includes('vegan') || false,
      glutenFree: typesString.toLowerCase().includes('gluten') || false,
      dairyFree: typesString.toLowerCase().includes('dairy') || false,
    };
  }

  // ============================================
  // BACKGROUND JOBS
  // ============================================

  async runDailyMaintenance(): Promise<void> {
    console.log('[RecipeCache] Running daily maintenance...');

    try {
      // Update trending scores
      await this.updateTrendingScores();

      // Fetch seasonal recipes for current season
      const currentSeason = this.getCurrentSeason();
      await this.fetchSeasonalRecipes(currentSeason, 50);

      // Fetch popular recipes
      await this.fetchTrendingFromFatSecret();

      // Clean old low-priority recipes (keep cache under control)
      await pool.query(
        `DELETE FROM recipe_cache 
         WHERE cache_priority < 5 
         AND view_count < 10 
         AND created_at < NOW() - INTERVAL '90 days'`,
      );

      console.log('[RecipeCache] Daily maintenance complete');
    } catch (error) {
      console.error('[RecipeCache] Maintenance error:', error);
    }
  }

  private getCurrentSeason(): string {
    const month = new Date().getMonth() + 1;
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'fall';
    return 'winter';
  }
}

export default new RecipeCacheService();
