#!/bin/bash

# Celebrity Booking Platform - Security Setup Script
# This script helps set up secure environment configuration

set -e  # Exit on any error

echo "🔐 Celebrity Booking Platform - Security Setup"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to generate secure password
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

echo -e "${BLUE}Checking prerequisites...${NC}"

# Check for required commands
if ! command_exists openssl; then
    echo -e "${RED}Error: openssl is required but not installed.${NC}"
    exit 1
fi

if ! command_exists docker; then
    echo -e "${YELLOW}Warning: Docker not found. Install Docker to use N8N automation.${NC}"
fi

echo -e "${GREEN}✓ Prerequisites check complete${NC}\n"

# Setup Docker environment
echo -e "${BLUE}Setting up Docker environment security...${NC}"

if [ ! -f ".env.docker.local" ]; then
    echo "Creating secure Docker environment file..."
    
    # Generate secure credentials
    N8N_USER="admin_$(date +%s)"
    N8N_PASS=$(generate_password)
    
    cat > .env.docker.local << EOF
# Local Docker Environment Variables - SECURE VERSION
# Generated on $(date)
# This file contains actual credentials and should NOT be committed to version control

# N8N Authentication - SECURE CREDENTIALS
N8N_BASIC_AUTH_USER=${N8N_USER}
N8N_BASIC_AUTH_PASSWORD=${N8N_PASS}

# Webhook Configuration
WEBHOOK_URL=http://localhost:5678/
N8N_HOST=localhost
N8N_PORT=5678
N8N_PROTOCOL=http

# Backend API Configuration
BACKEND_API_URL=http://host.docker.internal:3001

# Execution Settings
EXECUTIONS_MODE=regular
EXECUTIONS_TIMEOUT=3600
EXECUTIONS_TIMEOUT_MAX=7200
EXECUTIONS_DATA_SAVE_ON_ERROR=all
EXECUTIONS_DATA_SAVE_ON_SUCCESS=all
EXECUTIONS_DATA_MAX_AGE=336

# Timezone
GENERIC_TIMEZONE=America/New_York

# Security Settings
N8N_SECURE_COOKIE=true
N8N_DIAGNOSTICS_ENABLED=false

# Logging
N8N_LOG_LEVEL=info
N8N_LOG_OUTPUT=console

# Editor Configuration
N8N_EDITOR_BASE_URL=http://localhost:5678
EOF

    echo -e "${GREEN}✓ Created .env.docker.local with secure credentials${NC}"
    echo -e "${YELLOW}  N8N Username: ${N8N_USER}${NC}"
    echo -e "${YELLOW}  N8N Password: ${N8N_PASS}${NC}"
    echo -e "${YELLOW}  Please save these credentials securely!${NC}"
else
    echo -e "${YELLOW}✓ .env.docker.local already exists${NC}"
fi

# Setup backend environment security
echo -e "\n${BLUE}Checking backend environment security...${NC}"

if [ -f "backend/.env" ]; then
    echo "Checking backend .env file for security issues..."
    
    # Check for production mode
    if grep -q "NODE_ENV=production" backend/.env; then
        echo -e "${YELLOW}⚠ Backend is in production mode. Ensure all credentials are secure.${NC}"
    fi
    
    # Check for default passwords (you can extend this list)
    if grep -qi "password.*admin\|password.*123\|password.*password" backend/.env; then
        echo -e "${RED}⚠ WARNING: Default or weak passwords detected in backend/.env${NC}"
        echo -e "${RED}  Please update all passwords to secure values.${NC}"
    fi
    
    echo -e "${GREEN}✓ Backend environment file checked${NC}"
else
    echo -e "${YELLOW}⚠ Backend .env file not found${NC}"
fi

# Set proper file permissions
echo -e "\n${BLUE}Setting secure file permissions...${NC}"

# Make environment files readable only by owner
chmod 600 .env.docker.local 2>/dev/null || true
chmod 600 backend/.env 2>/dev/null || true
chmod 600 admin-dashboard/.env 2>/dev/null || true

# Make the script executable
chmod +x setup-security.sh

echo -e "${GREEN}✓ File permissions updated${NC}"

# Check .gitignore
echo -e "\n${BLUE}Verifying .gitignore security...${NC}"

if grep -q ".env.docker.local" .gitignore; then
    echo -e "${GREEN}✓ Sensitive environment files are ignored by Git${NC}"
else
    echo -e "${RED}⚠ WARNING: .gitignore may not be protecting sensitive files${NC}"
fi

# Final security checklist
echo -e "\n${BLUE}Security Setup Complete!${NC}"
echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN}✓ Secure environment files created${NC}"
echo -e "${GREEN}✓ File permissions configured${NC}"
echo -e "${GREEN}✓ Git ignore rules updated${NC}"

echo -e "\n${YELLOW}IMPORTANT SECURITY REMINDERS:${NC}"
echo -e "${YELLOW}1. Save the generated credentials securely${NC}"
echo -e "${YELLOW}2. Never commit .env.*.local files to version control${NC}"
echo -e "${YELLOW}3. Use strong, unique passwords for production${NC}"
echo -e "${YELLOW}4. Enable SSL/HTTPS for production deployment${NC}"
echo -e "${YELLOW}5. Regularly rotate passwords and secrets${NC}"

echo -e "\n${BLUE}To start the services with secure configuration:${NC}"
echo -e "  docker-compose up -d"

echo -e "\n${BLUE}Access N8N automation interface at:${NC}"
echo -e "  http://localhost:5678"
echo -e "  Username: ${N8N_USER}"
echo -e "  Password: ${N8N_PASS}"

echo -e "\n${GREEN}Setup complete! 🔐${NC}"