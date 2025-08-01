# Production Environment Setup Guide

## 🔐 Critical Security Setup

### 1. Create Production Supabase Project

**Steps to create a secure production Supabase project:**

1. **Create New Project**
   - Go to https://supabase.com/dashboard
   - Click "New Project"
   - Choose secure project name (e.g., "celebrity-booking-prod")
   - Select closest region to your users
   - Generate strong database password

2. **Configure Database Settings**
   - Enable Row Level Security (RLS) on all tables
   - Set up database connection pooling
   - Configure backup schedules
   - Enable point-in-time recovery

3. **Set Up Authentication**
   - Configure JWT expiry (24 hours recommended)
   - Set up email templates
   - Configure redirect URLs for production domains
   - Enable MFA for admin accounts

### 2. Environment Variables Configuration

**Create secure production environment files:**

#### Backend Environment (backend/.env.production)
```bash
# Production Configuration
NODE_ENV=production
PORT=3000

# Domain Configuration
DOMAIN=your-production-domain.com
FRONTEND_URL=https://your-production-domain.com
ADMIN_URL=https://admin.your-production-domain.com

# Supabase Production (REPLACE WITH YOUR VALUES)
SUPABASE_URL=https://your-production-project-id.supabase.co
SUPABASE_ANON_KEY=your-production-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-production-service-role-key-here

# JWT Configuration (GENERATE NEW FOR PRODUCTION)
JWT_SECRET=$(openssl rand -hex 64)

# SMTP Configuration (Hostinger)
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_USER=management@your-production-domain.com
SMTP_PASS=your-secure-hostinger-password-here

# Sentry Configuration (REPLACE WITH YOUR DSN)
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# Stripe Configuration (REPLACE WITH PRODUCTION KEYS)
STRIPE_PUBLISHABLE_KEY=pk_live_your-production-publishable-key
STRIPE_SECRET_KEY=sk_live_your-production-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-production-webhook-secret

# CORS Origins (Update with your domains)
CORS_ORIGINS=https://your-production-domain.com,https://admin.your-production-domain.com,https://www.your-production-domain.com

# Security Configuration
BCRYPT_ROUNDS=12
SESSION_SECRET=$(openssl rand -hex 32)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Redis Configuration (Optional but recommended)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# File Upload Configuration
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/webp,application/pdf

# Monitoring Configuration
LOG_LEVEL=info
LOG_FILE_PATH=/var/log/celebrity-booking/app.log
```

#### Frontend Environment (admin-dashboard/.env.production)
```bash
VITE_API_BASE_URL=https://api.your-production-domain.com
VITE_SUPABASE_URL=https://your-production-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-anon-key-here
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your-production-publishable-key
VITE_SENTRY_DSN=https://your-frontend-sentry-dsn@sentry.io/project-id
VITE_ENVIRONMENT=production
```

### 3. Secrets Management Implementation

**Option A: AWS Secrets Manager**
```bash
# Install AWS CLI and configure
aws configure

# Store secrets
aws secretsmanager create-secret \
  --name "celebrity-booking/production/database" \
  --description "Production database credentials" \
  --secret-string '{"url":"your-db-url","key":"your-service-key"}'

# Store SMTP credentials
aws secretsmanager create-secret \
  --name "celebrity-booking/production/smtp" \
  --description "Production SMTP credentials" \
  --secret-string '{"password":"your-smtp-password"}'
```

**Option B: HashiCorp Vault**
```bash
# Install Vault
wget https://releases.hashicorp.com/vault/1.15.0/vault_1.15.0_linux_amd64.zip
unzip vault_1.15.0_linux_amd64.zip
sudo mv vault /usr/local/bin/

# Initialize Vault
vault server -dev
export VAULT_ADDR='http://127.0.0.1:8200'
vault auth -method=userpass

# Store secrets
vault kv put secret/celebrity-booking/production/database \
  url="your-supabase-url" \
  anon_key="your-anon-key" \
  service_key="your-service-key"
```

### 4. SSL/TLS Configuration

**Let's Encrypt SSL Setup:**
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificates
sudo certbot --nginx -d your-production-domain.com \
  -d www.your-production-domain.com \
  -d admin.your-production-domain.com \
  -d api.your-production-domain.com

# Test auto-renewal
sudo certbot renew --dry-run

# Set up auto-renewal cron job
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

### 5. Database Security Hardening

**Supabase RLS Policies:**
```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE celebrities ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create admin-only policies
CREATE POLICY "admin_full_access" ON users
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "user_own_data" ON users
  FOR SELECT USING (auth.uid() = id);

-- Booking policies
CREATE POLICY "admin_all_bookings" ON bookings
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "user_own_bookings" ON bookings
  FOR SELECT USING (auth.uid() = user_id);
```

### 6. Monitoring & Alerting Setup

**Sentry Configuration:**
```javascript
// backend/utils/sentry.js
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  beforeSend(event, hint) {
    // Filter sensitive data
    if (event.request) {
      delete event.request.headers.authorization;
      delete event.request.headers.cookie;
    }
    return event;
  }
});
```

### 7. Backup Strategy

**Automated Database Backups:**
```bash
#!/bin/bash
# /usr/local/bin/backup-database.sh

BACKUP_DIR="/var/backups/celebrity-booking"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="db_backup_${DATE}.sql"

# Create backup directory
mkdir -p $BACKUP_DIR

# Export from Supabase (using pg_dump)
pg_dump "postgresql://postgres:$DB_PASSWORD@db.your-project.supabase.co:5432/postgres" \
  > "$BACKUP_DIR/$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_DIR/$BACKUP_FILE"

# Upload to S3 (optional)
aws s3 cp "$BACKUP_DIR/$BACKUP_FILE.gz" \
  s3://your-backup-bucket/database-backups/

# Cleanup old backups (keep 30 days)
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +30 -delete

# Add to crontab: 0 2 * * * /usr/local/bin/backup-database.sh
```

### 8. Security Hardening Checklist

- [ ] **Database Security**
  - [ ] RLS enabled on all tables
  - [ ] Service role key secured
  - [ ] Connection limits configured
  - [ ] Backup encryption enabled

- [ ] **Application Security**
  - [ ] JWT secrets rotated
  - [ ] CORS properly configured
  - [ ] Rate limiting implemented
  - [ ] Input validation on all endpoints

- [ ] **Infrastructure Security**
  - [ ] SSL certificates installed
  - [ ] Security headers configured
  - [ ] Firewall rules applied
  - [ ] SSH key-based authentication

- [ ] **Monitoring & Logging**
  - [ ] Error tracking configured
  - [ ] Performance monitoring setup
  - [ ] Log aggregation implemented
  - [ ] Alerting rules configured

### 9. Deployment Security Script

```bash
#!/bin/bash
# production-security-setup.sh

set -e

echo "🔐 Setting up production security..."

# 1. Generate secure secrets
JWT_SECRET=$(openssl rand -hex 64)
SESSION_SECRET=$(openssl rand -hex 32)

# 2. Set secure file permissions
chmod 600 backend/.env.production
chmod 600 admin-dashboard/.env.production

# 3. Configure firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# 4. Secure SSH
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl reload sshd

# 5. Install fail2ban
sudo apt install fail2ban -y
sudo systemctl enable fail2ban

echo "✅ Production security setup complete!"
echo "⚠️  Remember to:"
echo "   - Update all environment variables with production values"
echo "   - Configure Sentry DSN"
echo "   - Set up SSL certificates"
echo "   - Configure backup strategy"
```

### 10. Post-Deployment Verification

**Security Verification Script:**
```bash
#!/bin/bash
# verify-production-security.sh

echo "🔍 Verifying production security..."

# Check SSL certificate
curl -I https://your-production-domain.com

# Test API endpoints
curl -X GET https://api.your-production-domain.com/api/health

# Check security headers
curl -I https://your-production-domain.com | grep -E "Strict-Transport-Security|X-Frame-Options|X-Content-Type-Options"

# Verify rate limiting
for i in {1..10}; do
  curl -w "%{http_code}\n" -o /dev/null -s https://api.your-production-domain.com/api/health
done

echo "✅ Security verification complete!"
```

## 🚨 Critical Security Reminders

1. **Never commit production secrets to version control**
2. **Use environment-specific secrets management**
3. **Rotate secrets regularly (every 90 days)**
4. **Monitor for unauthorized access attempts**
5. **Keep all dependencies updated**
6. **Regular security audits and penetration testing**
7. **Backup verification and disaster recovery testing**

## 📞 Emergency Contacts

- Database Issues: Supabase Support
- SSL Certificate Issues: Let's Encrypt Community
- Application Errors: Check Sentry dashboard
- Infrastructure Issues: Check server logs and monitoring

Remember: Security is an ongoing process, not a one-time setup!