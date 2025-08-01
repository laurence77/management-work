-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for user roles
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'moderator', 'user', 'guest');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create users table for RBAC (this works alongside Supabase Auth)
CREATE TABLE IF NOT EXISTS app_users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  role user_role DEFAULT 'user',
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  
  -- Profile information
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  avatar_url TEXT,
  phone VARCHAR(20),
  
  -- Metadata
  last_login TIMESTAMP WITH TIME ZONE,
  login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  resource VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create role_permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  role user_role NOT NULL,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role, permission_id)
);

-- Create refresh_tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_revoked BOOLEAN DEFAULT false,
  device_info JSONB,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES app_users(id),
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(100),
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bookings table with proper structure
CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  celebrity_id UUID REFERENCES celebrities(id) ON DELETE CASCADE,
  
  -- Event details
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  event_duration INTEGER NOT NULL, -- in hours
  event_type VARCHAR(100) NOT NULL,
  event_location TEXT NOT NULL,
  special_requests TEXT,
  
  -- Contact information
  contact_name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(20) NOT NULL,
  
  -- Booking status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  total_amount DECIMAL(10,2) NOT NULL,
  deposit_amount DECIMAL(10,2),
  
  -- Payment information
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
  payment_intent_id TEXT,
  
  -- Admin notes
  admin_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default permissions
INSERT INTO permissions (name, description, resource, action) VALUES
  ('celebrities.read', 'View celebrities', 'celebrities', 'read'),
  ('celebrities.create', 'Create celebrities', 'celebrities', 'create'),
  ('celebrities.update', 'Update celebrities', 'celebrities', 'update'),
  ('celebrities.delete', 'Delete celebrities', 'celebrities', 'delete'),
  ('bookings.read', 'View bookings', 'bookings', 'read'),
  ('bookings.create', 'Create bookings', 'bookings', 'create'),
  ('bookings.update', 'Update bookings', 'bookings', 'update'),
  ('bookings.delete', 'Delete bookings', 'bookings', 'delete'),
  ('users.read', 'View users', 'users', 'read'),
  ('users.update', 'Update users', 'users', 'update'),
  ('users.delete', 'Delete users', 'users', 'delete'),
  ('settings.read', 'View settings', 'settings', 'read'),
  ('settings.update', 'Update settings', 'settings', 'update'),
  ('analytics.read', 'View analytics', 'analytics', 'read')
ON CONFLICT (name) DO NOTHING;

-- Assign permissions to roles
WITH permission_mappings AS (
  SELECT 
    'admin'::user_role as role,
    ARRAY[
      'celebrities.read', 'celebrities.create', 'celebrities.update', 'celebrities.delete',
      'bookings.read', 'bookings.create', 'bookings.update', 'bookings.delete',
      'users.read', 'users.update', 'users.delete',
      'settings.read', 'settings.update',
      'analytics.read'
    ] as permissions
  UNION ALL
  SELECT 
    'moderator'::user_role,
    ARRAY[
      'celebrities.read', 'celebrities.update',
      'bookings.read', 'bookings.update',
      'users.read'
    ]
  UNION ALL
  SELECT 
    'user'::user_role,
    ARRAY[
      'celebrities.read',
      'bookings.read', 'bookings.create'
    ]
  UNION ALL
  SELECT 
    'guest'::user_role,
    ARRAY['celebrities.read']
)
INSERT INTO role_permissions (role, permission_id)
SELECT 
  pm.role,
  p.id
FROM permission_mappings pm
CROSS JOIN LATERAL unnest(pm.permissions) as perm_name
JOIN permissions p ON p.name = perm_name
ON CONFLICT (role, permission_id) DO NOTHING;

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
DROP TRIGGER IF EXISTS update_app_users_updated_at ON app_users;
CREATE TRIGGER update_app_users_updated_at 
    BEFORE UPDATE ON app_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
CREATE TRIGGER update_bookings_updated_at 
    BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_app_users_auth_id ON app_users(auth_id);
CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email);
CREATE INDEX IF NOT EXISTS idx_app_users_role ON app_users(role);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_celebrity_id ON bookings(celebrity_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- Enable Row Level Security
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE celebrities ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for app_users
CREATE POLICY "Users can view their own profile" ON app_users
  FOR SELECT USING (auth.uid() = auth_id);

CREATE POLICY "Admins can view all users" ON app_users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM app_users au 
      WHERE au.auth_id = auth.uid() 
      AND au.role = 'admin'
    )
  );

CREATE POLICY "Users can update their own profile" ON app_users
  FOR UPDATE USING (auth.uid() = auth_id);

CREATE POLICY "Admins can update any user" ON app_users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM app_users au 
      WHERE au.auth_id = auth.uid() 
      AND au.role = 'admin'
    )
  );

-- RLS Policies for celebrities
CREATE POLICY "Everyone can view available celebrities" ON celebrities
  FOR SELECT USING (availability = true);

CREATE POLICY "Admins and moderators can view all celebrities" ON celebrities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM app_users au 
      WHERE au.auth_id = auth.uid() 
      AND au.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Only admins can modify celebrities" ON celebrities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM app_users au 
      WHERE au.auth_id = auth.uid() 
      AND au.role = 'admin'
    )
  );

-- RLS Policies for bookings
CREATE POLICY "Users can view their own bookings" ON bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM app_users au 
      WHERE au.auth_id = auth.uid() 
      AND au.id = bookings.user_id
    )
  );

CREATE POLICY "Admins and moderators can view all bookings" ON bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM app_users au 
      WHERE au.auth_id = auth.uid() 
      AND au.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Authenticated users can create bookings" ON bookings
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM app_users au 
      WHERE au.auth_id = auth.uid() 
      AND au.id = bookings.user_id
    )
  );

CREATE POLICY "Users can update their own pending bookings" ON bookings
  FOR UPDATE USING (
    status = 'pending'
    AND EXISTS (
      SELECT 1 FROM app_users au 
      WHERE au.auth_id = auth.uid() 
      AND au.id = bookings.user_id
    )
  );

CREATE POLICY "Admins and moderators can update any booking" ON bookings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM app_users au 
      WHERE au.auth_id = auth.uid() 
      AND au.role IN ('admin', 'moderator')
    )
  );

-- RLS Policies for refresh_tokens
CREATE POLICY "Users can view their own tokens" ON refresh_tokens
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM app_users au 
      WHERE au.auth_id = auth.uid() 
      AND au.id = refresh_tokens.user_id
    )
  );

CREATE POLICY "Users can manage their own tokens" ON refresh_tokens
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM app_users au 
      WHERE au.auth_id = auth.uid() 
      AND au.id = refresh_tokens.user_id
    )
  );

-- RLS Policies for site_settings
CREATE POLICY "Everyone can read site settings" ON site_settings
  FOR SELECT USING (true);

CREATE POLICY "Only admins can modify site settings" ON site_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM app_users au 
      WHERE au.auth_id = auth.uid() 
      AND au.role = 'admin'
    )
  );

-- RLS Policies for audit_logs
CREATE POLICY "Only admins can view audit logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM app_users au 
      WHERE au.auth_id = auth.uid() 
      AND au.role = 'admin'
    )
  );

-- Function to get user permissions
CREATE OR REPLACE FUNCTION get_user_permissions(user_auth_id UUID)
RETURNS TABLE(permission_name VARCHAR(100)) AS $$
BEGIN
  RETURN QUERY
  SELECT p.name
  FROM app_users au
  JOIN role_permissions rp ON rp.role = au.role
  JOIN permissions p ON p.id = rp.permission_id
  WHERE au.auth_id = user_auth_id
  AND au.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION user_has_permission(user_auth_id UUID, permission_name VARCHAR(100))
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM get_user_permissions(user_auth_id) 
    WHERE permission_name = get_user_permissions.permission_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;