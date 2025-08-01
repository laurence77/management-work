#!/bin/bash

echo "🚀 Starting Celebrity Booking Platform - Test Mode"
echo "=================================================="

# Kill any existing processes
echo "🧹 Cleaning up existing processes..."
pkill -f "node.*test-server" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 2

# Start backend test server
echo "🔧 Starting backend test server..."
cd /Users/laurence/management-project/backend
node test-server.js &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

echo "📊 Testing backend..."
if curl -s http://localhost:3000/api/health > /dev/null; then
    echo "✅ Backend is running at http://localhost:3000"
    curl -s http://localhost:3000/api/health | jq '.'
else
    echo "❌ Backend failed to start"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# Start frontend
echo "🎨 Starting frontend..."
cd /Users/laurence/management-project
npx vite --port 8080 --host 0.0.0.0 &
FRONTEND_PID=$!

# Wait for frontend to start
sleep 5

echo "📊 Testing frontend..."
if curl -s http://localhost:8080 > /dev/null; then
    echo "✅ Frontend is running at http://localhost:8080"
else
    echo "❌ Frontend failed to start"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 1
fi

echo ""
echo "🎉 ALL SERVERS RUNNING SUCCESSFULLY!"
echo "=================================================="
echo "Frontend: http://localhost:8080"
echo "Backend:  http://localhost:3000"
echo "API Test: http://localhost:3000/api/test"
echo ""
echo "💡 Test the application:"
echo "1. Open http://localhost:8080 in your browser"
echo "2. Test the celebrity booking features"
echo "3. Try the crypto payment system"
echo "4. Check mobile responsiveness"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for interrupt
trap 'echo "🛑 Stopping servers..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0' INT
wait