# Celebrity Booking Platform - Production Deployment Guide

This guide covers the complete production deployment process for the Celebrity Booking Platform.

## 🚀 Quick Deployment Checklist

### Prerequisites
- [ ] Linux server with Node.js 18+ and nginx
- [ ] Domain name configured (`bookmyreservation.org`)
- [ ] Hostinger email account setup
- [ ] Server with at least 2GB RAM and 20GB storage

### Step 1: Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install nginx and other dependencies
sudo apt install -y nginx certbot python3-certbot-nginx git
```

### Step 2: Clone and Setup Project
```bash
# Clone repository
git clone <your-repo-url> /var/www/bookmyreservation
cd /var/www/bookmyreservation

# Install dependencies
npm run fullstack:install
```

### Step 3: Configure Environment
```bash
# Copy and edit production environment
cp backend/.env.production backend/.env

# Update these values in backend/.env:
# - SMTP_PASS=your-hostinger-password
# - Any other production-specific settings
```

### Step 4: SSL Certificate Setup
```bash
# Run SSL setup (requires root)
sudo ./setup-ssl.sh
```

### Step 5: Deploy Application
```bash
# Run production deployment
./deploy-production.sh
```

### Step 6: Configure Process Manager (PM2)
```bash
# Install PM2 globally
sudo npm install -g pm2

# Start backend with PM2
cd backend
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save
pm2 startup
```

## 🔧 Configuration Details

### Environment Variables (.env.production)
```bash
NODE_ENV=production
DOMAIN=bookmyreservation.org
FRONTEND_URL=https://bookmyreservation.org
ADMIN_URL=https://admin.bookmyreservation.org

# Supabase Configuration (REPLACE WITH PRODUCTION VALUES)
SUPABASE_URL=https://your-production-project-id.supabase.co
SUPABASE_ANON_KEY=your-production-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-production-service-role-key

# JWT Secret (GENERATE NEW FOR PRODUCTION)
JWT_SECRET=your-production-jwt-secret

# Hostinger SMTP (UPDATE THESE)
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_USER=management@bookmyreservation.org
SMTP_PASS=YOUR_HOSTINGER_PASSWORD_HERE

# CORS Origins
CORS_ORIGINS=https://bookmyreservation.org,https://admin.bookmyreservation.org,https://www.bookmyreservation.org
```

### DNS Configuration
Point these domains to your server IP:
- `bookmyreservation.org` → Server IP
- `www.bookmyreservation.org` → Server IP  
- `admin.bookmyreservation.org` → Server IP

### Nginx Configuration
The `nginx-production.conf` file configures:
- SSL termination with Let's Encrypt certificates
- HTTP to HTTPS redirect
- Reverse proxy to Node.js backend
- Static file serving for frontend builds
- Security headers and rate limiting
- Separate admin subdomain handling

## 🔐 Security Features

### Already Implemented
- ✅ JWT authentication with secure secrets
- ✅ bcrypt password hashing (12 salt rounds)
- ✅ Rate limiting (100 requests/15 minutes)
- ✅ CORS configured for production domains
- ✅ Helmet.js security headers
- ✅ Input sanitization and XSS protection
- ✅ SQL injection protection via Supabase
- ✅ IP blocking for suspicious activity

### SSL/HTTPS Configuration
- Let's Encrypt SSL certificates
- Automatic certificate renewal
- HTTP Strict Transport Security (HSTS)
- Strong cipher suites
- HTTP/2 support

## 📊 Monitoring & Logging

### Health Checks
- Backend health endpoint: `/api/health`
- Database connectivity check
- Email service verification
- Admin authentication test

### Logging
- Winston logger configured for production
- Error logging to files
- HTTP request logging with Morgan
- Sentry integration ready (configure DSN)

### Process Management
PM2 provides:
- Automatic process restart
- Load balancing
- Memory monitoring
- Log management
- Zero-downtime deployments

## 🗄️ Database Management

### Supabase Configuration
- Production database: Use your own production Supabase project URL
- Row Level Security (RLS) enabled
- RBAC system implemented
- Edge functions for email processing

### Migration Management
All migrations are in `/backend/migrations/`:
- Run manually via Supabase dashboard
- Or use the SQL files in the migrations folder

## 📧 Email System

### Hostinger SMTP Setup
1. Log into your Hostinger account
2. Go to Email → Email Accounts
3. Create or use existing `management@bookmyreservation.org`
4. Update `SMTP_PASS` in production environment
5. Test email sending via admin dashboard

### Email Templates
Pre-configured templates for:
- Welcome emails
- Booking confirmations
- Password resets
- Admin notifications

## 🚨 Troubleshooting

### Common Issues

**Backend won't start:**
```bash
# Check logs
pm2 logs celebrity-booking-backend

# Check environment
cat backend/.env | grep -v PASS

# Test database connection
node -e "console.log(process.env.SUPABASE_URL)"
```

**SSL certificate issues:**
```bash
# Check certificate status
/usr/local/bin/check-ssl.sh

# Renew certificates
sudo certbot renew

# Test nginx config
sudo nginx -t
```

**Email not working:**
```bash
# Test SMTP connection
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'
```

### Performance Optimization

**Database:**
- Monitor query performance in Supabase dashboard
- Add indexes as needed
- Use connection pooling (already configured)

**Frontend:**
- Static assets served by nginx with caching
- Gzip compression enabled
- CDN integration available via Cloudinary

**Backend:**
- PM2 cluster mode for multiple CPU cores
- Redis caching (can be added)
- Rate limiting configured

## 🔄 Deployment Updates

### Zero-Downtime Deployment
```bash
# Update code
git pull origin main

# Rebuild frontend
npm run build
cd admin-dashboard && npm run build && cd ..

# Restart backend with PM2
pm2 restart celebrity-booking-backend

# Reload nginx if needed
sudo nginx -s reload
```

### Rollback Procedure
```bash
# Rollback to previous version
git checkout previous-commit-hash

# Rebuild and restart
npm run build
cd admin-dashboard && npm run build && cd ..
pm2 restart celebrity-booking-backend
```

## 📈 Performance Metrics

### Expected Performance
- **Response Time:** < 200ms for API calls
- **Concurrent Users:** 1000+ (with proper server specs)
- **Database Queries:** < 50ms average
- **Email Delivery:** < 5 seconds

### Monitoring Tools
- PM2 monitoring dashboard
- Nginx access/error logs
- Supabase analytics
- Sentry error tracking (when configured)

## 🎯 Production Checklist

Before going live:
- [ ] All environment variables configured
- [ ] SSL certificates installed and working
- [ ] DNS records pointing to server
- [ ] Email system tested end-to-end
- [ ] Admin login tested
- [ ] Frontend builds correctly
- [ ] All API endpoints responding
- [ ] Rate limiting working
- [ ] Backup strategy implemented
- [ ] Monitoring configured
- [ ] Error handling tested

## 🔗 Admin Access

**Admin Dashboard:** https://admin.bookmyreservation.org

⚠️ **Security Notice:** Admin credentials are stored securely in the production environment variables and should never be documented in plain text. Access credentials through the secure admin setup process.

**Features Available:**
- Celebrity management
- Booking management
- User management
- Email settings
- Analytics dashboard
- System monitoring

## 📞 Support

For deployment issues:
1. Check logs: `pm2 logs`
2. Verify configuration: `nginx -t`
3. Test endpoints: `curl http://localhost:3000/api/health`
4. Check SSL: `/usr/local/bin/check-ssl.sh`

The platform is production-ready with enterprise-grade security and scalability features.