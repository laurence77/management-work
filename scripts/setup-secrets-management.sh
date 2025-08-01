#!/bin/bash

# Secrets Management Setup - AWS Secrets Manager & HashiCorp Vault
# This script sets up either AWS Secrets Manager or HashiCorp Vault for production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

print_status "🔐 Celebrity Booking Platform - Secrets Management Setup"
echo ""

# Check if running as root (needed for system-wide installation)
if [[ $EUID -eq 0 ]]; then
   print_warning "Running as root - this is necessary for system-wide installation"
fi

# Menu for selecting secrets management solution
echo "Select your secrets management solution:"
echo "1. AWS Secrets Manager (recommended for AWS deployments)"
echo "2. HashiCorp Vault (recommended for on-premises/multi-cloud)"
echo "3. Both (setup both solutions)"
echo ""
read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        SETUP_AWS=true
        SETUP_VAULT=false
        ;;
    2)
        SETUP_AWS=false
        SETUP_VAULT=true
        ;;
    3)
        SETUP_AWS=true
        SETUP_VAULT=true
        ;;
    *)
        print_error "Invalid choice"
        exit 1
        ;;
esac

# =============================================================================
# AWS SECRETS MANAGER SETUP
# =============================================================================

setup_aws_secrets_manager() {
    print_status "Setting up AWS Secrets Manager integration..."
    
    # Check if AWS CLI is installed
    if ! command -v aws >/dev/null 2>&1; then
        print_status "Installing AWS CLI..."
        
        # Install AWS CLI v2
        if [[ "$OSTYPE" == "linux-gnu"* ]]; then
            curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
            unzip awscliv2.zip
            sudo ./aws/install
            rm -rf awscliv2.zip aws/
        elif [[ "$OSTYPE" == "darwin"* ]]; then
            curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
            sudo installer -pkg AWSCLIV2.pkg -target /
            rm AWSCLIV2.pkg
        fi
    fi
    
    # Configure AWS credentials if not already configured
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        print_warning "AWS credentials not configured"
        echo "Please configure AWS credentials:"
        aws configure
    fi
    
    # Verify AWS access
    AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo "")
    if [[ -z "$AWS_ACCOUNT" ]]; then
        print_error "Failed to verify AWS credentials"
        return 1
    fi
    
    print_success "AWS CLI configured for account: $AWS_ACCOUNT"
    
    # Create secrets in AWS Secrets Manager
    print_status "Creating secrets in AWS Secrets Manager..."
    
    REGION="${AWS_REGION:-us-east-1}"
    
    # Database secrets
    aws secretsmanager create-secret \
        --name "celebrity-booking/production/database" \
        --description "Production database credentials" \
        --secret-string '{
            "SUPABASE_URL": "https://your-production-project.supabase.co",
            "SUPABASE_SERVICE_ROLE_KEY": "your-production-service-role-key",
            "DATABASE_URL": "postgresql://postgres:password@db.your-project.supabase.co:5432/postgres"
        }' \
        --region "$REGION" 2>/dev/null || print_warning "Database secret may already exist"
    
    # Email secrets
    aws secretsmanager create-secret \
        --name "celebrity-booking/production/email" \
        --description "Production email SMTP credentials" \
        --secret-string '{
            "SMTP_USERNAME": "management@your-domain.com",
            "SMTP_PASSWORD": "your-hostinger-password"
        }' \
        --region "$REGION" 2>/dev/null || print_warning "Email secret may already exist"
    
    # Payment secrets
    aws secretsmanager create-secret \
        --name "celebrity-booking/production/payments" \
        --description "Production payment processor credentials" \
        --secret-string '{
            "STRIPE_SECRET_KEY": "sk_live_your_production_secret_key",
            "STRIPE_WEBHOOK_SECRET": "whsec_your_production_webhook_secret"
        }' \
        --region "$REGION" 2>/dev/null || print_warning "Payment secret may already exist"
    
    # Application secrets
    aws secretsmanager create-secret \
        --name "celebrity-booking/production/application" \
        --description "Production application secrets" \
        --secret-string '{
            "JWT_SECRET": "your-generated-jwt-secret",
            "SESSION_SECRET": "your-generated-session-secret",
            "SENTRY_DSN": "https://your-sentry-dsn@sentry.io/project-id"
        }' \
        --region "$REGION" 2>/dev/null || print_warning "Application secret may already exist"
    
    print_success "AWS Secrets Manager configured"
    
    # Create AWS secrets retrieval script
    cat > /usr/local/bin/aws-get-secrets.sh <<'EOF'
#!/bin/bash

# AWS Secrets Manager Retrieval Script
REGION="${AWS_REGION:-us-east-1}"

get_secret() {
    local secret_name="$1"
    aws secretsmanager get-secret-value \
        --secret-id "$secret_name" \
        --region "$REGION" \
        --query SecretString \
        --output text 2>/dev/null
}

# Export secrets as environment variables
export_secrets() {
    # Database secrets
    DB_SECRETS=$(get_secret "celebrity-booking/production/database")
    if [[ -n "$DB_SECRETS" ]]; then
        export SUPABASE_URL=$(echo "$DB_SECRETS" | jq -r '.SUPABASE_URL')
        export SUPABASE_SERVICE_ROLE_KEY=$(echo "$DB_SECRETS" | jq -r '.SUPABASE_SERVICE_ROLE_KEY')
        export DATABASE_URL=$(echo "$DB_SECRETS" | jq -r '.DATABASE_URL')
    fi
    
    # Email secrets
    EMAIL_SECRETS=$(get_secret "celebrity-booking/production/email")
    if [[ -n "$EMAIL_SECRETS" ]]; then
        export SMTP_USERNAME=$(echo "$EMAIL_SECRETS" | jq -r '.SMTP_USERNAME')
        export SMTP_PASSWORD=$(echo "$EMAIL_SECRETS" | jq -r '.SMTP_PASSWORD')
    fi
    
    # Payment secrets
    PAYMENT_SECRETS=$(get_secret "celebrity-booking/production/payments")
    if [[ -n "$PAYMENT_SECRETS" ]]; then
        export STRIPE_SECRET_KEY=$(echo "$PAYMENT_SECRETS" | jq -r '.STRIPE_SECRET_KEY')
        export STRIPE_WEBHOOK_SECRET=$(echo "$PAYMENT_SECRETS" | jq -r '.STRIPE_WEBHOOK_SECRET')
    fi
    
    # Application secrets
    APP_SECRETS=$(get_secret "celebrity-booking/production/application")
    if [[ -n "$APP_SECRETS" ]]; then
        export JWT_SECRET=$(echo "$APP_SECRETS" | jq -r '.JWT_SECRET')
        export SESSION_SECRET=$(echo "$APP_SECRETS" | jq -r '.SESSION_SECRET')
        export SENTRY_DSN=$(echo "$APP_SECRETS" | jq -r '.SENTRY_DSN')
    fi
}

# Main execution
case "${1:-export}" in
    "export")
        export_secrets
        ;;
    "list")
        echo "Available secrets:"
        aws secretsmanager list-secrets --region "$REGION" --query 'SecretList[?starts_with(Name, `celebrity-booking/`)].Name' --output table
        ;;
    "get")
        if [[ -z "$2" ]]; then
            echo "Usage: $0 get <secret-name>"
            exit 1
        fi
        get_secret "$2" | jq .
        ;;
    *)
        echo "Usage: $0 [export|list|get <secret-name>]"
        exit 1
        ;;
esac
EOF
    
    chmod +x /usr/local/bin/aws-get-secrets.sh
    
    # Create systemd service for secret loading
    cat > /etc/systemd/system/celebrity-booking-secrets.service <<EOF
[Unit]
Description=Celebrity Booking Secrets Loader
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/aws-get-secrets.sh export
Environment=AWS_REGION=$REGION
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF
    
    systemctl daemon-reload
    systemctl enable celebrity-booking-secrets.service
    
    print_success "AWS Secrets Manager integration completed"
}

# =============================================================================
# HASHICORP VAULT SETUP
# =============================================================================

setup_hashicorp_vault() {
    print_status "Setting up HashiCorp Vault..."
    
    # Install Vault
    if ! command -v vault >/dev/null 2>&1; then
        print_status "Installing HashiCorp Vault..."
        
        # Add HashiCorp GPG key and repository
        curl -fsSL https://apt.releases.hashicorp.com/gpg | sudo apt-key add -
        sudo apt-add-repository "deb [arch=amd64] https://apt.releases.hashicorp.com $(lsb_release -cs) main"
        sudo apt-get update && sudo apt-get install vault
    fi
    
    # Create vault user and directories
    sudo useradd --system --home /etc/vault.d --shell /bin/false vault || true
    sudo mkdir -p /opt/vault/data
    sudo mkdir -p /etc/vault.d
    sudo chown -R vault:vault /opt/vault
    sudo chown -R vault:vault /etc/vault.d
    
    # Create Vault configuration
    cat > /etc/vault.d/vault.hcl <<EOF
# HashiCorp Vault Configuration for Celebrity Booking Platform

# Storage backend
storage "file" {
  path = "/opt/vault/data"
}

# Network listener
listener "tcp" {
  address     = "127.0.0.1:8200"
  tls_disable = 1
}

# API address
api_addr = "http://127.0.0.1:8200"

# Cluster address
cluster_addr = "https://127.0.0.1:8201"

# UI
ui = true

# Disable mlock for development (enable in production)
disable_mlock = true

# Log level
log_level = "INFO"

# PID file
pid_file = "/var/run/vault/vault.pid"
EOF
    
    sudo chown vault:vault /etc/vault.d/vault.hcl
    sudo chmod 640 /etc/vault.d/vault.hcl
    
    # Create systemd service
    cat > /etc/systemd/system/vault.service <<EOF
[Unit]
Description=HashiCorp Vault
Documentation=https://www.vaultproject.io/docs/
Requires=network-online.target
After=network-online.target
ConditionFileNotEmpty=/etc/vault.d/vault.hcl

[Service]
Type=notify
User=vault
Group=vault
ProtectSystem=full
ProtectHome=read-only
PrivateTmp=yes
PrivateDevices=yes
SecureBits=keep-caps
AmbientCapabilities=CAP_IPC_LOCK
NoNewPrivileges=yes
ExecStart=/usr/bin/vault server -config=/etc/vault.d/vault.hcl
ExecReload=/bin/kill -HUP \$MAINPID
KillMode=process
Restart=on-failure
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF
    
    # Create PID directory
    sudo mkdir -p /var/run/vault
    sudo chown vault:vault /var/run/vault
    
    # Start and enable Vault
    systemctl daemon-reload
    systemctl enable vault
    systemctl start vault
    
    # Wait for Vault to start
    sleep 3
    
    # Set Vault address
    export VAULT_ADDR='http://127.0.0.1:8200'
    echo 'export VAULT_ADDR="http://127.0.0.1:8200"' >> /etc/environment
    
    # Initialize Vault if not already initialized
    if ! vault status >/dev/null 2>&1; then
        print_status "Initializing Vault..."
        
        VAULT_INIT=$(vault operator init -key-shares=5 -key-threshold=3 -format=json)
        
        # Save unseal keys and root token securely
        echo "$VAULT_INIT" > /etc/vault.d/vault-init.json
        sudo chown vault:vault /etc/vault.d/vault-init.json
        sudo chmod 600 /etc/vault.d/vault-init.json
        
        # Extract unseal keys and root token
        UNSEAL_KEY_1=$(echo "$VAULT_INIT" | jq -r '.unseal_keys_b64[0]')
        UNSEAL_KEY_2=$(echo "$VAULT_INIT" | jq -r '.unseal_keys_b64[1]')
        UNSEAL_KEY_3=$(echo "$VAULT_INIT" | jq -r '.unseal_keys_b64[2]')
        ROOT_TOKEN=$(echo "$VAULT_INIT" | jq -r '.root_token')
        
        # Unseal Vault
        vault operator unseal "$UNSEAL_KEY_1"
        vault operator unseal "$UNSEAL_KEY_2"
        vault operator unseal "$UNSEAL_KEY_3"
        
        # Authenticate with root token
        vault auth "$ROOT_TOKEN"
        
        print_success "Vault initialized and unsealed"
        print_warning "IMPORTANT: Save the unseal keys and root token from /etc/vault.d/vault-init.json"
    else
        print_success "Vault is already initialized"
    fi
    
    # Enable KV secrets engine
    vault secrets enable -path=celebrity-booking kv-v2 2>/dev/null || print_warning "KV engine may already be enabled"
    
    # Create secrets in Vault
    print_status "Creating secrets in Vault..."
    
    # Database secrets
    vault kv put celebrity-booking/database \
        SUPABASE_URL="https://your-production-project.supabase.co" \
        SUPABASE_SERVICE_ROLE_KEY="your-production-service-role-key" \
        DATABASE_URL="postgresql://postgres:password@db.your-project.supabase.co:5432/postgres"
    
    # Email secrets
    vault kv put celebrity-booking/email \
        SMTP_USERNAME="management@your-domain.com" \
        SMTP_PASSWORD="your-hostinger-password"
    
    # Payment secrets
    vault kv put celebrity-booking/payments \
        STRIPE_SECRET_KEY="sk_live_your_production_secret_key" \
        STRIPE_WEBHOOK_SECRET="whsec_your_production_webhook_secret"
    
    # Application secrets
    vault kv put celebrity-booking/application \
        JWT_SECRET="your-generated-jwt-secret" \
        SESSION_SECRET="your-generated-session-secret" \
        SENTRY_DSN="https://your-sentry-dsn@sentry.io/project-id"
    
    print_success "Secrets stored in Vault"
    
    # Create Vault secrets retrieval script
    cat > /usr/local/bin/vault-get-secrets.sh <<'EOF'
#!/bin/bash

# HashiCorp Vault Secrets Retrieval Script
export VAULT_ADDR="${VAULT_ADDR:-http://127.0.0.1:8200}"

get_secret() {
    local path="$1"
    local key="$2"
    vault kv get -field="$key" "celebrity-booking/$path" 2>/dev/null
}

# Export secrets as environment variables
export_secrets() {
    # Check if Vault is available
    if ! vault status >/dev/null 2>&1; then
        echo "ERROR: Vault is not available or unsealed"
        return 1
    fi
    
    # Database secrets
    export SUPABASE_URL=$(get_secret "database" "SUPABASE_URL")
    export SUPABASE_SERVICE_ROLE_KEY=$(get_secret "database" "SUPABASE_SERVICE_ROLE_KEY")
    export DATABASE_URL=$(get_secret "database" "DATABASE_URL")
    
    # Email secrets
    export SMTP_USERNAME=$(get_secret "email" "SMTP_USERNAME")
    export SMTP_PASSWORD=$(get_secret "email" "SMTP_PASSWORD")
    
    # Payment secrets
    export STRIPE_SECRET_KEY=$(get_secret "payments" "STRIPE_SECRET_KEY")
    export STRIPE_WEBHOOK_SECRET=$(get_secret "payments" "STRIPE_WEBHOOK_SECRET")
    
    # Application secrets
    export JWT_SECRET=$(get_secret "application" "JWT_SECRET")
    export SESSION_SECRET=$(get_secret "application" "SESSION_SECRET")
    export SENTRY_DSN=$(get_secret "application" "SENTRY_DSN")
}

# Main execution
case "${1:-export}" in
    "export")
        export_secrets
        ;;
    "list")
        echo "Available secrets:"
        vault kv list celebrity-booking/
        ;;
    "get")
        if [[ -z "$2" ]] || [[ -z "$3" ]]; then
            echo "Usage: $0 get <path> <key>"
            exit 1
        fi
        get_secret "$2" "$3"
        ;;
    "status")
        vault status
        ;;
    *)
        echo "Usage: $0 [export|list|get <path> <key>|status]"
        exit 1
        ;;
esac
EOF
    
    chmod +x /usr/local/bin/vault-get-secrets.sh
    
    print_success "HashiCorp Vault setup completed"
}

# =============================================================================
# APPLICATION INTEGRATION
# =============================================================================

create_secrets_integration() {
    print_status "Creating application secrets integration..."
    
    # Create Node.js secrets manager
    cat > /usr/local/lib/secrets-manager.js <<'EOF'
const { execSync } = require('child_process');

class SecretsManager {
    constructor(provider = 'auto') {
        this.provider = provider;
        this.cache = {};
        this.cacheExpiry = 300000; // 5 minutes
        
        if (provider === 'auto') {
            this.provider = this.detectProvider();
        }
    }
    
    detectProvider() {
        try {
            // Check for AWS credentials
            execSync('aws sts get-caller-identity', { stdio: 'ignore' });
            return 'aws';
        } catch (e) {
            // Check for Vault
            try {
                execSync('vault status', { stdio: 'ignore' });
                return 'vault';
            } catch (e) {
                return 'env'; // Fallback to environment variables
            }
        }
    }
    
    async getSecret(path, key = null) {
        const cacheKey = `${path}:${key}`;
        
        // Check cache
        if (this.cache[cacheKey] && Date.now() - this.cache[cacheKey].timestamp < this.cacheExpiry) {
            return this.cache[cacheKey].value;
        }
        
        let value;
        
        switch (this.provider) {
            case 'aws':
                value = await this.getAWSSecret(path, key);
                break;
            case 'vault':
                value = await this.getVaultSecret(path, key);
                break;
            default:
                value = process.env[key || path];
        }
        
        // Cache the value
        this.cache[cacheKey] = {
            value,
            timestamp: Date.now()
        };
        
        return value;
    }
    
    async getAWSSecret(secretName, key = null) {
        try {
            const command = `aws secretsmanager get-secret-value --secret-id "${secretName}" --query SecretString --output text`;
            const secretString = execSync(command, { encoding: 'utf8' }).trim();
            const secrets = JSON.parse(secretString);
            return key ? secrets[key] : secrets;
        } catch (error) {
            console.error(`Failed to get AWS secret ${secretName}:`, error.message);
            return null;
        }
    }
    
    async getVaultSecret(path, key) {
        try {
            const command = `vault kv get -field="${key}" "celebrity-booking/${path}"`;
            return execSync(command, { encoding: 'utf8' }).trim();
        } catch (error) {
            console.error(`Failed to get Vault secret ${path}/${key}:`, error.message);
            return null;
        }
    }
    
    async loadAllSecrets() {
        const secrets = {};
        
        try {
            // Database secrets
            secrets.SUPABASE_URL = await this.getSecret('celebrity-booking/production/database', 'SUPABASE_URL');
            secrets.SUPABASE_SERVICE_ROLE_KEY = await this.getSecret('celebrity-booking/production/database', 'SUPABASE_SERVICE_ROLE_KEY');
            secrets.DATABASE_URL = await this.getSecret('celebrity-booking/production/database', 'DATABASE_URL');
            
            // Email secrets
            secrets.SMTP_USERNAME = await this.getSecret('celebrity-booking/production/email', 'SMTP_USERNAME');
            secrets.SMTP_PASSWORD = await this.getSecret('celebrity-booking/production/email', 'SMTP_PASSWORD');
            
            // Payment secrets
            secrets.STRIPE_SECRET_KEY = await this.getSecret('celebrity-booking/production/payments', 'STRIPE_SECRET_KEY');
            secrets.STRIPE_WEBHOOK_SECRET = await this.getSecret('celebrity-booking/production/payments', 'STRIPE_WEBHOOK_SECRET');
            
            // Application secrets
            secrets.JWT_SECRET = await this.getSecret('celebrity-booking/production/application', 'JWT_SECRET');
            secrets.SESSION_SECRET = await this.getSecret('celebrity-booking/production/application', 'SESSION_SECRET');
            secrets.SENTRY_DSN = await this.getSecret('celebrity-booking/production/application', 'SENTRY_DSN');
            
            // Set environment variables
            Object.keys(secrets).forEach(key => {
                if (secrets[key]) {
                    process.env[key] = secrets[key];
                }
            });
            
            console.log(`✅ Loaded secrets using ${this.provider} provider`);
            return secrets;
        } catch (error) {
            console.error('Failed to load secrets:', error);
            throw error;
        }
    }
    
    clearCache() {
        this.cache = {};
    }
}

module.exports = SecretsManager;
EOF
    
    # Create secrets loading script for application startup
    cat > /usr/local/bin/load-app-secrets.sh <<'EOF'
#!/bin/bash

# Application Secrets Loader
SECRETS_PROVIDER="${SECRETS_PROVIDER:-auto}"

load_secrets() {
    case "$SECRETS_PROVIDER" in
        "aws")
            source /usr/local/bin/aws-get-secrets.sh
            ;;
        "vault")
            source /usr/local/bin/vault-get-secrets.sh
            ;;
        "auto")
            if command -v aws >/dev/null 2>&1 && aws sts get-caller-identity >/dev/null 2>&1; then
                source /usr/local/bin/aws-get-secrets.sh
            elif command -v vault >/dev/null 2>&1 && vault status >/dev/null 2>&1; then
                source /usr/local/bin/vault-get-secrets.sh
            else
                echo "WARNING: No secrets manager available, using environment variables"
            fi
            ;;
        *)
            echo "WARNING: Unknown secrets provider: $SECRETS_PROVIDER"
            ;;
    esac
}

# Load secrets
load_secrets

# Export provider info
export SECRETS_PROVIDER_USED="$SECRETS_PROVIDER"
export SECRETS_LOADED_AT="$(date -Iseconds)"

echo "✅ Secrets loaded using $SECRETS_PROVIDER provider at $(date)"
EOF
    
    chmod +x /usr/local/bin/load-app-secrets.sh
    
    print_success "Application secrets integration created"
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

# Install common dependencies
print_status "Installing common dependencies..."
if command -v apt-get >/dev/null 2>&1; then
    apt-get update
    apt-get install -y jq curl unzip software-properties-common
elif command -v yum >/dev/null 2>&1; then
    yum install -y jq curl unzip
elif command -v brew >/dev/null 2>&1; then
    brew install jq curl
fi

# Setup selected providers
if [[ "$SETUP_AWS" == "true" ]]; then
    setup_aws_secrets_manager
fi

if [[ "$SETUP_VAULT" == "true" ]]; then
    setup_hashicorp_vault
fi

# Create application integration
create_secrets_integration

# Create monitoring script
cat > /usr/local/bin/secrets-health-check.sh <<'EOF'
#!/bin/bash

# Secrets Management Health Check
check_aws() {
    if command -v aws >/dev/null 2>&1; then
        if aws sts get-caller-identity >/dev/null 2>&1; then
            echo "✅ AWS Secrets Manager: Available"
            aws secretsmanager list-secrets --query 'SecretList[?starts_with(Name, `celebrity-booking/`)].Name' --output table 2>/dev/null
        else
            echo "❌ AWS Secrets Manager: Not authenticated"
        fi
    else
        echo "⚠️  AWS CLI not installed"
    fi
}

check_vault() {
    if command -v vault >/dev/null 2>&1; then
        if vault status >/dev/null 2>&1; then
            echo "✅ HashiCorp Vault: Available"
            vault kv list celebrity-booking/ 2>/dev/null || echo "No secrets found"
        else
            echo "❌ HashiCorp Vault: Not available or unsealed"
        fi
    else
        echo "⚠️  HashiCorp Vault not installed"
    fi
}

echo "🔐 Secrets Management Health Check"
echo "================================="
echo ""

check_aws
echo ""
check_vault
echo ""

echo "📋 Environment Variables:"
env | grep -E "VAULT_|AWS_|SECRETS_" | head -10
EOF

chmod +x /usr/local/bin/secrets-health-check.sh

# Final summary
echo ""
print_status "📋 Secrets Management Setup Summary:"

if [[ "$SETUP_AWS" == "true" ]]; then
    echo "  ✅ AWS Secrets Manager configured"
    echo "     - Secrets stored in: celebrity-booking/production/*"
    echo "     - Retrieval script: /usr/local/bin/aws-get-secrets.sh"
fi

if [[ "$SETUP_VAULT" == "true" ]]; then
    echo "  ✅ HashiCorp Vault configured"
    echo "     - Vault server: http://127.0.0.1:8200"
    echo "     - Secrets path: celebrity-booking/*"
    echo "     - Retrieval script: /usr/local/bin/vault-get-secrets.sh"
    echo "     - ⚠️  IMPORTANT: Save unseal keys from /etc/vault.d/vault-init.json"
fi

echo "  ✅ Application integration created"
echo "     - Node.js module: /usr/local/lib/secrets-manager.js"
echo "     - Loader script: /usr/local/bin/load-app-secrets.sh"

echo ""
print_status "🔧 Usage Commands:"
echo "  - Health check: /usr/local/bin/secrets-health-check.sh"
echo "  - Load secrets: source /usr/local/bin/load-app-secrets.sh"

if [[ "$SETUP_AWS" == "true" ]]; then
    echo "  - AWS list secrets: /usr/local/bin/aws-get-secrets.sh list"
    echo "  - AWS get secret: /usr/local/bin/aws-get-secrets.sh get celebrity-booking/production/database"
fi

if [[ "$SETUP_VAULT" == "true" ]]; then
    echo "  - Vault status: /usr/local/bin/vault-get-secrets.sh status"
    echo "  - Vault list: /usr/local/bin/vault-get-secrets.sh list"
    echo "  - Vault get: /usr/local/bin/vault-get-secrets.sh get database SUPABASE_URL"
fi

echo ""
print_status "🚨 Security Reminders:"
echo "1. Update all placeholder values with real production secrets"
echo "2. Regularly rotate secrets (every 90 days)"
echo "3. Monitor access to secrets management systems"
echo "4. Keep unseal keys and root tokens in separate secure locations"
echo "5. Implement proper IAM policies for secret access"

echo ""
if /usr/local/bin/secrets-health-check.sh | grep -q "❌"; then
    print_warning "⚠️  Secrets management setup completed with some issues"
else
    print_success "🎉 Secrets management setup completed successfully!"
fi

print_status "Next steps:"
echo "1. Update secret values with real production credentials"
echo "2. Test secret retrieval from your application"
echo "3. Configure proper access policies"
echo "4. Set up secret rotation schedules"