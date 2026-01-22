import { authApi, handleApiError, setAuthToken, removeAuthToken } from '../api-client';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User;
  message?: string;
}

/**
 * Login with email and password
 */
export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  try {
    const response = await authApi.login(credentials.email, credentials.password);
    const { token, user } = response;

    if (token) {
      setAuthToken(token);
    }

    return {
      success: true,
      token,
      user: user as User,
    };
  } catch (error) {
    const errorMessage = handleApiError(error);
    return {
      success: false,
      message: errorMessage,
    };
  }
}

/**
 * Logout and clear auth token
 */
export async function logout(): Promise<void> {
  try {
    await authApi.logout();
  } catch (error) {
    console.error('Error during logout:', handleApiError(error));
  } finally {
    removeAuthToken();
  }
}

/**
 * Verify current auth token and get user info
 */
export async function verifyAuth(): Promise<AuthResponse> {
  try {
    const response = await authApi.getCurrentUser();
    
    return {
      success: true,
      user: response.user as User,
    };
  } catch (error) {
    removeAuthToken();
    return {
      success: false,
      message: handleApiError(error),
    };
  }
}

/**
 * Refresh auth token
 */
export async function refreshToken(): Promise<AuthResponse> {
  try {
    const response = await authApi.refreshToken();
    const { token } = response;

    if (token) {
      setAuthToken(token);
    }

    return {
      success: true,
      token,
    };
  } catch (error) {
    removeAuthToken();
    return {
      success: false,
      message: handleApiError(error),
    };
  }
}

