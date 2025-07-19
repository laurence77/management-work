-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create or update celebrities table with all required columns
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
  
  -- Location fields
  location_city TEXT,
  location_country TEXT,
  
  -- Social media and contact fields
  facebook_url TEXT,
  instagram_url TEXT,
  email TEXT,
  whatsapp TEXT,
  telegram_url TEXT,
  signal_url TEXT,
  
  -- Additional info
  bio TEXT,
  is_featured BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- If table exists but missing columns, add them
DO $$ 
BEGIN
    -- Add name column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'celebrities' AND column_name = 'name') THEN
        ALTER TABLE celebrities ADD COLUMN name VARCHAR(255) NOT NULL DEFAULT 'Unknown';
    END IF;
    
    -- Add category column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'celebrities' AND column_name = 'category') THEN
        ALTER TABLE celebrities ADD COLUMN category VARCHAR(100) NOT NULL DEFAULT 'Other';
    END IF;
    
    -- Add price column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'celebrities' AND column_name = 'price') THEN
        ALTER TABLE celebrities ADD COLUMN price DECIMAL(10,2) NOT NULL DEFAULT 0;
    END IF;
    
    -- Add image column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'celebrities' AND column_name = 'image') THEN
        ALTER TABLE celebrities ADD COLUMN image TEXT;
    END IF;
    
    -- Add description column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'celebrities' AND column_name = 'description') THEN
        ALTER TABLE celebrities ADD COLUMN description TEXT;
    END IF;
    
    -- Add availability column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'celebrities' AND column_name = 'availability') THEN
        ALTER TABLE celebrities ADD COLUMN availability BOOLEAN DEFAULT true;
    END IF;
    
    -- Add rating column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'celebrities' AND column_name = 'rating') THEN
        ALTER TABLE celebrities ADD COLUMN rating DECIMAL(3,2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5);
    END IF;
    
    -- Add bookings column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'celebrities' AND column_name = 'bookings') THEN
        ALTER TABLE celebrities ADD COLUMN bookings INTEGER DEFAULT 0;
    END IF;
    
    -- Add location fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'celebrities' AND column_name = 'location_city') THEN
        ALTER TABLE celebrities ADD COLUMN location_city TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'celebrities' AND column_name = 'location_country') THEN
        ALTER TABLE celebrities ADD COLUMN location_country TEXT;
    END IF;
    
    -- Add social media and contact fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'celebrities' AND column_name = 'facebook_url') THEN
        ALTER TABLE celebrities ADD COLUMN facebook_url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'celebrities' AND column_name = 'instagram_url') THEN
        ALTER TABLE celebrities ADD COLUMN instagram_url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'celebrities' AND column_name = 'email') THEN
        ALTER TABLE celebrities ADD COLUMN email TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'celebrities' AND column_name = 'whatsapp') THEN
        ALTER TABLE celebrities ADD COLUMN whatsapp TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'celebrities' AND column_name = 'telegram_url') THEN
        ALTER TABLE celebrities ADD COLUMN telegram_url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'celebrities' AND column_name = 'signal_url') THEN
        ALTER TABLE celebrities ADD COLUMN signal_url TEXT;
    END IF;
    
    -- Add additional info fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'celebrities' AND column_name = 'bio') THEN
        ALTER TABLE celebrities ADD COLUMN bio TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'celebrities' AND column_name = 'is_featured') THEN
        ALTER TABLE celebrities ADD COLUMN is_featured BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add created_at column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'celebrities' AND column_name = 'created_at') THEN
        ALTER TABLE celebrities ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    -- Add updated_at column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'celebrities' AND column_name = 'updated_at') THEN
        ALTER TABLE celebrities ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

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

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_celebrities_updated_at ON celebrities;
CREATE TRIGGER update_celebrities_updated_at 
    BEFORE UPDATE ON celebrities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_site_settings_updated_at ON site_settings;
CREATE TRIGGER update_site_settings_updated_at 
    BEFORE UPDATE ON site_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_celebrities_category ON celebrities(category);
CREATE INDEX IF NOT EXISTS idx_celebrities_availability ON celebrities(availability);
CREATE INDEX IF NOT EXISTS idx_celebrities_rating ON celebrities(rating);
CREATE INDEX IF NOT EXISTS idx_celebrities_featured ON celebrities(is_featured);
CREATE INDEX IF NOT EXISTS idx_celebrities_location_city ON celebrities(location_city);
CREATE INDEX IF NOT EXISTS idx_celebrities_location_country ON celebrities(location_country);

-- Insert default site settings (only if table is empty)
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

-- Insert sample celebrities with all the new fields (only if table is empty)
INSERT INTO celebrities (
  name, category, price, description, availability, rating, bookings,
  location_city, location_country, facebook_url, instagram_url, email,
  whatsapp, telegram_url, bio, is_featured
)
SELECT * FROM (VALUES
  (
    'Leonardo DiCaprio', 'A-List Actor', 50000.00, 
    'Academy Award-winning actor known for Titanic, Inception, and The Revenant', 
    true, 4.9, 15,
    'Los Angeles', 'USA', 
    'https://facebook.com/leonardodicaprio', 
    'https://instagram.com/leonardodicaprio',
    'leo@example.com', '+1-555-0001', 'https://t.me/leodicaprio',
    'Leonardo Wilhelm DiCaprio is an American actor and film producer known for his work in biographical and period films.',
    true
  ),
  (
    'Taylor Swift', 'Musician', 75000.00,
    'Grammy Award-winning singer-songwriter and global superstar',
    true, 4.8, 8,
    'Nashville', 'USA',
    'https://facebook.com/taylorswift',
    'https://instagram.com/taylorswift',
    'taylor@example.com', '+1-555-0002', 'https://t.me/taylorswift',
    'American singer-songwriter known for narrative songs about her personal life.',
    true
  ),
  (
    'Serena Williams', 'Athlete', 30000.00,
    'Tennis legend and 23-time Grand Slam champion',
    true, 4.7, 22,
    'Miami', 'USA',
    'https://facebook.com/serenawilliams',
    'https://instagram.com/serenawilliams',
    'serena@example.com', '+1-555-0003', 'https://t.me/serenawilliams',
    'American former professional tennis player, widely regarded as one of the greatest tennis players of all time.',
    false
  ),
  (
    'Gordon Ramsay', 'Chef', 25000.00,
    'Michelin-starred chef and television personality',
    true, 4.6, 35,
    'London', 'UK',
    'https://facebook.com/gordonramsay',
    'https://instagram.com/gordongram',
    'gordon@example.com', '+44-555-0004', 'https://t.me/gordonramsay',
    'British chef, restaurateur, television personality and writer.',
    false
  ),
  (
    'Oprah Winfrey', 'Media Personality', 100000.00,
    'Media mogul, talk show host, and philanthropist',
    true, 5.0, 5,
    'Chicago', 'USA',
    'https://facebook.com/oprahwinfrey',
    'https://instagram.com/oprah',
    'oprah@example.com', '+1-555-0005', 'https://t.me/oprahwinfrey',
    'American talk show host, television producer, actress, media executive, and philanthropist.',
    true
  )
) AS new_celebrities(
  name, category, price, description, availability, rating, bookings,
  location_city, location_country, facebook_url, instagram_url, email,
  whatsapp, telegram_url, bio, is_featured
)
WHERE NOT EXISTS (SELECT 1 FROM celebrities);