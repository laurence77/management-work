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
  name: string;
  role: 'admin';
  createdAt: string;
  lastLogin: string;
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
  token: string;
  expiresAt: string;
}