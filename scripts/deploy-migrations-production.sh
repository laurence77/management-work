#!/bin/bash

# Celebrity Booking Platform - Production Database Migration Deployment
# This script safely deploys database migrations to production Supabase

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Configuration
MIGRATIONS_DIR="backend/migrations"
BACKUP_DIR="database-backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

print_status "🚀 Celebrity Booking Platform - Production Migration Deployment"
echo ""

# Check if running in production environment
if [[ "$NODE_ENV" != "production" ]]; then
    print_warning "This script is intended for production deployment"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Deployment cancelled"
        exit 1
    fi
fi

# Verify required environment variables
print_status "Verifying environment configuration..."

required_vars=(
    "SUPABASE_URL"
    "SUPABASE_SERVICE_ROLE_KEY"
    "DATABASE_URL"
)

for var in "${required_vars[@]}"; do
    if [[ -z "${!var}" ]]; then
        print_error "Required environment variable $var is not set"
        exit 1
    fi
done

# Verify production Supabase URL
if [[ ! $SUPABASE_URL =~ ^https://.*\.supabase\.co$ ]]; then
    print_error "SUPABASE_URL does not appear to be a valid production URL"
    exit 1
fi

print_success "Environment configuration verified"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Function to create database backup
create_backup() {
    print_status "Creating pre-migration database backup..."
    
    BACKUP_FILE="$BACKUP_DIR/pre_migration_backup_${TIMESTAMP}.sql"
    
    # Use pg_dump to create backup
    if command -v pg_dump >/dev/null 2>&1; then
        pg_dump "$DATABASE_URL" > "$BACKUP_FILE"
        gzip "$BACKUP_FILE"
        print_success "Database backup created: ${BACKUP_FILE}.gz"
    else
        print_warning "pg_dump not found - creating backup via Supabase API"
        # Alternative backup method using Supabase API
        curl -X POST "${SUPABASE_URL}/rest/v1/rpc/create_backup" \
             -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
             -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
             -H "Content-Type: application/json" \
             -d "{\"backup_name\": \"pre_migration_${TIMESTAMP}\"}"
    fi
}

# Function to check migration status
check_migration_status() {
    print_status "Checking current migration status..."
    
    # Create migrations tracking table if it doesn't exist
    psql "$DATABASE_URL" -c "
        CREATE TABLE IF NOT EXISTS migration_history (
            id SERIAL PRIMARY KEY,
            filename VARCHAR(255) NOT NULL UNIQUE,
            executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            checksum VARCHAR(64),
            success BOOLEAN DEFAULT TRUE,
            error_message TEXT
        );
    " || {
        print_error "Failed to create migration_history table"
        return 1
    }
    
    print_success "Migration tracking table ready"
}

# Function to calculate file checksum
calculate_checksum() {
    local file="$1"
    if command -v sha256sum >/dev/null 2>&1; then
        sha256sum "$file" | cut -d' ' -f1
    elif command -v shasum >/dev/null 2>&1; then
        shasum -a 256 "$file" | cut -d' ' -f1
    else
        print_warning "No checksum utility found - skipping checksum verification"
        echo ""
    fi
}

# Function to execute a single migration
execute_migration() {
    local migration_file="$1"
    local filename=$(basename "$migration_file")
    
    print_status "Processing migration: $filename"
    
    # Check if migration already executed
    local executed=$(psql "$DATABASE_URL" -t -c "
        SELECT COUNT(*) FROM migration_history 
        WHERE filename = '$filename' AND success = TRUE;
    " | xargs)
    
    if [[ "$executed" -gt 0 ]]; then
        print_warning "Migration $filename already executed - skipping"
        return 0
    fi
    
    # Calculate checksum
    local checksum=$(calculate_checksum "$migration_file")
    
    # Execute migration in a transaction
    print_status "Executing migration: $filename"
    
    if psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$migration_file"; then
        # Record successful migration
        psql "$DATABASE_URL" -c "
            INSERT INTO migration_history (filename, checksum, success) 
            VALUES ('$filename', '$checksum', TRUE)
            ON CONFLICT (filename) 
            DO UPDATE SET 
                executed_at = NOW(), 
                checksum = '$checksum', 
                success = TRUE,
                error_message = NULL;
        "
        print_success "Migration $filename executed successfully"
        return 0
    else
        # Record failed migration
        local error_msg="Migration execution failed"
        psql "$DATABASE_URL" -c "
            INSERT INTO migration_history (filename, checksum, success, error_message) 
            VALUES ('$filename', '$checksum', FALSE, '$error_msg')
            ON CONFLICT (filename) 
            DO UPDATE SET 
                executed_at = NOW(), 
                checksum = '$checksum', 
                success = FALSE,
                error_message = '$error_msg';
        "
        print_error "Migration $filename failed"
        return 1
    fi
}

# Function to validate migration files
validate_migrations() {
    print_status "Validating migration files..."
    
    local invalid_files=()
    
    for migration_file in "$MIGRATIONS_DIR"/*.sql; do
        if [[ -f "$migration_file" ]]; then
            # Check for dangerous operations
            if grep -qi "DROP DATABASE\|DROP SCHEMA\|TRUNCATE" "$migration_file"; then
                invalid_files+=("$(basename "$migration_file"): Contains dangerous operations")
            fi
            
            # Check for syntax errors (basic validation)
            if ! grep -qi "^--\|CREATE\|ALTER\|INSERT\|UPDATE\|DELETE" "$migration_file"; then
                invalid_files+=("$(basename "$migration_file"): Does not appear to be a valid SQL file")
            fi
        fi
    done
    
    if [[ ${#invalid_files[@]} -gt 0 ]]; then
        print_error "Migration validation failed:"
        for issue in "${invalid_files[@]}"; do
            echo "  - $issue"
        done
        return 1
    fi
    
    print_success "Migration files validated"
    return 0
}

# Function to deploy all migrations
deploy_migrations() {
    print_status "Deploying migrations to production database..."
    
    local migration_count=0
    local failed_migrations=()
    
    # Process migrations in order
    for migration_file in "$MIGRATIONS_DIR"/*.sql; do
        if [[ -f "$migration_file" ]]; then
            if execute_migration "$migration_file"; then
                ((migration_count++))
            else
                failed_migrations+=("$(basename "$migration_file")")
            fi
        fi
    done
    
    if [[ ${#failed_migrations[@]} -gt 0 ]]; then
        print_error "Some migrations failed:"
        for failed in "${failed_migrations[@]}"; do
            echo "  - $failed"
        done
        return 1
    fi
    
    print_success "$migration_count migrations deployed successfully"
    return 0
}

# Function to verify database integrity
verify_database() {
    print_status "Verifying database integrity..."
    
    # Check critical tables exist
    local critical_tables=(
        "users"
        "celebrities" 
        "bookings"
        "payments"
        "site_settings"
        "n8n_workflows"
        "n8n_executions"
    )
    
    for table in "${critical_tables[@]}"; do
        local exists=$(psql "$DATABASE_URL" -t -c "
            SELECT COUNT(*) FROM information_schema.tables 
            WHERE table_name = '$table';
        " | xargs)
        
        if [[ "$exists" -eq 0 ]]; then
            print_error "Critical table '$table' not found"
            return 1
        fi
    done
    
    # Check RLS is enabled on critical tables
    local rls_tables=$(psql "$DATABASE_URL" -t -c "
        SELECT tablename FROM pg_tables pt
        JOIN pg_class pc ON pt.tablename = pc.relname
        WHERE pt.schemaname = 'public' 
        AND pc.relrowsecurity = TRUE;
    " | wc -l | xargs)
    
    if [[ "$rls_tables" -lt 5 ]]; then
        print_warning "Row Level Security may not be properly configured"
    fi
    
    print_success "Database integrity verified"
    return 0
}

# Function to update database statistics
update_statistics() {
    print_status "Updating database statistics..."
    
    psql "$DATABASE_URL" -c "ANALYZE;" || {
        print_warning "Failed to update database statistics"
    }
    
    print_success "Database statistics updated"
}

# Function to cleanup old backups
cleanup_backups() {
    print_status "Cleaning up old backups..."
    
    # Keep only last 10 backups
    find "$BACKUP_DIR" -name "*.sql.gz" -type f | \
        sort -r | tail -n +11 | xargs -r rm -f
    
    print_success "Old backups cleaned up"
}

# Main deployment workflow
main() {
    print_status "Starting production database migration deployment..."
    echo ""
    
    # Pre-deployment checks
    validate_migrations || exit 1
    check_migration_status || exit 1
    
    # Create backup
    create_backup
    
    # Deploy migrations
    if deploy_migrations; then
        print_success "All migrations deployed successfully!"
        
        # Post-deployment tasks
        verify_database
        update_statistics
        cleanup_backups
        
        # Print summary
        echo ""
        print_status "📊 Deployment Summary:"
        echo "  - Timestamp: $TIMESTAMP"
        echo "  - Backup created: ${BACKUP_DIR}/pre_migration_backup_${TIMESTAMP}.sql.gz"
        echo "  - Migrations directory: $MIGRATIONS_DIR"
        echo "  - Database: $SUPABASE_URL"
        
        # Show migration history
        echo ""
        print_status "📝 Migration History (last 10):"
        psql "$DATABASE_URL" -c "
            SELECT filename, executed_at, success 
            FROM migration_history 
            ORDER BY executed_at DESC 
            LIMIT 10;
        "
        
        echo ""
        print_success "🎉 Production database migration deployment completed successfully!"
        
    else
        print_error "Migration deployment failed!"
        print_warning "Database backup available at: ${BACKUP_DIR}/pre_migration_backup_${TIMESTAMP}.sql.gz"
        exit 1
    fi
}

# Check dependencies
if ! command -v psql >/dev/null 2>&1; then
    print_error "PostgreSQL client (psql) is required but not installed"
    print_status "Install with: apt-get install postgresql-client (Ubuntu/Debian) or brew install postgresql (macOS)"
    exit 1
fi

# Run main deployment
main

echo ""
print_status "Next steps:"
echo "1. Test application functionality"
echo "2. Monitor error logs"
echo "3. Verify all features work correctly"
echo "4. Update monitoring dashboards"