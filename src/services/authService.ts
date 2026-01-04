import AsyncStorage from '@react-native-async-storage/async-storage';
import {API_ENDPOINTS, getAuthHeader} from '../config/api';

export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  is_co_founder: boolean;
  is_special_user: boolean;
  is_creator: boolean;
  is_developer: boolean;
  has_lifetime_subscription: boolean;
  subscription_status: string;
  points: number;
  dietary_restrictions?: string[];
  allergies?: string[];
  show_nutrition?: boolean;
  preferred_units?: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
  special_message?: string;
  lifetime_access?: boolean;
}

class AuthService {
  private token: string | null = null;

  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      console.log('[AuthService] Login attempt:', {
        email,
        apiUrl: API_ENDPOINTS.auth.login,
      });

      const response = await fetch(API_ENDPOINTS.auth.login, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({email, password}),
      });

      console.log('[AuthService] Response status:', response.status);

      // Try to parse JSON response
      let data;
      try {
        data = await response.json();
        console.log('[AuthService] Response data:', {
          hasToken: !!data.token,
          hasUser: !!data.user,
          message: data.message,
        });
      } catch (parseError) {
        console.error('[AuthService] JSON parse error:', parseError);
        throw new Error('Invalid response from server. Please try again.');
      }

      if (!response.ok) {
        console.error('[AuthService] Login failed:', data);
        throw new Error(data.message || data.error || 'Login failed');
      }

      if (!data.token || !data.user) {
        console.error('[AuthService] Missing token or user in response');
        throw new Error('Invalid response from server');
      }

      this.token = data.token;
      await AsyncStorage.setItem('auth_token', data.token);
      await AsyncStorage.setItem('user_data', JSON.stringify(data.user));

      console.log('[AuthService] Login successful');
      return data;
    } catch (error) {
      console.error('[AuthService] Login error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error. Please check your connection.');
    }
  }

  async register(userData: {
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
    age_verified: boolean;
  }): Promise<AuthResponse> {
    try {
      console.log('[AuthService] Register attempt:', {email: userData.email});

      const response = await fetch(API_ENDPOINTS.auth.register, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      console.log('[AuthService] Register response status:', response.status);

      // Try to parse JSON response
      let data;
      try {
        data = await response.json();
        console.log('[AuthService] Register response data:', {
          hasToken: !!data.token,
          hasUser: !!data.user,
          message: data.message,
        });
      } catch (parseError) {
        console.error('[AuthService] JSON parse error:', parseError);
        throw new Error('Invalid response from server. Please try again.');
      }

      if (!response.ok) {
        console.error('[AuthService] Registration failed:', data);
        throw new Error(data.message || data.error || 'Registration failed');
      }

      if (!data.token || !data.user) {
        console.error('[AuthService] Missing token or user in response');
        throw new Error('Invalid response from server');
      }

      this.token = data.token;
      await AsyncStorage.setItem('auth_token', data.token);
      await AsyncStorage.setItem('user_data', JSON.stringify(data.user));

      console.log('[AuthService] Registration successful');
      return data;
    } catch (error) {
      console.error('[AuthService] Registration error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error. Please check your connection.');
    }
  }

  async logout(): Promise<void> {
    this.token = null;
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('user_data');
  }

  async getStoredToken(): Promise<string | null> {
    if (this.token) return this.token;

    const storedToken = await AsyncStorage.getItem('auth_token');
    this.token = storedToken;
    return storedToken;
  }

  async getStoredUser(): Promise<User | null> {
    const userData = await AsyncStorage.getItem('user_data');
    return userData ? JSON.parse(userData) : null;
  }

  async getCurrentUser(): Promise<User> {
    const token = await this.getStoredToken();
    if (!token) {
      throw new Error('No authentication token');
    }

    const response = await fetch(API_ENDPOINTS.auth.me, {
      headers: getAuthHeader(token),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to get user data');
    }

    return data.user;
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getStoredToken();
    return !!token;
  }
}

export default new AuthService();
