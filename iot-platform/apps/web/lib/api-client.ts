import type { ApiResponse } from './types';
import {
  NetworkError,
  createApiError,
  getErrorMessage,
  getUserFriendlyMessage,
} from './api-error';

// API base URL (from environment variable or default to localhost)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Type-safe API client using native fetch
class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      // Handle non-JSON responses (e.g., 500 errors with HTML)
      const contentType = response.headers.get('content-type');
      const isJson = contentType?.includes('application/json');

      if (!response.ok) {
        // Try to parse error from JSON response
        if (isJson) {
          const errorData: ApiResponse<T> = await response.json();
          const message = errorData.error?.message || getErrorMessage(response.status);
          throw createApiError(response.status, message, errorData.error);
        } else {
          // Non-JSON error response (e.g., nginx error page)
          const message = getErrorMessage(response.status);
          throw createApiError(response.status, message);
        }
      }

      const data: ApiResponse<T> = await response.json();

      if (!data.success) {
        const message = data.error?.message || 'Request failed';
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
