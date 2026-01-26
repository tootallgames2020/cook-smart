/**
 * SMART RECIPE INTELLIGENCE SERVICE
 * 
 * Revolutionary AI-powered recipe recommendations that understand:
 * - Family preferences and dietary restrictions
 * - Available ingredients and expiring items
 * - Time constraints and cooking skill level
 * - Weather, mood, and seasonal preferences
 * - Success patterns and learning from feedback
 */

import { pool } from '../server';
import { AIPreferencesService } from './AIPreferencesService';
import { logger } from '../utils/logger';

export interface SmartRecipeRequest {
  user_id: string;
  available_ingredients?: string[];
  expiring_ingredients?: string[];
  time_constraint?: number; // minutes
  difficulty_preference?: 'easy' | 'medium' | 'hard';
  dietary_restrictions?: string[];
  meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert';
  weather_context?: 'hot' | 'cold' | 'rainy' | 'sunny';
  family_size?: number;
  budget_constraint?: 'low' | 'medium' | 'high';
}

export interface SmartRecipeRecommendation {
  recipe_id: string;
  recipe_name: string;
  description: string;
  prep_time: number;
  cook_time: number;
  difficulty: 'easy' | 'medium' | 'hard';
  
  // AI Intelligence
  match_score: number; // 0-100
  confidence: number; // 0-1
  reasoning: string[];
  
  // Ingredient Analysis
  available_ingredients: string[];
  missing_ingredients: string[];
  expiring_ingredients_used: string[];
  ingredient_match_percentage: number;
  
  // Family Context
  family_preference_score: number;
  estimated_family_rating: number;
  similar_recipes_success_rate: number;
  
  // Practical Info
  estimated_cost: number;
  nutrition_score: number;
  waste_reduction_impact: number;
  
  // Learning Data
  suggestion_reasons: string[];
  personalization_factors: string[];
}

export class SmartRecipeIntelligenceService {

  /**
   * GET SMART RECIPE RECOMMENDATIONS
   * Main AI-powered recipe suggestion engine
   */
  static async getSmartRecommendations(
    request: SmartRecipeRequest
  ): Promise<SmartRecipeRecommendation[]> {
    try {
      // Check if user has smart recipe suggestions enabled
      const hasFeature = await AIPreferencesService.isFeatureEnabled(
        request.user_id,
        'smart_recipe_suggestions'
      );

      if (!hasFeature) {
        return []; // User has disabled smart suggestions
      }

      // Get user's family context and preferences
      const familyContext = await this.getFamilyContext(request.user_id);
      
      // Get user's recipe history and preferences
      const userPreferences = await this.getUserRecipePreferences(request.user_id);
      
      // Get available ingredients from inventory
      const availableIngredients = await this.getUserAvailableIngredients(request.user_id);
      
      // Get expiring ingredients
      const expiringIngredients = await this.getExpiringIngredients(request.user_id);

      // Generate AI-powered recommendations
      const recommendations = await this.generateIntelligentRecommendations({
        ...request,
        available_ingredients: availableIngredients,
        expiring_ingredients: expiringIngredients,
        family_context: familyContext,
        user_preferences: userPreferences,
      });

      // Log suggestions for learning
      for (const recommendation of recommendations) {
        await AIPreferencesService.logAISuggestion({
          user_id: request.user_id,
          suggestion_type: 'recipe',
          suggestion_content: recommendation,
          confidence_score: recommendation.confidence,
        });
      }

      return recommendations;
    } catch (error) {
      logger.error('Smart recipe recommendations error:', error);
      return [];
    }
  }

  /**
   * GENERATE INTELLIGENT RECOMMENDATIONS
   * Core AI logic for recipe suggestions
   */
  private static async generateIntelligentRecommendations(
    context: any
  ): Promise<SmartRecipeRecommendation[]> {
    try {
      // Mock intelligent recipe database - in production would use FatSecret API + AI
      const recipeDatabase = await this.getRecipeDatabase();
      
      const recommendations: SmartRecipeRecommendation[] = [];

      for (const recipe of recipeDatabase) {
        const analysis = await this.analyzeRecipeForUser(recipe, context);
        
        if (analysis.match_score >= 60) { // Only suggest good matches
          recommendations.push(analysis);
        }
      }

      // Sort by match score and confidence
      return recommendations
        .sort((a, b) => (b.match_score * b.confidence) - (a.match_score * a.confidence))
        .slice(0, 5); // Top 5 recommendations

    } catch (error) {
      logger.error('Generate intelligent recommendations error:', error);
      return [];
    }
  }

  /**
   * ANALYZE RECIPE FOR USER CONTEXT
   * AI analysis of how well a recipe fits the user's situation
   */
  private static async analyzeRecipeForUser(
    recipe: any,
    context: any
  ): Promise<SmartRecipeRecommendation> {
    const analysis: SmartRecipeRecommendation = {
      recipe_id: recipe.id,
      recipe_name: recipe.name,
      description: recipe.description,
      prep_time: recipe.prep_time,
      cook_time: recipe.cook_time,
      difficulty: recipe.difficulty,
      
      match_score: 0,
      confidence: 0,
      reasoning: [],
      
      available_ingredients: [],
      missing_ingredients: [],
      expiring_ingredients_used: [],
      ingredient_match_percentage: 0,
      
      family_preference_score: 0,
      estimated_family_rating: 0,
      similar_recipes_success_rate: 0,
      
      estimated_cost: recipe.estimated_cost || 15,
      nutrition_score: recipe.nutrition_score || 75,
      waste_reduction_impact: 0,
      
      suggestion_reasons: [],
      personalization_factors: [],
    };

    let matchScore = 0;
    let confidence = 0.7; // Base confidence

    // 1. INGREDIENT AVAILABILITY ANALYSIS
    const ingredientAnalysis = this.analyzeIngredientMatch(
      recipe.ingredients,
      context.available_ingredients,
      context.expiring_ingredients
    );
    
    analysis.available_ingredients = ingredientAnalysis.available;
    analysis.missing_ingredients = ingredientAnalysis.missing;
    analysis.expiring_ingredients_used = ingredientAnalysis.expiring_used;
    analysis.ingredient_match_percentage = ingredientAnalysis.match_percentage;
    
    matchScore += ingredientAnalysis.match_percentage * 0.4; // 40% weight
    
    if (ingredientAnalysis.match_percentage >= 80) {
      analysis.reasoning.push('You have most ingredients already');
      confidence += 0.1;
    }
    
    if (ingredientAnalysis.expiring_used.length > 0) {
      analysis.reasoning.push(`Uses ${ingredientAnalysis.expiring_used.length} expiring ingredient${ingredientAnalysis.expiring_used.length > 1 ? 's' : ''}`);
      analysis.waste_reduction_impact = ingredientAnalysis.expiring_used.length * 20;
      matchScore += 15; // Bonus for waste reduction
      confidence += 0.15;
    }

    // 2. TIME CONSTRAINT ANALYSIS
    const totalTime = recipe.prep_time + recipe.cook_time;
    if (context.time_constraint) {
      if (totalTime <= context.time_constraint) {
        matchScore += 20;
        analysis.reasoning.push(`Quick ${totalTime}-minute recipe fits your schedule`);
      } else {
        matchScore -= 10;
        analysis.reasoning.push(`Takes ${totalTime} minutes (longer than requested)`);
      }
    }

    // 3. DIFFICULTY PREFERENCE ANALYSIS
    if (context.difficulty_preference) {
      if (recipe.difficulty === context.difficulty_preference) {
        matchScore += 15;
        analysis.reasoning.push(`${recipe.difficulty} difficulty matches your preference`);
      }
    }

    // 4. FAMILY PREFERENCE ANALYSIS
    const familyScore = await this.analyzeFamilyPreferences(recipe, context.family_context);
    analysis.family_preference_score = familyScore;
    matchScore += familyScore * 0.3; // 30% weight
    
    if (familyScore >= 80) {
      analysis.reasoning.push('Family loves similar recipes');
      confidence += 0.1;
    }

    // 5. WEATHER CONTEXT ANALYSIS
    if (context.weather_context) {
      const weatherScore = this.analyzeWeatherContext(recipe, context.weather_context);
      matchScore += weatherScore;
      
      if (weatherScore > 0) {
        analysis.reasoning.push(this.getWeatherReasoning(recipe, context.weather_context));
      }
    }

    // 6. SEASONAL ANALYSIS
    const seasonalScore = this.analyzeSeasonalRelevance(recipe);
    matchScore += seasonalScore;
    
    if (seasonalScore > 0) {
      analysis.reasoning.push('Perfect for current season');
    }

    // 7. SUCCESS RATE ANALYSIS
    const successRate = await this.getRecipeSuccessRate(recipe.id, context.user_id);
    analysis.similar_recipes_success_rate = successRate;
    
    if (successRate >= 80) {
      matchScore += 10;
      analysis.reasoning.push('High success rate for similar recipes');
      confidence += 0.1;
    }

    // 8. PERSONALIZATION FACTORS
    analysis.personalization_factors = [
      `${analysis.ingredient_match_percentage}% ingredient match`,
      `Family preference: ${Math.round(familyScore)}%`,
      `${ingredientAnalysis.expiring_used.length} expiring ingredients used`,
      `${totalTime} minutes total time`,
    ];

    // Final scoring
    analysis.match_score = Math.min(100, Math.max(0, matchScore));
    analysis.confidence = Math.min(1, Math.max(0, confidence));
    analysis.estimated_family_rating = this.estimateFamilyRating(analysis);

    return analysis;
  }

  /**
   * ANALYZE INGREDIENT MATCH
   */
  private static analyzeIngredientMatch(
    recipeIngredients: string[],
    availableIngredients: string[],
    expiringIngredients: string[]
  ): {
    available: string[];
    missing: string[];
    expiring_used: string[];
    match_percentage: number;
  } {
    const available: string[] = [];
    const missing: string[] = [];
    const expiring_used: string[] = [];

    for (const ingredient of recipeIngredients) {
      const normalizedIngredient = ingredient.toLowerCase();
      
      // Check if available
      const isAvailable = availableIngredients.some(avail => 
        avail.toLowerCase().includes(normalizedIngredient) || 
        normalizedIngredient.includes(avail.toLowerCase())
      );

      if (isAvailable) {
        available.push(ingredient);
        
        // Check if it's expiring
        const isExpiring = expiringIngredients.some(exp => 
          exp.toLowerCase().includes(normalizedIngredient) || 
          normalizedIngredient.includes(exp.toLowerCase())
        );
        
        if (isExpiring) {
          expiring_used.push(ingredient);
        }
      } else {
        missing.push(ingredient);
      }
    }

    const match_percentage = Math.round((available.length / recipeIngredients.length) * 100);

    return {
      available,
      missing,
      expiring_used,
      match_percentage,
    };
  }

  /**
   * ANALYZE FAMILY PREFERENCES
   */
  private static async analyzeFamilyPreferences(recipe: any, familyContext: any): Promise<number> {
    // Mock family preference analysis - in production would use ML
    let score = 70; // Base score

    // Analyze cuisine preferences
    if (familyContext.preferred_cuisines?.includes(recipe.cuisine)) {
      score += 20;
    }

    // Analyze dietary restrictions
    if (familyContext.dietary_restrictions) {
      for (const restriction of familyContext.dietary_restrictions) {
        if (recipe.tags?.includes(restriction)) {
          score += 15;
        }
      }
    }

    // Analyze past recipe ratings
    if (familyContext.avg_rating_for_cuisine) {
      const cuisineRating = familyContext.avg_rating_for_cuisine[recipe.cuisine] || 3;
      score += (cuisineRating - 3) * 10; // Adjust based on past ratings
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * ANALYZE WEATHER CONTEXT
   */
  private static analyzeWeatherContext(recipe: any, weather: string): number {
    const weatherPreferences = {
      cold: ['soup', 'stew', 'casserole', 'hot', 'warm', 'comfort'],
      hot: ['salad', 'cold', 'light', 'fresh', 'grilled', 'chilled'],
      rainy: ['comfort', 'soup', 'stew', 'cozy', 'warm', 'hearty'],
      sunny: ['grilled', 'bbq', 'fresh', 'light', 'outdoor', 'salad'],
    };

    const preferences = weatherPreferences[weather as keyof typeof weatherPreferences] || [];
    
    for (const pref of preferences) {
      if (recipe.name.toLowerCase().includes(pref) || 
          recipe.description?.toLowerCase().includes(pref) ||
          recipe.tags?.some((tag: string) => tag.toLowerCase().includes(pref))) {
        return 15; // Weather bonus
      }
    }

    return 0;
  }

  /**
   * ANALYZE SEASONAL RELEVANCE
   */
  private static analyzeSeasonalRelevance(recipe: any): number {
    const currentMonth = new Date().getMonth();
    const seasonalIngredients = {
      spring: ['asparagus', 'peas', 'strawberry', 'artichoke'],
      summer: ['tomato', 'corn', 'berry', 'peach', 'zucchini'],
      fall: ['pumpkin', 'apple', 'squash', 'sweet potato'],
      winter: ['root vegetable', 'citrus', 'cabbage', 'potato'],
    };

    let season = 'spring';
    if (currentMonth >= 5 && currentMonth <= 7) season = 'summer';
    else if (currentMonth >= 8 && currentMonth <= 10) season = 'fall';
    else if (currentMonth >= 11 || currentMonth <= 1) season = 'winter';

    const seasonalItems = seasonalIngredients[season as keyof typeof seasonalIngredients];
    
    for (const item of seasonalItems) {
      if (recipe.ingredients?.some((ing: string) => ing.toLowerCase().includes(item))) {
        return 10; // Seasonal bonus
      }
    }

    return 0;
  }

  /**
   * GET WEATHER REASONING
   */
  private static getWeatherReasoning(recipe: any, weather: string): string {
    const reasonings = {
      cold: 'Perfect comfort food for cold weather',
      hot: 'Light and refreshing for hot weather',
      rainy: 'Cozy comfort food for a rainy day',
      sunny: 'Great for sunny day cooking',
    };

    return reasonings[weather as keyof typeof reasonings] || 'Good match for current weather';
  }

  /**
   * ESTIMATE FAMILY RATING
   */
  private static estimateFamilyRating(analysis: SmartRecipeRecommendation): number {
    let rating = 3.0; // Base rating

    // Adjust based on match score
    rating += (analysis.match_score - 50) / 25; // +/- 2 points based on match

    // Adjust based on ingredient availability
    rating += (analysis.ingredient_match_percentage - 50) / 50; // +/- 1 point

    // Adjust based on family preferences
    rating += (analysis.family_preference_score - 50) / 50; // +/- 1 point

    // Bonus for waste reduction
    if (analysis.expiring_ingredients_used.length > 0) {
      rating += 0.5;
    }

    return Math.min(5, Math.max(1, rating));
  }

  /**
   * UTILITY METHODS
   */
  private static async getFamilyContext(userId: string): Promise<any> {
    try {
      const client = await pool.connect();
      try {
        // Get family dietary restrictions and preferences
        const result = await client.query(`
          SELECT 
            f.family_name,
            COUNT(fm.user_id) as family_size,
            ARRAY_AGG(DISTINCT udr.restriction_type) as dietary_restrictions,
            ARRAY_AGG(DISTINCT ua.allergy_type) as allergies
          FROM family_members fm
          JOIN families f ON fm.family_id = f.id
          LEFT JOIN user_dietary_restrictions udr ON fm.user_id = udr.user_id
          LEFT JOIN user_allergies ua ON fm.user_id = ua.user_id
          WHERE fm.user_id = $1
          GROUP BY f.id, f.family_name
        `, [userId]);

        return result.rows[0] || { family_size: 1, dietary_restrictions: [], allergies: [] };
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Get family context error:', error);
      return { family_size: 1, dietary_restrictions: [], allergies: [] };
    }
  }

  private static async getUserRecipePreferences(userId: string): Promise<any> {
    try {
      const client = await pool.connect();
      try {
        const result = await client.query(`
          SELECT 
            AVG(rating) as avg_rating,
            COUNT(*) as total_ratings,
            ARRAY_AGG(DISTINCT cuisine_type) as preferred_cuisines
          FROM recipe_ratings rr
          JOIN recipes r ON rr.recipe_id = r.id
          WHERE rr.user_id = $1 AND rr.rating >= 4
        `, [userId]);

        return result.rows[0] || { avg_rating: 3.5, total_ratings: 0, preferred_cuisines: [] };
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Get user recipe preferences error:', error);
      return { avg_rating: 3.5, total_ratings: 0, preferred_cuisines: [] };
    }
  }

  private static async getUserAvailableIngredients(userId: string): Promise<string[]> {
    try {
      const client = await pool.connect();
      try {
        const result = await client.query(`
          SELECT ingredient_name
          FROM user_ingredients
          WHERE user_id = $1 AND quantity > 0
        `, [userId]);

        return result.rows.map(row => row.ingredient_name);
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Get available ingredients error:', error);
      return [];
    }
  }

  private static async getExpiringIngredients(userId: string): Promise<string[]> {
    try {
      const client = await pool.connect();
      try {
        const result = await client.query(`
          SELECT ingredient_name
          FROM user_ingredients
          WHERE user_id = $1 
            AND expiration_date IS NOT NULL
            AND expiration_date <= CURRENT_DATE + INTERVAL '3 days'
            AND quantity > 0
        `, [userId]);

        return result.rows.map(row => row.ingredient_name);
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Get expiring ingredients error:', error);
      return [];
    }
  }

  private static async getRecipeSuccessRate(recipeId: string, userId: string): Promise<number> {
    try {
      const client = await pool.connect();
      try {
        const result = await client.query(`
          SELECT AVG(rating) as avg_rating
          FROM recipe_ratings
          WHERE recipe_id = $1 OR user_id = $2
        `, [recipeId, userId]);

        const avgRating = parseFloat(result.rows[0]?.avg_rating) || 3.5;
        return Math.round((avgRating / 5) * 100);
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Get recipe success rate error:', error);
      return 70; // Default success rate
    }
  }

  private static async getRecipeDatabase(): Promise<any[]> {
    // Mock recipe database - in production would integrate with FatSecret API
    return [
      {
        id: 'chicken_stir_fry',
        name: 'Quick Chicken Stir Fry',
        description: 'Fast and healthy chicken stir fry with vegetables',
        prep_time: 10,
        cook_time: 15,
        difficulty: 'easy',
        cuisine: 'asian',
        ingredients: ['chicken', 'vegetables', 'soy sauce', 'garlic', 'oil'],
        tags: ['quick', 'healthy', 'protein'],
        estimated_cost: 12,
        nutrition_score: 85,
      },
      {
        id: 'banana_bread',
        name: 'Classic Banana Bread',
        description: 'Moist and delicious banana bread perfect for overripe bananas',
        prep_time: 15,
        cook_time: 60,
        difficulty: 'easy',
        cuisine: 'american',
        ingredients: ['bananas', 'flour', 'sugar', 'butter', 'eggs'],
        tags: ['baking', 'dessert', 'comfort'],
        estimated_cost: 8,
        nutrition_score: 60,
      },
      {
        id: 'vegetable_soup',
        name: 'Hearty Vegetable Soup',
        description: 'Warming soup perfect for cold days and using up vegetables',
        prep_time: 20,
        cook_time: 30,
        difficulty: 'easy',
        cuisine: 'comfort',
        ingredients: ['vegetables', 'broth', 'onion', 'garlic', 'herbs'],
        tags: ['soup', 'comfort', 'healthy', 'vegetarian'],
        estimated_cost: 10,
        nutrition_score: 90,
      },
    ];
  }
}