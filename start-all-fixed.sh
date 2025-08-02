#!/bin/bash

echo "🚀 STARTING CELEBRITY BOOKING PLATFORM..."

# Function to check if port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "⚠️  Port $1 is in use, killing existing process..."
        kill -9 $(lsof -ti:$1) 2>/dev/null || true
        sleep 2
    fi
}

# Kill existing processes
echo "🧹 Cleaning up existing processes..."
check_port 3000
check_port 5173
check_port 5174

# Start backend
echo "🔧 Starting backend server..."
cd backend && npm install > /dev/null 2>&1 && PORT=3000 npm run dev &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 5

# Start frontend
echo "🎨 Starting frontend..."
cd .. && npm run dev &
FRONTEND_PID=$!

# Start admin dashboard
echo "👑 Starting admin dashboard..."
npm run admin:dev &
ADMIN_PID=$!

echo ""
echo "🎉 All services starting!"
echo "📱 Frontend: http://localhost:5173"
echo "👑 Admin: http://localhost:5174" 
echo "🔧 Backend: http://localhost:3000"
echo ""
echo "⚠️  IMPORTANT: Edit .env and backend/.env with your Supabase credentials!"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
trap 'kill $BACKEND_PID $FRONTEND_PID $ADMIN_PID 2>/dev/null; echo "🛑 Stopping all services..."; exit 0' INT
wait