#!/bin/bash

# Celebrity Booking Platform - SSL Certificate Setup Script
# This script sets up Let's Encrypt SSL certificates for production

set -e  # Exit on any error

echo "🔒 SSL Certificate Setup for Celebrity Booking Platform"
echo "====================================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ This script must be run as root (use sudo)"
    exit 1
fi

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
    echo "📦 Installing Certbot..."
    apt update
    apt install -y certbot python3-certbot-nginx
fi

# Domain configuration
DOMAIN="bookmyreservation.org"
EMAIL="management@bookmyreservation.org"

echo "🌐 Setting up SSL certificates for:"
echo "   • $DOMAIN"
echo "   • www.$DOMAIN"
echo "   • admin.$DOMAIN"

# Stop nginx if running
echo "⏹️  Stopping nginx temporarily..."
systemctl stop nginx 2>/dev/null || true

# Obtain SSL certificates
echo "🔐 Obtaining SSL certificates from Let's Encrypt..."
certbot certonly --standalone \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN \
    -d www.$DOMAIN \
    -d admin.$DOMAIN

# Verify certificates were created
if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo "❌ SSL certificate creation failed!"
    exit 1
fi

echo "✅ SSL certificates created successfully!"

# Copy nginx configuration
echo "⚙️  Installing nginx configuration..."
cp nginx-production.conf /etc/nginx/sites-available/bookmyreservation.org

# Remove default nginx site
rm -f /etc/nginx/sites-enabled/default

# Enable our site
ln -sf /etc/nginx/sites-available/bookmyreservation.org /etc/nginx/sites-enabled/bookmyreservation.org

# Test nginx configuration
echo "🧪 Testing nginx configuration..."
nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx configuration is valid"
else
    echo "❌ Nginx configuration has errors!"
    exit 1
fi

# Start nginx
echo "🚀 Starting nginx..."
systemctl start nginx
systemctl enable nginx

# Set up automatic certificate renewal
echo "🔄 Setting up automatic certificate renewal..."
cat > /etc/cron.d/certbot << EOF
# Renew SSL certificates automatically
0 12 * * * root certbot renew --quiet --post-hook "systemctl reload nginx"
EOF

# Test certificate renewal
echo "🧪 Testing certificate renewal..."
certbot renew --dry-run

# Create certificate status check script
cat > /usr/local/bin/check-ssl.sh << 'EOF'
#!/bin/bash
DOMAIN="bookmyreservation.org"
EXPIRY=$(openssl x509 -enddate -noout -in /etc/letsencrypt/live/$DOMAIN/cert.pem | cut -d= -f2)
EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s)
CURRENT_EPOCH=$(date +%s)
DAYS_LEFT=$(( (EXPIRY_EPOCH - CURRENT_EPOCH) / 86400 ))

echo "SSL Certificate Status for $DOMAIN:"
echo "Expires: $EXPIRY"
echo "Days remaining: $DAYS_LEFT"

if [ $DAYS_LEFT -lt 30 ]; then
    echo "⚠️  Certificate expires in less than 30 days!"
else
    echo "✅ Certificate is valid"
fi
EOF

chmod +x /usr/local/bin/check-ssl.sh

# Display final status
echo ""
echo "🎉 SSL Setup Complete!"
echo "====================================================="
echo ""
echo "✅ SSL certificates installed for:"
echo "   • https://bookmyreservation.org"
echo "   • https://www.bookmyreservation.org"
echo "   • https://admin.bookmyreservation.org"
echo ""
echo "✅ Nginx configured and running"
echo "✅ Automatic renewal configured"
echo ""
echo "🔍 Certificate Information:"
/usr/local/bin/check-ssl.sh
echo ""
echo "⚙️  Next Steps:"
echo "   1. Update your DNS records to point to this server"
echo "   2. Test all domains in a web browser"
echo "   3. Run your deployment script: ./deploy-production.sh"
echo "   4. Update Hostinger SMTP credentials in backend/.env.production"
echo ""
echo "🔧 Useful Commands:"
echo "   • Check SSL status: /usr/local/bin/check-ssl.sh"
echo "   • Test renewal: certbot renew --dry-run"
echo "   • View certificates: certbot certificates"
echo "   • Nginx status: systemctl status nginx"
echo ""
echo "====================================================="