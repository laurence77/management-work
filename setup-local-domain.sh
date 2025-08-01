#!/bin/bash

echo "🏠 Setting up local domain for Celebrity Booking Platform"
echo "======================================================"

# Backup hosts file
sudo cp /etc/hosts /etc/hosts.backup

# Add local domains
echo "🌐 Adding local domains to /etc/hosts..."
sudo bash -c 'cat >> /etc/hosts << EOF

# Celebrity Booking Platform - Local Development
127.0.0.1 bookmyreservation.local
127.0.0.1 www.bookmyreservation.local  
127.0.0.1 admin.bookmyreservation.local
127.0.0.1 api.bookmyreservation.local
EOF'

# Copy local environment
echo "⚙️  Setting up local environment..."
cp backend/.env.local backend/.env

echo ""
echo "✅ Local domain setup complete!"
echo ""
echo "🚀 Now you can access:"
echo "   • Main Site: http://bookmyreservation.local:8080"
echo "   • Admin: http://admin.bookmyreservation.local:3001"
echo "   • API: http://api.bookmyreservation.local:3000"
echo ""
echo "🔑 Admin Login:"
echo "   Email: management@bookmyreservation.org"
echo "   Password: ${ADMIN_PASSWORD:-changeme123}"
echo ""
echo "To start: ./start-all.sh"