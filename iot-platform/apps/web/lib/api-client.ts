import type { ApiResponse } from './types';

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

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    const data: ApiResponse<T> = await response.json();

    if (!data.success) {
      throw new Error(data.error.message);
    }

    return data.data;
  }

  async get<T>(endpoint: string): Promise<{ data: T }> {
    const data = await this.request<T>(endpoint, { method: 'GET' });
    return { data };
  }

  // Special method for paginated responses that preserves pagination metadata
  async getPaginated<T>(endpoint: string): Promise<{ data: T[]; pagination: any }> {
    const url = `${this.baseURL}${endpoint}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error?.message || 'Request failed');
    }

    // Return both data and pagination from the backend response
    return {
      data: result.data,
      pagination: result.pagination,
    };
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
