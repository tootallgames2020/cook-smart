/**
 * SMART EXPIRATION MANAGEMENT SERVICE
 * 
 * Enhanced expiration notifications with recipe suggestions to reduce food waste:
 * - Intelligent expiration predictions based on ingredient type
 * - Recipe suggestions for expiring ingredients
 * - Multi-tier notification system (3 days, 1 day, expired)
 * - Smart grouping of expiring ingredients for recipe matching
 */

import { pool } from '../server';
import { PushNotificationService } from './PushNotificationService';
import { logger } from '../utils/logger';

export interface ExpiringIngredient {
  id: number;
  user_id: string;
  ingredient_name: string;
  quantity: number;
  unit: string;
  expiration_date: Date;
  days_until_expiry: number;
  category: string;
  storage_type: 'fresh' | 'frozen' | 'canned' | 'dried' | 'refrigerated';
}

export interface RecipeSuggestion {
  recipe_id: string;
  recipe_name: string;
  matching_ingredients: string[];
  total_ingredients: number;
  match_percentage: number;
  difficulty: 'easy' | 'medium' | 'hard';
  cook_time: number;
}

export class SmartExpirationService {
  
  /**
   * INGREDIENT EXPIRATION DEFAULTS
   * Default expiration times when user doesn't specify
   */
  private static readonly EXPIRATION_DEFAULTS: { [key: string]: number } = {
    // Dairy (days from purchase)
    'milk': 7,
    'yogurt': 14,
    'cheese': 21,
    'butter': 30,
    'cream': 5,
    
    // Meat & Seafood
    'chicken': 2,
    'beef': 3,
    'pork': 3,
    'fish': 1,
    'seafood': 1,
    
    // Vegetables
    'lettuce': 7,
    'spinach': 5,
    'broccoli': 7,
    'carrots': 14,
    'onions': 30,
    'potatoes': 60,
    'tomatoes': 7,
    
    // Fruits
    'bananas': 5,
    'apples': 14,
    'berries': 3,
    'citrus': 14,
    'avocado': 5,
    
    // Pantry items (longer shelf life)
    'flour': 365,
    'sugar': 730,
    'rice': 730,
    'pasta': 730,
    'oil': 365,
    'spices': 1095, // 3 years
    
    // Bread & Baked goods
    'bread': 5,
    'bagels': 7,
    'muffins': 3,
  };

  /**
   * PRESERVATION MULTIPLIERS
   * How much longer ingredients last with different storage methods
   */
  private static readonly PRESERVATION_MULTIPLIERS: { [key: string]: number } = {
    'fresh': 1,        // Base expiration time
    'refrigerated': 1.5, // 50% longer (for items that can be refrigerated)
    'frozen': 30,      // 30x longer (6 months to 2+ years)
    'canned': 365,     // 365x longer (years)
    'dried': 180,      // 180x longer (6+ months)
  };

  /**
   * PRESERVATION SUGGESTIONS
   * What preservation methods work for different ingredient types
   */
  private static readonly PRESERVATION_OPTIONS: { [key: string]: string[] } = {
    // Meat & Seafood
    'chicken': ['frozen', 'refrigerated'],
    'beef': ['frozen', 'refrigerated', 'dried'],
    'pork': ['frozen', 'refrigerated'],
    'fish': ['frozen', 'refrigerated', 'canned'],
    'seafood': ['frozen', 'refrigerated'],
    
    // Vegetables
    'vegetables': ['frozen', 'canned', 'dried'],
    'lettuce': ['refrigerated'],
    'spinach': ['frozen', 'refrigerated'],
    'broccoli': ['frozen', 'refrigerated'],
    'carrots': ['frozen', 'refrigerated', 'canned'],
    'onions': ['dried', 'refrigerated'],
    'tomatoes': ['canned', 'dried', 'frozen'],
    
    // Fruits
    'bananas': ['frozen', 'dried'],
    'apples': ['refrigerated', 'dried', 'canned'],
    'berries': ['frozen', 'dried'],
    'citrus': ['refrigerated'],
    
    // Dairy
    'milk': ['frozen'],
    'cheese': ['frozen', 'refrigerated'],
    'butter': ['frozen', 'refrigerated'],
    
    // Pantry items
    'bread': ['frozen', 'dried'],
    'herbs': ['dried', 'frozen'],
    'spices': ['dried'],
  };

  /**
   * AUTO-SET EXPIRATION DATES WITH STORAGE TYPE
   * When ingredients are added without expiration dates
   */
  static async autoSetExpirationDate(
    ingredientName: string, 
    storageType: 'fresh' | 'frozen' | 'canned' | 'dried' | 'refrigerated' = 'fresh'
  ): Promise<Date | null> {
    try {
      const normalizedName = ingredientName.toLowerCase();
      
      // Find matching expiration default
      let daysToExpiry = null;
      for (const [key, days] of Object.entries(this.EXPIRATION_DEFAULTS)) {
        if (normalizedName.includes(key)) {
          daysToExpiry = days;
          break;
        }
      }
      
      if (!daysToExpiry) {
        // Default to 7 days for unknown ingredients
        daysToExpiry = 7;
      }

      // Apply preservation multiplier
      const multiplier = this.PRESERVATION_MULTIPLIERS[storageType] || 1;
      const adjustedDays = Math.round(daysToExpiry * multiplier);
      
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + adjustedDays);
      
      logger.info(`Auto-set expiration for "${ingredientName}" (${storageType}): ${adjustedDays} days (${expirationDate.toDateString()})`);
      
      return expirationDate;
    } catch (error) {
      logger.error('Error auto-setting expiration date:', error);
      return null;
    }
  }

  /**
   * GET EXPIRING INGREDIENTS WITH SMART CATEGORIZATION
   */
  static async getExpiringIngredients(userId: string, daysAhead: number = 3): Promise<ExpiringIngredient[]> {
    try {
      const client = await pool.connect();
      try {
        const result = await client.query(`
          SELECT 
            ui.id,
            ui.user_id,
            ui.ingredient_name,
            ui.quantity,
            ui.unit,
            ui.expiration_date,
            ui.category,
            COALESCE(ui.storage_type, 'fresh') as storage_type,
            EXTRACT(DAY FROM (ui.expiration_date - CURRENT_DATE)) as days_until_expiry
          FROM user_ingredients ui
          WHERE ui.user_id = $1
            AND ui.expiration_date IS NOT NULL
            AND ui.expiration_date <= CURRENT_DATE + INTERVAL '${daysAhead} days'
            AND ui.expiration_date >= CURRENT_DATE
            AND ui.quantity > 0
          ORDER BY ui.expiration_date ASC, ui.ingredient_name
        `, [userId]);

        return result.rows.map(row => ({
          id: row.id,
          user_id: row.user_id,
          ingredient_name: row.ingredient_name,
          quantity: parseFloat(row.quantity),
          unit: row.unit,
          expiration_date: new Date(row.expiration_date),
          days_until_expiry: parseInt(row.days_until_expiry),
          category: row.category,
          storage_type: row.storage_type,
        }));
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Error getting expiring ingredients:', error);
      return [];
    }
  }

  /**
   * FIND RECIPE SUGGESTIONS FOR EXPIRING INGREDIENTS
   */
  static async findRecipeSuggestionsForExpiring(userId: string): Promise<RecipeSuggestion[]> {
    try {
      const expiringIngredients = await this.getExpiringIngredients(userId, 3);
      
      if (expiringIngredients.length === 0) {
        return [];
      }

      // Get all user's ingredients for better recipe matching
      const client = await pool.connect();
      try {
        const allIngredients = await client.query(`
          SELECT ingredient_name, quantity, unit
          FROM user_ingredients
          WHERE user_id = $1 AND quantity > 0
        `, [userId]);

        const availableIngredients = allIngredients.rows.map(row => row.ingredient_name.toLowerCase());
        const expiringNames = expiringIngredients.map(ing => ing.ingredient_name.toLowerCase());

        // Mock recipe suggestions based on expiring ingredients
        // In production, this would query FatSecret API or recipe database
        const recipeSuggestions = this.generateRecipeSuggestions(expiringNames, availableIngredients);

        return recipeSuggestions;
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Error finding recipe suggestions:', error);
      return [];
    }
  }

  /**
   * GENERATE SMART RECIPE SUGGESTIONS
   * Mock implementation - in production would use FatSecret API
   */
  private static generateRecipeSuggestions(
    expiringIngredients: string[], 
    allIngredients: string[]
  ): RecipeSuggestion[] {
    const recipeDatabase = [
      {
        recipe_id: 'quick_stir_fry',
        recipe_name: 'Quick Vegetable Stir Fry',
        required_ingredients: ['vegetables', 'oil', 'garlic', 'onion'],
        difficulty: 'easy' as const,
        cook_time: 15,
      },
      {
        recipe_id: 'chicken_soup',
        recipe_name: 'Hearty Chicken Soup',
        required_ingredients: ['chicken', 'vegetables', 'broth', 'onion'],
        difficulty: 'medium' as const,
        cook_time: 45,
      },
      {
        recipe_id: 'fruit_smoothie',
        recipe_name: 'Fresh Fruit Smoothie',
        required_ingredients: ['fruit', 'milk', 'yogurt'],
        difficulty: 'easy' as const,
        cook_time: 5,
      },
      {
        recipe_id: 'pasta_primavera',
        recipe_name: 'Pasta Primavera',
        required_ingredients: ['pasta', 'vegetables', 'cheese', 'oil'],
        difficulty: 'easy' as const,
        cook_time: 20,
      },
      {
        recipe_id: 'banana_bread',
        recipe_name: 'Banana Bread',
        required_ingredients: ['bananas', 'flour', 'sugar', 'butter'],
        difficulty: 'medium' as const,
        cook_time: 60,
      },
    ];

    const suggestions: RecipeSuggestion[] = [];

    for (const recipe of recipeDatabase) {
      const matchingIngredients: string[] = [];
      
      for (const required of recipe.required_ingredients) {
        // Check if user has this ingredient (or expiring version)
        const hasIngredient = allIngredients.some(userIng => 
          userIng.includes(required) || required.includes(userIng)
        );
        
        if (hasIngredient) {
          matchingIngredients.push(required);
        }
      }

      // Check if any expiring ingredients match this recipe
      const hasExpiringMatch = expiringIngredients.some(expiring =>
        recipe.required_ingredients.some(required =>
          expiring.includes(required) || required.includes(expiring)
        )
      );

      if (hasExpiringMatch && matchingIngredients.length >= 2) {
        const matchPercentage = Math.round((matchingIngredients.length / recipe.required_ingredients.length) * 100);
        
        suggestions.push({
          recipe_id: recipe.recipe_id,
          recipe_name: recipe.recipe_name,
          matching_ingredients: matchingIngredients,
          total_ingredients: recipe.required_ingredients.length,
          match_percentage: matchPercentage,
          difficulty: recipe.difficulty,
          cook_time: recipe.cook_time,
        });
      }
    }

    // Sort by match percentage and prioritize expiring ingredients
    return suggestions.sort((a, b) => b.match_percentage - a.match_percentage).slice(0, 3);
  }

  /**
   * SEND SMART EXPIRATION NOTIFICATIONS
   */
  static async sendSmartExpirationNotifications(): Promise<void> {
    try {
      const client = await pool.connect();
      try {
        // Get all users with expiring ingredients
        const usersWithExpiring = await client.query(`
          SELECT DISTINCT ui.user_id
          FROM user_ingredients ui
          WHERE ui.expiration_date IS NOT NULL
            AND ui.expiration_date <= CURRENT_DATE + INTERVAL '3 days'
            AND ui.expiration_date >= CURRENT_DATE
            AND ui.quantity > 0
        `);

        logger.info(`🔔 Processing expiration notifications for ${usersWithExpiring.rows.length} users`);

        for (const userRow of usersWithExpiring.rows) {
          await this.processUserExpirationNotifications(userRow.user_id);
        }
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Error sending smart expiration notifications:', error);
    }
  }

  /**
   * PROCESS INDIVIDUAL USER EXPIRATION NOTIFICATIONS
   */
  private static async processUserExpirationNotifications(userId: string): Promise<void> {
    try {
      const expiringIngredients = await this.getExpiringIngredients(userId, 3);
      const recipeSuggestions = await this.findRecipeSuggestionsForExpiring(userId);

      // Group by urgency
      const expiringToday = expiringIngredients.filter(ing => ing.days_until_expiry === 0);
      const expiringTomorrow = expiringIngredients.filter(ing => ing.days_until_expiry === 1);
      const expiringSoon = expiringIngredients.filter(ing => ing.days_until_expiry >= 2);

      // Send urgent notifications first
      if (expiringToday.length > 0) {
        await this.sendUrgentExpirationAlert(userId, expiringToday, recipeSuggestions);
      } else if (expiringTomorrow.length > 0) {
        await this.sendTomorrowExpirationAlert(userId, expiringTomorrow, recipeSuggestions);
      } else if (expiringSoon.length > 0) {
        await this.sendSoonExpirationAlert(userId, expiringSoon, recipeSuggestions);
      }

    } catch (error) {
      logger.error(`Error processing notifications for user ${userId}:`, error);
    }
  }

  /**
   * SEND URGENT EXPIRATION ALERT (Expiring Today)
   */
  private static async sendUrgentExpirationAlert(
    userId: string, 
    ingredients: ExpiringIngredient[], 
    recipes: RecipeSuggestion[]
  ): Promise<void> {
    const ingredientNames = ingredients.map(ing => ing.ingredient_name).join(', ');
    
    let title = '🚨 Urgent: Ingredients Expiring Today!';
    let body = `${ingredients.length} ingredient${ingredients.length > 1 ? 's' : ''} expire today: ${ingredientNames}`;
    
    if (recipes.length > 0) {
      body += `\n💡 Try: ${recipes[0].recipe_name}`;
    }

    // Add preservation suggestions for fresh ingredients
    const freshIngredients = ingredients.filter(ing => ing.storage_type === 'fresh');
    if (freshIngredients.length > 0) {
      const firstIngredient = freshIngredients[0];
      const preservationOptions = this.getPreservationSuggestions(firstIngredient.ingredient_name);
      if (preservationOptions.length > 0) {
        body += `\n🧊 Or freeze ${firstIngredient.ingredient_name} to extend life!`;
      }
    }

    await PushNotificationService.sendNotification(parseInt(userId), title, body, {
      type: 'urgent_expiry',
      ingredients: ingredients.map(ing => ({
        name: ing.ingredient_name,
        storage_type: ing.storage_type,
        preservation_options: this.getPreservationSuggestions(ing.ingredient_name),
      })),
      recipes: recipes.slice(0, 2),
    });
  }

  /**
   * SEND TOMORROW EXPIRATION ALERT
   */
  private static async sendTomorrowExpirationAlert(
    userId: string, 
    ingredients: ExpiringIngredient[], 
    recipes: RecipeSuggestion[]
  ): Promise<void> {
    const ingredientNames = ingredients.map(ing => ing.ingredient_name).join(', ');
    
    let title = '⏰ Ingredients Expiring Tomorrow';
    let body = `Plan ahead: ${ingredientNames} expire${ingredients.length === 1 ? 's' : ''} tomorrow`;
    
    if (recipes.length > 0) {
      body += `\n🍽️ Recipe idea: ${recipes[0].recipe_name}`;
    }

    await PushNotificationService.sendNotification(parseInt(userId), title, body, {
      type: 'tomorrow_expiry',
      ingredients: ingredients.map(ing => ing.ingredient_name),
      recipes: recipes.slice(0, 3),
    });
  }

  /**
   * SEND SOON EXPIRATION ALERT (2-3 days)
   */
  private static async sendSoonExpirationAlert(
    userId: string, 
    ingredients: ExpiringIngredient[], 
    recipes: RecipeSuggestion[]
  ): Promise<void> {
    const title = '📦 Ingredients Expiring Soon';
    const body = `${ingredients.length} ingredient${ingredients.length > 1 ? 's' : ''} expiring in 2-3 days`;

    await PushNotificationService.sendNotification(parseInt(userId), title, body, {
      type: 'soon_expiry',
      ingredients: ingredients.map(ing => ing.ingredient_name),
      recipes: recipes.slice(0, 2),
    });
  }

  /**
   * GET PRESERVATION SUGGESTIONS FOR EXPIRING INGREDIENTS
   */
  static getPreservationSuggestions(ingredientName: string): string[] {
    const normalizedName = ingredientName.toLowerCase();
    
    // Find matching preservation options
    for (const [key, options] of Object.entries(this.PRESERVATION_OPTIONS)) {
      if (normalizedName.includes(key) || key.includes(normalizedName)) {
        return options;
      }
    }
    
    // Default preservation options for unknown ingredients
    return ['refrigerated', 'frozen'];
  }

  /**
   * CALCULATE EXTENDED EXPIRATION DATE
   */
  static calculateExtendedExpiration(
    currentExpirationDate: Date,
    currentStorageType: string,
    newStorageType: string
  ): Date {
    const currentMultiplier = this.PRESERVATION_MULTIPLIERS[currentStorageType] || 1;
    const newMultiplier = this.PRESERVATION_MULTIPLIERS[newStorageType] || 1;
    
    // Calculate how many days were originally intended
    const now = new Date();
    const daysRemaining = Math.ceil((currentExpirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calculate base expiration (without current preservation)
    const baseDays = Math.round(daysRemaining / currentMultiplier);
    
    // Apply new preservation multiplier
    const newDays = Math.round(baseDays * newMultiplier);
    
    const newExpirationDate = new Date();
    newExpirationDate.setDate(newExpirationDate.getDate() + newDays);
    
    return newExpirationDate;
  }

  /**
   * GET EXPIRATION DASHBOARD DATA
   */
  static async getExpirationDashboard(userId: string) {
    try {
      const expiringIngredients = await this.getExpiringIngredients(userId, 7); // Next 7 days
      const recipeSuggestions = await this.findRecipeSuggestionsForExpiring(userId);

      // Group by urgency
      const today = expiringIngredients.filter(ing => ing.days_until_expiry === 0);
      const tomorrow = expiringIngredients.filter(ing => ing.days_until_expiry === 1);
      const thisWeek = expiringIngredients.filter(ing => ing.days_until_expiry >= 2);

      return {
        summary: {
          total_expiring: expiringIngredients.length,
          expiring_today: today.length,
          expiring_tomorrow: tomorrow.length,
          expiring_this_week: thisWeek.length,
        },
        ingredients: {
          today,
          tomorrow,
          this_week: thisWeek,
        },
        recipe_suggestions: recipeSuggestions,
        last_updated: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Error getting expiration dashboard:', error);
      return null;
    }
  }
}