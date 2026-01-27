/**
 * Universal Feedback Service for React Native
 * 
 * Handles all user feedback across the mobile app
 */

import { API_BASE_URL } from '../config/api';
import { getAuthToken } from './authService';

export interface FeedbackSubmission {
  feedbackType: string;
  featureArea: string;
  originalData: any;
  correctedData: any;
  contextData?: any;
  confidenceScore?: number;
}

export interface LearningPattern {
  patternKey: string;
  learnedValue: any;
  confidence: number;
  evidenceCount: number;
  lastSeen: Date;
}

export interface FeedbackAnalytics {
  feedbackType: string;
  date: string;
  totalFeedback: number;
  positiveFeedback: number;
  appliedCorrections: number;
  systemAccuracy: number;
  avgConfidence: number;
  satisfactionRate: number;
  activePatterns: number;
}

export interface UserFeedbackStats {
  byType: Array<{
    feedbackType: string;
    count: number;
    avgConfidence: number;
    appliedCount: number;
  }>;
  overall: {
    totalFeedback: number;
    totalApplied: number;
    overallConfidence: number;
    impactRate: number;
  };
}

class FeedbackService {
  
  /**
   * Submit user feedback for any feature
   */
  async submitFeedback(feedback: FeedbackSubmission): Promise<{ success: boolean; message: string; pointsAwarded?: number }> {
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          feedback_type: feedback.feedbackType,
          feature_area: feedback.featureArea,
          original_data: feedback.originalData,
          corrected_data: feedback.correctedData,
          context_data: feedback.contextData,
          confidence_score: feedback.confidenceScore || 1.0,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit feedback');
      }

      return {
        success: true,
        message: data.message,
        pointsAwarded: data.points_awarded,
      };
    } catch (error) {
      console.error('Error submitting feedback:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to submit feedback',
      };
    }
  }

  /**
   * Get learning patterns for a specific feature
   */
  async getLearningPatterns(patternType: string, minConfidence: number = 60): Promise<LearningPattern[]> {
    try {
      const token = await getAuthToken();
      if (!token) {
        return [];
      }

      const response = await fetch(
        `${API_BASE_URL}/api/v1/feedback/patterns/${patternType}?min_confidence=${minConfidence}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to get learning patterns');
      }

      return data.patterns || [];
    } catch (error) {
      console.error('Error getting learning patterns:', error);
      return [];
    }
  }

  /**
   * Apply learning to improve a system decision
   */
  async applyLearning(patternType: string, inputKey: string, defaultValue: any): Promise<any> {
    try {
      const token = await getAuthToken();
      if (!token) {
        return defaultValue;
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/feedback/apply-learning`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          pattern_type: patternType,
          input_key: inputKey,
          default_value: defaultValue,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        return defaultValue;
      }

      return data.learning_applied ? data.improved_value : defaultValue;
    } catch (error) {
      console.error('Error applying learning:', error);
      return defaultValue;
    }
  }

  /**
   * Get user's feedback statistics
   */
  async getUserFeedbackStats(): Promise<UserFeedbackStats | null> {
    try {
      const token = await getAuthToken();
      if (!token) {
        return null;
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/feedback/my-stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to get feedback stats');
      }

      return {
        byType: data.by_type,
        overall: data.overall,
      };
    } catch (error) {
      console.error('Error getting user feedback stats:', error);
      return null;
    }
  }

  /**
   * Get user's feedback history
   */
  async getUserFeedbackHistory(limit: number = 50, offset: number = 0): Promise<{
    feedback: Array<{
      feedbackType: string;
      featureArea: string;
      originalData: any;
      correctedData: any;
      confidenceScore: number;
      feedbackQuality: string;
      createdAt: string;
    }>;
    totalCount: number;
  } | null> {
    try {
      const token = await getAuthToken();
      if (!token) {
        return null;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/v1/feedback/my-feedback?limit=${limit}&offset=${offset}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to get feedback history');
      }

      return {
        feedback: data.feedback,
        totalCount: data.total_count,
      };
    } catch (error) {
      console.error('Error getting feedback history:', error);
      return null;
    }
  }

  /**
   * Validate system accuracy for a feature
   */
  async validateSystemAccuracy(feedbackType: string): Promise<{
    accuracy: number;
    totalSamples: number;
    recommendedActions: string[];
  } | null> {
    try {
      const token = await getAuthToken();
      if (!token) {
        return null;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/v1/feedback/accuracy/${feedbackType}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to validate accuracy');
      }

      return data.validation;
    } catch (error) {
      console.error('Error validating system accuracy:', error);
      return null;
    }
  }

  // Convenience methods for specific feedback types

  /**
   * Submit ingredient categorization feedback
   */
  async submitIngredientCategorizationFeedback(
    ingredientName: string,
    originalCategory: string,
    correctedCategory: string,
    confidence: number = 1.0
  ): Promise<{ success: boolean; message: string; pointsAwarded?: number }> {
    return this.submitFeedback({
      feedbackType: 'ingredient_category',
      featureArea: 'ingredients',
      originalData: { ingredient_name: ingredientName, category: originalCategory },
      correctedData: { category: correctedCategory },
      confidenceScore: confidence,
    });
  }

  /**
   * Submit recipe matching feedback
   */
  async submitRecipeMatchFeedback(
    recipeId: string,
    userIngredients: string[],
    matchQuality: number,
    actualSuccess: boolean,
    confidence: number = 1.0
  ): Promise<{ success: boolean; message: string; pointsAwarded?: number }> {
    return this.submitFeedback({
      feedbackType: 'recipe_match',
      featureArea: 'recipes',
      originalData: { 
        recipe_id: recipeId, 
        predicted_match: matchQuality,
        user_ingredients: userIngredients 
      },
      correctedData: { 
        actual_success: actualSuccess,
        user_rating: matchQuality 
      },
      confidenceScore: confidence,
    });
  }

  /**
   * Submit dietary restriction feedback
   */
  async submitDietaryFlagFeedback(
    ingredientName: string,
    missedAllergen: string,
    severity: 'mild' | 'moderate' | 'severe',
    confidence: number = 1.0
  ): Promise<{ success: boolean; message: string; pointsAwarded?: number }> {
    return this.submitFeedback({
      feedbackType: 'dietary_flag',
      featureArea: 'dietary',
      originalData: { 
        ingredient_name: ingredientName,
        detected_allergens: [] 
      },
      correctedData: { 
        missed_allergen: missedAllergen,
        severity: severity 
      },
      confidenceScore: confidence,
    });
  }

  /**
   * Submit cooking time feedback
   */
  async submitCookingTimeFeedback(
    recipeId: string,
    estimatedTime: number,
    actualTime: number,
    confidence: number = 1.0
  ): Promise<{ success: boolean; message: string; pointsAwarded?: number }> {
    return this.submitFeedback({
      feedbackType: 'cooking_time',
      featureArea: 'recipes',
      originalData: { 
        recipe_id: recipeId,
        estimated_minutes: estimatedTime 
      },
      correctedData: { 
        actual_minutes: actualTime 
      },
      confidenceScore: confidence,
    });
  }

  /**
   * Submit difficulty rating feedback
   */
  async submitDifficultyFeedback(
    recipeId: string,
    estimatedDifficulty: string,
    actualDifficulty: string,
    confidence: number = 1.0
  ): Promise<{ success: boolean; message: string; pointsAwarded?: number }> {
    return this.submitFeedback({
      feedbackType: 'difficulty_rating',
      featureArea: 'recipes',
      originalData: { 
        recipe_id: recipeId,
        estimated_difficulty: estimatedDifficulty 
      },
      correctedData: { 
        actual_difficulty: actualDifficulty 
      },
      confidenceScore: confidence,
    });
  }

  /**
   * Submit substitution success feedback
   */
  async submitSubstitutionFeedback(
    originalIngredient: string,
    substitutedIngredient: string,
    recipeType: string,
    success: boolean,
    notes: string,
    confidence: number = 1.0
  ): Promise<{ success: boolean; message: string; pointsAwarded?: number }> {
    return this.submitFeedback({
      feedbackType: 'substitution_success',
      featureArea: 'ingredients',
      originalData: { 
        original_ingredient: originalIngredient,
        substitute_ingredient: substitutedIngredient,
        recipe_type: recipeType 
      },
      correctedData: { 
        success: success,
        notes: notes 
      },
      confidenceScore: confidence,
    });
  }

  // Legacy compatibility methods for existing screens

  /**
   * Legacy method for general feedback (compatibility)
   */
  async submitGeneralFeedback(feedback: any): Promise<{ success: boolean; message: string; pointsAwarded?: number }> {
    // Convert legacy format to new format
    const legacyFeedback = feedback as {
      message: string;
      rating?: number;
      category?: string;
    };

    return this.submitFeedback({
      feedbackType: 'general_feedback',
      featureArea: legacyFeedback.category || 'general',
      originalData: {},
      correctedData: {
        message: legacyFeedback.message,
        rating: legacyFeedback.rating,
      },
      confidenceScore: 1.0,
    });
  }

  /**
   * Legacy method to get user feedback (compatibility)
   */
  async getMyFeedback(): Promise<any[]> {
    const result = await this.getUserFeedbackHistory(50, 0);
    return result?.feedback || [];
  }
}

export const feedbackService = new FeedbackService();
export default feedbackService;