-- Enhanced RBAC + RLS Security for Celebrity Booking Platform
-- This migration strengthens access control with comprehensive role-based permissions

-- Create roles table for fine-grained permissions
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_system_role BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  resource VARCHAR(50) NOT NULL, -- bookings, celebrities, analytics, etc.
  action VARCHAR(20) NOT NULL, -- read, write, delete, approve, etc.
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Junction table for role-permission mapping
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  role_id UUID REFERENCES user_roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

-- User role assignments (users can have multiple roles)
CREATE TABLE IF NOT EXISTS user_role_assignments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES user_roles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES app_users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, role_id)
);

-- Organization/tenant isolation table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  domain VARCHAR(100),
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User organization memberships
CREATE TABLE IF NOT EXISTS user_organizations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  role_in_org VARCHAR(50) DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, organization_id)
);

-- Add organization_id to existing tables for tenant isolation
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE celebrities ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE events ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- Insert default roles
INSERT INTO user_roles (name, display_name, description, is_system_role) VALUES
('super_admin', 'Super Admin', 'Full system access across all organizations', true),
('org_admin', 'Organization Admin', 'Full access within organization', true),
('booking_manager', 'Booking Manager', 'Manage bookings and celebrities', true),
('sales_rep', 'Sales Representative', 'Create and manage bookings', true),
('customer_support', 'Customer Support', 'Handle customer inquiries and basic booking operations', true),
('viewer', 'Viewer', 'Read-only access to assigned resources', true)
ON CONFLICT (name) DO NOTHING;

-- Insert comprehensive permissions
INSERT INTO permissions (name, resource, action, description) VALUES
-- Booking permissions
('bookings.read', 'bookings', 'read', 'View bookings'),
('bookings.create', 'bookings', 'create', 'Create new bookings'),
('bookings.update', 'bookings', 'update', 'Edit existing bookings'),
('bookings.delete', 'bookings', 'delete', 'Delete bookings'),
('bookings.approve', 'bookings', 'approve', 'Approve booking requests'),
('bookings.cancel', 'bookings', 'cancel', 'Cancel confirmed bookings'),

-- Celebrity permissions
('celebrities.read', 'celebrities', 'read', 'View celebrity profiles'),
('celebrities.create', 'celebrities', 'create', 'Add new celebrities'),
('celebrities.update', 'celebrities', 'update', 'Edit celebrity profiles'),
('celebrities.delete', 'celebrities', 'delete', 'Remove celebrities'),

-- Analytics permissions
('analytics.read', 'analytics', 'read', 'View analytics dashboards'),
('analytics.export', 'analytics', 'export', 'Export analytics data'),
('analytics.advanced', 'analytics', 'advanced', 'Access advanced analytics features'),

-- User management permissions
('users.read', 'users', 'read', 'View user accounts'),
('users.create', 'users', 'create', 'Create new user accounts'),
('users.update', 'users', 'update', 'Edit user accounts'),
('users.delete', 'users', 'delete', 'Delete user accounts'),
('users.assign_roles', 'users', 'assign_roles', 'Assign roles to users'),

-- Chat permissions
('chat.read', 'chat', 'read', 'View chat messages'),
('chat.send', 'chat', 'send', 'Send chat messages'),
('chat.moderate', 'chat', 'moderate', 'Moderate chat rooms'),

-- System permissions
('system.settings', 'system', 'settings', 'Manage system settings'),
('system.audit', 'system', 'audit', 'View audit logs'),
('system.backup', 'system', 'backup', 'Perform system backups')
ON CONFLICT (name) DO NOTHING;

-- Assign permissions to roles
-- Super Admin gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM user_roles r, permissions p 
WHERE r.name = 'super_admin'
ON CONFLICT DO NOTHING;

-- Organization Admin permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM user_roles r, permissions p 
WHERE r.name = 'org_admin' 
AND p.name IN (
  'bookings.read', 'bookings.create', 'bookings.update', 'bookings.approve', 'bookings.cancel',
  'celebrities.read', 'celebrities.create', 'celebrities.update',
  'analytics.read', 'analytics.export', 'analytics.advanced',
  'users.read', 'users.create', 'users.update', 'users.assign_roles',
  'chat.read', 'chat.send', 'chat.moderate'
)
ON CONFLICT DO NOTHING;

-- Booking Manager permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM user_roles r, permissions p 
WHERE r.name = 'booking_manager' 
AND p.name IN (
  'bookings.read', 'bookings.create', 'bookings.update', 'bookings.approve',
  'celebrities.read', 'celebrities.update',
  'analytics.read', 'analytics.export',
  'chat.read', 'chat.send'
)
ON CONFLICT DO NOTHING;

-- Sales Rep permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM user_roles r, permissions p 
WHERE r.name = 'sales_rep' 
AND p.name IN (
  'bookings.read', 'bookings.create', 'bookings.update',
  'celebrities.read',
  'analytics.read',
  'chat.read', 'chat.send'
)
ON CONFLICT DO NOTHING;

-- Customer Support permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM user_roles r, permissions p 
WHERE r.name = 'customer_support' 
AND p.name IN (
  'bookings.read', 'bookings.update',
  'celebrities.read',
  'chat.read', 'chat.send', 'chat.moderate'
)
ON CONFLICT DO NOTHING;

-- Viewer permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM user_roles r, permissions p 
WHERE r.name = 'viewer' 
AND p.name IN (
  'bookings.read',
  'celebrities.read',
  'analytics.read',
  'chat.read'
)
ON CONFLICT DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_user_id ON user_role_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_role_id ON user_role_assignments(role_id);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_active ON user_role_assignments(is_active);
CREATE INDEX IF NOT EXISTS idx_user_organizations_user_id ON user_organizations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_organizations_org_id ON user_organizations(organization_id);
CREATE INDEX IF NOT EXISTS idx_app_users_organization_id ON app_users(organization_id);
CREATE INDEX IF NOT EXISTS idx_bookings_organization_id ON bookings(organization_id);
CREATE INDEX IF NOT EXISTS idx_celebrities_organization_id ON celebrities(organization_id);

-- Enable RLS on all tables
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_roles
CREATE POLICY "Users can view roles in their organization" ON user_roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM app_users au 
      WHERE au.auth_id = auth.uid()
      AND (
        au.role IN ('super_admin') 
        OR EXISTS (
          SELECT 1 FROM user_role_assignments ura
          JOIN role_permissions rp ON ura.role_id = rp.role_id
          JOIN permissions p ON rp.permission_id = p.id
          WHERE ura.user_id = au.id 
          AND ura.is_active = true
          AND p.name = 'users.read'
        )
      )
    )
  );

-- RLS Policies for organizations
CREATE POLICY "Users can view their organization" ON organizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM app_users au 
      WHERE au.auth_id = auth.uid()
      AND (
        au.role = 'super_admin'
        OR au.organization_id = organizations.id
        OR EXISTS (
          SELECT 1 FROM user_organizations uo
          WHERE uo.user_id = au.id 
          AND uo.organization_id = organizations.id
          AND uo.is_active = true
        )
      )
    )
  );

-- Enhanced RLS for bookings with organization isolation
DROP POLICY IF EXISTS "Authenticated users can view bookings" ON bookings;
CREATE POLICY "Users can view bookings in their organization" ON bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM app_users au 
      WHERE au.auth_id = auth.uid()
      AND (
        au.role = 'super_admin'
        OR (
          au.organization_id = bookings.organization_id
          AND EXISTS (
            SELECT 1 FROM user_role_assignments ura
            JOIN role_permissions rp ON ura.role_id = rp.role_id
            JOIN permissions p ON rp.permission_id = p.id
            WHERE ura.user_id = au.id 
            AND ura.is_active = true
            AND p.name = 'bookings.read'
          )
        )
      )
    )
  );

-- Enhanced RLS for celebrities with organization isolation
DROP POLICY IF EXISTS "Authenticated users can view celebrities" ON celebrities;
CREATE POLICY "Users can view celebrities in their organization" ON celebrities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM app_users au 
      WHERE au.auth_id = auth.uid()
      AND (
        au.role = 'super_admin'
        OR (
          au.organization_id = celebrities.organization_id
          AND EXISTS (
            SELECT 1 FROM user_role_assignments ura
            JOIN role_permissions rp ON ura.role_id = rp.role_id
            JOIN permissions p ON rp.permission_id = p.id
            WHERE ura.user_id = au.id 
            AND ura.is_active = true
            AND p.name = 'celebrities.read'
          )
        )
      )
    )
  );

-- Function to check user permissions
CREATE OR REPLACE FUNCTION check_user_permission(
  user_auth_id UUID,
  permission_name TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  has_permission BOOLEAN := false;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM app_users au
    JOIN user_role_assignments ura ON au.id = ura.user_id
    JOIN role_permissions rp ON ura.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE au.auth_id = user_auth_id
    AND ura.is_active = true
    AND (ura.expires_at IS NULL OR ura.expires_at > NOW())
    AND p.name = permission_name
  ) INTO has_permission;
  
  RETURN has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's organization
CREATE OR REPLACE FUNCTION get_user_organization(user_auth_id UUID)
RETURNS UUID AS $$
DECLARE
  org_id UUID;
BEGIN
  SELECT au.organization_id 
  INTO org_id
  FROM app_users au 
  WHERE au.auth_id = user_auth_id;
  
  RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin(user_auth_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_admin BOOLEAN := false;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM app_users au
    WHERE au.auth_id = user_auth_id
    AND au.role = 'super_admin'
  ) INTO is_admin;
  
  RETURN is_admin;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Audit log table for security tracking
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES app_users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on audit logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS policy for audit logs
CREATE POLICY "Users can view audit logs in their organization" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM app_users au 
      WHERE au.auth_id = auth.uid()
      AND (
        au.role = 'super_admin'
        OR (
          au.organization_id = audit_logs.organization_id
          AND EXISTS (
            SELECT 1 FROM user_role_assignments ura
            JOIN role_permissions rp ON ura.role_id = rp.role_id
            JOIN permissions p ON rp.permission_id = p.id
            WHERE ura.user_id = au.id 
            AND ura.is_active = true
            AND p.name = 'system.audit'
          )
        )
      )
    )
  );

-- Function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event(
  p_user_id UUID,
  p_action VARCHAR(100),
  p_resource_type VARCHAR(50),
  p_resource_id UUID DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  audit_id UUID;
  user_org_id UUID;
BEGIN
  -- Get user's organization
  SELECT organization_id INTO user_org_id
  FROM app_users WHERE id = p_user_id;
  
  INSERT INTO audit_logs (
    user_id, action, resource_type, resource_id, 
    old_values, new_values, ip_address, user_agent, organization_id
  ) VALUES (
    p_user_id, p_action, p_resource_type, p_resource_id,
    p_old_values, p_new_values, p_ip_address, p_user_agent, user_org_id
  ) RETURNING id INTO audit_id;
  
  RETURN audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create default organization
INSERT INTO organizations (name, slug, domain) 
VALUES ('Default Organization', 'default', 'localhost')
ON CONFLICT (slug) DO NOTHING;

-- Update existing users to have the default organization
UPDATE app_users 
SET organization_id = (SELECT id FROM organizations WHERE slug = 'default')
WHERE organization_id IS NULL;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_user_roles_updated_at ON user_roles;
CREATE TRIGGER update_user_roles_updated_at 
    BEFORE UPDATE ON user_roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at 
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();