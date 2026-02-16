'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient, { authApi } from '@/lib/api-client';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastActivity, setLastActivity] = useState(Date.now());

  // Auto-logout after 30 minutes of inactivity
  useEffect(() => {
    const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

    const checkInactivity = (): void => {
      if (user && Date.now() - lastActivity > INACTIVITY_TIMEOUT) {
        logout();
      }
    };

    const interval = setInterval(checkInactivity, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [user, lastActivity]);

  // Track user activity
  useEffect(() => {
    const updateActivity = (): void => {
      setLastActivity(Date.now());
    };

    if (user) {
      window.addEventListener('mousemove', updateActivity);
      window.addEventListener('keypress', updateActivity);
      window.addEventListener('click', updateActivity);
      window.addEventListener('scroll', updateActivity);

      return () => {
        window.removeEventListener('mousemove', updateActivity);
        window.removeEventListener('keypress', updateActivity);
        window.removeEventListener('click', updateActivity);
        window.removeEventListener('scroll', updateActivity);
      };
    }
  }, [user]);

  // Load auth state on mount
  useEffect(() => {
    const loadAuth = async (): Promise<void> => {
      try {
        const token = apiClient.getAuthToken();
        if (token) {
          try {
            // Always try admin endpoint first for admin pages
            const isAdminPage =
              typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');

            let userData;

            if (isAdminPage) {
              try {
                const adminResponse = await apiClient.get<{ admin: any }>('/api/v1/admin/auth/me');
                userData = {
                  id: adminResponse.admin.id.toString(),
                  email: adminResponse.admin.email,
                  name: adminResponse.admin.name || 'Admin User',
                  role: 'admin',
                };
              } catch (adminError) {
                console.error('[AUTH] Admin endpoint failed:', adminError);
                // Don't fallback for admin pages - if admin endpoint fails, they shouldn't access admin
                throw adminError;
              }
            } else {
              // Regular user endpoint for non-admin pages
              const response = await apiClient.get<{ user: any }>('/api/v1/auth/me');
              userData = {
                id: response.user.id,
                email: response.user.email,
                name:
                  `${response.user.first_name || ''} ${response.user.last_name || ''}`.trim() ||
                  'User',
                role:
                  response.user.is_admin || response.user.is_co_founder || response.user.is_creator
                    ? 'admin'
                    : 'user',
              };
            }
            setUser(userData);
          } catch (error) {
            console.error('[AUTH] Failed to validate token:', error);
            // Token is invalid, clear it
            apiClient.clearAuth();
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('[AUTH] Failed to load auth:', error);
        apiClient.clearAuth();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadAuth();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    try {
      // Check if we're on admin pages - use admin login endpoint
      const isAdminPage =
        typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');

      let response;
      if (isAdminPage) {
        response = await apiClient.post<{ token: string; admin: any }>('/api/v1/admin/auth/login', {
          email,
          password,
        });
        // Restructure admin response to match expected format
        response = {
          token: response.token,
          user: response.admin,
        };
      } else {
        response = await authApi.login(email, password);
      }
      // Check if user has admin access
      const userData = response.user as any;
      if (isAdminPage) {
        // For admin login, we already validated they're an admin by successful login
      } else {
        if (!userData.is_admin && !userData.is_co_founder && !userData.is_creator) {
          console.error('[AUTH] User does not have admin access');
          throw new Error('You do not have admin access');
        }
      }
      apiClient.setAuthToken(response.token);

      let newUser;
      if (isAdminPage) {
        newUser = {
          id: userData.id.toString(),
          email: userData.email,
          name: userData.name || 'Admin User',
          role: 'admin',
        };
      } else {
        newUser = {
          id: userData.id,
          email: userData.email,
          name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 'Admin User',
          role: 'admin',
        };
      }
      setUser(newUser);
      setLastActivity(Date.now());
      // Return a promise that resolves after state is set
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve();
        }, 100);
      });
    } catch (error) {
      console.error('[AUTH] Login failed:', error);
      throw error;
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      apiClient.clearAuth();
      setUser(null);
      if (typeof window !== 'undefined') {
        window.location.href = '/admin/login';
      }
    }
  }, []);

  const refreshAuth = useCallback(async (): Promise<void> => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        return;
      }

      // Implement token refresh endpoint call
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.token) {
          localStorage.setItem('auth_token', data.token);
        }
      } else {
        await logout();
      }
      
      setLastActivity(Date.now());
    } catch (error) {
      console.error('[AUTH] Token refresh failed:', error);
      await logout();
    }
  }, [logout]);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    refreshAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
