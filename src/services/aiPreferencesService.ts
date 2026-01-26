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
   * GET USER AI PREFERENCES
   * Retrieve user's current AI feature preferences
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
   * UPDATE SINGLE PREFERENCE
   * Update a specific AI feature preference
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
   * UPDATE INTELLIGENCE LEVEL
   * Update intelligence level for a category of features
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
   * UPDATE BULK PREFERENCES
   * Update multiple AI preferences at once
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
   * GET FEATURE USAGE ANALYTICS
   * Get analytics about AI feature usage
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
   * TRACK FEATURE USAGE
   * Track usage of an AI feature (called automatically by services)
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
      console.warn('Track feature usage error:', error);
    }
  }

  /**
   * PROVIDE FEATURE FEEDBACK
   * Provide satisfaction feedback for an AI feature
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
   * GET AI RECOMMENDATIONS
   * Get personalized AI feature recommendations
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
   * RESET AI PREFERENCES
   * Reset all AI preferences to defaults
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
   * CHECK FEATURE AVAILABILITY
   * Check if a specific AI feature is available for the user
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
   * GET QUICK SETUP RECOMMENDATIONS
   * Get recommended AI features for quick setup
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