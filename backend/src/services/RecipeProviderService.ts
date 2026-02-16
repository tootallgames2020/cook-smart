/**
 * Recipe Provider Service - Orchestrator for multiple recipe API providers
 * 
 * Manages recipe API providers with automatic fallback and intelligent caching.
 * Implements cache-first strategy to minimize API calls and costs.
 * 
 * Architecture:
 * - Primary provider: FatSecret (500K calls/month free)
 * - Fallback providers: Additional providers if configured
 * - Cache layer: PostgreSQL for result caching
 * - Rate limiting: Automatic provider switching on limits
 * 
 * Flow:
 * 1. Check cache for existing results
 * 2. Try primary provider (FatSecret)
 * 3. Try fallback providers if primary fails
 * 4. Return cached results if all providers fail
 * 
 * @example
 * ```typescript
 * const service = new RecipeProviderService([fatSecretProvider, themealdbProvider]);
 * const recipes = await service.searchByIngredients(['chicken', 'rice'], 10);
 * ```
 */
export class RecipeProviderService {
  private providers: IRecipeProvider[];
  private primaryProvider: IRecipeProvider;
  private fallbackProviders: IRecipeProvider[];
  private lastUsedProvider: string = '';

  /**
   * Initialize the recipe provider service with configured providers
   * First provider in array becomes the primary provider
   * 
   * @param providers - Array of recipe providers (at least one required)
   * @throws Error if no providers are configured
   * 
   * @example
   * ```typescript
   * const service = new RecipeProviderService([
   *   new FatSecretService(),
   *   new TheMealDBService()
   * ]);
   * ```
   */
  constructor(providers: IRecipeProvider[]) {
    if (providers.length === 0) {
      throw new Error('At least one recipe provider must be configured');
    }

    this.providers = providers;
    this.primaryProvider = providers[0]!; // Non-null assertion since we checked length
    this.fallbackProviders = providers.slice(1);
  }

  /**
   * Search for recipes by ingredients with intelligent provider fallback
   * Uses cache-first strategy for non-ingredient searches
   * Forces fresh API calls for ingredient searches to ensure accurate matching
   * 
   * @param ingredients - Array of ingredient names to search for
   * @param limit - Maximum number of recipes to return (default: 10)
   * @param options - Optional search filters
   * @param options.maxCalories - Maximum calories per serving
   * @param options.mealType - Type of meal (breakfast, lunch, dinner, snack)
   * @returns Promise<Recipe[]> - Array of matching recipes or empty array if all providers fail
   * 
   * @example
   * ```typescript
   * // Basic search
   * const recipes = await service.searchByIngredients(['chicken', 'rice'], 10);
   * 
   * // With filters
   * const healthyRecipes = await service.searchByIngredients(
   *   ['chicken', 'broccoli'],
   *   20,
   *   { maxCalories: 500, mealType: 'dinner' }
   * );
   * ```
   */
  async searchByIngredients(
    ingredients: string[],
    limit: number = 10,
    options?: {maxCalories?: number; mealType?: string},
  ): Promise<Recipe[]> {
    // Generate cache key including filters
    const cacheKey = this.generateCacheKey(ingredients, options);

    // SKIP CACHE for ingredient searches to ensure fresh matching calculations
    // Cached recipes don't have proper ingredient matching data
    console.log(
      `⏭️  Skipping cache for ingredient search to ensure fresh matching`,
    );

    // Step 1: Check cache first (DISABLED for ingredient matching)
    // The cache-first strategy was causing 0% matches because cached recipes
    // don't have proper ingredient matching calculations
    // try {
    //   const cached = await this.checkCache(cacheKey);
    //   if (cached && cached.length > 0) {
    //     console.log(`✅ Cache HIT for ingredient search: ${cacheKey}`);
    //     return cached;
    //   }
    // } catch (cacheError) {
    //   console.log(
    //     `⚠️  Cache check failed, continuing to API:`,
    //     (cacheError as Error).message,
    //   );
    // }

    console.log(
      `⏭️  Forcing fresh API call for ingredient search: ${cacheKey}`,
    );

    // Step 2: Try primary provider
    try {
      if (await this.primaryProvider.isAvailable()) {
        console.log(
          `🔍 Trying primary provider: ${this.primaryProvider.getProviderName()}`,
        );
        const startTime = Date.now();

        try {
          console.log(
            `🔍 Calling ${this.primaryProvider.getProviderName()}.searchByIngredients with:`,
            {ingredients: ingredients.slice(0, 5), limit, options},
          );

          const results = await this.primaryProvider.searchByIngredients(
            ingredients,
            limit,
            options,
          );
          const responseTime = Date.now() - startTime;

          console.log(
            `📊 ${this.primaryProvider.getProviderName()} returned ${results?.length || 0} results in ${responseTime}ms`,
          );

          // Log successful API call (non-blocking)
          try {
            await APIUsageLogModel.logAPICall(
              this.primaryProvider.getProviderName(),
              'searchByIngredients',
              true,
              false,
              responseTime,
            );
          } catch (logError) {
            console.log(`⚠️  API logging failed:`, (logError as Error).message);
          }

          if (results && results.length > 0) {
            // Track which provider was actually used
            this.lastUsedProvider = this.primaryProvider.getProviderName();

            // Try to cache, but don't fail if caching fails
            try {
              await this.cacheResults(cacheKey, results);
            } catch (cacheError) {
              console.log(
                `⚠️  Caching failed, but continuing:`,
                (cacheError as Error).message,
              );
            }

            console.log(
              `✅ ${this.primaryProvider.getProviderName()} returned ${results.length} recipes`,
            );

            // Check rate limit warning (also non-blocking)
            try {
              await this.checkRateLimitWarning(
                this.primaryProvider.getProviderName(),
              );
            } catch (rateLimitError) {
              console.log(
                `⚠️  Rate limit check failed:`,
                (rateLimitError as Error).message,
              );
            }

            return results;
          }
        } catch (apiError) {
          const responseTime = Date.now() - startTime;

          // Log failed API call
          await APIUsageLogModel.logAPICall(
            this.primaryProvider.getProviderName(),
            'searchByIngredients',
            false,
            false,
            responseTime,
            (apiError as Error).message,
          );

          throw apiError;
        }
      } else {
        console.log(
          `⚠️  Primary provider ${this.primaryProvider.getProviderName()} not available (rate limit)`,
        );
      }
    } catch (error) {
      console.log(
        `❌ Primary provider ${this.primaryProvider.getProviderName()} failed:`,
        (error as Error).message,
      );
    }

    // Step 3: Try fallback providers
    for (const provider of this.fallbackProviders) {
      try {
        if (await provider.isAvailable()) {
          console.log(
            `🔍 Trying fallback provider: ${provider.getProviderName()}`,
          );
          const startTime = Date.now();

          try {
            const results = await provider.searchByIngredients(
              ingredients,
              limit,
              options,
            );
            const responseTime = Date.now() - startTime;

            // Log successful API call
            await APIUsageLogModel.logAPICall(
              provider.getProviderName(),
              'searchByIngredients',
              true,
              false,
              responseTime,
            );

            if (results && results.length > 0) {
              await this.cacheResults(cacheKey, results);
              console.log(
                `✅ ${provider.getProviderName()} returned ${results.length} recipes`,
              );
              return results;
            }
          } catch (apiError) {
            const responseTime = Date.now() - startTime;

            // Log failed API call
            await APIUsageLogModel.logAPICall(
              provider.getProviderName(),
              'searchByIngredients',
              false,
              false,
              responseTime,
              (apiError as Error).message,
            );

            throw apiError;
          }
        } else {
          console.log(
            `⚠️  Fallback provider ${provider.getProviderName()} not available`,
          );
        }
      } catch (error) {
        console.log(
          `❌ Fallback provider ${provider.getProviderName()} failed:`,
          (error as Error).message,
        );
      }
    }

    // Step 4: For ingredient searches, DO NOT return cached results
    // This prevents returning old Spoonacular data when we need fresh matching calculations
    console.log(`⚠️  All providers failed for ingredient search`);
    console.log(
      `🚫  NOT returning cached results to avoid stale matching data`,
    );
    console.log(`✅  Returning empty array to force fresh data only`);
    return [];
  }

  /**
   * Get detailed recipe information by ID
   * Tries all providers until one succeeds
   * 
   * @param recipeId - Unique recipe identifier
   * @param skipCache - If true, bypasses cache and forces fresh API call (default: false)
   * @returns Promise<RecipeDetails> - Detailed recipe information
   * @throws Error if all providers fail to retrieve recipe details
   * 
   * @example
   * ```typescript
   * // Get from cache or API
   * const details = await service.getRecipeDetails('recipe_123');
   * 
   * // Force fresh data
   * const freshDetails = await service.getRecipeDetails('recipe_123', true);
   * console.log(details.instructions);
   * console.log(details.ingredients);
   * ```
   */
  async getRecipeDetails(
    recipeId: string,
    skipCache: boolean = false,
  ): Promise<RecipeDetails> {
    // Check cache first (unless skipCache is true)
    if (!skipCache) {
      try {
        const cached = await RecipeCacheModel.getCachedRecipe(recipeId);
        if (cached && cached.recipe_data) {
          console.log(`✅ Cache HIT for recipe details: ${recipeId}`);
          return cached.recipe_data;
        }
      } catch (cacheError) {
        console.log(
          `⚠️  Cache check failed for recipe ${recipeId}:`,
          (cacheError as Error).message,
        );
      }
    } else {
      console.log(`⏭️  Skipping cache, fetching fresh from API: ${recipeId}`);
    }

    console.log(`❌ Cache MISS for recipe details: ${recipeId}`);

    // Try each provider
    for (const provider of this.providers) {
      try {
        if (await provider.isAvailable()) {
          console.log(
            `🔍 Fetching recipe ${recipeId} from ${provider.getProviderName()}`,
          );
          const details = await provider.getRecipeDetails(recipeId);

          if (details) {
            // 🖼️ IMAGE PRESERVATION: If details don't have image, log for debugging
            if (!details.image || details.image.trim() === '') {
              console.log(
                `⚠️  Recipe ${recipeId} missing image, provider should handle fallback`,
              );
            }

            await RecipeCacheModel.cacheRecipe(recipeId, details);
            console.log(
              `✅ Recipe ${recipeId} fetched from ${provider.getProviderName()}`,
            );
            return details;
          }
        }
      } catch (_error) {
        console.log(
          `❌ Provider ${provider.getProviderName()} failed to fetch recipe ${recipeId}`,
        );
      }
    }

    throw new Error('Recipe not found');
  }

  /**
   * Get cache statistics and performance metrics
   * Returns information about cache hits, misses, and storage usage
   * 
   * @returns Promise with cache statistics
   * 
   * @example
   * ```typescript
   * const stats = await service.getCacheStats();
   * console.log(`Cache hit rate: ${stats.hitRate}%`);
   * console.log(`Total cached recipes: ${stats.totalRecipes}`);
   * console.log(`Cache size: ${stats.sizeInMB}MB`);
   * ```
   */
  async getCacheStats() {
    return await RecipeCacheModel.getCacheStats();
  }

  /**
   * Generate MD5 hash from ingredient list for cache key
   * Sorts ingredients to ensure consistent hashing
   * 
   * @param ingredients - Array of ingredient names
   * @returns MD5 hash string
   * @private
   */
  private generateIngredientHash(ingredients: string[]): string {
    const sorted = ingredients.sort().join(',').toLowerCase();
    return crypto.createHash('md5').update(sorted).digest('hex');
  }

  /**
   * Generate cache key including search filters
   * Combines ingredients and options into a unique cache key
   * 
   * @param ingredients - Array of ingredient names
   * @param options - Optional search filters
   * @returns MD5 hash string for cache lookup
   * @private
   */
  private generateCacheKey(
    ingredients: string[],
    options?: {maxCalories?: number; mealType?: string},
  ): string {
    const sorted = ingredients.sort().join(',').toLowerCase();
    let cacheString = sorted;

    // Include filters in cache key
    if (options?.maxCalories) {
      cacheString += `|maxCal:${options.maxCalories}`;
    }
    if (options?.mealType) {
      cacheString += `|meal:${options.mealType}`;
    }

    return crypto.createHash('md5').update(cacheString).digest('hex');
  }

  /**
   * Check cache for previously searched results
   * Retrieves full recipe data for cached search results
   * 
   * @param ingredientHash - MD5 hash of ingredient list
   * @returns Promise<Recipe[]> - Array of cached recipes or empty array
   * @private
   */
  private async checkCache(ingredientHash: string): Promise<Recipe[]> {
    const cached = await RecipeCacheModel.getCachedSearch(ingredientHash);

    if (!cached) {
      return [];
    }

    // Fetch full recipe data from cache
    const recipes: Recipe[] = [];
    for (const recipeId of cached.recipe_ids) {
      const cachedRecipe = await RecipeCacheModel.getCachedRecipe(recipeId);
      if (cachedRecipe) {
        recipes.push(cachedRecipe.recipe_data);
      }
    }

    return recipes;
  }

  /**
   * Cache search results and individual recipes
   * Stores both the search result and individual recipe details
   * 
   * @param ingredientHash - MD5 hash of ingredient list
   * @param recipes - Array of recipes to cache
   * @returns Promise<void>
   * @private
   */
  private async cacheResults(
    ingredientHash: string,
    recipes: Recipe[],
  ): Promise<void> {
    try {
      const recipeIds: string[] = [];

      for (const recipe of recipes) {
        await RecipeCacheModel.cacheRecipe(recipe.id, recipe);
        recipeIds.push(recipe.id);
      }

      await RecipeCacheModel.cacheSearch(ingredientHash, recipeIds);
      console.log(`✅ Cached ${recipes.length} recipes and search result`);
    } catch (error) {
      console.log(`⚠️  Failed to cache recipes:`, (error as Error).message);
    }
  }

  /**
   * Get cached results only (when all providers fail)
   */
  private async getCachedResultsOnly(
    ingredientHash: string,
  ): Promise<Recipe[]> {
    try {
      // Try to get any cached results, even expired ones
      const result = await RecipeCacheModel.getCachedSearch(ingredientHash);

      if (result) {
        const recipes: Recipe[] = [];
        for (const recipeId of result.recipe_ids) {
          const cachedRecipe = await RecipeCacheModel.getCachedRecipe(recipeId);
          if (cachedRecipe) {
            recipes.push(cachedRecipe.recipe_data);
          }
        }
        return recipes;
      }
    } catch (error) {
      console.log(
        `⚠️  Failed to retrieve cached results:`,
        (error as Error).message,
      );
    }

    return [];
  }

  /**
   * Check if provider is approaching rate limit and log warning
   */
  private async checkRateLimitWarning(providerName: string): Promise<void> {
    const limits: {[key: string]: number} = {
      FatSecret: 500000, // 500K calls/month
    };

    const dailyLimit = limits[providerName];
    if (dailyLimit) {
      await APIUsageLogModel.checkRateLimitWarning(providerName, dailyLimit);
    }
  }

  /**
   * Get the name of the provider that was last used
   */
  /**
   * Get the name of the last successfully used provider
   * Useful for debugging and monitoring which provider is being used
   * 
   * @returns Name of the last provider that successfully returned results
   * 
   * @example
   * ```typescript
   * const recipes = await service.searchByIngredients(['chicken'], 10);
   * console.log(`Results from: ${service.getLastUsedProvider()}`);
   * // Output: "Results from: FatSecret"
   * ```
   */
  getLastUsedProvider(): string {
    return this.lastUsedProvider || this.primaryProvider.getProviderName();
  }
}
