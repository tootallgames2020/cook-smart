import { API_BASE_URL } from '../config/api';

class MaintenanceBotService {
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

  async getBotStatus(): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/maintenance-bot/status`, {
        method: 'GET',
        headers: await this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get bot status');
      }

      const data = await response.json();
      return data.status;
    } catch (error) {
      console.error('Get bot status error:', error);
      throw error;
    }
  }

  async getSystemHealth(): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/maintenance-bot/health`, {
        method: 'GET',
        headers: await this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get system health');
      }

      const data = await response.json();
      return data.health;
    } catch (error) {
      console.error('Get system health error:', error);
      throw error;
    }
  }

  async getCurrentIssues(): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/maintenance-bot/issues`, {
        method: 'GET',
        headers: await this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get current issues');
      }

      const data = await response.json();
      return data.issues || [];
    } catch (error) {
      console.error('Get current issues error:', error);
      throw error;
    }
  }

  async getPerformanceMetrics(): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/maintenance-bot/performance`, {
        method: 'GET',
        headers: await this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get performance metrics');
      }

      const data = await response.json();
      return data.performance;
    } catch (error) {
      console.error('Get performance metrics error:', error);
      throw error;
    }
  }

  async startBot(): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/maintenance-bot/start`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to start bot');
      }
    } catch (error) {
      console.error('Start bot error:', error);
      throw error;
    }
  }

  async stopBot(): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/maintenance-bot/stop`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to stop bot');
      }
    } catch (error) {
      console.error('Stop bot error:', error);
      throw error;
    }
  }

  async runManualCheck(): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/maintenance-bot/manual-check`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to run manual check');
      }

      const data = await response.json();
      return data.check_result;
    } catch (error) {
      console.error('Run manual check error:', error);
      throw error;
    }
  }

  async getBotCapabilities(): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/maintenance-bot/capabilities`, {
        method: 'GET',
        headers: await this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get bot capabilities');
      }

      const data = await response.json();
      return data.capabilities;
    } catch (error) {
      console.error('Get bot capabilities error:', error);
      throw error;
    }
  }

  async getMaintenanceHistory(limit: number = 20): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/maintenance-bot/history?limit=${limit}`, {
        method: 'GET',
        headers: await this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get maintenance history');
      }

      const data = await response.json();
      return data.history || [];
    } catch (error) {
      console.error('Get maintenance history error:', error);
      throw error;
    }
  }

  async updateBotConfiguration(config: any): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/maintenance-bot/config`, {
        method: 'PUT',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update bot configuration');
      }
    } catch (error) {
      console.error('Update bot configuration error:', error);
      throw error;
    }
  }
}

export const maintenanceBotService = new MaintenanceBotService();