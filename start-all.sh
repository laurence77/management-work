#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting EliteConnect Platform${NC}"
echo "=================================="

# Function to check if port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${YELLOW}⚠️  Port $1 is already in use${NC}"
        return 1
    fi
    return 0
}

# Check ports
echo -e "${BLUE}📋 Checking ports...${NC}"
check_port 8080
frontend_port_free=$?
check_port 3001
admin_port_free=$?

if [ $frontend_port_free -ne 0 ] || [ $admin_port_free -ne 0 ]; then
    echo -e "${RED}❌ Some ports are in use. Please free them first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Ports are available${NC}"
echo ""

# Start frontend in background
echo -e "${BLUE}🌐 Starting Frontend (Port 8080)...${NC}"
cd /Users/laurence/liquid-glow-booking-verse
npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}✅ Frontend started (PID: $FRONTEND_PID)${NC}"

# Wait a moment
sleep 2

# Start admin dashboard in background
echo -e "${BLUE}🔐 Starting Admin Dashboard (Port 3001)...${NC}"
cd /Users/laurence/liquid-glow-booking-verse/admin-dashboard
npm run dev > ../admin.log 2>&1 &
ADMIN_PID=$!
echo -e "${GREEN}✅ Admin Dashboard started (PID: $ADMIN_PID)${NC}"

# Wait for services to start
echo -e "${YELLOW}⏳ Waiting for services to initialize...${NC}"
sleep 5

echo ""
echo -e "${GREEN}🎉 Both applications are running!${NC}"
echo "=================================="
echo -e "${BLUE}📱 Frontend (Public Site):${NC}"
echo "   🌐 Local:   http://localhost:8080"
echo "   🌐 Network: http://192.168.1.40:8080"
echo ""
echo -e "${BLUE}🔐 Admin Dashboard:${NC}"
echo "   🌐 Local:   http://localhost:3001"
echo "   📧 Email:   admin@eliteconnect.com"
echo "   🔑 Password: admin123"
echo ""
echo -e "${YELLOW}📋 Process IDs:${NC}"
echo "   Frontend: $FRONTEND_PID"
echo "   Admin:    $ADMIN_PID"
echo ""
echo -e "${YELLOW}📝 Logs:${NC}"
echo "   Frontend: tail -f frontend.log"
echo "   Admin:    tail -f admin.log"
echo ""
echo -e "${RED}🛑 To stop both services:${NC}"
echo "   kill $FRONTEND_PID $ADMIN_PID"
echo "   or use: ./stop-all.sh"
echo ""
echo -e "${BLUE}Press Ctrl+C to stop both services${NC}"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Stopping services...${NC}"
    kill $FRONTEND_PID $ADMIN_PID 2>/dev/null
    echo -e "${GREEN}✅ Services stopped${NC}"
    exit 0
}

# Trap Ctrl+C
trap cleanup INT

# Wait for processes
wait