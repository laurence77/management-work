-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create celebrities table
CREATE TABLE IF NOT EXISTS celebrities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  image TEXT,
  description TEXT,
  availability BOOLEAN DEFAULT true,
  rating DECIMAL(3,2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  bookings INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create site_settings table
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

-- Create users table for authentication
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(50),
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  celebrity_id UUID REFERENCES celebrities(id) ON DELETE CASCADE,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_hours INTEGER DEFAULT 1,
  total_price DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_celebrities_category ON celebrities(category);
CREATE INDEX IF NOT EXISTS idx_celebrities_availability ON celebrities(availability);
CREATE INDEX IF NOT EXISTS idx_celebrities_rating ON celebrities(rating);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_celebrity_id ON bookings(celebrity_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_celebrities_updated_at BEFORE UPDATE ON celebrities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_site_settings_updated_at BEFORE UPDATE ON site_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
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
) VALUES (
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
) ON CONFLICT DO NOTHING;

-- Insert sample celebrities
INSERT INTO celebrities (name, category, price, description, availability, rating, bookings) VALUES 
('Leonardo DiCaprio', 'A-List Actor', 50000.00, 'Academy Award-winning actor known for Titanic, Inception, and The Revenant', true, 4.9, 15),
('Taylor Swift', 'Musician', 75000.00, 'Grammy Award-winning singer-songwriter and global superstar', true, 4.8, 8),
('Serena Williams', 'Athlete', 30000.00, 'Tennis legend and 23-time Grand Slam champion', true, 4.7, 22),
('Gordon Ramsay', 'Chef', 25000.00, 'Michelin-starred chef and television personality', true, 4.6, 35),
('Oprah Winfrey', 'Media Personality', 100000.00, 'Media mogul, talk show host, and philanthropist', true, 5.0, 5)
ON CONFLICT DO NOTHING;