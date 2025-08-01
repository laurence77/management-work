import { 
  Celebrity, 
  SiteSettings, 
  LoginRequest, 
  LoginResponse, 
  ApiResponse, 
  User,
  Booking,
  EmailSettings,
  EmailTemplate,
  AutomationWorkflow,
  FormSubmission,
  AnalyticsData,
  LoadingState
} from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000/api';

// Debug logging
console.log('🔧 API_BASE_URL:', API_BASE_URL);

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('admin_token');
  }

  setToken(token: string | null) {
    this.token = token;
  }

  async request<T>(
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
    console.log('🔐 API CLIENT: Login attempt started', credentials.email);
    
    const response = await this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
      credentials: 'include', // Include cookies for refresh token
    });

    console.log('🔐 API CLIENT: Login response received', response);

    if (response.success && response.data) {
      console.log('🔐 API CLIENT: Login successful, setting token');
      this.token = response.data.accessToken;
      localStorage.setItem('admin_token', response.data.accessToken);
      return response.data;
    }

    console.log('🔐 API CLIENT: Login failed', response.error);
    throw new Error(response.error || 'Login failed');
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { 
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      this.token = null;
      localStorage.removeItem('admin_token');
    }
  }

  async verifyToken(token: string): Promise<{ user: User }> {
    const response = await this.request<{ user: User }>('/auth/verify', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Token verification failed');
  }

  async refreshToken(): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/auth/refresh', {
      method: 'POST',
      credentials: 'include', // Include httpOnly refresh token cookie
    });

    if (response.success && response.data) {
      this.token = response.data.accessToken;
      localStorage.setItem('admin_token', response.data.accessToken);
      return response.data;
    }

    throw new Error(response.error || 'Token refresh failed');
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

  // Bookings
  async getBookings(): Promise<Booking[]> {
    const response = await this.request<Booking[]>('/bookings');
    return response.data || [];
  }

  async getBookingById(id: string): Promise<Booking> {
    const response = await this.request<Booking>(`/bookings/${id}`);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.error || 'Failed to get booking');
  }

  async updateBookingStatus(id: string, updates: { status: string; notes?: string }): Promise<Booking> {
    const response = await this.request<Booking>(`/bookings/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.error || 'Failed to update booking status');
  }

  async getBookingStats(): Promise<AnalyticsData> {
    const response = await this.request<AnalyticsData>('/bookings/stats');
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.error || 'Failed to get booking stats');
  }

  // Email Settings
  async getEmailSettings(): Promise<EmailSettings[]> {
    try {
      const response = await this.request<any>('/settings/email');
      
      // Transform the response to match expected format
      const emailData = response.data || response;
      
      if (emailData && typeof emailData === 'object') {
        // Convert object format to array format expected by the component
        const settingsArray = [
          {
            id: '1',
            setting_key: 'smtp_host',
            setting_value: emailData.smtpHost || 'smtp.hostinger.com',
            display_name: 'SMTP Host',
            description: 'SMTP server hostname',
            setting_type: 'text' as const,
            is_required: true,
            is_active: true
          },
          {
            id: '2',
            setting_key: 'smtp_port',
            setting_value: emailData.smtpPort?.toString() || '465',
            display_name: 'SMTP Port',
            description: 'SMTP server port',
            setting_type: 'text' as const,
            is_required: true,
            is_active: true
          },
          {
            id: '3',
            setting_key: 'smtp_user',
            setting_value: emailData.smtpUser || 'management@bookmyreservation.org',
            display_name: 'SMTP Username',
            description: 'SMTP authentication username',
            setting_type: 'email' as const,
            is_required: true,
            is_active: true
          },
          {
            id: '4',
            setting_key: 'smtp_pass',
            setting_value: emailData.smtpPass || 'NOT SET',
            display_name: 'SMTP Password',
            description: 'SMTP authentication password',
            setting_type: 'text' as const,
            is_required: true,
            is_active: true
          },
          {
            id: '5',
            setting_key: 'primary_email',
            setting_value: emailData.fromEmail || 'management@bookmyreservation.org',
            display_name: 'From Email',
            description: 'Email address used as sender',
            setting_type: 'email' as const,
            is_required: true,
            is_active: true
          },
          {
            id: '6',
            setting_key: 'email_enabled',
            setting_value: emailData.enabled ? 'true' : 'false',
            display_name: 'Email Service Enabled',
            description: 'Enable or disable email functionality',
            setting_type: 'boolean' as const,
            is_required: false,
            is_active: true
          }
        ];
        
        return settingsArray;
      }
      
      return [];
    } catch (error) {
      console.error('Failed to load email settings:', error);
      // Return default settings if API fails
      return [
        {
          id: '1',
          setting_key: 'smtp_host',
          setting_value: 'smtp.hostinger.com',
          display_name: 'SMTP Host',
          description: 'SMTP server hostname',
          setting_type: 'text' as const,
          is_required: true,
          is_active: true
        },
        {
          id: '2',
          setting_key: 'smtp_port',
          setting_value: '465',
          display_name: 'SMTP Port',
          description: 'SMTP server port',
          setting_type: 'text' as const,
          is_required: true,
          is_active: true
        },
        {
          id: '3',
          setting_key: 'smtp_user',
          setting_value: 'management@bookmyreservation.org',
          display_name: 'SMTP Username',
          description: 'SMTP authentication username',
          setting_type: 'email' as const,
          is_required: true,
          is_active: true
        },
        {
          id: '4',
          setting_key: 'smtp_pass',
          setting_value: '***CONFIGURED***',
          display_name: 'SMTP Password',
          description: 'SMTP authentication password',
          setting_type: 'text' as const,
          is_required: true,
          is_active: true
        },
        {
          id: '5',
          setting_key: 'primary_email',
          setting_value: 'management@bookmyreservation.org',
          display_name: 'From Email',
          description: 'Email address used as sender',
          setting_type: 'email' as const,
          is_required: true,
          is_active: true
        },
        {
          id: '6',
          setting_key: 'email_enabled',
          setting_value: 'true',
          display_name: 'Email Service Enabled',
          description: 'Enable or disable email functionality',
          setting_type: 'boolean' as const,
          is_required: false,
          is_active: true
        }
      ];
    }
  }

  async updateEmailSetting(key: string, value: string): Promise<EmailSettings> {
    const response = await this.request<EmailSettings>(`/email-settings/email/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    });
    
    if (response.success !== false) { // Handle direct success responses
      return response.data || response;
    }
    
    throw new Error(response.error || 'Failed to update email setting');
  }

  async bulkUpdateEmailSettings(updates: Record<string, string>): Promise<EmailSettings> {
    const response = await this.request<EmailSettings>('/settings/email/update', {
      method: 'POST',
      body: JSON.stringify({ settings: updates }),
    });
    
    if (response.success !== false) {
      return response.data || response;
    }
    
    throw new Error(response.error || 'Failed to bulk update email settings');
  }

  async testEmailSettings(): Promise<{ success: boolean; message: string }> {
    const response = await this.request<{ success: boolean; message: string }>('/settings/email/test', {
      method: 'POST',
      body: JSON.stringify({
        to: 'management@bookmyreservation.org',
        subject: 'Test Email from Admin Dashboard',
        message: 'This is a test email to verify SMTP configuration.'
      })
    });
    
    if (response.success !== false) {
      return response.data || response;
    }
    
    throw new Error(response.error || 'Failed to send test email');
  }

  async getEmailStats(): Promise<{ sent: number; failed: number; pending: number }> {
    const response = await this.request<{ sent: number; failed: number; pending: number }>('/email-settings/email/stats');
    
    if (response.success !== false) {
      return response.data || response;
    }
    
    throw new Error(response.error || 'Failed to get email stats');
  }

  // Automation & Analytics
  async getAutomationActivities(): Promise<AutomationWorkflow[]> {
    const response = await this.request<AutomationWorkflow[]>('/analytics/automation/activities');
    return response.data || response;
  }

  async getAutomationStats(): Promise<AnalyticsData> {
    const response = await this.request<AnalyticsData>('/analytics/automation/stats');
    return response.data || response;
  }

  // Email Templates
  async getEmailTemplates(): Promise<EmailTemplate[]> {
    const response = await this.request<EmailTemplate[]>('/email-settings/templates');
    return response.data || response;
  }

  async updateEmailTemplate(templateKey: string, updates: Partial<EmailTemplate>): Promise<EmailTemplate> {
    const response = await this.request<EmailTemplate>(`/email-settings/templates/${templateKey}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    
    if (response.success !== false) {
      return response.data || response;
    }
    
    throw new Error(response.error || 'Failed to update email template');
  }

  async testEmailTemplate(templateKey: string, testData: Record<string, unknown>): Promise<{ success: boolean; message: string }> {
    const response = await this.request<{ success: boolean; message: string }>(`/email-settings/templates/${templateKey}/test`, {
      method: 'POST',
      body: JSON.stringify({ testData }),
    });
    
    if (response.success !== false) {
      return response.data || response;
    }
    
    throw new Error(response.error || 'Failed to send test email');
  }

  // Generic GET method for components that expect it
  async get<T = unknown>(endpoint: string): Promise<T> {
    const response = await this.request<T>(endpoint);
    return response.data || response;
  }

  // Generic PATCH method for updates
  async patch<T = unknown>(endpoint: string, data?: any): Promise<T> {
    const response = await this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
    return response.data || response;
  }

  // Generic POST method 
  async post<T = unknown>(endpoint: string, data?: any): Promise<T> {
    const response = await this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
    return response.data || response;
  }

  // Form submissions
  async getFormSubmissions(type: 'representation' | 'consultation' | 'service-requests'): Promise<FormSubmission[]> {
    const response = await this.request<FormSubmission[]>(`/admin/forms/${type}`);
    return response.data || [];
  }

  // Payment Options
  async getPaymentOptions(): Promise<any[]> {
    const response = await this.request<any[]>('/payment-options');
    return response.data || [];
  }

  async createPaymentOption(option: any): Promise<any> {
    const response = await this.request<any>('/payment-options', {
      method: 'POST',
      body: JSON.stringify(option),
    });
    
    if (response.success !== false) {
      return response.data || response;
    }
    
    throw new Error(response.error || 'Failed to create payment option');
  }

  async updatePaymentOption(id: string, updates: any): Promise<any> {
    const response = await this.request<any>(`/payment-options/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    
    if (response.success !== false) {
      return response.data || response;
    }
    
    throw new Error(response.error || 'Failed to update payment option');
  }

  async deletePaymentOption(id: string): Promise<void> {
    const response = await this.request(`/payment-options/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to delete payment option');
    }
  }
}

export const api = new ApiClient();