#!/bin/bash

echo "🔧 Setting up Celebrity Booking Platform environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if environment files exist
check_env_file() {
    local env_file=$1
    local example_file="${env_file}.example"
    
    if [ ! -f "$env_file" ]; then
        if [ -f "$example_file" ]; then
            echo -e "${GREEN}Creating $env_file from template...${NC}"
            cp "$example_file" "$env_file"
            echo -e "${YELLOW}⚠️  Please edit $env_file with your actual values${NC}"
        else
            echo -e "${RED}❌ Missing both $env_file and $example_file${NC}"
            return 1
        fi
    else
        echo -e "${GREEN}✅ $env_file exists${NC}"
    fi
}

# Create environment files
echo "📁 Setting up environment files..."
check_env_file "backend/.env"
check_env_file "admin-dashboard/.env"

# Create main project .env if it doesn't exist
if [ ! -f ".env" ]; then
    echo -e "${GREEN}Creating main .env file...${NC}"
    cat > .env << 'EOF'
# Main Project Environment Configuration
NODE_ENV=development

# Required: Set strong passwords for admin accounts
ADMIN_PASSWORD=
MANAGEMENT_PASSWORD=

# Database Configuration
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# JWT Secrets (generate using: openssl rand -base64 32)
JWT_SECRET=
REFRESH_TOKEN_SECRET=

# Email Configuration
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=

# Application URLs
FRONTEND_URL=http://localhost:8080
ADMIN_URL=http://localhost:3001
API_URL=http://localhost:3000
EOF
    echo -e "${YELLOW}⚠️  Please edit .env with your actual values${NC}"
fi

# Check for required tools
echo "🔧 Checking required tools..."

command -v node >/dev/null 2>&1 || { echo -e "${RED}❌ Node.js is required but not installed.${NC}" >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo -e "${RED}❌ npm is required but not installed.${NC}" >&2; exit 1; }

NODE_VERSION=$(node --version | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js 18+ is required. Current version: $(node --version)${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $(node --version) is installed${NC}"
echo -e "${GREEN}✅ npm $(npm --version) is installed${NC}"

# Install dependencies
echo "📦 Installing dependencies..."

echo "Installing main project dependencies..."
npm install

echo "Installing admin dashboard dependencies..."
cd admin-dashboard && npm install && cd ..

echo "Installing backend dependencies..."
cd backend && npm install && cd ..

echo -e "${GREEN}🎉 Environment setup complete!${NC}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Before starting the application:${NC}"
echo "1. Edit .env files with your actual values"
echo "2. Set strong passwords for ADMIN_PASSWORD and MANAGEMENT_PASSWORD"
echo "3. Configure your Supabase project credentials"
echo "4. Set up your email SMTP credentials"
echo ""
echo -e "${GREEN}To start the application:${NC}"
echo "npm run start:all     # Start all services"
echo "npm run backend:dev   # Backend API (port 3000)"
echo "npm run admin:dev     # Admin Dashboard (port 3001)"
echo "npm run dev           # Frontend (port 8080)"