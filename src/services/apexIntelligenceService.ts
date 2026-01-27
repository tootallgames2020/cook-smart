import { API_BASE_URL } from '../config/api';

class ApexIntelligenceService {
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

  async getCapabilities(): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/apex-intelligence/capabilities`, {
        method: 'GET',
        headers: await this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get capabilities');
      }

      const data = await response.json();
      return data.capabilities || [];
    } catch (error) {
      console.error('Get capabilities error:', error);
      throw error;
    }
  }

  async analyzeNutrition(request: {
    food_items: string[];
    portion_sizes: number[];
    analysis_depth: 'basic' | 'comprehensive' | 'apex';
  }): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/apex-intelligence/nutrition/analyze`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to analyze nutrition');
      }

      const data = await response.json();
      return data.analysis;
    } catch (error) {
      console.error('Analyze nutrition error:', error);
      throw error;
    }
  }

  async analyzePhoto(request: {
    image_data: string;
    analysis_type: 'meal_analysis' | 'pantry_scan' | 'freshness_check';
  }): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/apex-intelligence/photo/analyze`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to analyze photo');
      }

      const data = await response.json();
      return data.analysis;
    } catch (error) {
      console.error('Analyze photo error:', error);
      throw error;
    }
  }

  async processVoiceCommand(request: {
    audio_data: string;
    context: 'cooking' | 'shopping' | 'planning';
  }): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/apex-intelligence/voice/process`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to process voice command');
      }

      const data = await response.json();
      return data.result;
    } catch (error) {
      console.error('Process voice command error:', error);
      throw error;
    }
  }

  async generatePrediction(request: {
    prediction_type: 'consumption' | 'shopping' | 'waste' | 'health';
    time_horizon_days: number;
  }): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/apex-intelligence/predictive/generate`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate prediction');
      }

      const data = await response.json();
      return data.prediction;
    } catch (error) {
      console.error('Generate prediction error:', error);
      throw error;
    }
  }

  async getNutritionCoaching(): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/apex-intelligence/nutrition/coaching`, {
        method: 'GET',
        headers: await this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get nutrition coaching');
      }

      const data = await response.json();
      return data.coaching;
    } catch (error) {
      console.error('Get nutrition coaching error:', error);
      throw error;
    }
  }

  async getHealthInsights(): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/apex-intelligence/nutrition/health-insights`, {
        method: 'GET',
        headers: await this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get health insights');
      }

      const data = await response.json();
      return data.insights;
    } catch (error) {
      console.error('Get health insights error:', error);
      throw error;
    }
  }

  async getPhotoIntelligenceResults(): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/apex-intelligence/photo/results`, {
        method: 'GET',
        headers: await this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get photo intelligence results');
      }

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Get photo intelligence results error:', error);
      throw error;
    }
  }

  async getVoiceCommandHistory(): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/apex-intelligence/voice/history`, {
        method: 'GET',
        headers: await this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get voice command history');
      }

      const data = await response.json();
      return data.history || [];
    } catch (error) {
      console.error('Get voice command history error:', error);
      throw error;
    }
  }

  async getPredictiveModels(): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/apex-intelligence/predictive/models`, {
        method: 'GET',
        headers: await this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get predictive models');
      }

      const data = await response.json();
      return data.models || [];
    } catch (error) {
      console.error('Get predictive models error:', error);
      throw error;
    }
  }

  async provideFeedback(feedback: {
    feature_type: 'nutrition' | 'photo' | 'voice' | 'predictive';
    rating: number;
    comments: string;
    accuracy_rating?: number;
  }): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/apex-intelligence/feedback`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify(feedback),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to provide feedback');
      }
    } catch (error) {
      console.error('Provide feedback error:', error);
      throw error;
    }
  }

  async updatePreferences(preferences: any): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/apex-intelligence/preferences`, {
        method: 'PUT',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update preferences');
      }
    } catch (error) {
      console.error('Update preferences error:', error);
      throw error;
    }
  }
}

export const apexIntelligenceService = new ApexIntelligenceService();