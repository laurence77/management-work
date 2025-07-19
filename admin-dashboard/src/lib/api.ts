import { Celebrity, SiteSettings, LoginRequest, LoginResponse, ApiResponse } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('admin_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Authentication
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (response.success && response.data) {
      this.token = response.data.token;
      localStorage.setItem('admin_token', response.data.token);
      return response.data;
    }

    throw new Error(response.error || 'Login failed');
  }

  async logout(): Promise<void> {
    this.token = null;
    localStorage.removeItem('admin_token');
    await this.request('/auth/logout', { method: 'POST' });
  }

  // Celebrities
  async getCelebrities(): Promise<Celebrity[]> {
    const response = await this.request<Celebrity[]>('/celebrities');
    return response.data || [];
  }

  async createCelebrity(celebrity: Omit<Celebrity, 'id' | 'createdAt' | 'updatedAt'>): Promise<Celebrity> {
    const response = await this.request<Celebrity>('/celebrities', {
      method: 'POST',
      body: JSON.stringify(celebrity),
    });
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.error || 'Failed to create celebrity');
  }

  async updateCelebrity(id: string, updates: Partial<Celebrity>): Promise<Celebrity> {
    const response = await this.request<Celebrity>(`/celebrities/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.error || 'Failed to update celebrity');
  }

  async deleteCelebrity(id: string): Promise<void> {
    const response = await this.request(`/celebrities/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to delete celebrity');
    }
  }

  async uploadCelebrityImage(id: string, file: File): Promise<Celebrity> {
    const formData = new FormData();
    formData.append('image', file);

    const url = `${API_BASE_URL}/celebrities/${id}/upload-image`;
    
    const headers: HeadersInit = {};
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Upload failed');
      }

      if (data.success && data.data) {
        return data.data;
      }

      throw new Error('Upload failed');
    } catch (error) {
      console.error('Image upload failed:', error);
      throw error;
    }
  }

  // Site Settings
  async getSiteSettings(): Promise<SiteSettings> {
    const response = await this.request<SiteSettings>('/settings');
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.error || 'Failed to get site settings');
  }

  async getPublicSettings(): Promise<SiteSettings> {
    const response = await this.request<SiteSettings>('/settings/public');
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.error || 'Failed to get public settings');
  }

  async updateSiteSettings(settings: Partial<SiteSettings>): Promise<SiteSettings> {
    const response = await this.request<SiteSettings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.error || 'Failed to update site settings');
  }
}

export const api = new ApiClient();