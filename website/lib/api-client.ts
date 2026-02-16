import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

// Ensure we always use the API subdomain, not the main website domain
let API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.cooksmartapp.com';

// Fix common misconfiguration: if someone sets it to the main domain, correct it
if (API_BASE_URL === 'https://cooksmartapp.com' || API_BASE_URL === 'http://cooksmartapp.com') {
  API_BASE_URL = 'https://api.cooksmartapp.com';
}

interface ApiClientConfig {
  baseURL: string;
  timeout: number;
  headers: Record<string, string>;
}

class ApiClient {
  private client: AxiosInstance;
  private authToken: string | null = null;

  constructor(config: ApiClientConfig) {
    this.client = axios.create(config);

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (requestConfig) => {
        if (this.authToken) {
          requestConfig.headers.Authorization = `Bearer ${this.authToken}`;
        }
        return requestConfig;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        return response;
      },
      async (error) => {
        console.error('[API] Error:', {
          url: error.config?.url,
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });
        if (error.response?.status === 401) {
          // Token expired or invalid
          this.clearAuth();
          if (typeof window !== 'undefined') {
            window.location.href = '/admin/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  setAuthToken(token: string): void {
    this.authToken = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
      // Also set as cookie for middleware
      document.cookie = `auth_token=${token}; path=/; max-age=${8 * 60 * 60}; secure; samesite=strict`;
    }
  }

  getAuthToken(): string | null {
    if (!this.authToken && typeof window !== 'undefined') {
      // Try localStorage first
      this.authToken = localStorage.getItem('auth_token');

      // If not in localStorage, try cookies
      if (!this.authToken) {
        const cookies = document.cookie.split(';');
        const authCookie = cookies.find((cookie) => cookie.trim().startsWith('auth_token='));
        if (authCookie) {
          this.authToken = authCookie.split('=')[1];
          // Sync back to localStorage
          localStorage.setItem('auth_token', this.authToken);
        }
      }
    }
    return this.authToken;
  }

  clearAuth(): void {
    this.authToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      // Also clear cookie
      document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    }
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }
}

// Create singleton instance
const apiClient = new ApiClient({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;

// Export specific API methods for different domains
export const authApi = {
  login: (email: string, password: string) => {
    return apiClient.post<{ token: string; user: unknown }>('/api/v1/auth/login', {
      email,
      password,
    });
  },

  logout: () => apiClient.post('/api/v1/auth/logout'),

  refreshToken: () => apiClient.post<{ token: string }>('/api/v1/auth/refresh'),
};

export const recipesApi = {
  getAll: (params?: { page?: number; limit?: number; search?: string; filter?: string }) =>
    apiClient.get<{ recipes: unknown[]; total: number }>('/recipes', { params }),

  getById: (id: string) => apiClient.get<unknown>(`/recipes/${id}`),

  getFeatured: () => apiClient.get<unknown[]>('/recipes/featured'),

  update: (id: string, data: unknown) => apiClient.patch<unknown>(`/admin/recipes/${id}`, data),

  delete: (id: string) => apiClient.delete(`/admin/recipes/${id}`),

  feature: (id: string, featured: boolean) =>
    apiClient.patch(`/admin/recipes/${id}/feature`, { featured }),

  bulkUpdate: (ids: string[], data: unknown) =>
    apiClient.post('/admin/recipes/bulk-update', { ids, data }),

  bulkDelete: (ids: string[]) => apiClient.post('/admin/recipes/bulk-delete', { ids }),
};

export const blogApi = {
  getAll: (params?: { page?: number; limit?: number; category?: string; search?: string }) =>
    apiClient.get<{ posts: unknown[]; total: number }>('/blog', { params }),

  getById: (id: string) => apiClient.get<unknown>(`/blog/${id}`),

  getCategories: () => apiClient.get<string[]>('/blog/categories'),
};

export const usersApi = {
  getAll: (params?: { page?: number; limit?: number; search?: string; status?: string }) =>
    apiClient.get<{ users: unknown[]; total: number }>('/api/v1/admin/users', { params }),

  getById: (id: string) => apiClient.get<unknown>(`/api/v1/admin/users/${id}`),

  update: (id: string, data: unknown) =>
    apiClient.patch<unknown>(`/api/v1/admin/users/${id}`, data),

  deactivate: (id: string) => apiClient.post(`/api/v1/admin/users/${id}/deactivate`),

  suspend: (id: string) => apiClient.post(`/api/v1/admin/users/${id}/suspend`),

  delete: (id: string) => apiClient.delete(`/api/v1/admin/users/${id}`),

  grantAdmin: (id: string) =>
    apiClient.patch(`/api/v1/admin/users/${id}/admin-access`, { isAdmin: true }),

  revokeAdmin: (id: string) =>
    apiClient.patch(`/api/v1/admin/users/${id}/admin-access`, { isAdmin: false }),
};

export const moderationApi = {
  getQueue: (params?: { page?: number; limit?: number; type?: string; priority?: string }) =>
    apiClient.get<{ items: unknown[]; total: number }>('/admin/moderation', { params }),

  getDetail: (id: string) => apiClient.get<unknown>(`/admin/moderation/${id}`),

  approve: (id: string, data?: { notes?: string; notifyCreator?: boolean }) =>
    apiClient.post(`/admin/moderation/${id}/approve`, data),

  remove: (id: string, data: { reason: string; notes?: string; notifyCreator?: boolean }) =>
    apiClient.post(`/admin/moderation/${id}/remove`, data),
};

export const analyticsApi = {
  getOverview: (params?: { startDate?: string; endDate?: string }) =>
    apiClient.get<unknown>('/admin/analytics/overview', { params }),

  getMetric: (metric: string, params?: { startDate?: string; endDate?: string }) =>
    apiClient.get<unknown>(`/admin/analytics/${metric}`, { params }),

  export: (format: 'csv' | 'pdf', params?: { startDate?: string; endDate?: string }) =>
    apiClient.get<Blob>('/admin/analytics/export', {
      params: { ...params, format },
      responseType: 'blob',
    }),
};

export const newsletterApi = {
  subscribe: (email: string, preferences?: unknown) =>
    apiClient.post('/newsletter/subscribe', { email, preferences }),

  unsubscribe: (email: string) => apiClient.post('/newsletter/unsubscribe', { email }),
};

export const contactApi = {
  submit: (data: { name: string; email: string; subject: string; message: string }) =>
    apiClient.post('/contact', data),
};

// Export utility functions
export const setAuthToken = (token: string): void => apiClient.setAuthToken(token);
export const removeAuthToken = (): void => apiClient.clearAuth();
export const getAuthToken = (): string | null => apiClient.getAuthToken();

export const handleApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.message || 'An error occurred';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unknown error occurred';
};
