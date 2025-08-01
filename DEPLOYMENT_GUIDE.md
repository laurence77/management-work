# Production Deployment Guide

## Domain and Hosting Setup

### 1. Domain Registration
- Register your domain (e.g., `celebritybook.com`)
- Set up DNS records with your domain provider
- Configure subdomains:
  - `www.celebritybook.com` (main website)
  - `admin.celebritybook.com` (admin dashboard)
  - `api.celebritybook.com` (backend API)

### 2. DNS Configuration
```
A Record: @ -> Your server IP
A Record: www -> Your server IP
A Record: admin -> Your server IP
A Record: api -> Your server IP
CNAME: *.celebritybook.com -> celebritybook.com
```

### 3. SSL Certificates
- Use Let's Encrypt for free SSL certificates
- Configure automatic renewal
- Enable HTTPS redirect

## Frontend Hosting (Vercel/Netlify)

### Option 1: Vercel Deployment

1. **Connect Repository**
   ```bash
   npm install -g vercel
   vercel login
   vercel --prod
   ```

2. **Environment Variables**
   ```
   VITE_API_URL=https://api.celebritybook.com
   VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
   VITE_SITE_URL=https://www.celebritybook.com
   ```

3. **Build Settings**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

### Option 2: Netlify Deployment

1. **Connect Repository**
   - Go to Netlify dashboard
   - Connect GitHub repository
   - Configure build settings

2. **Build Configuration**
   ```toml
   # netlify.toml
   [build]
     command = "npm run build"
     publish = "dist"
   
   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```

## Backend Hosting

### Option 1: VPS/Cloud Server (Recommended)

1. **Server Setup**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PM2
   sudo npm install -g pm2
   
   # Install Nginx
   sudo apt install nginx -y
   ```

2. **Application Deployment**
   ```bash
   # Clone repository
   git clone <your-repo-url> /var/www/celebrity-api
   cd /var/www/celebrity-api/backend
   
   # Install dependencies
   npm install --production
   
   # Start with PM2
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

3. **Nginx Configuration**
   ```nginx
   # /etc/nginx/sites-available/celebrity-api
   server {
       listen 80;
       server_name api.celebritybook.com;
       return 301 https://$server_name$request_uri;
   }
   
   server {
       listen 443 ssl http2;
       server_name api.celebritybook.com;
       
       ssl_certificate /etc/letsencrypt/live/api.celebritybook.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/api.celebritybook.com/privkey.pem;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

## Environment Variables

### Production Environment File
```bash
# .env.production
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://www.celebritybook.com
ADMIN_URL=https://admin.celebritybook.com

# Database
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Authentication
JWT_SECRET=your_super_secure_jwt_secret_key
JWT_REFRESH_SECRET=your_super_secure_refresh_secret

# Email
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_USER=your_email@celebritybook.com
SMTP_PASS=your_email_password

# Payments
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_live_...

# Logging
LOG_LEVEL=info
LOG_FILE=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# Security
CORS_ORIGINS=https://www.celebritybook.com,https://admin.celebritybook.com
HELMET_ENABLED=true
```

## PM2 Configuration

### ecosystem.config.js
```javascript
module.exports = {
  apps: [{
    name: 'celebrity-api',
    script: './server.js',
    cwd: '/var/www/celebrity-api/backend',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    watch: false,
    max_memory_restart: '1G',
    merge_logs: true
  }]
};
```

## SSL Certificate Setup

### Using Certbot (Let's Encrypt)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get certificates
sudo certbot --nginx -d api.celebritybook.com
sudo certbot --nginx -d www.celebritybook.com
sudo certbot --nginx -d admin.celebritybook.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## Database Setup

### Supabase Production Configuration
1. **Create production project** in Supabase
2. **Run migrations** from `backend/migrations/`
3. **Set up Row Level Security** (RLS)
4. **Configure Edge Functions** for email automation
5. **Set up database backups**

## Monitoring and Logging

### 1. Application Monitoring
```bash
# Install monitoring tools
npm install -g pm2-logrotate
pm2 install pm2-logrotate

# Set up log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:retain 7
```

### 2. Error Monitoring (Sentry)
```bash
npm install @sentry/node @sentry/integrations
```

Add to your server.js:
```javascript
const Sentry = require("@sentry/node");

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
```

## Security Checklist

- [ ] SSL certificates installed and auto-renewing
- [ ] Firewall configured (ports 22, 80, 443 only)
- [ ] Strong passwords and SSH key authentication
- [ ] Database credentials secured
- [ ] API keys in environment variables only
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Security headers enabled (Helmet.js)
- [ ] Input validation and sanitization
- [ ] Regular security updates

## Backup Strategy

### Database Backups
- Automatic daily Supabase backups
- Weekly full database exports
- File storage backups (if applicable)

### Application Backups
- Git repository as source of truth
- Environment variables backed up securely
- Regular server snapshots

## Performance Optimization

### 1. Frontend Optimization
- Bundle splitting and lazy loading
- Image optimization and CDN
- Browser caching headers
- Gzip compression

### 2. Backend Optimization
- Database query optimization
- Redis caching (optional)
- API response compression
- Connection pooling

## Deployment Checklist

- [ ] Domain registered and DNS configured
- [ ] SSL certificates installed
- [ ] Frontend deployed to Vercel/Netlify
- [ ] Backend deployed to production server
- [ ] Database migrated and configured
- [ ] Environment variables set
- [ ] Payment processing tested
- [ ] Email system tested
- [ ] Monitoring and logging set up
- [ ] Backup strategy implemented
- [ ] Security measures in place
- [ ] Load testing completed

## Post-Deployment

1. **Test all functionality** in production
2. **Monitor performance** and errors
3. **Set up alerting** for critical issues
4. **Document deployment process** for team
5. **Plan regular maintenance** and updates

## Troubleshooting

### Common Issues
1. **CORS errors**: Check environment variables and nginx config
2. **SSL certificate issues**: Verify domain DNS and certificate paths
3. **Database connection**: Check Supabase credentials and network
4. **Payment processing**: Verify Stripe webhook endpoints
5. **Email delivery**: Test SMTP configuration

### Log Files Locations
- Application: `/var/www/celebrity-api/backend/logs/`
- Nginx: `/var/log/nginx/`
- PM2: `~/.pm2/logs/`
- System: `/var/log/`