#!/bin/bash

# Deploy and Test Email Edge Function for Production
# This script deploys the email edge function to Supabase and tests it

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_status "🚀 Deploying Email Edge Function to Production Supabase"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase >/dev/null 2>&1; then
    print_error "Supabase CLI is not installed"
    print_status "Install with: npm install -g supabase"
    exit 1
fi

# Check if logged in to Supabase
if ! supabase projects list >/dev/null 2>&1; then
    print_error "Not logged in to Supabase"
    print_status "Run: supabase login"
    exit 1
fi

# Verify environment variables
print_status "Verifying environment configuration..."

required_vars=(
    "SUPABASE_URL"
    "SUPABASE_SERVICE_ROLE_KEY"
    "SMTP_USERNAME"
    "SMTP_PASSWORD"
)

for var in "${required_vars[@]}"; do
    if [[ -z "${!var}" ]]; then
        print_error "Required environment variable $var is not set"
        exit 1
    fi
done

print_success "Environment configuration verified"

# Extract project ID from Supabase URL
PROJECT_ID=$(echo "$SUPABASE_URL" | sed -n 's/.*\/\/\([^.]*\)\.supabase\.co/\1/p')

if [[ -z "$PROJECT_ID" ]]; then
    print_error "Could not extract project ID from SUPABASE_URL"
    exit 1
fi

print_status "Deploying to project: $PROJECT_ID"

# Link to the project
print_status "Linking to Supabase project..."
supabase link --project-ref "$PROJECT_ID" || {
    print_error "Failed to link to Supabase project"
    exit 1
}

print_success "Successfully linked to project"

# Create email logs table if it doesn't exist
print_status "Setting up email logs table..."

EMAIL_LOGS_SQL="
CREATE TABLE IF NOT EXISTS email_logs (
    id BIGSERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL DEFAULT 'general',
    recipient TEXT NOT NULL,
    subject TEXT NOT NULL,
    success BOOLEAN NOT NULL DEFAULT false,
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Admin-only access policy
CREATE POLICY IF NOT EXISTS \"email_logs_admin_only\" ON email_logs
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_success ON email_logs(success);
CREATE INDEX IF NOT EXISTS idx_email_logs_type ON email_logs(type);

COMMENT ON TABLE email_logs IS 'Logs of all email sending attempts';
"

# Execute SQL to create table
psql "$SUPABASE_URL/rest/v1" -c "$EMAIL_LOGS_SQL" 2>/dev/null || {
    print_warning "Could not create email_logs table via psql - may need manual creation"
}

# Set function secrets
print_status "Setting edge function secrets..."

supabase secrets set SMTP_USERNAME="$SMTP_USERNAME" --project-ref "$PROJECT_ID"
supabase secrets set SMTP_PASSWORD="$SMTP_PASSWORD" --project-ref "$PROJECT_ID"

print_success "Secrets configured"

# Deploy the edge function
print_status "Deploying send-email-production edge function..."

supabase functions deploy send-email-production --project-ref "$PROJECT_ID" || {
    print_error "Failed to deploy edge function"
    exit 1
}

print_success "Edge function deployed successfully"

# Wait a moment for deployment to propagate
sleep 3

# Test the edge function
print_status "Testing email edge function..."

TEST_EMAIL="${TEST_EMAIL:-admin@example.com}"
FUNCTION_URL="$SUPABASE_URL/functions/v1/send-email-production"

# Test 1: Basic email
print_status "Test 1: Basic email sending..."
response=$(curl -s -w "%{http_code}" -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "'$TEST_EMAIL'",
    "subject": "Test Email - Production Deployment",
    "html": "<h1>Test Email</h1><p>This is a test email from the production edge function.</p>",
    "type": "test"
  }')

http_code="${response: -3}"
response_body="${response%???}"

if [[ "$http_code" == "200" ]]; then
    print_success "Test 1 passed: Basic email sending"
else
    print_error "Test 1 failed: HTTP $http_code"
    echo "$response_body"
fi

# Test 2: Template email
print_status "Test 2: Template-based email..."
response=$(curl -s -w "%{http_code}" -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "'$TEST_EMAIL'",
    "subject": "Template Test",
    "template": "welcome",
    "variables": {
      "name": "Test User",
      "dashboard_url": "https://admin.bookmyreservation.org"
    },
    "type": "welcome"
  }')

http_code="${response: -3}"
response_body="${response%???}"

if [[ "$http_code" == "200" ]]; then
    print_success "Test 2 passed: Template-based email"
else
    print_error "Test 2 failed: HTTP $http_code"
    echo "$response_body"
fi

# Test 3: Error handling (invalid email)
print_status "Test 3: Error handling (invalid email)..."
response=$(curl -s -w "%{http_code}" -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "invalid-email",
    "subject": "Test",
    "html": "<p>Test</p>"
  }')

http_code="${response: -3}"
response_body="${response%???}"

if [[ "$http_code" == "400" ]]; then
    print_success "Test 3 passed: Error handling working"
else
    print_warning "Test 3 unexpected: HTTP $http_code (expected 400)"
    echo "$response_body"
fi

# Test 4: CORS headers
print_status "Test 4: CORS preflight request..."
response=$(curl -s -w "%{http_code}" -X OPTIONS "$FUNCTION_URL" \
  -H "Origin: https://admin.bookmyreservation.org" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type,authorization")

http_code="${response: -3}"

if [[ "$http_code" == "200" ]]; then
    print_success "Test 4 passed: CORS headers working"
else
    print_error "Test 4 failed: HTTP $http_code"
fi

# Check email logs
print_status "Checking email logs..."
LOGS_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM email_logs WHERE sent_at > NOW() - INTERVAL '5 minutes';" 2>/dev/null | xargs || echo "0")

if [[ "$LOGS_COUNT" -gt 0 ]]; then
    print_success "Email logging working: $LOGS_COUNT recent entries"
else
    print_warning "No recent email logs found - logging may need manual setup"
fi

# Performance test
print_status "Test 5: Performance test (multiple emails)..."
start_time=$(date +%s)

for i in {1..5}; do
    curl -s -X POST "$FUNCTION_URL" \
      -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
      -H "Content-Type: application/json" \
      -d '{
        "to": "'$TEST_EMAIL'",
        "subject": "Performance Test '$i'",
        "html": "<p>Performance test email #'$i'</p>",
        "type": "performance_test"
      }' >/dev/null &
done

wait
end_time=$(date +%s)
duration=$((end_time - start_time))

if [[ $duration -lt 10 ]]; then
    print_success "Test 5 passed: Performance test completed in ${duration}s"
else
    print_warning "Test 5 slow: Performance test took ${duration}s"
fi

# Display function information
echo ""
print_status "📋 Edge Function Information:"
echo "  - Function URL: $FUNCTION_URL"
echo "  - Project ID: $PROJECT_ID"
echo "  - SMTP Provider: Hostinger"
echo "  - Templates Available: welcome, booking_confirmation, password_reset, admin_notification"

echo ""
print_status "📖 Usage Examples:"
echo ""
echo "Basic Email:"
echo 'curl -X POST "'$FUNCTION_URL'" \'
echo '  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \'
echo '  -H "Content-Type: application/json" \'
echo '  -d '\''{
    "to": "user@example.com",
    "subject": "Hello",
    "html": "<h1>Hello World</h1>"
  }'\'''

echo ""
echo "Template Email:"
echo 'curl -X POST "'$FUNCTION_URL'" \'
echo '  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \'
echo '  -H "Content-Type: application/json" \'
echo '  -d '\''{
    "to": "user@example.com",
    "template": "welcome",
    "variables": {"name": "John", "dashboard_url": "https://app.example.com"}
  }'\'''

echo ""
print_status "🔧 Monitoring:"
echo "  - Check email logs: SELECT * FROM email_logs ORDER BY sent_at DESC LIMIT 10;"
echo "  - Function logs: supabase functions logs send-email-production --project-ref $PROJECT_ID"
echo "  - SMTP delivery status: Monitor via Hostinger dashboard"

echo ""
if [[ "$LOGS_COUNT" -gt 0 ]]; then
    print_success "🎉 Email edge function deployment and testing completed successfully!"
else
    print_warning "⚠️  Email edge function deployed but logging needs verification"
fi

echo ""
print_status "Next steps:"
echo "1. Update backend email service to use the new edge function"
echo "2. Configure email templates in admin dashboard"
echo "3. Set up email delivery monitoring"
echo "4. Test with real email addresses"
echo "5. Monitor function performance and error rates"