import { API_BASE_URL } from '../config/api';
import { getAuthToken } from './authService';

export interface PhotoAnalysisResult {
  success: boolean;
  analysis_type: 'meal' | 'receipt' | 'pantry' | 'ingredient';
  detected_foods?: DetectedFood[];
  nutrition_summary?: NutritionSummary;
  detected_items?: ReceiptItem[];
  detected_ingredients?: DetectedIngredient[];
  identified_food?: IdentifiedFood;
  confidence: number;
  processing_time_ms: number;
}

export interface DetectedFood {
  name: string;
  confidence: number;
  portion_size?: string;
  nutrition?: NutritionSummary;
}

export interface NutritionSummary {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}

export interface ReceiptItem {
  name: string;
  price: number;
  quantity?: number;
  category?: string;
  matched_ingredient?: string;
}

export interface DetectedIngredient {
  name: string;
  estimated_quantity: string;
  confidence: number;
  expiration_estimate?: string;
}

export interface IdentifiedFood {
  name: string;
  confidence: number;
  category: string;
  nutrition?: NutritionSummary;
  storage_tips?: string[];
}

/**
 * Service for analyzing photos using AI
 * Handles meal analysis, receipt scanning, pantry inventory, and ingredient identification
 */
class PhotoAnalysisService {
  private baseUrl = `${API_BASE_URL}/api/v1/photo-analysis`;

  /**
   * Analyze a meal photo for nutrition information
   * Detects foods in the photo and provides nutritional breakdown
   * 
   * @param base64Image - Base64 encoded image data
   * @returns Promise<PhotoAnalysisResult> - Analysis result with detected foods and nutrition
   * @throws Error if analysis fails
   * 
   * @example
   * ```typescript
   * const result = await photoAnalysisService.analyzeMealPhoto(base64ImageData);
   * if (result.success) {
   *   result.detected_foods?.forEach(food => {
   *     console.log(`${food.name}: ${food.nutrition?.calories} calories`);
   *   });
   * }
   * ```
   */
  async analyzeMealPhoto(base64Image: string): Promise<PhotoAnalysisResult> {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${this.baseUrl}/analyze-meal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          image_data: base64Image,
          analysis_options: {
            include_nutrition: true,
            include_portions: true,
            confidence_threshold: 0.7,
          },
        }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Response error:', errorText);
        throw new Error(`Meal analysis failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Meal photo analysis error:', error);
      throw error;
    }
  }

  /**
   * Scan a grocery receipt to extract items and update inventory
   * Automatically adds detected items to user's ingredient inventory
   * 
   * @param base64Image - Base64 encoded receipt image
   * @returns Promise<PhotoAnalysisResult> - Scan result with detected items and prices
   * @throws Error if scan fails
   * 
   * @example
   * ```typescript
   * const result = await photoAnalysisService.scanReceipt(receiptImageData);
   * if (result.success) {
   *   console.log(`Found ${result.detected_items?.length} items`);
   *   result.detected_items?.forEach(item => {
   *     console.log(`${item.name}: $${item.price}`);
   *   });
   * }
   * ```
   */
  async scanReceipt(base64Image: string): Promise<PhotoAnalysisResult> {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${this.baseUrl}/scan-receipt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          image_data: base64Image,
          scan_options: {
            auto_add_to_inventory: true,
            match_existing_ingredients: true,
            extract_prices: true,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Receipt scan failed: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Receipt scan error:', error);
      throw error;
    }
  }

  /**
   * Analyze pantry or fridge photo for inventory management
   * Detects ingredients and estimates quantities for inventory tracking
   * 
   * @param base64Image - Base64 encoded pantry/fridge image
   * @returns Promise<PhotoAnalysisResult> - Analysis result with detected ingredients and quantities
   * @throws Error if analysis fails
   * 
   * @example
   * ```typescript
   * const result = await photoAnalysisService.analyzePantryPhoto(pantryImageData);
   * if (result.success) {
   *   result.detected_ingredients?.forEach(ingredient => {
   *     console.log(`${ingredient.name}: ${ingredient.estimated_quantity}`);
   *   });
   * }
   * ```
   */
  async analyzePantryPhoto(base64Image: string): Promise<PhotoAnalysisResult> {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${this.baseUrl}/analyze-pantry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          image_data: base64Image,
          analysis_options: {
            estimate_quantities: true,
            check_freshness: true,
            suggest_recipes: true,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Pantry analysis failed: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Pantry photo analysis error:', error);
      throw error;
    }
  }

  /**
   * Identify a single ingredient from a photo
   * Provides detailed information including nutrition and storage tips
   * 
   * @param base64Image - Base64 encoded ingredient image
   * @returns Promise<PhotoAnalysisResult> - Identification result with ingredient details
   * @throws Error if identification fails
   * 
   * @example
   * ```typescript
   * const result = await photoAnalysisService.identifyIngredient(ingredientImageData);
   * if (result.success && result.identified_food) {
   *   console.log(`Identified: ${result.identified_food.name}`);
   *   console.log(`Category: ${result.identified_food.category}`);
   *   console.log(`Storage tips:`, result.identified_food.storage_tips);
   * }
   * ```
   */
  async identifyIngredient(base64Image: string): Promise<PhotoAnalysisResult> {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${this.baseUrl}/identify-ingredient`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          image_data: base64Image,
          identification_options: {
            include_nutrition: true,
            include_storage_tips: true,
            confidence_threshold: 0.8,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ingredient identification failed: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Ingredient identification error:', error);
      throw error;
    }
  }

  /**
   * Get user's photo analysis history
   * Returns previous photo analyses for review and tracking
   * 
   * @param limit - Maximum number of history items to return (default: 50)
   * @returns Promise<PhotoAnalysisResult[]> - Array of previous analyses or empty array if API fails
   * @throws Error if request fails
   * 
   * @example
   * ```typescript
   * const history = await photoAnalysisService.getAnalysisHistory(20);
   * history.forEach(analysis => {
   *   console.log(`${analysis.analysis_type}: ${analysis.confidence}% confidence`);
   * });
   * ```
   */
  async getAnalysisHistory(limit: number = 50): Promise<PhotoAnalysisResult[]> {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${this.baseUrl}/history?limit=${limit}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Get analysis history failed: ${response.status}`);
      }

      const data = await response.json();
      return data.history || [];
    } catch (error) {
      console.error('Get analysis history error:', error);
      throw error;
    }
  }

  /**
   * Provide feedback on photo analysis accuracy
   * Helps improve AI accuracy by reporting correct and incorrect detections
   * 
   * @param analysisId - ID of the analysis to provide feedback for
   * @param feedback - Feedback object with accuracy rating and corrections
   * @param feedback.accuracy_rating - Rating from 1-5
   * @param feedback.correct_foods - Array of correctly identified foods
   * @param feedback.incorrect_foods - Array of incorrectly identified foods
   * @param feedback.missing_foods - Array of foods that were missed
   * @param feedback.comments - Additional feedback comments
   * @returns Promise<void>
   * @throws Error if feedback submission fails
   * 
   * @example
   * ```typescript
   * await photoAnalysisService.provideAnalysisFeedback('analysis_123', {
   *   accuracy_rating: 4,
   *   correct_foods: ['chicken', 'rice'],
   *   incorrect_foods: ['broccoli'], // was actually asparagus
   *   missing_foods: ['carrots'],
   *   comments: 'Good overall but missed the carrots'
   * });
   * ```
   */
  async provideAnalysisFeedback(
    analysisId: string,
    feedback: {
      accuracy_rating: number; // 1-5
      correct_foods?: string[];
      incorrect_foods?: string[];
      missing_foods?: string[];
      comments?: string;
    }
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
          analysis_id: analysisId,
          ...feedback,
        }),
      });

      if (!response.ok) {
        throw new Error(`Provide feedback failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Provide analysis feedback error:', error);
      throw error;
    }
  }

  /**
   * Get insights about photo analysis usage
   * Returns statistics and patterns about user's photo analysis activity
   * 
   * @returns Promise<any> - Insights object with usage statistics
   * @throws Error if request fails
   * 
   * @example
   * ```typescript
   * const insights = await photoAnalysisService.getAnalysisInsights();
   * console.log(`Total analyses: ${insights.total_analyses}`);
   * console.log(`Most analyzed type: ${insights.most_common_type}`);
   * console.log(`Average confidence: ${insights.average_confidence}%`);
   * ```
   */
  async getAnalysisInsights(): Promise<any> {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${this.baseUrl}/insights`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Get analysis insights failed: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Get analysis insights error:', error);
      throw error;
    }
  }

  /**
   * Analyze multiple photos at once
   * Efficient batch processing for multiple images
   * 
   * @param photos - Array of photos with image data and analysis type
   * @returns Promise<PhotoAnalysisResult[]> - Array of analysis results or empty array if API fails
   * @throws Error if batch analysis fails
   * 
   * @example
   * ```typescript
   * const results = await photoAnalysisService.batchAnalyzePhotos([
   *   { image_data: mealImage1, analysis_type: 'meal' },
   *   { image_data: mealImage2, analysis_type: 'meal' },
   *   { image_data: receiptImage, analysis_type: 'receipt' }
   * ]);
   * console.log(`Analyzed ${results.length} photos`);
   * ```
   */
  async batchAnalyzePhotos(
    photos: { image_data: string; analysis_type: 'meal' | 'receipt' | 'pantry' | 'ingredient' }[]
  ): Promise<PhotoAnalysisResult[]> {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${this.baseUrl}/batch-analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ photos }),
      });

      if (!response.ok) {
        throw new Error(`Batch analysis failed: ${response.status}`);
      }

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Batch photo analysis error:', error);
      throw error;
    }
  }

  /**
   * Get list of foods that can be recognized by the AI
   * Useful for showing users what the system can identify
   * 
   * @returns Promise<string[]> - Array of supported food names or empty array if API fails
   * 
   * @example
   * ```typescript
   * const supportedFoods = await photoAnalysisService.getSupportedFoods();
   * console.log(`Can recognize ${supportedFoods.length} different foods`);
   * console.log('Examples:', supportedFoods.slice(0, 10).join(', '));
   * ```
   */
  async getSupportedFoods(): Promise<string[]> {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${this.baseUrl}/supported-foods`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Get supported foods failed: ${response.status}`);
      }

      const data = await response.json();
      return data.foods || [];
    } catch (error) {
      console.error('Get supported foods error:', error);
      return [];
    }
  }
}

export const photoAnalysisService = new PhotoAnalysisService();
export default photoAnalysisService;