-- Create site_settings table only
CREATE TABLE IF NOT EXISTS site_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Basic site info
  site_name VARCHAR(255) DEFAULT 'EliteConnect',
  tagline VARCHAR(500),
  description TEXT,
  
  -- Contact information
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  address TEXT,
  
  -- Social media links
  social_twitter VARCHAR(255),
  social_instagram VARCHAR(255),
  social_facebook VARCHAR(255),
  social_linkedin VARCHAR(255),
  
  -- Footer content
  footer_company_description TEXT,
  footer_copyright VARCHAR(500),
  
  -- Footer links
  footer_services_title VARCHAR(100) DEFAULT 'Services',
  footer_services_links JSONB,
  footer_support_title VARCHAR(100) DEFAULT 'Support',
  footer_support_links JSONB,
  footer_legal_links JSONB,
  
  -- Newsletter
  newsletter_enabled BOOLEAN DEFAULT true,
  newsletter_title VARCHAR(255),
  newsletter_description TEXT,
  
  -- SEO settings
  meta_title VARCHAR(255),
  meta_description TEXT,
  meta_keywords TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trigger for site_settings
DROP TRIGGER IF EXISTS update_site_settings_updated_at ON site_settings;
CREATE TRIGGER update_site_settings_updated_at 
    BEFORE UPDATE ON site_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default site settings
INSERT INTO site_settings (
  site_name,
  tagline,
  description,
  contact_email,
  contact_phone,
  address,
  social_twitter,
  social_instagram,
  social_facebook,
  social_linkedin,
  footer_company_description,
  footer_copyright,
  footer_services_links,
  footer_support_links,
  footer_legal_links,
  newsletter_title,
  newsletter_description,
  meta_title,
  meta_description,
  meta_keywords
)
SELECT
  'EliteConnect',
  'Connect with Elite Celebrities',
  'The premier platform for celebrity bookings and exclusive experiences.',
  'contact@eliteconnect.com',
  '+1 (555) 123-4567',
  'Beverly Hills, CA 90210',
  'https://twitter.com/eliteconnect',
  'https://instagram.com/eliteconnect',
  'https://facebook.com/eliteconnect',
  'https://linkedin.com/company/eliteconnect',
  'EliteConnect is the premier platform connecting you with world-class celebrities for unforgettable experiences, private meetings, and exclusive events.',
  '© 2024 EliteConnect. All rights reserved.',
  '[
    {"name": "Private Meetings", "url": "/meetings"},
    {"name": "Event Appearances", "url": "/events"},
    {"name": "Celebrity Management", "url": "/management"},
    {"name": "Brand Consulting", "url": "/consulting"},
    {"name": "Luxury Accommodations", "url": "/hotels"}
  ]',
  '[
    {"name": "FAQ", "url": "/faq"},
    {"name": "Contact Us", "url": "/contact"},
    {"name": "Privacy Policy", "url": "/privacy"},
    {"name": "Terms of Service", "url": "/terms"},
    {"name": "Security", "url": "/security"}
  ]',
  '[
    {"name": "Legal", "url": "/legal"},
    {"name": "Cookies", "url": "/cookies"},
    {"name": "Accessibility", "url": "/accessibility"}
  ]',
  'Stay Connected',
  'Get exclusive updates and celebrity news',
  'EliteConnect - Premium Celebrity Booking Platform',
  'Book exclusive meetings and events with world-class celebrities. Premium experiences, verified talents, secure platform.',
  'celebrity booking, exclusive events, private meetings, luxury experiences'
WHERE NOT EXISTS (SELECT 1 FROM site_settings);