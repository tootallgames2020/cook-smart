import { API_BASE_URL } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

class PreservationService {
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
      return await AsyncStorage.getItem('auth_token');
    } catch (error) {
      console.error('Error getting stored token:', error);
      return null;
    }
  }

  async getIngredientsWithPreservation(): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/expiration/ingredients-with-preservation`, {
        method: 'GET',
        headers: await this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get ingredients with preservation');
      }

      const data = await response.json();
      return data.ingredients || [];
    } catch (error) {
      console.error('Get ingredients with preservation error:', error);
      throw error;
    }
  }

  async updateStorageType(ingredientId: string, storageType: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/expiration/update-storage-type`, {
        method: 'PUT',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify({
          ingredient_id: ingredientId,
          storage_type: storageType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update storage type');
      }
    } catch (error) {
      console.error('Update storage type error:', error);
      throw error;
    }
  }

  async getPreservationSuggestions(ingredientId: string): Promise<string[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/expiration/preservation-suggestions/${ingredientId}`, {
        method: 'GET',
        headers: await this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get preservation suggestions');
      }

      const data = await response.json();
      return data.suggestions || [];
    } catch (error) {
      console.error('Get preservation suggestions error:', error);
      throw error;
    }
  }

  async getExpirationAlerts(): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/expiration/alerts`, {
        method: 'GET',
        headers: await this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get expiration alerts');
      }

      const data = await response.json();
      return data.alerts || [];
    } catch (error) {
      console.error('Get expiration alerts error:', error);
      throw error;
    }
  }

  async getPreservationTips(): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/expiration/preservation-tips`, {
        method: 'GET',
        headers: await this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get preservation tips');
      }

      const data = await response.json();
      return data.tips || [];
    } catch (error) {
      console.error('Get preservation tips error:', error);
      throw error;
    }
  }

  async calculatePreservationExtension(
    ingredientName: string,
    currentStorageType: string,
    newStorageType: string
  ): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/expiration/calculate-extension`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify({
          ingredient_name: ingredientName,
          current_storage_type: currentStorageType,
          new_storage_type: newStorageType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to calculate preservation extension');
      }

      const data = await response.json();
      return data.extension;
    } catch (error) {
      console.error('Calculate preservation extension error:', error);
      throw error;
    }
  }

  async getStorageTypeRecommendations(ingredientName: string): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/expiration/storage-recommendations/${encodeURIComponent(ingredientName)}`, {
        method: 'GET',
        headers: await this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get storage type recommendations');
      }

      const data = await response.json();
      return data.recommendations || [];
    } catch (error) {
      console.error('Get storage type recommendations error:', error);
      throw error;
    }
  }
}

export const preservationService = new PreservationService();