#!/bin/bash

# Celebrity Booking Platform - Production Secrets Setup
# This script helps set up secure production environment variables

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Function to generate secure random string
generate_secret() {
    openssl rand -hex 32
}

# Function to generate JWT secret
generate_jwt_secret() {
    openssl rand -hex 64
}

print_status "🔐 Celebrity Booking Platform - Production Secrets Setup"
echo ""

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root for security reasons"
   exit 1
fi

# Check required dependencies
command -v openssl >/dev/null 2>&1 || { print_error "openssl is required but not installed. Aborting."; exit 1; }

print_status "Generating secure secrets..."

# Generate secrets
JWT_SECRET=$(generate_jwt_secret)
SESSION_SECRET=$(generate_secret)

print_success "Secrets generated successfully!"
echo ""

# Create production environment files
print_status "Setting up production environment files..."

# Backend environment
BACKEND_ENV="backend/.env.production"
ADMIN_ENV="admin-dashboard/.env.production"

# Copy secure templates
cp backend/.env.production.secure "$BACKEND_ENV"
cp admin-dashboard/.env.production.secure "$ADMIN_ENV"

# Replace generated secrets in backend env
sed -i "s/REPLACE_WITH_GENERATED_JWT_SECRET/$JWT_SECRET/g" "$BACKEND_ENV"
sed -i "s/REPLACE_WITH_GENERATED_SESSION_SECRET/$SESSION_SECRET/g" "$BACKEND_ENV"

# Set secure file permissions
chmod 600 "$BACKEND_ENV"
chmod 600 "$ADMIN_ENV"

print_success "Environment files created with secure permissions (600)"
echo ""

# Interactive setup
print_status "🚀 Interactive Production Configuration Setup"
echo ""

read -p "Enter your production domain (e.g., bookmyreservation.org): " DOMAIN
read -p "Enter your Supabase project URL: " SUPABASE_URL
read -p "Enter your Supabase anon key: " SUPABASE_ANON_KEY
read -s -p "Enter your Supabase service role key: " SUPABASE_SERVICE_ROLE_KEY
echo ""
read -p "Enter your SMTP user (e.g., management@$DOMAIN): " SMTP_USER
read -s -p "Enter your SMTP password: " SMTP_PASS
echo ""
read -p "Enter your Sentry DSN (backend): " SENTRY_DSN
read -p "Enter your frontend Sentry DSN: " FRONTEND_SENTRY_DSN
read -p "Enter your Stripe publishable key (pk_live_...): " STRIPE_PUBLISHABLE_KEY
read -s -p "Enter your Stripe secret key (sk_live_...): " STRIPE_SECRET_KEY
echo ""
read -s -p "Enter your Stripe webhook secret: " STRIPE_WEBHOOK_SECRET
echo ""

print_status "Updating configuration files..."

# Update backend environment
sed -i "s/your-production-domain.com/$DOMAIN/g" "$BACKEND_ENV"
sed -i "s|https://your-production-project-id.supabase.co|$SUPABASE_URL|g" "$BACKEND_ENV"
sed -i "s/your-production-anon-key-here/$SUPABASE_ANON_KEY/g" "$BACKEND_ENV"
sed -i "s/your-production-service-role-key-here/$SUPABASE_SERVICE_ROLE_KEY/g" "$BACKEND_ENV"
sed -i "s/management@your-production-domain.com/$SMTP_USER/g" "$BACKEND_ENV"
sed -i "s/YOUR_SECURE_HOSTINGER_PASSWORD_HERE/$SMTP_PASS/g" "$BACKEND_ENV"
sed -i "s|https://your-production-sentry-dsn@sentry.io/project-id|$SENTRY_DSN|g" "$BACKEND_ENV"
sed -i "s/pk_live_your_production_publishable_key/$STRIPE_PUBLISHABLE_KEY/g" "$BACKEND_ENV"
sed -i "s/sk_live_your_production_secret_key/$STRIPE_SECRET_KEY/g" "$BACKEND_ENV"
sed -i "s/whsec_your_production_webhook_secret/$STRIPE_WEBHOOK_SECRET/g" "$BACKEND_ENV"

# Update admin dashboard environment
sed -i "s/your-production-domain.com/$DOMAIN/g" "$ADMIN_ENV"
sed -i "s|https://your-production-project-id.supabase.co|$SUPABASE_URL|g" "$ADMIN_ENV"
sed -i "s/your-production-anon-key-here/$SUPABASE_ANON_KEY/g" "$ADMIN_ENV"
sed -i "s/pk_live_your_production_publishable_key/$STRIPE_PUBLISHABLE_KEY/g" "$ADMIN_ENV"
sed -i "s|https://your-frontend-sentry-dsn@sentry.io/project-id|$FRONTEND_SENTRY_DSN|g" "$ADMIN_ENV"

print_success "Configuration files updated successfully!"
echo ""

# Security recommendations
print_warning "🔒 SECURITY REMINDERS:"
echo "1. ⚠️  NEVER commit the production .env files to version control"
echo "2. 🔄 Rotate secrets every 90 days"
echo "3. 🔐 Store backups of these secrets in a secure password manager"
echo "4. 👥 Limit access to production secrets to essential team members only"
echo "5. 📝 Document who has access to production secrets"
echo "6. 🚨 Monitor for unauthorized access to these files"
echo ""

# Create backup of secrets (encrypted)
print_status "Creating encrypted backup of secrets..."
BACKUP_FILE="production-secrets-backup-$(date +%Y%m%d-%H%M%S).env.gpg"

# Combine both env files for backup
cat "$BACKEND_ENV" > temp_secrets_backup.env
echo "" >> temp_secrets_backup.env
echo "# Admin Dashboard Environment" >> temp_secrets_backup.env
cat "$ADMIN_ENV" >> temp_secrets_backup.env

# Encrypt backup
read -s -p "Enter a strong passphrase for the secrets backup: " BACKUP_PASSPHRASE
echo ""
gpg --symmetric --cipher-algo AES256 --passphrase "$BACKUP_PASSPHRASE" \
    --output "$BACKUP_FILE" temp_secrets_backup.env

# Clean up
rm temp_secrets_backup.env

print_success "Encrypted backup created: $BACKUP_FILE"
print_warning "Store this backup file and passphrase in separate secure locations!"
echo ""

# Additional security setup
print_status "Performing additional security setup..."

# Create logs directory
sudo mkdir -p /var/log/celebrity-booking
sudo chown $USER:$USER /var/log/celebrity-booking

# Set up log rotation
sudo tee /etc/logrotate.d/celebrity-booking > /dev/null <<EOF
/var/log/celebrity-booking/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 $USER $USER
    postrotate
        systemctl reload celebrity-booking-backend || true
    endscript
}
EOF

print_success "Log rotation configured"

# Create systemd service file
print_status "Creating systemd service file..."
sudo tee /etc/systemd/system/celebrity-booking-backend.service > /dev/null <<EOF
[Unit]
Description=Celebrity Booking Backend
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)/backend
Environment=NODE_ENV=production
EnvironmentFile=$(pwd)/backend/.env.production
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=celebrity-booking-backend

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable celebrity-booking-backend

print_success "Systemd service created and enabled"

# Final checklist
print_status "📋 Production Deployment Checklist:"
echo "□ Domain DNS configured"
echo "□ SSL certificates installed"
echo "□ Firewall configured"
echo "□ Database migrations run"
echo "□ Email templates configured"
echo "□ Monitoring alerts set up"
echo "□ Backup strategy implemented"
echo "□ Security headers configured"
echo "□ Rate limiting tested"
echo "□ Admin access verified"
echo ""

print_success "🎉 Production secrets setup complete!"
print_warning "Next steps:"
echo "1. Review and test all configuration"
echo "2. Run the production deployment script"
echo "3. Verify all services are working"
echo "4. Set up monitoring and alerting"
echo "5. Document the deployment process"

echo ""
print_status "Environment files created:"
echo "  - $BACKEND_ENV"
echo "  - $ADMIN_ENV"
echo "  - $BACKUP_FILE (encrypted backup)"