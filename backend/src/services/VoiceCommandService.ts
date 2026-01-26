/**
 * VOICE COMMAND SERVICE
 * 
 * Natural language processing for hands-free cooking:
 * - "Hey Cook Smart, I used 2 cups flour"
 * - "Add milk to shopping list"
 * - "What's next in this recipe?"
 * - "How much chicken do we have left?"
 * - "Find a recipe with chicken and rice"
 */

import { pool } from '../server';
import { AIPreferencesService } from './AIPreferencesService';
import { logger } from '../utils/logger';

export interface VoiceCommand {
  user_id: string;
  command_text: string;
  intent?: string;
  entities?: { [key: string]: any };
  confidence?: number;
  processing_method?: 'local' | 'cloud';
}

export interface VoiceResponse {
  success: boolean;
  response_text: string;
  action_taken?: string;
  data?: any;
  confidence: number;
  processing_time_ms: number;
}

export class VoiceCommandService {

  /**
   * PROCESS VOICE COMMAND
   * Main entry point for voice command processing
   */
  static async processVoiceCommand(command: VoiceCommand): Promise<VoiceResponse> {
    const startTime = Date.now();
    
    try {
      // Check if user has voice commands enabled
      const hasVoiceEnabled = await AIPreferencesService.isFeatureEnabled(
        command.user_id,
        'voice_commands'
      );

      if (!hasVoiceEnabled) {
        return {
          success: false,
          response_text: "Voice commands are disabled. Enable them in AI settings.",
          confidence: 1.0,
          processing_time_ms: Date.now() - startTime,
        };
      }

      // Get user's voice processing preference
      const preferences = await AIPreferencesService.getUserPreferences(command.user_id);
      const processingMethod = preferences?.voice_processing || 'local_only';

      // Parse command intent and entities
      const parsedCommand = await this.parseVoiceCommand(command.command_text, processingMethod);
      
      // Execute the command
      const response = await this.executeVoiceCommand(command.user_id, parsedCommand);
      
      // Track usage for analytics
      await AIPreferencesService.trackFeatureUsage(
        command.user_id,
        'voice_command',
        response.success ? 5 : 2
      );

      response.processing_time_ms = Date.now() - startTime;
      return response;

    } catch (error) {
      logger.error('Voice command processing error:', error);
      return {
        success: false,
        response_text: "Sorry, I couldn't understand that command. Try rephrasing it.",
        confidence: 0.0,
        processing_time_ms: Date.now() - startTime,
      };
    }
  }

  /**
   * PARSE VOICE COMMAND
   * Extract intent and entities from natural language
   */
  private static async parseVoiceCommand(
    commandText: string, 
    processingMethod: string
  ): Promise<{ intent: string; entities: any; confidence: number }> {
    
    const normalizedText = commandText.toLowerCase().trim();
    
    // LOCAL PROCESSING - Pattern matching for privacy
    if (processingMethod === 'local_only') {
      return this.parseCommandLocally(normalizedText);
    }
    
    // CLOUD PROCESSING - More accurate but requires privacy consent
    if (processingMethod === 'cloud_enhanced') {
      return this.parseCommandWithCloud(normalizedText);
    }
    
    // Default to local processing
    return this.parseCommandLocally(normalizedText);
  }

  /**
   * LOCAL COMMAND PARSING
   * Privacy-first pattern matching on device
   */
  private static parseCommandLocally(text: string): { intent: string; entities: any; confidence: number } {
    const patterns = {
      // Ingredient usage patterns
      ingredient_usage: [
        /(?:i )?used (\d+(?:\.\d+)?)\s*(\w+)\s*(?:of\s+)?(\w+)/i,
        /(?:i )?consumed (\d+(?:\.\d+)?)\s*(\w+)\s*(?:of\s+)?(\w+)/i,
        /(?:i )?finished (?:the\s+)?(\w+)/i,
      ],
      
      // Shopping list patterns
      add_to_shopping: [
        /add (\w+(?:\s+\w+)*) to (?:the\s+)?shopping list/i,
        /(?:we )?need (?:to buy\s+)?(\w+(?:\s+\w+)*)/i,
        /(?:put\s+)?(\w+(?:\s+\w+)*) on (?:the\s+)?(?:shopping\s+)?list/i,
      ],
      
      // Recipe search patterns
      recipe_search: [
        /(?:find|search for|look for) (?:a\s+)?recipe (?:with\s+|using\s+|for\s+)?(.+)/i,
        /what can i (?:make|cook) with (.+)/i,
        /(?:recipe|recipes) (?:with\s+|using\s+|for\s+)?(.+)/i,
      ],
      
      // Inventory check patterns
      inventory_check: [
        /how much (\w+(?:\s+\w+)*) (?:do we have|is left)/i,
        /(?:do we have|check) (\w+(?:\s+\w+)*)/i,
        /what(?:'s| is) (?:left of\s+|remaining of\s+)?(\w+(?:\s+\w+)*)/i,
      ],
      
      // Recipe help patterns
      recipe_help: [
        /what(?:'s| is) (?:the\s+)?next step/i,
        /(?:continue|next) (?:step|instruction)/i,
        /how (?:long|much time) (?:left|remaining)/i,
      ],
      
      // Expiration check patterns
      expiration_check: [
        /what(?:'s| is) expiring (?:soon|today|tomorrow)/i,
        /(?:check|show) expir(?:ing|ation)/i,
        /what needs to be used (?:soon|up)/i,
      ],
    };

    // Try to match patterns
    for (const [intent, patternList] of Object.entries(patterns)) {
      for (const pattern of patternList) {
        const match = text.match(pattern);
        if (match) {
          return this.extractEntitiesFromMatch(intent, match, text);
        }
      }
    }

    // Fallback - general help
    return {
      intent: 'general_help',
      entities: { original_text: text },
      confidence: 0.3,
    };
  }

  /**
   * CLOUD COMMAND PARSING
   * More accurate NLP using cloud services (with user consent)
   */
  private static async parseCommandWithCloud(text: string): Promise<{ intent: string; entities: any; confidence: number }> {
    try {
      // This would integrate with OpenAI API or similar NLP service
      // For now, fall back to local processing
      logger.info('Cloud NLP processing requested but not implemented yet');
      return this.parseCommandLocally(text);
    } catch (error) {
      logger.error('Cloud parsing error, falling back to local:', error);
      return this.parseCommandLocally(text);
    }
  }

  /**
   * EXTRACT ENTITIES FROM REGEX MATCH
   */
  private static extractEntitiesFromMatch(
    intent: string, 
    match: RegExpMatchArray, 
    originalText: string
  ): { intent: string; entities: any; confidence: number } {
    
    const entities: any = { original_text: originalText };
    let confidence = 0.8;

    switch (intent) {
      case 'ingredient_usage':
        if (match[1]) entities.quantity = parseFloat(match[1]);
        if (match[2]) entities.unit = match[2];
        if (match[3]) entities.ingredient = match[3];
        if (match[1] && match[2] && match[3]) confidence = 0.9;
        break;

      case 'add_to_shopping':
        if (match[1]) entities.item = match[1].trim();
        confidence = 0.85;
        break;

      case 'recipe_search':
        if (match[1]) entities.ingredients = match[1].trim();
        confidence = 0.8;
        break;

      case 'inventory_check':
        if (match[1]) entities.ingredient = match[1].trim();
        confidence = 0.85;
        break;

      case 'recipe_help':
        confidence = 0.9;
        break;

      case 'expiration_check':
        confidence = 0.9;
        break;
    }

    return { intent, entities, confidence };
  }

  /**
   * EXECUTE VOICE COMMAND
   * Perform the action based on parsed intent
   */
  private static async executeVoiceCommand(
    userId: string, 
    parsed: { intent: string; entities: any; confidence: number }
  ): Promise<VoiceResponse> {
    
    const { intent, entities, confidence } = parsed;

    try {
      switch (intent) {
        case 'ingredient_usage':
          return await this.handleIngredientUsage(userId, entities);
          
        case 'add_to_shopping':
          return await this.handleAddToShopping(userId, entities);
          
        case 'recipe_search':
          return await this.handleRecipeSearch(userId, entities);
          
        case 'inventory_check':
          return await this.handleInventoryCheck(userId, entities);
          
        case 'recipe_help':
          return await this.handleRecipeHelp(userId, entities);
          
        case 'expiration_check':
          return await this.handleExpirationCheck(userId, entities);
          
        default:
          return {
            success: false,
            response_text: "I can help you with ingredients, shopping lists, recipes, and inventory. What would you like to do?",
            confidence: 0.5,
            processing_time_ms: 0,
          };
      }
    } catch (error) {
      logger.error(`Execute voice command error (${intent}):`, error);
      return {
        success: false,
        response_text: "Sorry, I had trouble processing that command. Please try again.",
        confidence: 0.0,
        processing_time_ms: 0,
      };
    }
  }

  /**
   * HANDLE INGREDIENT USAGE
   * "I used 2 cups flour"
   */
  private static async handleIngredientUsage(userId: string, entities: any): Promise<VoiceResponse> {
    const { quantity, unit, ingredient } = entities;

    if (!quantity || !ingredient) {
      return {
        success: false,
        response_text: "I need to know how much of what ingredient you used. Try saying 'I used 2 cups flour'.",
        confidence: 0.8,
        processing_time_ms: 0,
      };
    }

    try {
      const client = await pool.connect();
      try {
        // Find matching ingredient in user's inventory
        const ingredientResult = await client.query(`
          SELECT id, ingredient_name, quantity, unit
          FROM user_ingredients
          WHERE user_id = $1 
            AND LOWER(ingredient_name) LIKE LOWER($2)
            AND quantity > 0
          ORDER BY similarity(ingredient_name, $2) DESC
          LIMIT 1
        `, [userId, `%${ingredient}%`]);

        if (ingredientResult.rows.length === 0) {
          return {
            success: false,
            response_text: `I couldn't find ${ingredient} in your inventory. You might need to add it first.`,
            confidence: 0.7,
            processing_time_ms: 0,
          };
        }

        const ingredientData = ingredientResult.rows[0];

        // Use the ingredient (with unit conversion if needed)
        const { InventoryUnitConverter } = await import('./InventoryUnitConverter');
        
        const conversionResult = InventoryUnitConverter.subtractUsage(
          ingredientData.quantity,
          ingredientData.unit,
          quantity,
          unit || ingredientData.unit,
          ingredientData.ingredient_name
        );

        if (!conversionResult.success) {
          return {
            success: false,
            response_text: `I couldn't convert ${quantity} ${unit} of ${ingredient}. ${conversionResult.error}`,
            confidence: 0.6,
            processing_time_ms: 0,
          };
        }

        // Update inventory
        const newQuantity = conversionResult.remainingQuantity!;
        const finalUnit = conversionResult.remainingUnit!;

        if (newQuantity > 0) {
          await client.query(`
            UPDATE user_ingredients 
            SET quantity = $1, unit = $2, updated_at = NOW()
            WHERE id = $3
          `, [newQuantity, finalUnit, ingredientData.id]);
        } else {
          await client.query(`
            DELETE FROM user_ingredients WHERE id = $1
          `, [ingredientData.id]);
        }

        // Log usage
        await client.query(`
          INSERT INTO ingredient_usage_log 
          (user_id, ingredient_id, ingredient_name, quantity_used, unit_used, conversion_details, used_at)
          VALUES ($1, $2, $3, $4, $5, $6, NOW())
        `, [
          userId,
          ingredientData.ingredient_name.toLowerCase().replace(/\s+/g, '_'),
          ingredientData.ingredient_name,
          quantity,
          unit || ingredientData.unit,
          JSON.stringify({
            voice_command: true,
            conversion: conversionResult.conversionUsed,
          })
        ]);

        const responseText = newQuantity > 0 
          ? `Got it! Updated ${ingredientData.ingredient_name}. You have ${newQuantity.toFixed(1)} ${finalUnit} left.`
          : `Got it! You've used up all your ${ingredientData.ingredient_name}. Should I add it to your shopping list?`;

        return {
          success: true,
          response_text: responseText,
          action_taken: 'ingredient_updated',
          data: {
            ingredient: ingredientData.ingredient_name,
            used: `${quantity} ${unit}`,
            remaining: newQuantity > 0 ? `${newQuantity} ${finalUnit}` : 'none',
            conversion: conversionResult.conversionUsed,
          },
          confidence: 0.9,
          processing_time_ms: 0,
        };

      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Handle ingredient usage error:', error);
      return {
        success: false,
        response_text: "Sorry, I had trouble updating your ingredient inventory.",
        confidence: 0.0,
        processing_time_ms: 0,
      };
    }
  }

  /**
   * HANDLE ADD TO SHOPPING
   * "Add milk to shopping list"
   */
  private static async handleAddToShopping(userId: string, entities: any): Promise<VoiceResponse> {
    const { item } = entities;

    if (!item) {
      return {
        success: false,
        response_text: "What would you like me to add to your shopping list?",
        confidence: 0.8,
        processing_time_ms: 0,
      };
    }

    try {
      const client = await pool.connect();
      try {
        // Get user's family ID if they're in a family
        const familyResult = await client.query(`
          SELECT family_id FROM family_members WHERE user_id = $1
        `, [userId]);

        const familyId = familyResult.rows[0]?.family_id || null;

        // Add to shopping list
        await client.query(`
          INSERT INTO shopping_list_items 
          (user_id, family_id, item_name, quantity, unit, added_at, notes)
          VALUES ($1, $2, $3, 1, 'piece', NOW(), 'Added via voice command')
        `, [userId, familyId, item.trim()]);

        return {
          success: true,
          response_text: `Added ${item} to your shopping list!`,
          action_taken: 'shopping_item_added',
          data: { item: item.trim() },
          confidence: 0.9,
          processing_time_ms: 0,
        };

      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Handle add to shopping error:', error);
      return {
        success: false,
        response_text: "Sorry, I couldn't add that to your shopping list.",
        confidence: 0.0,
        processing_time_ms: 0,
      };
    }
  }

  /**
   * HANDLE RECIPE SEARCH
   * "Find a recipe with chicken and rice"
   */
  private static async handleRecipeSearch(userId: string, entities: any): Promise<VoiceResponse> {
    const { ingredients } = entities;

    if (!ingredients) {
      return {
        success: false,
        response_text: "What ingredients would you like to use in a recipe?",
        confidence: 0.8,
        processing_time_ms: 0,
      };
    }

    try {
      // Use smart recipe intelligence
      const { SmartRecipeIntelligenceService } = await import('./SmartRecipeIntelligenceService');
      
      const recommendations = await SmartRecipeIntelligenceService.getSmartRecommendations({
        user_id: userId,
        available_ingredients: ingredients.split(/\s+and\s+|\s*,\s*|\s+/),
        time_constraint: 45, // Default to 45 minutes for voice requests
      });

      if (recommendations.length === 0) {
        return {
          success: false,
          response_text: `I couldn't find any recipes with ${ingredients}. Try different ingredients or check your inventory.`,
          confidence: 0.7,
          processing_time_ms: 0,
        };
      }

      const topRecipe = recommendations[0];
      const responseText = `I found ${topRecipe.recipe_name}! It's a ${topRecipe.difficulty} recipe that takes ${topRecipe.prep_time + topRecipe.cook_time} minutes. You have ${topRecipe.ingredient_match_percentage}% of the ingredients.`;

      return {
        success: true,
        response_text: responseText,
        action_taken: 'recipe_found',
        data: {
          recipe: topRecipe,
          total_found: recommendations.length,
        },
        confidence: 0.8,
        processing_time_ms: 0,
      };

    } catch (error) {
      logger.error('Handle recipe search error:', error);
      return {
        success: false,
        response_text: "Sorry, I had trouble searching for recipes.",
        confidence: 0.0,
        processing_time_ms: 0,
      };
    }
  }

  /**
   * HANDLE INVENTORY CHECK
   * "How much chicken do we have?"
   */
  private static async handleInventoryCheck(userId: string, entities: any): Promise<VoiceResponse> {
    const { ingredient } = entities;

    if (!ingredient) {
      return {
        success: false,
        response_text: "What ingredient would you like me to check?",
        confidence: 0.8,
        processing_time_ms: 0,
      };
    }

    try {
      const client = await pool.connect();
      try {
        const result = await client.query(`
          SELECT ingredient_name, quantity, unit, expiration_date
          FROM user_ingredients
          WHERE user_id = $1 
            AND LOWER(ingredient_name) LIKE LOWER($2)
            AND quantity > 0
          ORDER BY similarity(ingredient_name, $2) DESC
        `, [userId, `%${ingredient}%`]);

        if (result.rows.length === 0) {
          return {
            success: true,
            response_text: `You don't have any ${ingredient} in your inventory.`,
            action_taken: 'inventory_checked',
            data: { ingredient, found: false },
            confidence: 0.8,
            processing_time_ms: 0,
          };
        }

        const items = result.rows;
        let responseText = '';

        if (items.length === 1) {
          const item = items[0];
          responseText = `You have ${item.quantity} ${item.unit} of ${item.ingredient_name}`;
          
          if (item.expiration_date) {
            const daysUntilExpiry = Math.ceil((new Date(item.expiration_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            if (daysUntilExpiry <= 3) {
              responseText += `, expiring in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}`;
            }
          }
        } else {
          responseText = `You have ${items.length} types of ${ingredient}: `;
          responseText += items.map(item => `${item.quantity} ${item.unit} ${item.ingredient_name}`).join(', ');
        }

        return {
          success: true,
          response_text: responseText + '.',
          action_taken: 'inventory_checked',
          data: { ingredient, items: items.length, found: true },
          confidence: 0.9,
          processing_time_ms: 0,
        };

      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Handle inventory check error:', error);
      return {
        success: false,
        response_text: "Sorry, I couldn't check your inventory right now.",
        confidence: 0.0,
        processing_time_ms: 0,
      };
    }
  }

  /**
   * HANDLE RECIPE HELP
   * "What's the next step?"
   */
  private static async handleRecipeHelp(userId: string, entities: any): Promise<VoiceResponse> {
    // This would integrate with active recipe tracking
    return {
      success: true,
      response_text: "Recipe help is coming soon! For now, you can ask me about ingredients, shopping, or inventory.",
      confidence: 0.5,
      processing_time_ms: 0,
    };
  }

  /**
   * HANDLE EXPIRATION CHECK
   * "What's expiring soon?"
   */
  private static async handleExpirationCheck(userId: string, entities: any): Promise<VoiceResponse> {
    try {
      const { SmartExpirationService } = await import('./SmartExpirationService');
      
      const expiringIngredients = await SmartExpirationService.getExpiringIngredients(userId, 3);

      if (expiringIngredients.length === 0) {
        return {
          success: true,
          response_text: "Great news! Nothing is expiring in the next 3 days.",
          action_taken: 'expiration_checked',
          data: { expiring_count: 0 },
          confidence: 0.9,
          processing_time_ms: 0,
        };
      }

      const today = expiringIngredients.filter(ing => ing.days_until_expiry === 0);
      const tomorrow = expiringIngredients.filter(ing => ing.days_until_expiry === 1);
      const soon = expiringIngredients.filter(ing => ing.days_until_expiry >= 2);

      let responseText = '';
      if (today.length > 0) {
        responseText += `${today.length} item${today.length > 1 ? 's' : ''} expire today: ${today.map(i => i.ingredient_name).join(', ')}. `;
      }
      if (tomorrow.length > 0) {
        responseText += `${tomorrow.length} item${tomorrow.length > 1 ? 's' : ''} expire tomorrow: ${tomorrow.map(i => i.ingredient_name).join(', ')}. `;
      }
      if (soon.length > 0) {
        responseText += `${soon.length} item${soon.length > 1 ? 's' : ''} expire in 2-3 days: ${soon.map(i => i.ingredient_name).join(', ')}.`;
      }

      return {
        success: true,
        response_text: responseText.trim(),
        action_taken: 'expiration_checked',
        data: { 
          expiring_count: expiringIngredients.length,
          today: today.length,
          tomorrow: tomorrow.length,
          soon: soon.length,
        },
        confidence: 0.9,
        processing_time_ms: 0,
      };

    } catch (error) {
      logger.error('Handle expiration check error:', error);
      return {
        success: false,
        response_text: "Sorry, I couldn't check your expiring ingredients right now.",
        confidence: 0.0,
        processing_time_ms: 0,
      };
    }
  }
}