import type { ApiResponse } from './types';
import {
  NetworkError,
  createApiError,
  getErrorMessage,
  getUserFriendlyMessage,
} from './api-error';
import { apiConfig } from './config';

// API base URL from centralized config
const API_BASE_URL = apiConfig.baseUrl;

// Token storage keys (must match AuthContext)
const ACCESS_TOKEN_KEY = 'iot_access_token';
const REFRESH_TOKEN_KEY = 'iot_refresh_token';

// Type-safe API client using native fetch
class ApiClient {
  private baseURL: string;
  private refreshPromise: Promise<void> | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  /**
   * Get access token from localStorage
   */
  private getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshAccessToken(): Promise<void> {
    // If refresh is already in progress, wait for it
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await fetch(`${this.baseURL}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error('Token refresh failed');
        }

        // Update tokens in localStorage
        localStorage.setItem(ACCESS_TOKEN_KEY, data.data.accessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, data.data.refreshToken);
      } catch (error) {
        // Refresh failed - clear tokens and redirect to login
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        localStorage.removeItem('iot_user');

        // Redirect to login page if we're in the browser
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }

        throw error;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit,
    retry = true
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    // Get access token and add to headers
    const accessToken = this.getAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string>),
    };

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle 401 Unauthorized - Try to refresh token and retry
      if (response.status === 401 && retry) {
        try {
          await this.refreshAccessToken();
          // Retry the original request with new token
          return this.request<T>(endpoint, options, false);
        } catch (refreshError) {
          // Refresh failed - will redirect to login in refreshAccessToken
          throw createApiError(401, 'Authentication failed. Please login again.');
        }
      }

      // Handle non-JSON responses (e.g., 500 errors with HTML)
      const contentType = response.headers.get('content-type');
      const isJson = contentType?.includes('application/json');

      if (!response.ok) {
        // Try to parse error from JSON response
        if (isJson) {
          const errorData = await response.json() as any;
          const message = errorData.error?.message || errorData.error || getErrorMessage(response.status);
          throw createApiError(response.status, message, errorData.error);
        } else {
          // Non-JSON error response (e.g., nginx error page)
          const message = getErrorMessage(response.status);
          throw createApiError(response.status, message);
        }
      }

      const data = await response.json() as any;

      if (!data.success) {
        const message = data.error?.message || data.error || 'Request failed';
        throw createApiError(response.status, message, data.error);
      }

      return data.data;
    } catch (error) {
      // Network errors (no response from server)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new NetworkError('Unable to connect to the server. Please check your connection.');
      }

      // Re-throw API errors
      throw error;
    }
  }

  async get<T>(endpoint: string): Promise<{ data: T }> {
    const data = await this.request<T>(endpoint, { method: 'GET' });
    return { data };
  }

  // Special method for paginated responses that preserves pagination metadata
  async getPaginated<T>(endpoint: string): Promise<{ data: T[]; pagination: any }> {
    const url = `${this.baseURL}${endpoint}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const message = getErrorMessage(response.status);
        throw createApiError(response.status, message);
      }

      const result = await response.json();

      if (!result.success) {
        const message = result.error?.message || 'Request failed';
        throw createApiError(response.status, message, result.error);
      }

      // Return both data and pagination from the backend response
      return {
        data: result.data,
        pagination: result.pagination,
      };
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new NetworkError();
      }
      throw error;
    }
  }

  async post<T>(endpoint: string, body: unknown): Promise<{ data: T }> {
    const data = await this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return { data };
  }

  async patch<T>(endpoint: string, body: unknown): Promise<{ data: T }> {
    const data = await this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    return { data };
  }

  async delete(endpoint: string): Promise<void> {
    await this.request<void>(endpoint, { method: 'DELETE' });
  }
}

// Export singleton instance
export const apiClient = new ApiClient(API_BASE_URL);
