#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🛑 Stopping EliteConnect Platform...${NC}"

# Kill processes on ports 8080 and 3001
echo -e "${YELLOW}📋 Finding and stopping processes...${NC}"

# Stop frontend (port 8080)
FRONTEND_PID=$(lsof -ti:8080)
if [ ! -z "$FRONTEND_PID" ]; then
    kill $FRONTEND_PID
    echo -e "${GREEN}✅ Frontend stopped (PID: $FRONTEND_PID)${NC}"
else
    echo -e "${YELLOW}⚠️  No frontend process found on port 8080${NC}"
fi

# Stop admin dashboard (port 3001)
ADMIN_PID=$(lsof -ti:3001)
if [ ! -z "$ADMIN_PID" ]; then
    kill $ADMIN_PID
    echo -e "${GREEN}✅ Admin Dashboard stopped (PID: $ADMIN_PID)${NC}"
else
    echo -e "${YELLOW}⚠️  No admin process found on port 3001${NC}"
fi

# Clean up log files
if [ -f "frontend.log" ]; then
    rm frontend.log
    echo -e "${GREEN}✅ Frontend log cleaned${NC}"
fi

if [ -f "admin.log" ]; then
    rm admin.log
    echo -e "${GREEN}✅ Admin log cleaned${NC}"
fi

echo -e "${GREEN}🎉 All services stopped successfully!${NC}"