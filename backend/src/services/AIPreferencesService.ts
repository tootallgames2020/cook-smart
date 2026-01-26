/**
 * AI PREFERENCES SERVICE
 * 
 * Manages user AI preferences with granular control:
 * - All AI features included free (no pricing impact)
 * - User controls what AI features they want
 * - Privacy-first approach with safe defaults
 * - Analytics to improve AI over time
 */

import { pool } from '../server';
import { logger } from '../utils/logger';

export interface AIPreferences {
  user_id: string;
  
  // Core AI Features (default enabled)
  smart_recipe_suggestions: boolean;
  expiration_intelligence: boolean;
  family_coordination: boolean;
  shopping_predictions: boolean;
  
  // Advanced AI Features (default disabled for privacy)
  auto_meal_planning: boolean;
  voice_commands: boolean;
  photo_analysis: boolean;
  predictive_analytics: boolean;
  
  // APEX INTELLIGENCE FEATURES (Industry-leading AI)
  apex_nutrition_intelligence: boolean;
  apex_photo_intelligence: boolean;
  apex_voice_intelligence: boolean;
  apex_predictive_intelligence: boolean;
  
  // AI Assistance Level
  ai_assistance_level: 'minimal' | 'helpful' | 'genius';
  
  // Privacy Controls
  location_sharing: 'off' | 'family_only' | 'full';
  voice_processing: 'off' | 'local_only' | 'cloud_enhanced';
  photo_processing: 'off' | 'manual' | 'automatic';
  
  // Apex Intelligence Settings
  nutrition_coaching_level: 'basic' | 'advanced' | 'expert';
  photo_analysis_depth: 'basic' | 'complete' | 'expert';
  voice_intelligence_mode: 'basic' | 'contextual' | 'genius';
  predictive_confidence_level: 'basic' | 'advanced' | 'expert';
  
  // Notification Preferences
  smart_notifications: boolean;
  notification_timing: 'immediate' | 'smart' | 'scheduled' | 'minimal';
  suggestion_frequency: 'minimal' | 'moderate' | 'frequent';
  
  // Learning & Analytics
  usage_analytics: boolean;
  pattern_learning: boolean;
  community_insights: boolean;
}

export interface AISuggestion {
  id?: number;
  user_id: string;
  suggestion_type: 'recipe' | 'shopping' | 'expiration' | 'meal_plan' | 'family_coordination';
  suggestion_content: any;
  confidence_score: number;
  suggested_at?: Date;
  user_action?: 'accepted' | 'rejected' | 'ignored' | 'modified';
}

export class AIPreferencesService {

  /**
   * GET USER AI PREFERENCES
   */
  static async getUserPreferences(userId: string): Promise<AIPreferences | null> {
    try {
      const client = await pool.connect();
      try {
        const result = await client.query(`
          SELECT * FROM user_ai_preferences WHERE user_id = $1
        `, [userId]);

        if (result.rows.length === 0) {
          // Create default preferences if they don't exist
          return await this.createDefaultPreferences(userId);
        }

        return result.rows[0] as AIPreferences;
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Get AI preferences error:', error);
      return null;
    }
  }

  /**
   * UPDATE USER AI PREFERENCES
   */
  static async updateUserPreferences(
    userId: string, 
    preferences: Partial<AIPreferences>
  ): Promise<AIPreferences | null> {
    try {
      const client = await pool.connect();
      try {
        // Build dynamic update query
        const updateFields = Object.keys(preferences)
          .filter(key => key !== 'user_id')
          .map((key, index) => `${key} = $${index + 2}`)
          .join(', ');

        const values = [
          userId,
          ...Object.keys(preferences)
            .filter(key => key !== 'user_id')
            .map(key => preferences[key as keyof AIPreferences])
        ];

        const result = await client.query(`
          UPDATE user_ai_preferences 
          SET ${updateFields}, updated_at = NOW()
          WHERE user_id = $1
          RETURNING *
        `, values);

        if (result.rows.length === 0) {
          logger.warn(`No AI preferences found for user ${userId} during update`);
          return null;
        }

        logger.info(`AI preferences updated for user ${userId}`);
        return result.rows[0] as AIPreferences;
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Update AI preferences error:', error);
      return null;
    }
  }

  /**
   * CREATE DEFAULT PREFERENCES FOR NEW USER
   */
  static async createDefaultPreferences(userId: string): Promise<AIPreferences> {
    try {
      const client = await pool.connect();
      try {
        const result = await client.query(`
          INSERT INTO user_ai_preferences (user_id)
          VALUES ($1)
          ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW()
          RETURNING *
        `, [userId]);

        logger.info(`Default AI preferences created for user ${userId}`);
        return result.rows[0] as AIPreferences;
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Create default AI preferences error:', error);
      throw error;
    }
  }

  /**
   * CHECK IF USER HAS FEATURE ENABLED
   */
  static async isFeatureEnabled(userId: string, featureName: keyof AIPreferences): Promise<boolean> {
    try {
      const preferences = await this.getUserPreferences(userId);
      if (!preferences) {
        return false;
      }

      return Boolean(preferences[featureName]);
    } catch (error) {
      logger.error('Check feature enabled error:', error);
      return false;
    }
  }

  /**
   * LOG AI SUGGESTION FOR LEARNING
   */
  static async logAISuggestion(suggestion: AISuggestion): Promise<void> {
    try {
      const client = await pool.connect();
      try {
        await client.query(`
          INSERT INTO ai_suggestions_log 
          (user_id, suggestion_type, suggestion_content, confidence_score, suggested_at)
          VALUES ($1, $2, $3, $4, NOW())
        `, [
          suggestion.user_id,
          suggestion.suggestion_type,
          JSON.stringify(suggestion.suggestion_content),
          suggestion.confidence_score
        ]);
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Log AI suggestion error:', error);
    }
  }

  /**
   * RECORD USER ACTION ON AI SUGGESTION
   */
  static async recordSuggestionAction(
    userId: string,
    suggestionType: string,
    action: 'accepted' | 'rejected' | 'ignored' | 'modified'
  ): Promise<void> {
    try {
      const client = await pool.connect();
      try {
        await client.query(`
          UPDATE ai_suggestions_log 
          SET user_action = $1, action_at = NOW()
          WHERE user_id = $2 AND suggestion_type = $3 
            AND suggested_at >= CURRENT_DATE - INTERVAL '1 day'
            AND user_action IS NULL
          ORDER BY suggested_at DESC
          LIMIT 1
        `, [action, userId, suggestionType]);

        // Track feature usage
        await this.trackFeatureUsage(userId, `suggestion_${action}`, action === 'accepted' ? 5 : 3);
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Record suggestion action error:', error);
    }
  }

  /**
   * TRACK AI FEATURE USAGE
   */
  static async trackFeatureUsage(
    userId: string, 
    featureName: string, 
    rating?: number
  ): Promise<void> {
    try {
      const client = await pool.connect();
      try {
        await client.query(`
          INSERT INTO ai_feature_usage (user_id, feature_name, usage_count, last_used, user_rating)
          VALUES ($1, $2, 1, NOW(), $3)
          ON CONFLICT (user_id, feature_name) 
          DO UPDATE SET 
            usage_count = ai_feature_usage.usage_count + 1,
            last_used = NOW(),
            user_rating = COALESCE($3, ai_feature_usage.user_rating)
        `, [userId, featureName, rating]);
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Track feature usage error:', error);
    }
  }

  /**
   * GET AI FEATURE ANALYTICS (for improvement)
   */
  static async getFeatureAnalytics(featureName?: string): Promise<any[]> {
    try {
      const client = await pool.connect();
      try {
        let query = `
          SELECT 
            feature_name,
            COUNT(*) as total_users,
            SUM(usage_count) as total_usage,
            AVG(user_rating) as avg_rating,
            COUNT(*) FILTER (WHERE last_used >= CURRENT_DATE - INTERVAL '7 days') as active_users_week
          FROM ai_feature_usage
        `;

        const params: any[] = [];
        if (featureName) {
          query += ' WHERE feature_name = $1';
          params.push(featureName);
        }

        query += ' GROUP BY feature_name ORDER BY total_usage DESC';

        const result = await client.query(query, params);
        return result.rows;
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Get feature analytics error:', error);
      return [];
    }
  }

  /**
   * GET USER'S AI ASSISTANCE LEVEL
   */
  static async getAssistanceLevel(userId: string): Promise<'minimal' | 'helpful' | 'genius'> {
    try {
      const preferences = await this.getUserPreferences(userId);
      return preferences?.ai_assistance_level || 'helpful';
    } catch (error) {
      logger.error('Get assistance level error:', error);
      return 'helpful';
    }
  }

  /**
   * SHOULD SHOW AI SUGGESTION (respects user preferences)
   */
  static async shouldShowSuggestion(
    userId: string, 
    suggestionType: 'recipe' | 'shopping' | 'expiration' | 'meal_plan'
  ): Promise<boolean> {
    try {
      const preferences = await this.getUserPreferences(userId);
      if (!preferences) return false;

      // Check if user has the relevant feature enabled
      switch (suggestionType) {
        case 'recipe':
          return preferences.smart_recipe_suggestions;
        case 'shopping':
          return preferences.shopping_predictions;
        case 'expiration':
          return preferences.expiration_intelligence;
        case 'meal_plan':
          return preferences.auto_meal_planning;
        default:
          return false;
      }
    } catch (error) {
      logger.error('Should show suggestion error:', error);
      return false;
    }
  }

  /**
   * GET SUGGESTION FREQUENCY LIMIT
   */
  static async getSuggestionFrequencyLimit(userId: string): Promise<number> {
    try {
      const preferences = await this.getUserPreferences(userId);
      if (!preferences) return 3; // Default moderate

      switch (preferences.suggestion_frequency) {
        case 'minimal': return 1;   // 1 suggestion per day
        case 'moderate': return 3;  // 3 suggestions per day  
        case 'frequent': return 8;  // 8 suggestions per day
        default: return 3;
      }
    } catch (error) {
      logger.error('Get suggestion frequency limit error:', error);
      return 3;
    }
  }

  /**
   * CHECK DAILY SUGGESTION LIMIT
   */
  static async hasReachedDailySuggestionLimit(
    userId: string, 
    suggestionType: string
  ): Promise<boolean> {
    try {
      const limit = await this.getSuggestionFrequencyLimit(userId);
      
      const client = await pool.connect();
      try {
        const result = await client.query(`
          SELECT COUNT(*) as count
          FROM ai_suggestions_log
          WHERE user_id = $1 
            AND suggestion_type = $2 
            AND suggested_at >= CURRENT_DATE
        `, [userId, suggestionType]);

        const todayCount = parseInt(result.rows[0].count);
        return todayCount >= limit;
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Check daily suggestion limit error:', error);
      return true; // Err on the side of caution
    }
  }
}