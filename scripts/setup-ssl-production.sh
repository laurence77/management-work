#!/bin/bash

# Production SSL Certificate Setup and Auto-Renewal
# This script sets up Let's Encrypt SSL certificates and configures auto-renewal

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
DOMAIN="${DOMAIN:-bookmyreservation.org}"
ADMIN_DOMAIN="admin.${DOMAIN}"
API_DOMAIN="api.${DOMAIN}"
WWW_DOMAIN="www.${DOMAIN}"

print_status "🔐 Setting up SSL certificates for production domains"
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root (use sudo)"
   exit 1
fi

# Update system packages
print_status "Updating system packages..."
apt update && apt upgrade -y

# Install required packages
print_status "Installing required packages..."
apt install -y nginx certbot python3-certbot-nginx cron

# Verify domains are configured
print_status "Verifying domain configuration..."

required_domains=("$DOMAIN" "$WWW_DOMAIN" "$ADMIN_DOMAIN" "$API_DOMAIN")

for domain in "${required_domains[@]}"; do
    if ! nslookup "$domain" >/dev/null 2>&1; then
        print_warning "Domain $domain may not be properly configured in DNS"
    else
        print_success "Domain $domain is resolving"
    fi
done

# Create basic nginx configuration for domain verification
print_status "Creating initial nginx configuration..."

cat > /etc/nginx/sites-available/celebrity-booking <<EOF
server {
    listen 80;
    server_name $DOMAIN $WWW_DOMAIN $ADMIN_DOMAIN $API_DOMAIN;

    # Allow Let's Encrypt verification
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        try_files \$uri =404;
    }

    # Temporary redirect to HTTPS (will be updated after SSL setup)
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/celebrity-booking /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
nginx -t || {
    print_error "Nginx configuration test failed"
    exit 1
}

# Restart nginx
systemctl restart nginx
systemctl enable nginx

print_success "Nginx configured for domain verification"

# Create webroot directory
mkdir -p /var/www/html/.well-known/acme-challenge

# Obtain SSL certificates
print_status "Obtaining SSL certificates from Let's Encrypt..."

# Use staging environment for testing (remove --staging for production)
if [[ "${CERTBOT_STAGING:-false}" == "true" ]]; then
    STAGING_FLAG="--staging"
    print_warning "Using Let's Encrypt staging environment"
else
    STAGING_FLAG=""
    print_status "Using Let's Encrypt production environment"
fi

certbot certonly \
    --webroot \
    --webroot-path=/var/www/html \
    --email="management@${DOMAIN}" \
    --agree-tos \
    --no-eff-email \
    $STAGING_FLAG \
    -d "$DOMAIN" \
    -d "$WWW_DOMAIN" \
    -d "$ADMIN_DOMAIN" \
    -d "$API_DOMAIN" || {
    print_error "SSL certificate issuance failed"
    print_status "Common issues:"
    echo "1. Domain DNS not pointing to this server"
    echo "2. Firewall blocking port 80/443"
    echo "3. Domain verification failed"
    exit 1
}

print_success "SSL certificates obtained successfully"

# Create production nginx configuration with SSL
print_status "Creating production nginx configuration with SSL..."

cat > /etc/nginx/sites-available/celebrity-booking <<EOF
# HTTP to HTTPS redirect
server {
    listen 80;
    server_name $DOMAIN $WWW_DOMAIN $ADMIN_DOMAIN $API_DOMAIN;

    # Allow Let's Encrypt verification
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        try_files \$uri =404;
    }

    # Redirect all HTTP to HTTPS
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# Main website (HTTPS)
server {
    listen 443 ssl http2;
    server_name $DOMAIN $WWW_DOMAIN;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # HSTS (HTTP Strict Transport Security)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' *.stripe.com *.supabase.co; style-src 'self' 'unsafe-inline'; img-src 'self' data: *.cloudinary.com; connect-src 'self' *.supabase.co *.stripe.com; frame-src *.stripe.com; font-src 'self' data:;" always;
    
    # Root directory for frontend
    root /var/www/celebrity-booking/dist;
    index index.html;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Frontend routing (SPA)
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# Admin Dashboard (HTTPS)
server {
    listen 443 ssl http2;
    server_name $ADMIN_DOMAIN;

    # SSL Configuration (same as main site)
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Root directory for admin dashboard
    root /var/www/celebrity-booking/admin-dashboard/dist;
    index index.html;
    
    # Admin SPA routing
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# API Backend (HTTPS)
server {
    listen 443 ssl http2;
    server_name $API_DOMAIN;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;
    
    # Proxy to Node.js backend
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        proxy_pass http://127.0.0.1:3000/api/health;
    }
}
EOF

# Test new configuration
nginx -t || {
    print_error "New nginx configuration test failed"
    exit 1
}

# Reload nginx with new SSL configuration
systemctl reload nginx

print_success "Production nginx configuration with SSL applied"

# Set up automatic certificate renewal
print_status "Setting up automatic certificate renewal..."

# Create renewal script
cat > /usr/local/bin/renew-ssl-certs.sh <<'EOF'
#!/bin/bash

# SSL Certificate Renewal Script
LOG_FILE="/var/log/ssl-renewal.log"

echo "$(date): Starting SSL certificate renewal check" >> $LOG_FILE

# Attempt renewal
if certbot renew --quiet --no-self-upgrade >> $LOG_FILE 2>&1; then
    echo "$(date): Certificate renewal check completed successfully" >> $LOG_FILE
    
    # Test nginx configuration
    if nginx -t >> $LOG_FILE 2>&1; then
        # Reload nginx to use new certificates
        systemctl reload nginx
        echo "$(date): Nginx reloaded with new certificates" >> $LOG_FILE
    else
        echo "$(date): ERROR: Nginx configuration test failed after renewal" >> $LOG_FILE
    fi
else
    echo "$(date): ERROR: Certificate renewal failed" >> $LOG_FILE
fi
EOF

chmod +x /usr/local/bin/renew-ssl-certs.sh

# Create cron job for automatic renewal (twice daily)
cat > /etc/cron.d/ssl-renewal <<EOF
# Automatic SSL certificate renewal
# Runs twice daily at random minutes to avoid load spikes
$(shuf -i 0-59 -n 1) $(shuf -i 0-5 -n 1),$(shuf -i 12-17 -n 1) * * * root /usr/local/bin/renew-ssl-certs.sh
EOF

print_success "Automatic SSL renewal configured"

# Create SSL verification script
cat > /usr/local/bin/check-ssl.sh <<'EOF'
#!/bin/bash

# SSL Certificate Verification Script
DOMAINS=("$DOMAIN" "$WWW_DOMAIN" "$ADMIN_DOMAIN" "$API_DOMAIN")

echo "🔐 SSL Certificate Status Check"
echo "==============================="

for domain in "${DOMAINS[@]}"; do
    echo ""
    echo "Checking $domain..."
    
    # Check certificate expiry
    expiry=$(echo | openssl s_client -servername $domain -connect $domain:443 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2)
    
    if [[ -n "$expiry" ]]; then
        expiry_epoch=$(date -d "$expiry" +%s)
        current_epoch=$(date +%s)
        days_left=$(( (expiry_epoch - current_epoch) / 86400 ))
        
        if [[ $days_left -gt 30 ]]; then
            echo "✅ $domain: Valid for $days_left days"
        elif [[ $days_left -gt 7 ]]; then
            echo "⚠️  $domain: Expires in $days_left days"
        else
            echo "🚨 $domain: EXPIRES SOON - $days_left days left!"
        fi
    else
        echo "❌ $domain: Certificate check failed"
    fi
    
    # Check if HTTPS redirect works
    http_status=$(curl -s -o /dev/null -w "%{http_code}" -L "http://$domain/")
    if [[ "$http_status" == "200" ]]; then
        echo "✅ $domain: HTTP to HTTPS redirect working"
    else
        echo "⚠️  $domain: HTTP redirect returned $http_status"
    fi
done

echo ""
echo "📋 Certificate Files:"
ls -la /etc/letsencrypt/live/*/

echo ""
echo "📊 Nginx Status:"
systemctl status nginx --no-pager -l

echo ""
echo "🔄 Recent Renewal Logs:"
tail -10 /var/log/ssl-renewal.log 2>/dev/null || echo "No renewal logs found"
EOF

chmod +x /usr/local/bin/check-ssl.sh

# Test SSL certificates
print_status "Testing SSL certificate installation..."

sleep 5  # Wait for nginx to fully reload

for domain in "$DOMAIN" "$WWW_DOMAIN" "$ADMIN_DOMAIN" "$API_DOMAIN"; do
    if curl -s -f -o /dev/null "https://$domain" --connect-timeout 10; then
        print_success "HTTPS working for $domain"
    else
        print_warning "HTTPS test failed for $domain"
    fi
done

# Configure firewall
print_status "Configuring firewall..."

# Install ufw if not present
if ! command -v ufw >/dev/null 2>&1; then
    apt install -y ufw
fi

# Configure firewall rules
ufw --force reset
ufw default deny incoming
ufw default allow outgoing

# Allow SSH (be careful!)
ufw allow 22/tcp

# Allow HTTP and HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall
ufw --force enable

print_success "Firewall configured"

# Create monitoring script
cat > /usr/local/bin/ssl-monitor.sh <<'EOF'
#!/bin/bash

# SSL Monitoring Script for alerting
ALERT_DAYS=7
EMAIL="admin@bookmyreservation.org"

check_domain() {
    local domain=$1
    local expiry=$(echo | openssl s_client -servername $domain -connect $domain:443 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2)
    
    if [[ -n "$expiry" ]]; then
        local expiry_epoch=$(date -d "$expiry" +%s)
        local current_epoch=$(date +%s)
        local days_left=$(( (expiry_epoch - current_epoch) / 86400 ))
        
        if [[ $days_left -le $ALERT_DAYS ]]; then
            echo "WARNING: SSL certificate for $domain expires in $days_left days"
            # Send alert email (configure sendmail or use API)
            return 1
        fi
    else
        echo "ERROR: Could not check SSL certificate for $domain"
        return 1
    fi
    
    return 0
}

# Check all domains
DOMAINS=("bookmyreservation.org" "www.bookmyreservation.org" "admin.bookmyreservation.org" "api.bookmyreservation.org")
issues=0

for domain in "${DOMAINS[@]}"; do
    if ! check_domain "$domain"; then
        ((issues++))
    fi
done

if [[ $issues -gt 0 ]]; then
    echo "SSL certificate issues detected. Check /var/log/ssl-renewal.log"
    exit 1
fi

echo "All SSL certificates are healthy"
exit 0
EOF

chmod +x /usr/local/bin/ssl-monitor.sh

# Add monitoring to cron (daily check)
echo "0 8 * * * root /usr/local/bin/ssl-monitor.sh >> /var/log/ssl-monitor.log 2>&1" >> /etc/cron.d/ssl-renewal

print_success "SSL monitoring configured"

# Final verification
print_status "Running final SSL verification..."
/usr/local/bin/check-ssl.sh

echo ""
print_status "📋 SSL Setup Summary:"
echo "  - Domains: $DOMAIN, $WWW_DOMAIN, $ADMIN_DOMAIN, $API_DOMAIN"
echo "  - Certificates: /etc/letsencrypt/live/$DOMAIN/"
echo "  - Auto-renewal: Configured (twice daily)"
echo "  - Monitoring: Daily certificate checks"
echo "  - Nginx: Production configuration with security headers"
echo "  - Firewall: Configured (SSH, HTTP, HTTPS only)"

echo ""
print_status "🔧 Useful Commands:"
echo "  - Check SSL status: /usr/local/bin/check-ssl.sh"
echo "  - Test renewal: certbot renew --dry-run"
echo "  - Nginx test: nginx -t"
echo "  - View renewal logs: tail -f /var/log/ssl-renewal.log"
echo "  - Manual renewal: certbot renew"

echo ""
if /usr/local/bin/check-ssl.sh | grep -q "❌\|🚨"; then
    print_warning "⚠️  SSL setup completed with some issues - please review the output above"
else
    print_success "🎉 SSL certificate setup completed successfully!"
fi

echo ""
print_status "Next steps:"
echo "1. Update DNS records to point to this server"
echo "2. Test all domains and functionalities"
echo "3. Monitor certificate renewal logs"
echo "4. Set up additional monitoring/alerting"
echo "5. Configure backup strategies"