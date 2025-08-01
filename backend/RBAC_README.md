# Role-Based Access Control (RBAC) Implementation

## Overview

This implementation provides a comprehensive Role-Based Access Control system using Supabase for authentication and Row Level Security (RLS) for data access control, combined with JWT tokens for API authorization.

## Features

### 🔐 **Authentication**
- **Supabase Auth Integration**: Leverages Supabase's built-in authentication system
- **Dual Token System**: Access tokens (15min) + Refresh tokens (7 days)
- **Secure Token Storage**: Refresh tokens stored as httpOnly cookies
- **Automatic Token Refresh**: Seamless token renewal without user intervention
- **Multi-device Support**: Track and manage tokens across multiple devices

### 👥 **Role-Based Permissions**
- **Hierarchical Roles**: Admin > Moderator > User > Guest
- **Fine-grained Permissions**: Resource-action based permissions (e.g., `celebrities.create`)
- **Dynamic Permission Loading**: Permissions fetched at login and stored in JWT
- **Permission Middleware**: Easy-to-use middleware for route protection

### 🛡️ **Row Level Security (RLS)**
- **Supabase RLS Policies**: Database-level security enforced by Supabase
- **User Context Aware**: Policies automatically enforce user-specific access
- **Admin Override**: Admin users can access all data when needed
- **Automatic Enforcement**: No additional code needed for basic access control

### 📊 **Audit & Security**
- **Comprehensive Logging**: All auth events logged with Winston
- **Security Event Tracking**: Failed login attempts, unauthorized access
- **Audit Trail**: Complete audit log of user actions
- **Automated Cleanup**: Expired tokens and old logs automatically cleaned up

## Database Schema

### User Management
```sql
-- Main user table (extends Supabase auth.users)
app_users (
  id UUID PRIMARY KEY,
  auth_id UUID REFERENCES auth.users(id),
  email VARCHAR UNIQUE,
  role user_role DEFAULT 'user',
  is_active BOOLEAN DEFAULT true,
  -- Additional profile fields...
)

-- Permissions system
permissions (
  id UUID PRIMARY KEY,
  name VARCHAR UNIQUE, -- e.g., 'celebrities.create'
  resource VARCHAR,    -- e.g., 'celebrities'
  action VARCHAR       -- e.g., 'create'
)

role_permissions (
  role user_role,
  permission_id UUID REFERENCES permissions(id)
)
```

### Token Management
```sql
refresh_tokens (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES app_users(id),
  token_hash VARCHAR,
  expires_at TIMESTAMP,
  is_revoked BOOLEAN DEFAULT false,
  device_info JSONB,
  ip_address INET
)
```

## Permission System

### Roles & Permissions

#### **Admin Role**
- Full system access
- All permissions granted
- Can create/manage other admins
- Access to all data and analytics

#### **Moderator Role**
- Content management permissions
- Can view and update celebrities
- Can manage bookings
- Limited user management

#### **User Role**
- Basic user permissions
- Can view celebrities
- Can create and manage own bookings
- Profile management

#### **Guest Role**
- Read-only access
- View public celebrity information only

### Permission Format
Permissions follow the pattern: `resource.action`

Examples:
- `celebrities.create` - Create new celebrities
- `celebrities.read` - View celebrities
- `celebrities.update` - Update celebrity information
- `celebrities.delete` - Delete celebrities
- `bookings.read` - View bookings
- `bookings.update` - Update booking status
- `analytics.read` - View system analytics

## API Usage

### Authentication Endpoints

#### Register User
```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}

# Response includes access token and sets httpOnly refresh token cookie
{
  "success": true,
  "data": {
    "user": { ... },
    "accessToken": "eyJ...",
    "expiresIn": "15m"
  }
}
```

#### Refresh Token
```bash
POST /api/auth/refresh
# Refresh token automatically sent from httpOnly cookie

{
  "success": true,
  "data": {
    "user": { ... },
    "accessToken": "eyJ...",
    "expiresIn": "15m"
  }
}
```

#### Logout
```bash
POST /api/auth/logout
Authorization: Bearer <access_token>
```

### Protected Route Usage

#### Using Role-Based Middleware
```javascript
const { requireRole, requirePermission } = require('../middleware/auth');

// Require specific role(s)
router.get('/admin-only', requireRole('admin'), handler);
router.get('/admin-or-mod', requireRole('admin', 'moderator'), handler);

// Require specific permission
router.post('/celebrities', requirePermission('celebrities.create'), handler);
router.delete('/celebrities/:id', requirePermission('celebrities.delete'), handler);
```

#### Frontend Token Usage
```javascript
// Include access token in requests
const response = await fetch('/api/celebrities', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});

// Handle token refresh automatically
if (response.status === 401) {
  const refreshResponse = await fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'include' // Include httpOnly cookie
  });
  
  if (refreshResponse.ok) {
    const { data } = await refreshResponse.json();
    // Use new access token and retry original request
  } else {
    // Redirect to login
  }
}
```

## Row Level Security Policies

### Celebrities Table
```sql
-- Public can view available celebrities
CREATE POLICY "Everyone can view available celebrities" ON celebrities
  FOR SELECT USING (availability = true);

-- Admins can do everything
CREATE POLICY "Admins can manage all celebrities" ON celebrities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM app_users au 
      WHERE au.auth_id = auth.uid() 
      AND au.role = 'admin'
    )
  );
```

### Bookings Table
```sql
-- Users can only see their own bookings
CREATE POLICY "Users can view their own bookings" ON bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM app_users au 
      WHERE au.auth_id = auth.uid() 
      AND au.id = bookings.user_id
    )
  );

-- Admins can see all bookings
CREATE POLICY "Admins can view all bookings" ON bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM app_users au 
      WHERE au.auth_id = auth.uid() 
      AND au.role IN ('admin', 'moderator')
    )
  );
```

## Security Features

### Token Security
- **Short-lived Access Tokens**: 15-minute expiry reduces exposure window
- **Secure Refresh Tokens**: Stored as httpOnly cookies, not accessible via JavaScript
- **Token Rotation**: New refresh token issued on each refresh
- **Device Tracking**: Track tokens by device/IP for security monitoring

### Authentication Security
- **Rate Limiting**: Protect against brute force attacks
- **Account Locking**: Temporary lockout after failed attempts
- **Password Requirements**: Minimum 6 characters (configurable)
- **Email Verification**: Require email verification for new accounts

### Database Security
- **RLS Enforcement**: Database-level security cannot be bypassed
- **Principle of Least Privilege**: Users only access what they need
- **Admin Oversight**: All admin actions logged and auditable
- **Data Isolation**: User data automatically isolated by RLS policies

## Monitoring & Maintenance

### Automated Cleanup
```javascript
// Cleanup service automatically:
// - Removes expired refresh tokens (hourly)
// - Archives old audit logs (daily)
// - Monitors system health
```

### Security Monitoring
```javascript
// Security events logged:
// - Failed login attempts
// - Unauthorized access attempts
// - Permission denied events
// - Token refresh failures
// - Admin privilege usage
```

### Audit Logging
```javascript
// Audit trail includes:
// - User registration/login/logout
// - Resource access and modifications
// - Permission changes
// - Role assignments
// - Data exports/imports
```

## Environment Variables

```bash
# JWT Configuration
JWT_SECRET=your_jwt_secret_key
REFRESH_TOKEN_SECRET=your_refresh_token_secret
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d

# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key

# Logging
LOG_LEVEL=info
NODE_ENV=production
```

## Migration Guide

### From Basic Auth to RBAC

1. **Run Migration**: Execute `006_rbac_and_auth.sql`
2. **Update Environment**: Add required environment variables
3. **Install Dependencies**: `npm install winston node-cron`
4. **Update Frontend**: Implement token refresh logic
5. **Test Permissions**: Verify all routes work with new permissions

### Creating Admin User
```bash
# After migration, create first admin user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "securepassword",
    "firstName": "Admin",
    "lastName": "User",
    "role": "admin"
  }'
```

## Best Practices

### Security
1. **Always use HTTPS** in production
2. **Rotate JWT secrets** regularly
3. **Monitor failed login attempts**
4. **Set up rate limiting** on auth endpoints
5. **Regular security audits** of permissions

### Performance
1. **Cache permission checks** when possible
2. **Use database indexes** on auth tables
3. **Monitor token cleanup** performance
4. **Set appropriate token expiry** times

### Development
1. **Use permission-based middleware** instead of role checks
2. **Test with different user roles** during development
3. **Mock auth for unit tests**
4. **Document new permissions** when adding features

## Troubleshooting

### Common Issues

#### Token Refresh Failing
- Check httpOnly cookie settings
- Verify CORS configuration
- Ensure refresh token secret is correct

#### RLS Policies Not Working
- Verify Supabase connection
- Check policy syntax in database
- Ensure user context is set correctly

#### Permission Denied Errors
- Check user permissions in database
- Verify JWT token contains permissions
- Check middleware order in routes

### Debug Commands
```bash
# Check user permissions
SELECT * FROM get_user_permissions('user_auth_id');

# View RLS policies
\d+ table_name

# Check token cleanup stats
curl -X GET http://localhost:3000/api/admin/cleanup/stats \
  -H "Authorization: Bearer <admin_token>"
```

## API Documentation

For complete API documentation with examples, see the [API Documentation](./API_DOCS.md) file.