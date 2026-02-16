/**
 * Universal Feedback Service for React Native
 * Handles all user feedback across the mobile app to improve AI accuracy
 * Implements machine learning feedback loop for continuous improvement
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

/**
 * Service for collecting and processing user feedback
 * Enables continuous improvement of AI features through user corrections
 */
class FeedbackService {
  
  /**
   * Submit user feedback for any feature
   * Core method for all feedback submission - other methods are convenience wrappers
   * 
   * @param feedback - Feedback submission data
   * @param feedback.feedbackType - Type of feedback (e.g., 'ingredient_category', 'recipe_match')
   * @param feedback.featureArea - Feature area (e.g., 'ingredients', 'recipes', 'dietary')
   * @param feedback.originalData - Original system output that needs correction
   * @param feedback.correctedData - User's corrected data
   * @param feedback.contextData - Optional additional context
   * @param feedback.confidenceScore - User's confidence in correction (0-1, default: 1.0)
   * @returns Promise with success status, message, and optional points awarded
   * 
   * @example
   * ```typescript
   * const result = await feedbackService.submitFeedback({
   *   feedbackType: 'ingredient_category',
   *   featureArea: 'ingredients',
   *   originalData: { ingredient_name: 'tomato', category: 'vegetable' },
   *   correctedData: { category: 'fruit' },
   *   confidenceScore: 1.0
   * });
   * if (result.success) {
   *   console.log(`Feedback submitted! Earned ${result.pointsAwarded} points`);
   * }
   * ```
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
   * Returns patterns learned from user feedback that can improve system decisions
   * 
   * @param patternType - Type of pattern to retrieve (e.g., 'ingredient_category', 'recipe_match')
   * @param minConfidence - Minimum confidence threshold (0-100, default: 60)
   * @returns Promise<LearningPattern[]> - Array of learned patterns or empty array if none found
   * 
   * @example
   * ```typescript
   * const patterns = await feedbackService.getLearningPatterns('ingredient_category', 80);
   * patterns.forEach(pattern => {
   *   console.log(`${pattern.patternKey}: ${pattern.learnedValue} (${pattern.confidence}% confidence)`);
   *   console.log(`Based on ${pattern.evidenceCount} corrections`);
   * });
   * ```
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
   * Uses learned patterns to provide better default values
   * 
   * @param patternType - Type of pattern to apply
   * @param inputKey - Key to look up learned value
   * @param defaultValue - Fallback value if no learning available
   * @returns Promise<any> - Improved value if learning exists, otherwise defaultValue
   * 
   * @example
   * ```typescript
   * // Get improved category for an ingredient
   * const category = await feedbackService.applyLearning(
   *   'ingredient_category',
   *   'tomato',
   *   'vegetable' // default
   * );
   * console.log(`Category: ${category}`); // May return 'fruit' if learned
   * ```
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
   * Returns breakdown of feedback by type and overall impact metrics
   * 
   * @returns Promise<UserFeedbackStats | null> - User's feedback statistics or null if not authenticated
   * 
   * @example
   * ```typescript
   * const stats = await feedbackService.getUserFeedbackStats();
   * if (stats) {
   *   console.log(`Total feedback: ${stats.overall.totalFeedback}`);
   *   console.log(`Applied: ${stats.overall.totalApplied}`);
   *   console.log(`Impact rate: ${stats.overall.impactRate}%`);
   *   stats.byType.forEach(type => {
   *     console.log(`${type.feedbackType}: ${type.count} submissions`);
   *   });
   * }
   * ```
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
   * Returns paginated list of all feedback submitted by the user
   * 
   * @param limit - Maximum number of items to return (default: 50)
   * @param offset - Number of items to skip for pagination (default: 0)
   * @returns Promise with feedback array and total count, or null if not authenticated
   * 
   * @example
   * ```typescript
   * const result = await feedbackService.getUserFeedbackHistory(20, 0);
   * if (result) {
   *   console.log(`Showing ${result.feedback.length} of ${result.totalCount} items`);
   *   result.feedback.forEach(item => {
   *     console.log(`${item.feedbackType}: ${item.feedbackQuality} quality`);
   *   });
   * }
   * ```
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
   * Analyzes feedback to determine how accurate the system is for a specific feature
   * 
   * @param feedbackType - Type of feedback to validate (e.g., 'ingredient_category')
   * @returns Promise with accuracy metrics and recommendations, or null if not authenticated
   * 
   * @example
   * ```typescript
   * const validation = await feedbackService.validateSystemAccuracy('ingredient_category');
   * if (validation) {
   *   console.log(`Accuracy: ${validation.accuracy}%`);
   *   console.log(`Based on ${validation.totalSamples} samples`);
   *   validation.recommendedActions.forEach(action => {
   *     console.log(`Recommendation: ${action}`);
   *   });
   * }
   * ```
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

  /**
   * Submit ingredient categorization feedback
   * Convenience method for correcting ingredient category classifications
   * 
   * @param ingredientName - Name of the ingredient
   * @param originalCategory - Category assigned by system
   * @param correctedCategory - Correct category
   * @param confidence - User's confidence in correction (0-1, default: 1.0)
   * @returns Promise with success status and points awarded
   * 
   * @example
   * ```typescript
   * const result = await feedbackService.submitIngredientCategorizationFeedback(
   *   'tomato',
   *   'vegetable',
   *   'fruit',
   *   1.0
   * );
   * console.log(result.message);
   * ```
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
   * Provides feedback on recipe recommendation quality
   * 
   * @param recipeId - ID of the recommended recipe
   * @param userIngredients - Ingredients user had available
   * @param matchQuality - Predicted match quality (0-100)
   * @param actualSuccess - Whether recipe actually worked well
   * @param confidence - User's confidence in feedback (0-1, default: 1.0)
   * @returns Promise with success status and points awarded
   * 
   * @example
   * ```typescript
   * const result = await feedbackService.submitRecipeMatchFeedback(
   *   'recipe_123',
   *   ['chicken', 'rice', 'broccoli'],
   *   85,
   *   true,
   *   1.0
   * );
   * ```
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
   * Reports missed allergens or dietary flags
   * 
   * @param ingredientName - Name of the ingredient
   * @param missedAllergen - Allergen that was not detected
   * @param severity - Severity level ('mild', 'moderate', 'severe')
   * @param confidence - User's confidence in feedback (0-1, default: 1.0)
   * @returns Promise with success status and points awarded
   * 
   * @example
   * ```typescript
   * const result = await feedbackService.submitDietaryFlagFeedback(
   *   'wheat flour',
   *   'gluten',
   *   'severe',
   *   1.0
   * );
   * ```
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
   * Corrects estimated cooking times based on actual experience
   * 
   * @param recipeId - ID of the recipe
   * @param estimatedTime - System's estimated time in minutes
   * @param actualTime - Actual time taken in minutes
   * @param confidence - User's confidence in feedback (0-1, default: 1.0)
   * @returns Promise with success status and points awarded
   * 
   * @example
   * ```typescript
   * const result = await feedbackService.submitCookingTimeFeedback(
   *   'recipe_123',
   *   30,
   *   45,
   *   1.0
   * );
   * ```
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
   * Corrects recipe difficulty ratings based on user experience
   * 
   * @param recipeId - ID of the recipe
   * @param estimatedDifficulty - System's estimated difficulty
   * @param actualDifficulty - Actual difficulty experienced
   * @param confidence - User's confidence in feedback (0-1, default: 1.0)
   * @returns Promise with success status and points awarded
   * 
   * @example
   * ```typescript
   * const result = await feedbackService.submitDifficultyFeedback(
   *   'recipe_123',
   *   'easy',
   *   'medium',
   *   1.0
   * );
   * ```
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
   * Reports whether an ingredient substitution worked well
   * 
   * @param originalIngredient - Original ingredient in recipe
   * @param substitutedIngredient - Ingredient used as substitute
   * @param recipeType - Type of recipe (e.g., 'baking', 'soup')
   * @param success - Whether substitution worked well
   * @param notes - Additional notes about the substitution
   * @param confidence - User's confidence in feedback (0-1, default: 1.0)
   * @returns Promise with success status and points awarded
   * 
   * @example
   * ```typescript
   * const result = await feedbackService.submitSubstitutionFeedback(
   *   'butter',
   *   'olive oil',
   *   'baking',
   *   false,
   *   'Cake texture was too dense',
   *   1.0
   * );
   * ```
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

  /**
   * Submit general feedback
   * Legacy compatibility method for existing screens
   * 
   * @param feedback - Feedback object with message, rating, and category
   * @returns Promise with success status and points awarded
   * @private
   * 
   * @example
   * ```typescript
   * const result = await feedbackService.submitGeneralFeedback({
   *   message: 'Love the new recipe search!',
   *   rating: 5,
   *   category: 'recipes'
   * });
   * ```
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
   * Get user's feedback history
   * Legacy compatibility method for existing screens
   * 
   * @returns Promise<any[]> - Array of user's feedback submissions
   * @private
   * 
   * @example
   * ```typescript
   * const myFeedback = await feedbackService.getMyFeedback();
   * console.log(`You've submitted ${myFeedback.length} feedback items`);
   * ```
   */
  async getMyFeedback(): Promise<any[]> {
    const result = await this.getUserFeedbackHistory(50, 0);
    return result?.feedback || [];
  }
}

export const feedbackService = new FeedbackService();
export default feedbackService;