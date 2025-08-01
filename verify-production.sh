#!/bin/bash

# BookMyReservation Production Verification Script
# Verifies all components are working with Supabase

echo "🔍 Verifying Production System..."
echo "================================="

# Test backend connectivity
echo "📡 Testing Backend API..."
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/settings/public 2>/dev/null || echo "000")
if [ "$BACKEND_STATUS" = "200" ]; then
    echo "✅ Backend API: ONLINE"
else
    echo "❌ Backend API: OFFLINE (Status: $BACKEND_STATUS)"
fi

# Test email settings endpoint
echo "📧 Testing Email Settings API..."
EMAIL_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/email-settings/email 2>/dev/null || echo "000")
if [ "$EMAIL_STATUS" = "200" ]; then
    echo "✅ Email Settings API: ONLINE"
else
    echo "❌ Email Settings API: OFFLINE (Status: $EMAIL_STATUS)"
fi

# Test automation endpoints
echo "🔄 Testing Automation API..."
AUTO_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/analytics/automation/stats 2>/dev/null || echo "000")
if [ "$AUTO_STATUS" = "200" ]; then
    echo "✅ Automation API: ONLINE"
else
    echo "❌ Automation API: OFFLINE (Status: $AUTO_STATUS)"
fi

# Test Supabase Edge Function
echo "⚡ Testing Edge Function..."
EDGE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST $SUPABASE_URL/functions/v1/send-email \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"to":"test@example.com","subject":"Production Test","html":"<p>Test</p>","type":"test"}' 2>/dev/null || echo "000")
if [ "$EDGE_STATUS" = "200" ]; then
    echo "✅ Edge Function: ONLINE"
else
    echo "❌ Edge Function: OFFLINE (Status: $EDGE_STATUS)"
fi

# Test admin dashboard
echo "🎛️ Testing Admin Dashboard..."
DASHBOARD_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5173 2>/dev/null || echo "000")
if [ "$DASHBOARD_STATUS" = "200" ]; then
    echo "✅ Admin Dashboard: ONLINE"
else
    echo "❌ Admin Dashboard: OFFLINE (Status: $DASHBOARD_STATUS)"
fi

# Test main frontend
echo "🌐 Testing Main Frontend..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5174 2>/dev/null || echo "000")
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo "✅ Main Frontend: ONLINE"
else
    echo "❌ Main Frontend: OFFLINE (Status: $FRONTEND_STATUS)"
fi

echo ""
echo "🔗 Production URLs:"
echo "   • Backend API: http://localhost:3000"
echo "   • Admin Dashboard: http://localhost:5173"
echo "   • Main Frontend: http://localhost:5174"
echo "   • Edge Function: Supabase Production Functions"
echo ""
echo "💾 Database: Supabase Production"
echo "📧 Email System: Queue + Hostinger SMTP"
echo "🎯 Environment: PRODUCTION"

# Summary
echo ""
echo "================================="
if [[ "$BACKEND_STATUS" = "200" && "$EMAIL_STATUS" = "200" && "$AUTO_STATUS" = "200" && "$EDGE_STATUS" = "200" ]]; then
    echo "🎉 PRODUCTION SYSTEM: FULLY OPERATIONAL"
else
    echo "⚠️  PRODUCTION SYSTEM: SOME ISSUES DETECTED"
fi
echo "================================="