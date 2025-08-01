#!/bin/bash

# BookMyReservation Production Startup Script
# This script starts the full production system with Supabase integration

echo "🚀 Starting BookMyReservation Production System..."

# Kill any existing processes
echo "🔄 Stopping existing processes..."
pkill -f "node.*server" 2>/dev/null || true
pkill -f "npm.*dev" 2>/dev/null || true

# Set production environment
export NODE_ENV=production

# Start backend server (production with Supabase)
echo "📡 Starting Production Backend Server..."
cd /Users/laurence/management-project/backend
npm start &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start admin dashboard
echo "🎛️ Starting Admin Dashboard..."
cd /Users/laurence/management-project/admin-dashboard
npm run dev &
DASHBOARD_PID=$!

# Start main frontend
echo "🌐 Starting Main Frontend..."
cd /Users/laurence/management-project
npm run dev &
FRONTEND_PID=$!

echo "✅ Production System Started!"
echo ""
echo "🔗 Services Running:"
echo "   • Backend API: http://localhost:3000"
echo "   • Admin Dashboard: http://localhost:5173"
echo "   • Main Frontend: http://localhost:5174"
echo ""
echo "💾 Database: Supabase (Production)"
echo "📧 Email System: Hostinger SMTP + Queue"
echo "⚡ Edge Functions: quick-worker deployed"
echo ""
echo "🎯 System Status: PRODUCTION READY"
echo ""
echo "Process IDs:"
echo "   Backend: $BACKEND_PID"
echo "   Dashboard: $DASHBOARD_PID" 
echo "   Frontend: $FRONTEND_PID"
echo ""
echo "Press Ctrl+C to stop all services"

# Keep script running and handle cleanup
trap 'echo "🛑 Stopping all services..."; kill $BACKEND_PID $DASHBOARD_PID $FRONTEND_PID 2>/dev/null; exit' INT

# Wait for all processes
wait