const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

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

class ApiClient {
  async getPublicSettings(): Promise<SiteSettings> {
    try {
      const response = await fetch(`${API_BASE_URL}/settings/public`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch settings');
      }

      if (data.success && data.data) {
        return data.data;
      }

      throw new Error('Invalid response format');
    } catch (error) {
      console.error('Error fetching public settings:', error);
      
      // Return default settings if API fails
      return {
        site_name: 'EliteConnect',
        tagline: 'Connect with Elite Celebrities',
        description: 'The premier platform for celebrity bookings and exclusive experiences.',
        contact_email: 'contact@eliteconnect.com',
        contact_phone: '+1 (555) 123-4567',
        address: 'Beverly Hills, CA 90210',
        social_twitter: 'https://twitter.com/eliteconnect',
        social_instagram: 'https://instagram.com/eliteconnect',
        social_facebook: 'https://facebook.com/eliteconnect',
        social_linkedin: 'https://linkedin.com/company/eliteconnect',
        footer_company_description: 'EliteConnect is the premier platform connecting you with world-class celebrities for unforgettable experiences, private meetings, and exclusive events.',
        footer_copyright: '© 2024 EliteConnect. All rights reserved.',
        footer_services_title: 'Services',
        footer_services_links: [
          { name: 'Private Meetings', url: '/meetings' },
          { name: 'Event Appearances', url: '/events' },
          { name: 'Celebrity Management', url: '/management' },
          { name: 'Brand Consulting', url: '/consulting' },
          { name: 'Luxury Accommodations', url: '/hotels' }
        ],
        footer_support_title: 'Support',
        footer_support_links: [
          { name: 'FAQ', url: '/faq' },
          { name: 'Contact Us', url: '/contact' },
          { name: 'Privacy Policy', url: '/privacy' },
          { name: 'Terms of Service', url: '/terms' },
          { name: 'Security', url: '/security' }
        ],
        footer_legal_links: [
          { name: 'Legal', url: '/legal' },
          { name: 'Cookies', url: '/cookies' },
          { name: 'Accessibility', url: '/accessibility' }
        ],
        newsletter_enabled: true,
        newsletter_title: 'Stay Connected',
        newsletter_description: 'Get exclusive updates and celebrity news',
        meta_title: 'EliteConnect - Premium Celebrity Booking Platform',
        meta_description: 'Book exclusive meetings and events with world-class celebrities. Premium experiences, verified talents, secure platform.',
        meta_keywords: 'celebrity booking, exclusive events, private meetings, luxury experiences',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }
  }
}

export const api = new ApiClient();