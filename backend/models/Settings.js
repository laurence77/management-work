const { supabase, supabaseAdmin } = require('../config/supabase');

class Settings {
  // Get all settings
  static async getAll() {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .single();

      if (error && error.code === 'PGRST116') {
        // No settings found, return default values
        return this.getDefaultSettings();
      }

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching settings:', error);
      throw error;
    }
  }

  // Get public settings (safe for frontend)
  static async getPublic() {
    try {
      const settings = await this.getAll();
      
      // Remove sensitive fields
      const publicSettings = { ...settings };
      delete publicSettings.id;
      delete publicSettings.created_at;
      delete publicSettings.updated_at;
      
      return publicSettings;
    } catch (error) {
      console.error('Error fetching public settings:', error);
      throw error;
    }
  }

  // Update settings
  static async update(settingsData) {
    try {
      // Check if settings exist
      const { data: existing } = await supabase
        .from('site_settings')
        .select('id')
        .single();

      const updateData = {
        ...settingsData,
        updated_at: new Date().toISOString()
      };

      let result;
      
      if (existing) {
        // Update existing settings
        const { data, error } = await supabaseAdmin
          .from('site_settings')
          .update(updateData)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Create new settings
        const { data, error } = await supabaseAdmin
          .from('site_settings')
          .insert([updateData])
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      return result;
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  }

  // Get default settings structure
  static getDefaultSettings() {
    return {
      // Basic site info
      site_name: 'EliteConnect',
      tagline: 'Connect with Elite Celebrities',
      description: 'The premier platform for celebrity bookings and exclusive experiences.',
      
      // Contact information
      contact_email: 'contact@eliteconnect.com',
      contact_phone: '+1 (555) 123-4567',
      address: 'Beverly Hills, CA 90210',
      
      // Social media links
      social_twitter: 'https://twitter.com/eliteconnect',
      social_instagram: 'https://instagram.com/eliteconnect',
      social_facebook: 'https://facebook.com/eliteconnect',
      social_linkedin: 'https://linkedin.com/company/eliteconnect',
      
      // Footer content
      footer_company_description: 'EliteConnect is the premier platform connecting you with world-class celebrities for unforgettable experiences, private meetings, and exclusive events.',
      footer_copyright: '© 2024 EliteConnect. All rights reserved.',
      
      // Footer links - Services
      footer_services_title: 'Services',
      footer_services_links: [
        { name: 'Private Meetings', url: '/meetings' },
        { name: 'Event Appearances', url: '/events' },
        { name: 'Celebrity Management', url: '/management' },
        { name: 'Brand Consulting', url: '/consulting' },
        { name: 'Luxury Accommodations', url: '/hotels' }
      ],
      
      // Footer links - Support
      footer_support_title: 'Support',
      footer_support_links: [
        { name: 'FAQ', url: '/faq' },
        { name: 'Contact Us', url: '/contact' },
        { name: 'Privacy Policy', url: '/privacy' },
        { name: 'Terms of Service', url: '/terms' },
        { name: 'Security', url: '/security' }
      ],
      
      // Footer links - Legal
      footer_legal_links: [
        { name: 'Legal', url: '/legal' },
        { name: 'Cookies', url: '/cookies' },
        { name: 'Accessibility', url: '/accessibility' }
      ],
      
      // Newsletter
      newsletter_enabled: true,
      newsletter_title: 'Stay Connected',
      newsletter_description: 'Get exclusive updates and celebrity news',
      
      // SEO settings
      meta_title: 'EliteConnect - Premium Celebrity Booking Platform',
      meta_description: 'Book exclusive meetings and events with world-class celebrities. Premium experiences, verified talents, secure platform.',
      meta_keywords: 'celebrity booking, exclusive events, private meetings, luxury experiences',
      
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  // Reset to defaults
  static async resetToDefaults() {
    try {
      const defaultSettings = this.getDefaultSettings();
      return await this.update(defaultSettings);
    } catch (error) {
      console.error('Error resetting settings:', error);
      throw error;
    }
  }
}

module.exports = Settings;