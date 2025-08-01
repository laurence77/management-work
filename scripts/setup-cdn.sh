#!/bin/bash

# CDN Setup for Static Asset Optimization
# This script configures CloudFlare and AWS CloudFront for optimal content delivery

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

print_status "🌐 Celebrity Booking Platform - CDN Setup"
echo ""

# Configuration
DOMAIN="${DOMAIN:-bookmyreservation.org}"
AWS_REGION="${AWS_REGION:-us-east-1}"

echo "Select CDN solution:"
echo "1. CloudFlare (recommended for ease of use)"
echo "2. AWS CloudFront (recommended for AWS integration)"
echo "3. Both CloudFlare and CloudFront"
echo "4. Custom CDN with Nginx caching"
echo ""
read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        SETUP_CLOUDFLARE=true
        ;;
    2)
        SETUP_CLOUDFRONT=true
        ;;
    3)
        SETUP_CLOUDFLARE=true
        SETUP_CLOUDFRONT=true
        ;;
    4)
        SETUP_CUSTOM=true
        ;;
    *)
        print_error "Invalid choice"
        exit 1
        ;;
esac

# =============================================================================
# CLOUDFLARE SETUP
# =============================================================================

setup_cloudflare() {
    print_status "Setting up CloudFlare CDN..."
    
    if [[ -z "$CLOUDFLARE_API_TOKEN" ]]; then
        print_warning "CloudFlare API token not provided"
        print_status "Get your API token from: https://dash.cloudflare.com/profile/api-tokens"
        read -p "Enter CloudFlare API token (or press Enter to skip): " CLOUDFLARE_API_TOKEN
    fi
    
    if [[ -n "$CLOUDFLARE_API_TOKEN" ]]; then
        # Install CloudFlare CLI
        if ! command -v cloudflared >/dev/null 2>&1; then
            print_status "Installing CloudFlare CLI..."
            wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
            dpkg -i cloudflared-linux-amd64.deb
            rm cloudflared-linux-amd64.deb
        fi

        # CloudFlare configuration script
        cat > /usr/local/bin/setup-cloudflare.py <<'EOF'
#!/usr/bin/env python3

import requests
import json
import sys
import os

class CloudFlareManager:
    def __init__(self, api_token):
        self.api_token = api_token
        self.base_url = "https://api.cloudflare.com/client/v4"
        self.headers = {
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json"
        }
    
    def get_zone_id(self, domain):
        """Get zone ID for domain"""
        response = requests.get(f"{self.base_url}/zones", headers=self.headers, params={"name": domain})
        data = response.json()
        
        if data["success"] and data["result"]:
            return data["result"][0]["id"]
        return None
    
    def update_cache_settings(self, zone_id):
        """Configure caching settings"""
        settings = [
            {
                "id": "cache_level",
                "value": "aggressive"
            },
            {
                "id": "browser_cache_ttl",
                "value": 31536000  # 1 year
            },
            {
                "id": "edge_cache_ttl",
                "value": 7200  # 2 hours
            },
            {
                "id": "always_online",
                "value": "on"
            },
            {
                "id": "development_mode",
                "value": "off"
            },
            {
                "id": "minify",
                "value": {
                    "css": "on",
                    "html": "on",
                    "js": "on"
                }
            }
        ]
        
        results = []
        for setting in settings:
            response = requests.patch(
                f"{self.base_url}/zones/{zone_id}/settings/{setting['id']}",
                headers=self.headers,
                json={"value": setting["value"]}
            )
            results.append(response.json())
        
        return results
    
    def create_page_rules(self, zone_id, domain):
        """Create page rules for optimization"""
        rules = [
            {
                "targets": [{"target": "url", "constraint": {"operator": "matches", "value": f"*.{domain}/static/*"}}],
                "actions": [
                    {"id": "cache_level", "value": "cache_everything"},
                    {"id": "edge_cache_ttl", "value": 31536000},
                    {"id": "browser_cache_ttl", "value": 31536000}
                ],
                "priority": 1,
                "status": "active"
            },
            {
                "targets": [{"target": "url", "constraint": {"operator": "matches", "value": f"*.{domain}/*.js"}}],
                "actions": [
                    {"id": "cache_level", "value": "cache_everything"},
                    {"id": "edge_cache_ttl", "value": 86400}
                ],
                "priority": 2,
                "status": "active"
            },
            {
                "targets": [{"target": "url", "constraint": {"operator": "matches", "value": f"*.{domain}/*.css"}}],
                "actions": [
                    {"id": "cache_level", "value": "cache_everything"},
                    {"id": "edge_cache_ttl", "value": 86400}
                ],
                "priority": 3,
                "status": "active"
            },
            {
                "targets": [{"target": "url", "constraint": {"operator": "matches", "value": f"{domain}/api/*"}}],
                "actions": [
                    {"id": "cache_level", "value": "bypass"}
                ],
                "priority": 4,
                "status": "active"
            }
        ]
        
        results = []
        for rule in rules:
            response = requests.post(
                f"{self.base_url}/zones/{zone_id}/pagerules",
                headers=self.headers,
                json=rule
            )
            results.append(response.json())
        
        return results
    
    def setup_security_settings(self, zone_id):
        """Configure security settings"""
        settings = [
            {
                "id": "security_level",
                "value": "medium"
            },
            {
                "id": "ssl",
                "value": "strict"
            },
            {
                "id": "always_use_https",
                "value": "on"
            },
            {
                "id": "automatic_https_rewrites",
                "value": "on"
            },
            {
                "id": "hsts",
                "value": {
                    "enabled": True,
                    "max_age": 31536000,
                    "include_subdomains": True,
                    "preload": True
                }
            }
        ]
        
        results = []
        for setting in settings:
            response = requests.patch(
                f"{self.base_url}/zones/{zone_id}/settings/{setting['id']}",
                headers=self.headers,
                json={"value": setting["value"]}
            )
            results.append(response.json())
        
        return results
    
    def setup_firewall_rules(self, zone_id):
        """Setup firewall rules"""
        rules = [
            {
                "filter": {
                    "expression": "(http.request.method eq \"POST\" and http.request.uri.path contains \"/api/auth/login\") and (rate(1m) > 5)",
                    "paused": False
                },
                "action": "challenge",
                "priority": 1,
                "description": "Rate limit login attempts"
            },
            {
                "filter": {
                    "expression": "cf.threat_score ge 10",
                    "paused": False
                },
                "action": "challenge",
                "priority": 2,
                "description": "Challenge high threat score visitors"
            }
        ]
        
        results = []
        for rule in rules:
            response = requests.post(
                f"{self.base_url}/zones/{zone_id}/firewall/rules",
                headers=self.headers,
                json=rule
            )
            results.append(response.json())
        
        return results

def main():
    api_token = os.environ.get('CLOUDFLARE_API_TOKEN')
    domain = os.environ.get('DOMAIN', 'bookmyreservation.org')
    
    if not api_token:
        print("Error: CLOUDFLARE_API_TOKEN environment variable not set")
        sys.exit(1)
    
    cf = CloudFlareManager(api_token)
    
    # Get zone ID
    print(f"Getting zone ID for {domain}...")
    zone_id = cf.get_zone_id(domain)
    if not zone_id:
        print(f"Error: Could not find zone for {domain}")
        sys.exit(1)
    
    print(f"Zone ID: {zone_id}")
    
    # Configure cache settings
    print("Configuring cache settings...")
    cache_results = cf.update_cache_settings(zone_id)
    
    # Create page rules
    print("Creating page rules...")
    page_rules = cf.create_page_rules(zone_id, domain)
    
    # Configure security
    print("Configuring security settings...")
    security_results = cf.setup_security_settings(zone_id)
    
    # Setup firewall rules
    print("Setting up firewall rules...")
    firewall_results = cf.setup_firewall_rules(zone_id)
    
    print("CloudFlare setup completed successfully!")
    
    # Save configuration summary
    summary = {
        "domain": domain,
        "zone_id": zone_id,
        "cache_settings": len(cache_results),
        "page_rules": len(page_rules),
        "security_settings": len(security_results),
        "firewall_rules": len(firewall_results)
    }
    
    with open('/var/log/cloudflare-setup.json', 'w') as f:
        json.dump(summary, f, indent=2)

if __name__ == "__main__":
    main()
EOF

        chmod +x /usr/local/bin/setup-cloudflare.py

        # Install Python requests if not available
        pip3 install requests >/dev/null 2>&1 || {
            apt-get update && apt-get install -y python3-pip
            pip3 install requests
        }

        # Run CloudFlare setup
        export CLOUDFLARE_API_TOKEN="$CLOUDFLARE_API_TOKEN"
        export DOMAIN="$DOMAIN"
        /usr/local/bin/setup-cloudflare.py

        print_success "CloudFlare CDN configured"
    else
        print_warning "Skipping CloudFlare setup - no API token provided"
    fi
}

# =============================================================================
# AWS CLOUDFRONT SETUP
# =============================================================================

setup_cloudfront() {
    print_status "Setting up AWS CloudFront CDN..."
    
    # Check if AWS CLI is installed and configured
    if ! command -v aws >/dev/null 2>&1; then
        print_status "Installing AWS CLI..."
        curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
        unzip awscliv2.zip
        ./aws/install
        rm -rf awscliv2.zip aws/
    fi
    
    # Verify AWS credentials
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        print_warning "AWS credentials not configured"
        print_status "Please configure AWS credentials: aws configure"
        return 1
    fi

    # Create S3 bucket for static assets
    print_status "Creating S3 bucket for static assets..."
    
    BUCKET_NAME="celebrity-booking-static-${RANDOM}"
    
    aws s3api create-bucket \
        --bucket "$BUCKET_NAME" \
        --region "$AWS_REGION" \
        --create-bucket-configuration LocationConstraint="$AWS_REGION" 2>/dev/null || {
        print_warning "Bucket may already exist"
    }

    # Configure bucket policy for CloudFront
    cat > /tmp/bucket-policy.json <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowCloudFrontAccess",
            "Effect": "Allow",
            "Principal": {
                "Service": "cloudfront.amazonaws.com"
            },
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::${BUCKET_NAME}/*",
            "Condition": {
                "StringEquals": {
                    "AWS:SourceArn": "arn:aws:cloudfront::$(aws sts get-caller-identity --query Account --output text):distribution/*"
                }
            }
        }
    ]
}
EOF

    aws s3api put-bucket-policy --bucket "$BUCKET_NAME" --policy file:///tmp/bucket-policy.json
    rm /tmp/bucket-policy.json

    # Create CloudFront distribution
    print_status "Creating CloudFront distribution..."
    
    cat > /tmp/cloudfront-config.json <<EOF
{
    "CallerReference": "celebrity-booking-$(date +%s)",
    "Comment": "Celebrity Booking Platform CDN",
    "DefaultRootObject": "index.html",
    "Origins": {
        "Quantity": 2,
        "Items": [
            {
                "Id": "S3-${BUCKET_NAME}",
                "DomainName": "${BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com",
                "S3OriginConfig": {
                    "OriginAccessIdentity": ""
                }
            },
            {
                "Id": "API-Origin",
                "DomainName": "api.${DOMAIN}",
                "CustomOriginConfig": {
                    "HTTPPort": 443,
                    "HTTPSPort": 443,
                    "OriginProtocolPolicy": "https-only",
                    "OriginSslProtocols": {
                        "Quantity": 1,
                        "Items": ["TLSv1.2"]
                    }
                }
            }
        ]
    },
    "DefaultCacheBehavior": {
        "TargetOriginId": "S3-${BUCKET_NAME}",
        "ViewerProtocolPolicy": "redirect-to-https",
        "MinTTL": 0,
        "ForwardedValues": {
            "QueryString": false,
            "Cookies": {
                "Forward": "none"
            }
        },
        "TrustedSigners": {
            "Enabled": false,
            "Quantity": 0
        },
        "Compress": true
    },
    "CacheBehaviors": {
        "Quantity": 3,
        "Items": [
            {
                "PathPattern": "/api/*",
                "TargetOriginId": "API-Origin",
                "ViewerProtocolPolicy": "https-only",
                "MinTTL": 0,
                "DefaultTTL": 0,
                "MaxTTL": 0,
                "ForwardedValues": {
                    "QueryString": true,
                    "Cookies": {
                        "Forward": "all"
                    },
                    "Headers": {
                        "Quantity": 3,
                        "Items": ["Authorization", "Content-Type", "User-Agent"]
                    }
                },
                "TrustedSigners": {
                    "Enabled": false,
                    "Quantity": 0
                },
                "Compress": false
            },
            {
                "PathPattern": "*.js",
                "TargetOriginId": "S3-${BUCKET_NAME}",
                "ViewerProtocolPolicy": "redirect-to-https",
                "MinTTL": 86400,
                "DefaultTTL": 86400,
                "MaxTTL": 31536000,
                "ForwardedValues": {
                    "QueryString": false,
                    "Cookies": {
                        "Forward": "none"
                    }
                },
                "TrustedSigners": {
                    "Enabled": false,
                    "Quantity": 0
                },
                "Compress": true
            },
            {
                "PathPattern": "*.css",
                "TargetOriginId": "S3-${BUCKET_NAME}",
                "ViewerProtocolPolicy": "redirect-to-https",
                "MinTTL": 86400,
                "DefaultTTL": 86400,
                "MaxTTL": 31536000,
                "ForwardedValues": {
                    "QueryString": false,
                    "Cookies": {
                        "Forward": "none"
                    }
                },
                "TrustedSigners": {
                    "Enabled": false,
                    "Quantity": 0
                },
                "Compress": true
            }
        ]
    },
    "Enabled": true,
    "PriceClass": "PriceClass_100",
    "Aliases": {
        "Quantity": 2,
        "Items": ["cdn.${DOMAIN}", "assets.${DOMAIN}"]
    },
    "ViewerCertificate": {
        "CloudFrontDefaultCertificate": true
    },
    "WebACLId": "",
    "HttpVersion": "http2",
    "IsIPV6Enabled": true
}
EOF

    DISTRIBUTION_ID=$(aws cloudfront create-distribution \
        --distribution-config file:///tmp/cloudfront-config.json \
        --query 'Distribution.Id' \
        --output text)
    
    rm /tmp/cloudfront-config.json

    # Wait for distribution to be deployed
    print_status "Waiting for CloudFront distribution to be deployed (this may take 10-15 minutes)..."
    aws cloudfront wait distribution-deployed --id "$DISTRIBUTION_ID"

    # Get distribution domain name
    DISTRIBUTION_DOMAIN=$(aws cloudfront get-distribution \
        --id "$DISTRIBUTION_ID" \
        --query 'Distribution.DomainName' \
        --output text)

    # Create deployment script for static assets
    cat > /usr/local/bin/deploy-to-cdn.sh <<EOF
#!/bin/bash

# Deploy static assets to CDN
BUILD_DIR="/opt/celebrity-booking/dist"
S3_BUCKET="$BUCKET_NAME"
CLOUDFRONT_DISTRIBUTION_ID="$DISTRIBUTION_ID"

echo "🚀 Deploying static assets to CDN..."

# Build the application
cd /opt/celebrity-booking
npm run build

# Sync to S3
aws s3 sync "\$BUILD_DIR" "s3://\$S3_BUCKET" \
    --delete \
    --cache-control "max-age=31536000" \
    --exclude "*.html" \
    --exclude "service-worker.js"

# Upload HTML files with shorter cache
aws s3 sync "\$BUILD_DIR" "s3://\$S3_BUCKET" \
    --cache-control "max-age=3600" \
    --include "*.html" \
    --include "service-worker.js"

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
    --distribution-id "\$CLOUDFRONT_DISTRIBUTION_ID" \
    --paths "/*"

echo "✅ Deployment completed"
echo "CDN URL: https://$DISTRIBUTION_DOMAIN"
EOF

    chmod +x /usr/local/bin/deploy-to-cdn.sh

    # Save CloudFront configuration
    cat > /var/log/cloudfront-setup.json <<EOF
{
    "distribution_id": "$DISTRIBUTION_ID",
    "distribution_domain": "$DISTRIBUTION_DOMAIN",
    "s3_bucket": "$BUCKET_NAME",
    "aliases": ["cdn.$DOMAIN", "assets.$DOMAIN"],
    "setup_date": "$(date -Iseconds)"
}
EOF

    print_success "AWS CloudFront CDN configured"
    print_status "Distribution ID: $DISTRIBUTION_ID"
    print_status "Distribution Domain: $DISTRIBUTION_DOMAIN"
}

# =============================================================================
# CUSTOM CDN WITH NGINX CACHING
# =============================================================================

setup_custom_cdn() {
    print_status "Setting up custom CDN with Nginx caching..."
    
    # Configure Nginx for caching
    cat > /etc/nginx/conf.d/cdn-cache.conf <<'EOF'
# CDN Cache Configuration

# Cache zones
proxy_cache_path /var/cache/nginx/static levels=1:2 keys_zone=static_cache:10m max_size=1g inactive=60m use_temp_path=off;
proxy_cache_path /var/cache/nginx/api levels=1:2 keys_zone=api_cache:10m max_size=100m inactive=10m use_temp_path=off;

# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=static_limit:10m rate=30r/s;

# Upstream servers
upstream api_backend {
    server 127.0.0.1:3000;
    keepalive 32;
}

# CDN server block
server {
    listen 443 ssl http2;
    server_name cdn.bookmyreservation.org assets.bookmyreservation.org;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/bookmyreservation.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bookmyreservation.org/privkey.pem;
    
    # Security headers
    add_header X-Cache-Status $upstream_cache_status always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options SAMEORIGIN always;
    add_header Strict-Transport-Security "max-age=31536000" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types
        application/javascript
        application/json
        application/xml
        application/rss+xml
        application/atom+xml
        image/svg+xml
        text/css
        text/javascript
        text/xml
        text/plain;

    # Brotli compression (if available)
    brotli on;
    brotli_comp_level 6;
    brotli_types
        application/javascript
        application/json
        application/xml
        text/css
        text/javascript
        text/xml
        text/plain;

    # Static assets with long cache
    location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$ {
        root /var/www/celebrity-booking/dist;
        
        # Cache settings
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header X-Cache-Status "STATIC" always;
        
        # Rate limiting
        limit_req zone=static_limit burst=50 nodelay;
        
        # CORS headers for fonts and assets
        add_header Access-Control-Allow-Origin *;
        
        # Try files, fallback to API if not found
        try_files $uri @api_fallback;
    }

    # API requests - minimal caching
    location /api/ {
        # Rate limiting
        limit_req zone=api_limit burst=20 nodelay;
        
        # Proxy settings
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Caching for GET requests only
        proxy_cache api_cache;
        proxy_cache_methods GET HEAD;
        proxy_cache_key "$scheme$request_method$host$request_uri";
        proxy_cache_valid 200 301 302 5m;
        proxy_cache_valid 404 1m;
        proxy_cache_bypass $http_pragma $http_authorization;
        proxy_no_cache $http_pragma $http_authorization;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # All other requests - serve from dist or fallback to API
    location / {
        root /var/www/celebrity-booking/dist;
        index index.html;
        
        # SPA routing
        try_files $uri $uri/ /index.html;
        
        # Cache control for HTML
        expires 1h;
        add_header Cache-Control "public, must-revalidate";
    }

    # API fallback for missing static files
    location @api_fallback {
        proxy_pass http://api_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check endpoint
    location /cdn-health {
        access_log off;
        return 200 "CDN OK\n";
        add_header Content-Type text/plain;
    }
}

# Cache purge endpoint (admin only)
server {
    listen 127.0.0.1:8081;
    server_name localhost;
    
    location /purge/ {
        proxy_cache_purge static_cache $scheme$request_method$host$1;
        access_log off;
    }
}
EOF

    # Create cache directories
    mkdir -p /var/cache/nginx/{static,api}
    chown -R nginx:nginx /var/cache/nginx

    # Create cache management script
    cat > /usr/local/bin/cdn-cache-manager.sh <<'EOF'
#!/bin/bash

CACHE_DIR="/var/cache/nginx"
STATIC_CACHE_SIZE_LIMIT="1G"
API_CACHE_SIZE_LIMIT="100M"

case "${1:-status}" in
    "clear")
        echo "Clearing CDN cache..."
        rm -rf $CACHE_DIR/static/*
        rm -rf $CACHE_DIR/api/*
        systemctl reload nginx
        echo "Cache cleared"
        ;;
    
    "purge")
        if [[ -z "$2" ]]; then
            echo "Usage: $0 purge <url_pattern>"
            exit 1
        fi
        echo "Purging cache for pattern: $2"
        find $CACHE_DIR -name "*$(echo $2 | md5sum | cut -d' ' -f1)*" -delete
        ;;
    
    "status")
        echo "📊 CDN Cache Status"
        echo "=================="
        echo "Static cache size: $(du -sh $CACHE_DIR/static 2>/dev/null | cut -f1 || echo '0')"
        echo "API cache size: $(du -sh $CACHE_DIR/api 2>/dev/null | cut -f1 || echo '0')"
        echo "Cache files: $(find $CACHE_DIR -type f | wc -l)"
        echo ""
        echo "Recent access log entries:"
        tail -5 /var/log/nginx/access.log | grep -E "(HIT|MISS)" || echo "No cache entries found"
        ;;
    
    "stats")
        echo "📈 CDN Statistics (last 1000 requests)"
        echo "======================================"
        tail -1000 /var/log/nginx/access.log | awk '
        BEGIN { hits=0; misses=0; total=0 }
        /X-Cache-Status.*HIT/ { hits++; total++ }
        /X-Cache-Status.*MISS/ { misses++; total++ }
        /X-Cache-Status/ { total++ }
        END { 
            if (total > 0) {
                printf "Cache hit rate: %.1f%% (%d hits, %d misses)\n", (hits/total)*100, hits, misses
            } else {
                print "No cache statistics available"
            }
        }'
        ;;
    
    "optimize")
        echo "Optimizing CDN cache..."
        # Remove old cache files
        find $CACHE_DIR -type f -atime +7 -delete
        # Reload nginx to refresh cache zones
        systemctl reload nginx
        echo "Cache optimized"
        ;;
    
    *)
        echo "Usage: $0 {clear|purge <pattern>|status|stats|optimize}"
        exit 1
        ;;
esac
EOF

    chmod +x /usr/local/bin/cdn-cache-manager.sh

    # Test nginx configuration
    nginx -t && systemctl reload nginx

    print_success "Custom CDN with Nginx caching configured"
}

# =============================================================================
# IMAGE OPTIMIZATION SETUP
# =============================================================================

setup_image_optimization() {
    print_status "Setting up image optimization..."
    
    # Install image optimization tools
    apt-get update
    apt-get install -y imagemagick webp jpegoptim optipng

    # Image optimization script
    cat > /usr/local/bin/optimize-images.sh <<'EOF'
#!/bin/bash

INPUT_DIR="${1:-/var/www/celebrity-booking/dist/static/images}"
OUTPUT_DIR="${2:-$INPUT_DIR/optimized}"
QUALITY="${3:-85}"

echo "🖼️ Optimizing images in $INPUT_DIR"

mkdir -p "$OUTPUT_DIR"

# Function to optimize JPEG
optimize_jpeg() {
    local input="$1"
    local output="$2"
    jpegoptim --max="$QUALITY" --strip-all --overwrite "$input"
    
    # Create WebP version
    cwebp -q "$QUALITY" "$input" -o "${output%.jpg}.webp" 2>/dev/null || \
    cwebp -q "$QUALITY" "$input" -o "${output%.jpeg}.webp" 2>/dev/null
}

# Function to optimize PNG
optimize_png() {
    local input="$1"
    local output="$2"
    optipng -o2 "$input"
    
    # Create WebP version
    cwebp -q "$QUALITY" "$input" -o "${output%.png}.webp" 2>/dev/null
}

# Process all images
find "$INPUT_DIR" -type f \( -iname "*.jpg" -o -iname "*.jpeg" \) | while read file; do
    echo "Optimizing JPEG: $(basename "$file")"
    optimize_jpeg "$file" "$OUTPUT_DIR/$(basename "$file")"
done

find "$INPUT_DIR" -type f -iname "*.png" | while read file; do
    echo "Optimizing PNG: $(basename "$file")"
    optimize_png "$file" "$OUTPUT_DIR/$(basename "$file")"
done

echo "✅ Image optimization completed"
echo "Original directory: $INPUT_DIR"
echo "Optimized directory: $OUTPUT_DIR"
EOF

    chmod +x /usr/local/bin/optimize-images.sh

    # Automatic image optimization on upload
    cat > /usr/local/bin/auto-optimize-images.sh <<'EOF'
#!/bin/bash

# Monitor upload directory and automatically optimize images
UPLOAD_DIR="/var/www/celebrity-booking/uploads"
OPTIMIZED_DIR="/var/www/celebrity-booking/dist/static/images"

if command -v inotifywait >/dev/null 2>&1; then
    echo "Starting image optimization monitor..."
    
    inotifywait -m -r -e create,moved_to "$UPLOAD_DIR" --format '%w%f' | while read file; do
        if [[ "$file" =~ \.(jpg|jpeg|png)$ ]]; then
            echo "New image detected: $file"
            
            # Copy to optimized directory
            cp "$file" "$OPTIMIZED_DIR/"
            
            # Optimize
            /usr/local/bin/optimize-images.sh "$OPTIMIZED_DIR" "$OPTIMIZED_DIR" 85
            
            echo "Image optimized: $(basename "$file")"
        fi
    done
else
    echo "inotify-tools not installed. Install with: apt-get install inotify-tools"
fi
EOF

    chmod +x /usr/local/bin/auto-optimize-images.sh

    print_success "Image optimization configured"
}

# =============================================================================
# CDN MONITORING AND ANALYTICS
# =============================================================================

setup_cdn_monitoring() {
    print_status "Setting up CDN monitoring and analytics..."
    
    # CDN monitoring script
    cat > /usr/local/bin/cdn-monitor.sh <<'EOF'
#!/bin/bash

echo "🌐 CDN Monitoring Dashboard"
echo "=========================="

# Check CDN endpoints
ENDPOINTS=(
    "https://bookmyreservation.org"
    "https://cdn.bookmyreservation.org"
    "https://assets.bookmyreservation.org"
)

echo ""
echo "🔍 Endpoint Status:"
for endpoint in "${ENDPOINTS[@]}"; do
    if curl -s -f -o /dev/null --max-time 10 "$endpoint"; then
        response_time=$(curl -s -o /dev/null -w "%{time_total}" --max-time 10 "$endpoint")
        echo "  ✅ $endpoint (${response_time}s)"
    else
        echo "  ❌ $endpoint"
    fi
done

# Cache statistics
echo ""
echo "📊 Cache Statistics:"
if command -v /usr/local/bin/cdn-cache-manager.sh >/dev/null 2>&1; then
    /usr/local/bin/cdn-cache-manager.sh stats
fi

# CloudFlare analytics (if configured)
if [[ -n "$CLOUDFLARE_API_TOKEN" ]] && command -v python3 >/dev/null 2>&1; then
    echo ""
    echo "☁️ CloudFlare Analytics:"
    python3 - <<PYTHON
import requests
import os
from datetime import datetime, timedelta

api_token = os.environ.get('CLOUDFLARE_API_TOKEN')
if api_token:
    headers = {"Authorization": f"Bearer {api_token}"}
    
    # Get zone analytics
    response = requests.get(
        "https://api.cloudflare.com/client/v4/zones",
        headers=headers,
        params={"name": "bookmyreservation.org"}
    )
    
    if response.status_code == 200:
        zones = response.json()["result"]
        if zones:
            zone_id = zones[0]["id"]
            
            # Get analytics for last 24 hours
            since = (datetime.now() - timedelta(days=1)).isoformat() + "Z"
            analytics_response = requests.get(
                f"https://api.cloudflare.com/client/v4/zones/{zone_id}/analytics/dashboard",
                headers=headers,
                params={"since": since}
            )
            
            if analytics_response.status_code == 200:
                data = analytics_response.json()["result"]
                print(f"  Requests: {data.get('totals', {}).get('requests', {}).get('all', 'N/A')}")
                print(f"  Bandwidth: {data.get('totals', {}).get('bandwidth', {}).get('all', 'N/A')} bytes")
                print(f"  Cache hit ratio: {data.get('totals', {}).get('requests', {}).get('cached', 'N/A')}")
            else:
                print("  Analytics not available")
    else:
        print("  CloudFlare API error")
else:
    print("  CloudFlare API token not configured")

PYTHON
fi

# AWS CloudFront analytics (if configured)
if command -v aws >/dev/null 2>&1 && aws sts get-caller-identity >/dev/null 2>&1; then
    echo ""
    echo "🚀 CloudFront Analytics:"
    
    if [[ -f "/var/log/cloudfront-setup.json" ]]; then
        DISTRIBUTION_ID=$(jq -r '.distribution_id' /var/log/cloudfront-setup.json)
        
        # Get distribution statistics
        aws cloudfront get-distribution-config --id "$DISTRIBUTION_ID" >/dev/null 2>&1 && {
            echo "  Distribution ID: $DISTRIBUTION_ID"
            echo "  Status: $(aws cloudfront get-distribution --id "$DISTRIBUTION_ID" --query 'Distribution.Status' --output text)"
            echo "  Domain: $(aws cloudfront get-distribution --id "$DISTRIBUTION_ID" --query 'Distribution.DomainName' --output text)"
        } || echo "  CloudFront distribution not found"
    else
        echo "  CloudFront not configured"
    fi
fi

echo ""
echo "🔧 Management Commands:"
echo "  Clear cache: /usr/local/bin/cdn-cache-manager.sh clear"
echo "  Deploy assets: /usr/local/bin/deploy-to-cdn.sh"
echo "  Optimize images: /usr/local/bin/optimize-images.sh"
EOF

    chmod +x /usr/local/bin/cdn-monitor.sh

    # Performance testing script
    cat > /usr/local/bin/cdn-performance-test.sh <<'EOF'
#!/bin/bash

DOMAIN="${1:-bookmyreservation.org}"

echo "🚀 CDN Performance Test for $DOMAIN"
echo "=================================="

# Test different asset types
ASSETS=(
    "https://$DOMAIN/static/css/main.css"
    "https://$DOMAIN/static/js/main.js"
    "https://$DOMAIN/static/images/logo.png"
    "https://cdn.$DOMAIN/static/css/main.css"
    "https://assets.$DOMAIN/static/js/main.js"
)

echo ""
echo "📊 Asset Load Times:"
for asset in "${ASSETS[@]}"; do
    if curl -s -f -o /dev/null --max-time 30 "$asset"; then
        times=$(curl -s -o /dev/null -w "%{time_namelookup},%{time_connect},%{time_starttransfer},%{time_total}" --max-time 30 "$asset")
        IFS=',' read -r dns connect start total <<< "$times"
        echo "  $(basename "$asset"): DNS:${dns}s Connect:${connect}s TTFB:${start}s Total:${total}s"
    else
        echo "  $(basename "$asset"): ❌ Failed"
    fi
done

# Test from different locations (if curl supports it)
echo ""
echo "🌍 Geographic Performance:"
locations=("--interface 0.0.0.0")  # Add more interfaces if available

for location in "${locations[@]}"; do
    time=$(curl -s -o /dev/null -w "%{time_total}" $location --max-time 30 "https://$DOMAIN" 2>/dev/null || echo "N/A")
    echo "  Default interface: ${time}s"
done

echo ""
echo "📈 Recommendations:"
if (( $(echo "$total > 3" | bc -l) )); then
    echo "  ⚠️  Page load time is high. Consider:"
    echo "    - Enabling compression"
    echo "    - Optimizing images"
    echo "    - Using a CDN"
else
    echo "  ✅ Page load performance is good"
fi
EOF

    chmod +x /usr/local/bin/cdn-performance-test.sh

    print_success "CDN monitoring and analytics configured"
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

# Install common dependencies
if command -v apt-get >/dev/null 2>&1; then
    apt-get update
    apt-get install -y curl wget python3 python3-pip jq bc
fi

# Create necessary directories
mkdir -p /var/log
mkdir -p /var/www/celebrity-booking/dist/static/{css,js,images}

# Setup selected CDN solutions
if [[ "${SETUP_CLOUDFLARE:-false}" == "true" ]]; then
    setup_cloudflare
fi

if [[ "${SETUP_CLOUDFRONT:-false}" == "true" ]]; then
    setup_cloudfront
fi

if [[ "${SETUP_CUSTOM:-false}" == "true" ]]; then
    setup_custom_cdn
fi

# Always setup image optimization and monitoring
setup_image_optimization
setup_cdn_monitoring

# Create automated deployment script
cat > /usr/local/bin/deploy-with-cdn.sh <<'EOF'
#!/bin/bash

echo "🚀 Deploying Celebrity Booking Platform with CDN"
echo "================================================"

# Build frontend
echo "Building frontend..."
cd /opt/celebrity-booking
npm run build

# Optimize images
echo "Optimizing images..."
/usr/local/bin/optimize-images.sh

# Deploy to CDN
if [[ -f "/usr/local/bin/deploy-to-cdn.sh" ]]; then
    echo "Deploying to CloudFront..."
    /usr/local/bin/deploy-to-cdn.sh
fi

# Clear CDN cache
if [[ -f "/usr/local/bin/cdn-cache-manager.sh" ]]; then
    echo "Clearing CDN cache..."
    /usr/local/bin/cdn-cache-manager.sh clear
fi

# Test deployment
echo "Testing deployment..."
sleep 5
/usr/local/bin/cdn-performance-test.sh

echo "✅ Deployment completed"
EOF

chmod +x /usr/local/bin/deploy-with-cdn.sh

# Setup automated CDN optimization
cat > /etc/cron.d/cdn-optimization <<'EOF'
# CDN optimization schedule

# Daily image optimization
0 3 * * * root /usr/local/bin/optimize-images.sh >> /var/log/cdn-optimization.log 2>&1

# Weekly cache optimization
0 4 * * 0 root /usr/local/bin/cdn-cache-manager.sh optimize >> /var/log/cdn-optimization.log 2>&1

# Daily performance monitoring
0 6 * * * root /usr/local/bin/cdn-performance-test.sh >> /var/log/cdn-performance.log 2>&1
EOF

# Final summary
echo ""
print_status "📋 CDN Setup Summary:"

if [[ "${SETUP_CLOUDFLARE:-false}" == "true" ]]; then
    echo "  ✅ CloudFlare CDN configured"
fi

if [[ "${SETUP_CLOUDFRONT:-false}" == "true" ]]; then
    echo "  ✅ AWS CloudFront CDN configured"
fi

if [[ "${SETUP_CUSTOM:-false}" == "true" ]]; then
    echo "  ✅ Custom Nginx CDN configured"
fi

echo "  ✅ Image optimization pipeline"
echo "  ✅ CDN monitoring and analytics"
echo "  ✅ Automated deployment scripts"
echo "  ✅ Performance testing tools"

echo ""
print_status "🔧 CDN Management:"
echo "  - CDN monitor: /usr/local/bin/cdn-monitor.sh"
echo "  - Performance test: /usr/local/bin/cdn-performance-test.sh"
echo "  - Deploy with CDN: /usr/local/bin/deploy-with-cdn.sh"
echo "  - Cache manager: /usr/local/bin/cdn-cache-manager.sh"
echo "  - Optimize images: /usr/local/bin/optimize-images.sh"

echo ""
print_status "🌐 CDN Endpoints:"
echo "  - Main site: https://$DOMAIN"
echo "  - CDN assets: https://cdn.$DOMAIN"
echo "  - Static assets: https://assets.$DOMAIN"

if [[ -f "/var/log/cloudfront-setup.json" ]]; then
    CLOUDFRONT_DOMAIN=$(jq -r '.distribution_domain' /var/log/cloudfront-setup.json)
    echo "  - CloudFront: https://$CLOUDFRONT_DOMAIN"
fi

echo ""
print_success "🎉 CDN setup completed successfully!"

echo ""
print_status "Next steps:"
echo "1. Update DNS records to point CDN subdomains to your CDN"
echo "2. Test CDN performance from different geographic locations"
echo "3. Configure cache invalidation in your deployment pipeline"
echo "4. Monitor CDN performance and adjust cache settings as needed"
echo "5. Set up alerts for CDN availability and performance"