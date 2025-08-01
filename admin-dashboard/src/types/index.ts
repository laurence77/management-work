export interface Celebrity {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  description: string;
  availability: boolean;
  rating: number;
  bookings: number;
  
  // Location fields
  location_city?: string;
  location_country?: string;
  
  // Social media and contact fields
  facebook_url?: string;
  instagram_url?: string;
  email?: string;
  whatsapp?: string;
  telegram_url?: string;
  signal_url?: string;
  
  // Additional info
  bio?: string;
  is_featured: boolean;
  
  createdAt: string;
  updatedAt: string;
}

export interface SiteSettings {
  // Basic site info
  site_name: string;
  tagline: string;
  description: string;
  
  // Contact information
  contact_email: string;
  contact_phone: string;
  address: string;
  
  // Social media links
  social_twitter: string;
  social_instagram: string;
  social_facebook: string;
  social_linkedin: string;
  
  // Footer content
  footer_company_description: string;
  footer_copyright: string;
  
  // Footer links
  footer_services_title: string;
  footer_services_links: Array<{name: string; url: string}>;
  footer_support_title: string;
  footer_support_links: Array<{name: string; url: string}>;
  footer_legal_links: Array<{name: string; url: string}>;
  
  // Newsletter
  newsletter_enabled: boolean;
  newsletter_title: string;
  newsletter_description: string;
  
  // SEO settings
  meta_title: string;
  meta_description: string;
  meta_keywords: string;
  
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'moderator' | 'user';
  permissions: string[];
  isVerified: boolean;
  createdAt: string;
  lastLogin?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  expiresIn: string;
}

export interface Booking {
  id: string;
  user_id: string;
  celebrity_id: string;
  event_date: string;
  event_duration: number;
  event_type: string;
  event_location: string;
  special_requests?: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  total_amount: number;
  deposit_amount?: number;
  payment_status: 'pending' | 'paid' | 'refunded' | 'failed';
  payment_intent_id?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
  celebrity?: Celebrity;
  user?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

// Chat and Communication Types
export interface ChatMessage {
  id: string;
  chat_room_id: string;
  sender_id: string;
  message: string;
  message_type: 'text' | 'image' | 'file' | 'system';
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  sender?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url?: string;
  };
}

export interface ChatRoom {
  id: string;
  name?: string;
  type: 'direct' | 'group' | 'support';
  participants: string[];
  last_message?: ChatMessage;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
}

// Analytics Types
export interface AnalyticsData {
  period: 'day' | 'week' | 'month' | 'year';
  metrics: {
    total_bookings: number;
    total_revenue: number;
    active_users: number;
    conversion_rate: number;
    average_booking_value: number;
  };
  trends: {
    bookings_change: number;
    revenue_change: number;
    users_change: number;
  };
  top_celebrities: Array<{
    id: string;
    name: string;
    bookings: number;
    revenue: number;
  }>;
  booking_sources: Array<{
    source: string;
    count: number;
    percentage: number;
  }>;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  label?: string;
  color?: string;
}

export interface TimeSeriesData {
  date: string;
  value: number;
  label?: string;
}

// Automation Types
export interface AutomationWorkflow {
  id: string;
  name: string;
  description?: string;
  trigger_type: 'booking_created' | 'payment_received' | 'user_registered' | 'scheduled' | 'manual';
  trigger_config: Record<string, unknown>;
  actions: AutomationAction[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_run?: string;
  run_count: number;
  success_rate: number;
}

export interface AutomationAction {
  id: string;
  type: 'send_email' | 'send_sms' | 'create_task' | 'update_booking' | 'webhook' | 'delay';
  config: Record<string, unknown>;
  order: number;
  is_enabled: boolean;
}

export interface AutomationRun {
  id: string;
  workflow_id: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  trigger_data: Record<string, unknown>;
  started_at: string;
  completed_at?: string;
  error_message?: string;
  steps: AutomationStep[];
}

export interface AutomationStep {
  action_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  output?: Record<string, unknown>;
}

// Edge Functions Types
export interface EdgeFunction {
  id: string;
  name: string;
  description?: string;
  code: string;
  runtime: 'deno' | 'node';
  environment_variables: Record<string, string>;
  is_active: boolean;
  endpoint_url: string;
  created_at: string;
  updated_at: string;
  last_deployed?: string;
  deployment_status: 'pending' | 'deployed' | 'failed';
}

export interface EdgeFunctionLog {
  id: string;
  function_id: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// Realtime Types
export interface RealtimeEvent {
  type: string;
  payload: Record<string, unknown>;
  timestamp: string;
  source?: string;
}

export interface RealtimeSubscription {
  channel: string;
  event_types: string[];
  callback: (event: RealtimeEvent) => void;
}

// AI Assistant Types
export interface AIConversation {
  id: string;
  user_id: string;
  title?: string;
  messages: AIMessage[];
  context: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface AIBookingRequest {
  celebrity_preference?: string;
  event_type?: string;
  budget_range?: [number, number];
  date_preference?: string;
  location_preference?: string;
  special_requirements?: string;
  contact_info: {
    name: string;
    email: string;
    phone?: string;
  };
}

// Calendar Types
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  event_type: 'booking' | 'meeting' | 'personal' | 'system';
  related_booking_id?: string;
  attendees: string[];
  location?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CalendarIntegration {
  id: string;
  provider: 'google' | 'outlook' | 'apple' | 'caldav';
  account_name: string;
  is_active: boolean;
  sync_settings: {
    import_events: boolean;
    export_events: boolean;
    conflict_resolution: 'manual' | 'auto_reject' | 'auto_accept';
  };
  last_sync?: string;
  created_at: string;
}

// Settings Types
export interface EmailSettings {
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  smtp_security: 'none' | 'tls' | 'ssl';
  from_email: string;
  from_name: string;
  reply_to?: string;
  is_active: boolean;
  test_email?: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html_content: string;
  text_content?: string;
  template_type: 'booking_confirmation' | 'payment_receipt' | 'reminder' | 'welcome' | 'custom';
  variables: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Form and Validation Types
export interface FormField {
  name: string;
  type: 'text' | 'email' | 'number' | 'select' | 'textarea' | 'checkbox' | 'date' | 'file';
  label: string;
  placeholder?: string;
  required: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    custom?: string;
  };
  options?: Array<{ label: string; value: string }>;
  default_value?: string | number | boolean;
}

export interface DynamicForm {
  id: string;
  name: string;
  description?: string;
  fields: FormField[];
  submit_url: string;
  success_message?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FormSubmission {
  id: string;
  form_id: string;
  data: Record<string, unknown>;
  submitted_by?: string;
  ip_address?: string;
  user_agent?: string;
  status: 'pending' | 'processed' | 'archived';
  created_at: string;
}

// Error and Loading States
export interface LoadingState {
  isLoading: boolean;
  error?: string | null;
  data?: unknown;
}

export interface ErrorState {
  message: string;
  code?: string | number;
  details?: Record<string, unknown>;
}

// API and HTTP Types
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_items: number;
    items_per_page: number;
    has_next: boolean;
    has_previous: boolean;
  };
}

export interface FilterParams {
  search?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  category?: string;
  [key: string]: string | number | boolean | undefined;
}

// Component Props Types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (value: unknown, row: T) => React.ReactNode;
  width?: string;
}

export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

// Hook Return Types
export interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export interface UseFormResult<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  handleChange: (field: keyof T, value: unknown) => void;
  handleSubmit: (e: React.FormEvent) => void;
  reset: () => void;
  isValid: boolean;
  isDirty: boolean;
}

// Utility Types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};