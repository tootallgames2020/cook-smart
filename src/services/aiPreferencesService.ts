import { API_BASE_URL } from '../config/api';
import { getAuthToken } from './authService';

export interface AIPreferences {
  // Voice Features
  voice_commands?: boolean;
  apex_voice_intelligence?: boolean;
  voice_processing?: 'local_only' | 'cloud_enhanced';
  voice_intelligence_level?: 'minimal' | 'helpful' | 'genius';
  
  // Photo Features
  photo_analysis?: boolean;
  receipt_scanning?: boolean;
  photo_intelligence_level?: 'minimal' | 'helpful' | 'genius';
  
  // Nutrition Features
  nutrition_coaching?: boolean;
  meal_optimization?: boolean;
  nutrition_intelligence_level?: 'minimal' | 'helpful' | 'genius';
  
  // Planning Features
  auto_meal_planning?: boolean;
  predictive_analytics?: boolean;
  planning_intelligence_level?: 'minimal' | 'helpful' | 'genius';
  
  // Family Features
  family_coordination?: boolean;
  family_intelligence_level?: 'minimal' | 'helpful' | 'genius';
  
  // Privacy Settings
  data_sharing_consent?: boolean;
  analytics_consent?: boolean;
  personalization_consent?: boolean;
}

export interface FeatureUsage {
  feature_name: string;
  usage_count: number;
  last_used: string;
  satisfaction_score: number;
  total_value_points: number;
}

class AIPreferencesService {
  private baseUrl = `${API_BASE_URL}/api/v1/ai-preferences`;

  /**
   * Retrieve user's current AI feature preferences
   * Returns all AI feature settings including voice, photo, nutrition, planning, and family features
   * 
   * @returns Promise<AIPreferences> - User's AI preferences or default settings if API fails
   * 
   * @example
   * ```typescript
   * const prefs = await aiPreferencesService.getUserPreferences();
   * if (prefs.voice_commands) {
   *   console.log('Voice commands enabled');
   * }
   * console.log('Intelligence level:', prefs.voice_intelligence_level);
   * ```
   */
  async getUserPreferences(): Promise<AIPreferences> {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${this.baseUrl}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Get AI preferences failed: ${response.status}`);
      }

      const data = await response.json();
      return data.preferences || {};
    } catch (error) {
      console.error('Get AI preferences error:', error);
      // Return default preferences if API fails
      return {
        voice_commands: false,
        apex_voice_intelligence: false,
        voice_processing: 'local_only',
        voice_intelligence_level: 'helpful',
        photo_analysis: false,
        receipt_scanning: false,
        photo_intelligence_level: 'helpful',
        nutrition_coaching: false,
        meal_optimization: false,
        nutrition_intelligence_level: 'helpful',
        auto_meal_planning: false,
        predictive_analytics: false,
        planning_intelligence_level: 'helpful',
        family_coordination: false,
        family_intelligence_level: 'helpful',
        data_sharing_consent: false,
        analytics_consent: false,
        personalization_consent: false,
      };
    }
  }

  /**
   * Update a specific AI feature preference
   * Enables or disables a single AI feature
   * 
   * @param featureName - Name of the AI feature to update (e.g., 'voice_commands', 'photo_analysis')
   * @param enabled - True to enable the feature, false to disable
   * @returns Promise<void>
   * @throws Error if update fails
   * 
   * @example
   * ```typescript
   * await aiPreferencesService.updatePreference('voice_commands', true);
   * await aiPreferencesService.updatePreference('photo_analysis', false);
   * ```
   */
  async updatePreference(featureName: string, enabled: boolean): Promise<void> {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${this.baseUrl}/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          feature_name: featureName,
          enabled: enabled,
        }),
      });

      if (!response.ok) {
        throw new Error(`Update AI preference failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Update AI preference error:', error);
      throw error;
    }
  }

  /**
   * Update intelligence level for a category of AI features
   * Controls how advanced the AI assistance is for a specific category
   * 
   * @param category - Feature category ('voice', 'photo', 'nutrition', 'planning', 'family')
   * @param level - Intelligence level ('minimal', 'helpful', 'genius')
   * @returns Promise<void>
   * @throws Error if update fails
   * 
   * @example
   * ```typescript
   * // Set voice features to genius level
   * await aiPreferencesService.updateIntelligenceLevel('voice', 'genius');
   * 
   * // Set photo features to minimal level
   * await aiPreferencesService.updateIntelligenceLevel('photo', 'minimal');
   * ```
   */
  async updateIntelligenceLevel(
    category: 'voice' | 'photo' | 'nutrition' | 'planning' | 'family',
    level: 'minimal' | 'helpful' | 'genius'
  ): Promise<void> {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${this.baseUrl}/intelligence-level`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          category: category,
          intelligence_level: level,
        }),
      });

      if (!response.ok) {
        throw new Error(`Update intelligence level failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Update intelligence level error:', error);
      throw error;
    }
  }

  /**
   * Update multiple AI preferences at once
   * Efficient way to update several preferences in a single API call
   * 
   * @param preferences - Partial preferences object with settings to update
   * @returns Promise<void>
   * @throws Error if bulk update fails
   * 
   * @example
   * ```typescript
   * await aiPreferencesService.updateBulkPreferences({
   *   voice_commands: true,
   *   photo_analysis: true,
   *   voice_intelligence_level: 'genius',
   *   photo_intelligence_level: 'helpful'
   * });
   * ```
   */
  async updateBulkPreferences(preferences: Partial<AIPreferences>): Promise<void> {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${this.baseUrl}/bulk-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ preferences }),
      });

      if (!response.ok) {
        throw new Error(`Bulk update AI preferences failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Bulk update AI preferences error:', error);
      throw error;
    }
  }

  /**
   * Get analytics about AI feature usage
   * Returns usage statistics for all AI features including usage count and satisfaction scores
   * 
   * @returns Promise<FeatureUsage[]> - Array of feature usage statistics or empty array if API fails
   * 
   * @example
   * ```typescript
   * const usage = await aiPreferencesService.getFeatureUsage();
   * usage.forEach(feature => {
   *   console.log(`${feature.feature_name}: ${feature.usage_count} uses`);
   *   console.log(`Satisfaction: ${feature.satisfaction_score}/5`);
   * });
   * ```
   */
  async getFeatureUsage(): Promise<FeatureUsage[]> {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${this.baseUrl}/usage`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Get feature usage failed: ${response.status}`);
      }

      const data = await response.json();
      return data.usage || [];
    } catch (error) {
      console.error('Get feature usage error:', error);
      return [];
    }
  }

  /**
   * Track usage of an AI feature
   * Called automatically by services when AI features are used
   * Does not throw errors to avoid disrupting feature functionality
   * 
   * @param featureName - Name of the AI feature being used
   * @param valuePoints - Value points to award for this usage (default: 1)
   * @returns Promise<void>
   * @private
   * 
   * @example
   * ```typescript
   * // Called internally by voice service
   * await aiPreferencesService.trackFeatureUsage('voice_commands', 1);
   * 
   * // Called internally by photo service with higher value
   * await aiPreferencesService.trackFeatureUsage('photo_analysis', 5);
   * ```
   */
  async trackFeatureUsage(featureName: string, valuePoints: number = 1): Promise<void> {
    try {
      const token = await getAuthToken();
      await fetch(`${this.baseUrl}/track-usage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          feature_name: featureName,
          value_points: valuePoints,
        }),
      });
    } catch (error) {
      // Don't throw error for tracking - it's not critical
    }
  }

  /**
   * Provide satisfaction feedback for an AI feature
   * Allows users to rate their experience with AI features
   * 
   * @param featureName - Name of the AI feature to provide feedback for
   * @param satisfactionScore - Satisfaction rating (1-5 scale)
   * @param feedback - Optional text feedback
   * @returns Promise<void>
   * @throws Error if feedback submission fails
   * 
   * @example
   * ```typescript
   * await aiPreferencesService.provideFeatureFeedback(
   *   'voice_commands',
   *   5,
   *   'Works perfectly while cooking!'
   * );
   * ```
   */
  async provideFeatureFeedback(
    featureName: string,
    satisfactionScore: number,
    feedback?: string
  ): Promise<void> {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${this.baseUrl}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          feature_name: featureName,
          satisfaction_score: satisfactionScore,
          feedback: feedback,
        }),
      });

      if (!response.ok) {
        throw new Error(`Provide feature feedback failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Provide feature feedback error:', error);
      throw error;
    }
  }

  /**
   * Get personalized AI feature recommendations
   * Returns suggestions for AI features the user might find useful based on their usage patterns
   * 
   * @returns Promise<any[]> - Array of AI feature recommendations or empty array if API fails
   * 
   * @example
   * ```typescript
   * const recommendations = await aiPreferencesService.getAIRecommendations();
   * recommendations.forEach(rec => {
   *   console.log(`Try ${rec.feature_name}: ${rec.reason}`);
   * });
   * ```
   */
  async getAIRecommendations(): Promise<any[]> {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${this.baseUrl}/recommendations`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Get AI recommendations failed: ${response.status}`);
      }

      const data = await response.json();
      return data.recommendations || [];
    } catch (error) {
      console.error('Get AI recommendations error:', error);
      return [];
    }
  }

  /**
   * Reset all AI preferences to default values
   * Disables all AI features and resets intelligence levels to 'helpful'
   * 
   * @returns Promise<void>
   * @throws Error if reset fails
   * 
   * @example
   * ```typescript
   * await aiPreferencesService.resetPreferences();
   * console.log('All AI preferences reset to defaults');
   * ```
   */
  async resetPreferences(): Promise<void> {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${this.baseUrl}/reset`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Reset AI preferences failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Reset AI preferences error:', error);
      throw error;
    }
  }

  /**
   * Check if a specific AI feature is currently enabled for the user
   * Useful for conditional feature rendering
   * 
   * @param featureName - Name of the AI feature to check
   * @returns Promise<boolean> - True if feature is enabled, false otherwise
   * 
   * @example
   * ```typescript
   * const canUseVoice = await aiPreferencesService.isFeatureAvailable('voice_commands');
   * if (canUseVoice) {
   *   // Show voice command button
   * }
   * ```
   */
  async isFeatureAvailable(featureName: string): Promise<boolean> {
    try {
      const preferences = await this.getUserPreferences();
      return preferences[featureName as keyof AIPreferences] === true;
    } catch (error) {
      console.error('Check feature availability error:', error);
      return false;
    }
  }

  /**
   * Get recommended AI features for quick setup
   * Returns a curated list of AI features with descriptions and benefits for onboarding
   * 
   * @returns Array of recommended AI features with display information
   * 
   * @example
   * ```typescript
   * const recommendations = aiPreferencesService.getQuickSetupRecommendations();
   * recommendations.forEach(rec => {
   *   console.log(`${rec.display_name}: ${rec.description}`);
   *   console.log('Benefits:', rec.benefits.join(', '));
   * });
   * ```
   */
  getQuickSetupRecommendations(): { 
    feature: string; 
    display_name: string; 
    description: string; 
    recommended_level: string;
    benefits: string[];
  }[] {
    return [
      {
        feature: 'voice_commands',
        display_name: 'Voice Commands',
        description: 'Hands-free cooking with voice control',
        recommended_level: 'helpful',
        benefits: [
          'Update ingredients while cooking',
          'Add items to shopping list',
          'Get recipe help hands-free',
        ],
      },
      {
        feature: 'photo_analysis',
        display_name: 'Photo Analysis',
        description: 'Analyze food photos for nutrition and ingredients',
        recommended_level: 'helpful',
        benefits: [
          'Scan receipts to update inventory',
          'Identify ingredients in photos',
          'Track nutrition from food photos',
        ],
      },
      {
        feature: 'auto_meal_planning',
        display_name: 'Auto Meal Planning',
        description: 'AI-generated weekly meal plans',
        recommended_level: 'helpful',
        benefits: [
          'Save time on meal planning',
          'Balanced nutrition automatically',
          'Use ingredients you already have',
        ],
      },
      {
        feature: 'family_coordination',
        display_name: 'Family Coordination',
        description: 'Smart family meal coordination',
        recommended_level: 'helpful',
        benefits: [
          'Coordinate family meals',
          'Share shopping lists',
          'Notify family about meals',
        ],
      },
    ];
  }
}

export const aiPreferencesService = new AIPreferencesService();
export default aiPreferencesService;