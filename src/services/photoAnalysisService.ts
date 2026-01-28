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

class PhotoAnalysisService {
  private baseUrl = `${API_BASE_URL}/api/v1/photo-analysis`;

  /**
   * ANALYZE MEAL PHOTO
   * Analyze a meal photo for nutrition information
   */
  async analyzeMealPhoto(base64Image: string): Promise<PhotoAnalysisResult> {
    try {
      console.log('🔍 Starting meal photo analysis...');
      const token = await getAuthToken();
      console.log('🔑 Auth token:', token ? 'Found' : 'Missing');
      
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

      console.log('📡 Response status:', response.status);
      console.log('📡 Response URL:', response.url);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Response error:', errorText);
        throw new Error(`Meal analysis failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Analysis result:', data);
      return data;
    } catch (error) {
      console.error('Meal photo analysis error:', error);
      throw error;
    }
  }

  /**
   * SCAN RECEIPT
   * Scan a grocery receipt to update inventory
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
   * ANALYZE PANTRY PHOTO
   * Analyze pantry/fridge photo for inventory management
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
   * IDENTIFY INGREDIENT
   * Identify a single ingredient from photo
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
   * GET PHOTO ANALYSIS HISTORY
   * Get user's photo analysis history
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
   * PROVIDE ANALYSIS FEEDBACK
   * Provide feedback on photo analysis accuracy
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
   * GET ANALYSIS INSIGHTS
   * Get insights about photo analysis usage
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
   * BATCH ANALYZE PHOTOS
   * Analyze multiple photos at once
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
   * GET SUPPORTED FOODS
   * Get list of foods that can be recognized
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