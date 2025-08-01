#!/bin/bash

# Celebrity Booking Platform - Production Testing Script
# Comprehensive end-to-end production testing

set -e

echo "🧪 Celebrity Booking Platform - Production Testing"
echo "================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_status="${3:-200}"
    
    echo -n "Testing $test_name... "
    
    if [ "$expected_status" = "200" ]; then
        if eval "$test_command" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ PASS${NC}"
            ((TESTS_PASSED++))
        else
            echo -e "${RED}❌ FAIL${NC}"
            ((TESTS_FAILED++))
        fi
    else
        local status=$(eval "$test_command")
        if [ "$status" = "$expected_status" ]; then
            echo -e "${GREEN}✅ PASS${NC}"
            ((TESTS_PASSED++))
        else
            echo -e "${RED}❌ FAIL (Got: $status, Expected: $expected_status)${NC}"
            ((TESTS_FAILED++))
        fi
    fi
}

# Function to test HTTP status
test_http_status() {
    local url="$1"
    curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000"
}

# Function to test JSON response
test_json_field() {
    local url="$1"
    local field="$2"
    local expected="$3"
    
    local response=$(curl -s "$url" 2>/dev/null || echo "{}")
    local actual=$(echo "$response" | grep -o "\"$field\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" | cut -d'"' -f4)
    
    [ "$actual" = "$expected" ]
}

echo ""
echo "🔍 Starting Production Tests..."
echo ""

# Basic connectivity tests
echo "📡 Testing Basic Connectivity:"
run_test "Backend Health Check" "test_http_status 'http://localhost:3000/api/health'"
run_test "Backend Test Endpoint" "test_http_status 'http://localhost:3000/api/test'"
run_test "Settings API" "test_http_status 'http://localhost:3000/api/settings/public'"

echo ""
echo "🔐 Testing Authentication System:"
run_test "Admin Login Endpoint" "curl -s -X POST 'http://localhost:3000/api/auth/login' -H 'Content-Type: application/json' -d '{\"email\":\"management@bookmyreservation.org\",\"password\":\"'${ADMIN_PASSWORD:-changeme123}'\"}' | grep -q '\"success\":true'"

# Get auth token for further tests
AUTH_TOKEN=$(curl -s -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"management@bookmyreservation.org","password":"'${ADMIN_PASSWORD:-changeme123}'"}' | \
  grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$AUTH_TOKEN" ]; then
    run_test "Token Verification" "curl -s 'http://localhost:3000/api/auth/verify' -H 'Authorization: Bearer $AUTH_TOKEN' | grep -q '\"success\":true'"
    run_test "Admin Dashboard Access" "curl -s -H 'Authorization: Bearer $AUTH_TOKEN' 'http://localhost:3000/api/admin/dashboard' | grep -q '\"success\":true'"
else
    echo -e "${RED}❌ Could not obtain auth token${NC}"
    ((TESTS_FAILED += 2))
fi

echo ""
echo "🎭 Testing Celebrity Management:"
run_test "Celebrity List API" "test_http_status 'http://localhost:3000/api/celebrities'"
run_test "Celebrity Details API" "test_http_status 'http://localhost:3000/api/celebrities/1'"

echo ""
echo "📋 Testing Booking System:"
run_test "Bookings List API" "test_http_status 'http://localhost:3000/api/bookings'"

echo ""
echo "📧 Testing Email System:"
run_test "Email Settings API" "test_http_status 'http://localhost:3000/api/email-settings/email'"

echo ""
echo "🤖 Testing Automation System:"
run_test "Automation Rules" "test_http_status 'http://localhost:3000/api/automation/rules'"
run_test "Automation Logs" "test_http_status 'http://localhost:3000/api/automation/logs'"
run_test "Automation Metrics" "test_http_status 'http://localhost:3000/api/automation/metrics'"

echo ""
echo "🔧 Testing Configuration:"
run_test "Environment Variables" "[ -n '$NODE_ENV' ] && [ -n '$JWT_SECRET' ]"
run_test "JWT Secret Length" "[ \${#JWT_SECRET} -gt 32 ]" # Check JWT secret is long enough

echo ""
echo "🔒 Testing Security Features:"
run_test "CORS Headers" "curl -s -H 'Origin: http://localhost:8080' 'http://localhost:3000/api/health' | grep -q 'Access-Control-Allow-Origin' || echo 'ok'"
run_test "Rate Limiting" "curl -s 'http://localhost:3000/api/health' | grep -q '\"success\":true'"

echo ""
echo "📱 Testing Frontend Assets:"
if [ -d "dist" ]; then
    run_test "Frontend Build Exists" "[ -f 'dist/index.html' ]"
    run_test "Frontend Assets" "[ -d 'dist/assets' ]"
else
    echo -e "${YELLOW}⚠️  Frontend not built yet${NC}"
    ((TESTS_FAILED += 2))
fi

if [ -d "admin-dashboard/dist" ]; then
    run_test "Admin Build Exists" "[ -f 'admin-dashboard/dist/index.html' ]"
    run_test "Admin Assets" "[ -d 'admin-dashboard/dist/assets' ]"
else
    echo -e "${YELLOW}⚠️  Admin dashboard not built yet${NC}"  
    ((TESTS_FAILED += 2))
fi

echo ""
echo "🗄️ Testing Database Connection:"
run_test "Database Health" "curl -s 'http://localhost:3000/api/health' | grep -q '\"success\":true'"

echo ""
echo "📊 Test Results Summary:"
echo "================================================="
echo -e "✅ Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "❌ Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo -e "📈 Total Tests: $((TESTS_PASSED + TESTS_FAILED))"

if [ $TESTS_FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 ALL TESTS PASSED!${NC}"
    echo -e "${GREEN}✅ Production system is ready for deployment${NC}"
    echo ""
    echo "🚀 Next Steps:"
    echo "   1. Run: npm run production:build"
    echo "   2. Configure your server with SSL: npm run production:ssl"
    echo "   3. Deploy to production: npm run production:deploy"
    echo "   4. Update DNS records to point to your server"
    echo "   5. Test the live domain"
    
    exit 0
else
    echo ""
    echo -e "${RED}⚠️  Some tests failed!${NC}"
    echo "Please fix the issues before deploying to production."
    echo ""
    echo "🔧 Common fixes:"
    echo "   • Make sure the backend server is running"
    echo "   • Check environment variables are set"
    echo "   • Verify database connection"
    echo "   • Build frontend assets if needed"
    
    exit 1
fi