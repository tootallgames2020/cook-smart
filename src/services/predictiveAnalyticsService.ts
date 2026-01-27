import { API_BASE_URL } from '../config/api';

export interface PredictiveAnalysisRequest {
  analysis_type: 'consumption' | 'shopping' | 'waste' | 'budget' | 'seasonal' | 'family_insights';
  time_horizon_days: number;
  include_confidence_intervals?: boolean;
}

export interface PredictiveAnalysisResult {
  success: boolean;
  analysis_type: string;
  time_horizon_days: number;
  generated_at: string;
  confidence: number;
  predictions: any;
  recommendations: string[];
  data_quality_score: number;
  model_accuracy: number;
}

class PredictiveAnalyticsService {
  private async getAuthHeaders(): Promise<Record<string, string>> {
    // Get auth token from storage
    const token = await this.getStoredToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  }

  private async getStoredToken(): Promise<string | null> {
    try {
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      return await AsyncStorage.default.getItem('auth_token');
    } catch (error) {
      console.error('Error getting stored token:', error);
      return null;
    }
  }

  async generatePredictiveAnalysis(request: PredictiveAnalysisRequest): Promise<PredictiveAnalysisResult> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/predictive-analytics/analyze`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate predictive analysis');
      }

      const data = await response.json();
      return data.analysis;
    } catch (error) {
      console.error('Generate predictive analysis error:', error);
      throw error;
    }
  }

  async getAnalysisHistory(limit: number = 10): Promise<PredictiveAnalysisResult[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/predictive-analytics/history?limit=${limit}`, {
        method: 'GET',
        headers: await this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get analysis history');
      }

      const data = await response.json();
      return data.analyses || [];
    } catch (error) {
      console.error('Get analysis history error:', error);
      throw error;
    }
  }

  async getConsumptionPrediction(timeHorizonDays: number = 30): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/predictive-analytics/consumption?days=${timeHorizonDays}`, {
        method: 'GET',
        headers: await this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get consumption prediction');
      }

      const data = await response.json();
      return data.prediction;
    } catch (error) {
      console.error('Get consumption prediction error:', error);
      throw error;
    }
  }

  async getShoppingOptimization(): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/predictive-analytics/shopping-optimization`, {
        method: 'GET',
        headers: await this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get shopping optimization');
      }

      const data = await response.json();
      return data.optimization;
    } catch (error) {
      console.error('Get shopping optimization error:', error);
      throw error;
    }
  }

  async getWastePrediction(): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/predictive-analytics/waste-prediction`, {
        method: 'GET',
        headers: await this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get waste prediction');
      }

      const data = await response.json();
      return data.prediction;
    } catch (error) {
      console.error('Get waste prediction error:', error);
      throw error;
    }
  }

  async getBudgetForecast(): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/predictive-analytics/budget-forecast`, {
        method: 'GET',
        headers: await this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get budget forecast');
      }

      const data = await response.json();
      return data.forecast;
    } catch (error) {
      console.error('Get budget forecast error:', error);
      throw error;
    }
  }

  async getSeasonalTrends(): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/predictive-analytics/seasonal-trends`, {
        method: 'GET',
        headers: await this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get seasonal trends');
      }

      const data = await response.json();
      return data.trends;
    } catch (error) {
      console.error('Get seasonal trends error:', error);
      throw error;
    }
  }

  async getFamilyInsights(): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/predictive-analytics/family-insights`, {
        method: 'GET',
        headers: await this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get family insights');
      }

      const data = await response.json();
      return data.insights;
    } catch (error) {
      console.error('Get family insights error:', error);
      throw error;
    }
  }

  async updateAnalysisPreferences(preferences: any): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/predictive-analytics/preferences`, {
        method: 'PUT',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update analysis preferences');
      }
    } catch (error) {
      console.error('Update analysis preferences error:', error);
      throw error;
    }
  }
}

export const predictiveAnalyticsService = new PredictiveAnalyticsService();