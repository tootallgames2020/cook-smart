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

/**
 * Service for handling user authentication and session management
 * Manages login, registration, logout, and token storage
 */
class AuthService {
  private token: string | null = null;

  /**
   * Authenticate a user with email and password
   * Stores the authentication token and user data in AsyncStorage
   * 
   * @param email - User's email address
   * @param password - User's password
   * @returns Promise<AuthResponse> - Authentication response with token and user data
   * @throws Error if login fails or network error occurs
   * 
   * @example
   * ```typescript
   * const response = await authService.login('user@example.com', 'password123');
   * console.log('Welcome', response.user.first_name);
   * ```
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await fetch(API_ENDPOINTS.auth.login, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({email, password}),
      });

      // Try to parse JSON response
      let data: AuthResponse;
      try {
        data = await response.json();
      } catch (parseError) {
        throw new Error('Invalid response from server. Please try again.');
      }

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      if (!data.token || !data.user) {
        throw new Error('Invalid response from server');
      }

      this.token = data.token;
      await AsyncStorage.setItem('auth_token', data.token);
      await AsyncStorage.setItem('user_data', JSON.stringify(data.user));
      
      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error. Please check your connection.');
    }
  }

  /**
   * Register a new user account
   * Stores the authentication token and user data in AsyncStorage upon success
   * 
   * @param userData - User registration information
   * @param userData.email - User's email address
   * @param userData.password - User's password
   * @param userData.first_name - User's first name (optional)
   * @param userData.last_name - User's last name (optional)
   * @param userData.age_verified - Confirmation that user meets age requirements
   * @returns Promise<AuthResponse> - Authentication response with token and user data
   * @throws Error if registration fails or network error occurs
   * 
   * @example
   * ```typescript
   * const response = await authService.register({
   *   email: 'newuser@example.com',
   *   password: 'securePassword123',
   *   first_name: 'John',
   *   last_name: 'Doe',
   *   age_verified: true
   * });
   * ```
   */
  async register(userData: {
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
    age_verified: boolean;
  }): Promise<AuthResponse> {
    try {
      const response = await fetch(API_ENDPOINTS.auth.register, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      // Try to parse JSON response
      let data: AuthResponse;
      try {
        data = await response.json();
      } catch (parseError) {
        throw new Error('Invalid response from server. Please try again.');
      }

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      if (!data.token || !data.user) {
        throw new Error('Invalid response from server');
      }

      this.token = data.token;
      await AsyncStorage.setItem('auth_token', data.token);
      await AsyncStorage.setItem('user_data', JSON.stringify(data.user));

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error. Please check your connection.');
    }
  }

  /**
   * Log out the current user
   * Clears authentication token and user data from AsyncStorage
   * 
   * @returns Promise<void>
   * 
   * @example
   * ```typescript
   * await authService.logout();
   * navigation.navigate('Login');
   * ```
   */
  async logout(): Promise<void> {
    this.token = null;
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('user_data');
  }

  /**
   * Retrieve the stored authentication token
   * Checks memory cache first, then AsyncStorage
   * 
   * @returns Promise<string | null> - The authentication token or null if not found
   * @private
   */
  async getStoredToken(): Promise<string | null> {
    if (this.token) return this.token;

    const storedToken = await AsyncStorage.getItem('auth_token');
    this.token = storedToken;
    return storedToken;
  }

  /**
   * Get the current authentication token
   * Alias for getStoredToken()
   * 
   * @returns Promise<string | null> - The authentication token or null if not found
   * 
   * @example
   * ```typescript
   * const token = await authService.getAuthToken();
   * if (token) {
   *   // User is authenticated
   * }
   * ```
   */
  async getAuthToken(): Promise<string | null> {
    return this.getStoredToken();
  }

  /**
   * Retrieve the stored user data from AsyncStorage
   * 
   * @returns Promise<User | null> - The user data or null if not found
   * 
   * @example
   * ```typescript
   * const user = await authService.getStoredUser();
   * if (user) {
   *   console.log('User email:', user.email);
   * }
   * ```
   */
  async getStoredUser(): Promise<User | null> {
    const userData = await AsyncStorage.getItem('user_data');
    return userData ? JSON.parse(userData) : null;
  }

  /**
   * Fetch the current user's data from the API
   * Requires valid authentication token
   * 
   * @returns Promise<User> - The current user's data
   * @throws Error if not authenticated or API request fails
   * 
   * @example
   * ```typescript
   * try {
   *   const user = await authService.getCurrentUser();
   *   console.log('Current user:', user.email);
   * } catch (error) {
   *   console.error('Not authenticated');
   * }
   * ```
   */
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

  /**
   * Check if a user is currently authenticated
   * 
   * @returns Promise<boolean> - True if user has a valid token, false otherwise
   * 
   * @example
   * ```typescript
   * const isAuth = await authService.isAuthenticated();
   * if (!isAuth) {
   *   navigation.navigate('Login');
   * }
   * ```
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getStoredToken();
    return !!token;
  }
}

export default new AuthService();

// Export getAuthToken as a named export for convenience
export const getAuthToken = async (): Promise<string | null> => {
  const authService = new AuthService();
  return authService.getAuthToken();
};
