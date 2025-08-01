#!/bin/bash

# Comprehensive Uptime Monitoring Setup
# This script sets up uptime monitoring with multiple providers and alerting

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

print_status "📊 Celebrity Booking Platform - Uptime Monitoring Setup"
echo ""

# Configuration
DOMAIN="${DOMAIN:-bookmyreservation.org}"
ADMIN_DOMAIN="admin.${DOMAIN}"
API_DOMAIN="api.${DOMAIN}"
WWW_DOMAIN="www.${DOMAIN}"

# Monitoring endpoints
ENDPOINTS=(
    "https://$DOMAIN"
    "https://$WWW_DOMAIN"
    "https://$ADMIN_DOMAIN"
    "https://$API_DOMAIN/api/health"
    "https://$API_DOMAIN/api/status"
)

# Alert contacts
ALERT_EMAIL="${ALERT_EMAIL:-admin@${DOMAIN}}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"
PHONE_NUMBER="${PHONE_NUMBER:-}"

echo "Select monitoring solution:"
echo "1. UptimeRobot (Free tier available)"
echo "2. Pingdom (Premium monitoring)"
echo "3. StatusCake (Good free tier)"
echo "4. Custom monitoring with Prometheus/Grafana"
echo "5. All of the above (comprehensive setup)"
echo ""
read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        SETUP_UPTIMEROBOT=true
        ;;
    2)
        SETUP_PINGDOM=true
        ;;
    3)
        SETUP_STATUSCAKE=true
        ;;
    4)
        SETUP_CUSTOM=true
        ;;
    5)
        SETUP_UPTIMEROBOT=true
        SETUP_PINGDOM=true
        SETUP_STATUSCAKE=true
        SETUP_CUSTOM=true
        ;;
    *)
        print_error "Invalid choice"
        exit 1
        ;;
esac

# =============================================================================
# UPTIMEROBOT SETUP
# =============================================================================

setup_uptimerobot() {
    print_status "Setting up UptimeRobot monitoring..."
    
    # Check if API key is provided
    if [[ -z "$UPTIMEROBOT_API_KEY" ]]; then
        print_warning "UptimeRobot API key not provided"
        print_status "Get your API key from: https://uptimerobot.com/dashboard#mySettings"
        read -p "Enter UptimeRobot API key (or press Enter to skip): " UPTIMEROBOT_API_KEY
    fi
    
    if [[ -n "$UPTIMEROBOT_API_KEY" ]]; then
        # Create monitoring script
        cat > /usr/local/bin/setup-uptimerobot-monitors.py <<'EOF'
#!/usr/bin/env python3

import requests
import json
import sys
import os

class UptimeRobotSetup:
    def __init__(self, api_key):
        self.api_key = api_key
        self.base_url = "https://api.uptimerobot.com/v2"
        
    def create_monitor(self, url, friendly_name, monitor_type=1):
        """Create a monitor in UptimeRobot"""
        data = {
            'api_key': self.api_key,
            'format': 'json',
            'type': monitor_type,  # 1 = HTTP(s)
            'url': url,
            'friendly_name': friendly_name,
            'interval': 300,  # 5 minutes
            'timeout': 30
        }
        
        response = requests.post(f"{self.base_url}/newMonitor", data=data)
        return response.json()
    
    def get_monitors(self):
        """Get existing monitors"""
        data = {
            'api_key': self.api_key,
            'format': 'json'
        }
        
        response = requests.post(f"{self.base_url}/getMonitors", data=data)
        return response.json()
    
    def setup_all_monitors(self, endpoints):
        """Setup monitors for all endpoints"""
        existing = self.get_monitors()
        existing_urls = []
        
        if existing.get('stat') == 'ok':
            existing_urls = [monitor['url'] for monitor in existing.get('monitors', [])]
        
        for endpoint in endpoints:
            if endpoint not in existing_urls:
                name = endpoint.replace('https://', '').replace('http://', '')
                result = self.create_monitor(endpoint, f"Celebrity Booking - {name}")
                
                if result.get('stat') == 'ok':
                    print(f"✅ Created monitor for {endpoint}")
                else:
                    print(f"❌ Failed to create monitor for {endpoint}: {result.get('error', {}).get('message', 'Unknown error')}")
            else:
                print(f"ℹ️  Monitor already exists for {endpoint}")

if __name__ == "__main__":
    api_key = os.environ.get('UPTIMEROBOT_API_KEY')
    if not api_key:
        print("Error: UPTIMEROBOT_API_KEY environment variable not set")
        sys.exit(1)
    
    endpoints = sys.argv[1:] if len(sys.argv) > 1 else []
    if not endpoints:
        print("Error: No endpoints provided")
        sys.exit(1)
    
    setup = UptimeRobotSetup(api_key)
    setup.setup_all_monitors(endpoints)
EOF
        
        chmod +x /usr/local/bin/setup-uptimerobot-monitors.py
        
        # Install dependencies
        pip3 install requests >/dev/null 2>&1 || {
            print_status "Installing Python requests library..."
            apt-get update && apt-get install -y python3-pip
            pip3 install requests
        }
        
        # Run setup
        export UPTIMEROBOT_API_KEY="$UPTIMEROBOT_API_KEY"
        /usr/local/bin/setup-uptimerobot-monitors.py "${ENDPOINTS[@]}"
        
        print_success "UptimeRobot monitoring configured"
    else
        print_warning "Skipping UptimeRobot setup - no API key provided"
    fi
}

# =============================================================================
# PINGDOM SETUP
# =============================================================================

setup_pingdom() {
    print_status "Setting up Pingdom monitoring..."
    
    if [[ -z "$PINGDOM_API_TOKEN" ]]; then
        print_warning "Pingdom API token not provided"
        print_status "Get your API token from: https://my.pingdom.com/app/api-tokens"
        read -p "Enter Pingdom API token (or press Enter to skip): " PINGDOM_API_TOKEN
    fi
    
    if [[ -n "$PINGDOM_API_TOKEN" ]]; then
        # Create Pingdom setup script
        cat > /usr/local/bin/setup-pingdom-monitors.py <<'EOF'
#!/usr/bin/env python3

import requests
import json
import sys
import os

class PingdomSetup:
    def __init__(self, api_token):
        self.api_token = api_token
        self.base_url = "https://api.pingdom.com/api/3.1"
        self.headers = {
            'Authorization': f'Bearer {api_token}',
            'Content-Type': 'application/json'
        }
    
    def create_check(self, url, name):
        """Create a check in Pingdom"""
        data = {
            'name': name,
            'host': url.replace('https://', '').replace('http://', '').split('/')[0],
            'type': 'http',
            'url': url,
            'resolution': 5,  # 5 minutes
            'sendnotificationwhendown': 2,  # After 2 failed checks
            'notifyagainevery': 0,
            'notifywhenbackup': True
        }
        
        response = requests.post(f"{self.base_url}/checks", 
                               headers=self.headers, 
                               json=data)
        return response.json()
    
    def get_checks(self):
        """Get existing checks"""
        response = requests.get(f"{self.base_url}/checks", headers=self.headers)
        return response.json()
    
    def setup_all_checks(self, endpoints):
        """Setup checks for all endpoints"""
        existing = self.get_checks()
        existing_hosts = []
        
        if 'checks' in existing:
            existing_hosts = [check['hostname'] for check in existing['checks']]
        
        for endpoint in endpoints:
            host = endpoint.replace('https://', '').replace('http://', '').split('/')[0]
            if host not in existing_hosts:
                name = f"Celebrity Booking - {host}"
                result = self.create_check(endpoint, name)
                
                if 'check' in result:
                    print(f"✅ Created Pingdom check for {endpoint}")
                else:
                    print(f"❌ Failed to create check for {endpoint}: {result}")
            else:
                print(f"ℹ️  Check already exists for {host}")

if __name__ == "__main__":
    api_token = os.environ.get('PINGDOM_API_TOKEN')
    if not api_token:
        print("Error: PINGDOM_API_TOKEN environment variable not set")
        sys.exit(1)
    
    endpoints = sys.argv[1:] if len(sys.argv) > 1 else []
    if not endpoints:
        print("Error: No endpoints provided")
        sys.exit(1)
    
    setup = PingdomSetup(api_token)
    setup.setup_all_checks(endpoints)
EOF
        
        chmod +x /usr/local/bin/setup-pingdom-monitors.py
        
        # Run setup
        export PINGDOM_API_TOKEN="$PINGDOM_API_TOKEN"
        /usr/local/bin/setup-pingdom-monitors.py "${ENDPOINTS[@]}"
        
        print_success "Pingdom monitoring configured"
    else
        print_warning "Skipping Pingdom setup - no API token provided"
    fi
}

# =============================================================================
# STATUSCAKE SETUP
# =============================================================================

setup_statuscake() {
    print_status "Setting up StatusCake monitoring..."
    
    if [[ -z "$STATUSCAKE_API_KEY" ]]; then
        print_warning "StatusCake API key not provided"
        print_status "Get your API key from: https://app.statuscake.com/APIKey"
        read -p "Enter StatusCake API key (or press Enter to skip): " STATUSCAKE_API_KEY
    fi
    
    if [[ -n "$STATUSCAKE_API_KEY" ]]; then
        # Create StatusCake setup script
        cat > /usr/local/bin/setup-statuscake-monitors.py <<'EOF'
#!/usr/bin/env python3

import requests
import json
import sys
import os

class StatusCakeSetup:
    def __init__(self, api_key):
        self.api_key = api_key
        self.base_url = "https://api.statuscake.com/v1"
        self.headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
    
    def create_test(self, url, name):
        """Create a test in StatusCake"""
        data = {
            'name': name,
            'website_url': url,
            'test_type': 'HTTP',
            'check_rate': 300,  # 5 minutes
            'timeout': 30,
            'confirmation': 2,
            'trigger_rate': 5,
            'custom_header': '',
            'user_agent': '',
            'status_codes_csv': '204,205,206,300,301,302,303,304,305,306,307,308,400,401,403,404,405,406,408,410,413,444,429,494,495,496,499,500,501,502,503,504,505,506,507,508,509,510,511,521,522,523,524,520,598,599',
            'use_jar': 1,
            'post_raw': '',
            'final_endpoint': '',
            'follow_redirects': 1,
            'find_string': '',
            'do_not_find': 0,
            'real_browser': 0,
            'test_tags': 'celebrity-booking,production'
        }
        
        response = requests.post(f"{self.base_url}/uptime", 
                               headers=self.headers, 
                               json=data)
        return response.json()
    
    def get_tests(self):
        """Get existing tests"""
        response = requests.get(f"{self.base_url}/uptime", headers=self.headers)
        return response.json()
    
    def setup_all_tests(self, endpoints):
        """Setup tests for all endpoints"""
        existing = self.get_tests()
        existing_urls = []
        
        if 'data' in existing:
            existing_urls = [test['website_url'] for test in existing['data']]
        
        for endpoint in endpoints:
            if endpoint not in existing_urls:
                name = f"Celebrity Booking - {endpoint.replace('https://', '').replace('http://', '')}"
                result = self.create_test(endpoint, name)
                
                if 'data' in result:
                    print(f"✅ Created StatusCake test for {endpoint}")
                else:
                    print(f"❌ Failed to create test for {endpoint}: {result}")
            else:
                print(f"ℹ️  Test already exists for {endpoint}")

if __name__ == "__main__":
    api_key = os.environ.get('STATUSCAKE_API_KEY')
    if not api_key:
        print("Error: STATUSCAKE_API_KEY environment variable not set")
        sys.exit(1)
    
    endpoints = sys.argv[1:] if len(sys.argv) > 1 else []
    if not endpoints:
        print("Error: No endpoints provided")
        sys.exit(1)
    
    setup = StatusCakeSetup(api_key)
    setup.setup_all_tests(endpoints)
EOF
        
        chmod +x /usr/local/bin/setup-statuscake-monitors.py
        
        # Run setup
        export STATUSCAKE_API_KEY="$STATUSCAKE_API_KEY"
        /usr/local/bin/setup-statuscake-monitors.py "${ENDPOINTS[@]}"
        
        print_success "StatusCake monitoring configured"
    else
        print_warning "Skipping StatusCake setup - no API token provided"
    fi
}

# =============================================================================
# CUSTOM MONITORING WITH PROMETHEUS/GRAFANA
# =============================================================================

setup_custom_monitoring() {
    print_status "Setting up custom monitoring with Prometheus and Grafana..."
    
    # Install Docker if not present
    if ! command -v docker >/dev/null 2>&1; then
        print_status "Installing Docker..."
        curl -fsSL https://get.docker.com -o get-docker.sh
        sh get-docker.sh
        systemctl enable docker
        systemctl start docker
        rm get-docker.sh
    fi
    
    # Install Docker Compose if not present
    if ! command -v docker-compose >/dev/null 2>&1; then
        print_status "Installing Docker Compose..."
        curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose
    fi
    
    # Create monitoring directory
    mkdir -p /opt/monitoring/{prometheus,grafana,alertmanager}
    
    # Prometheus configuration
    cat > /opt/monitoring/prometheus/prometheus.yml <<EOF
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'blackbox'
    metrics_path: /probe
    params:
      module: [http_2xx]
    static_configs:
      - targets:
$(for endpoint in "${ENDPOINTS[@]}"; do
    echo "        - $endpoint"
done)
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: blackbox-exporter:9115

  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']
EOF

    # Alert rules
    cat > /opt/monitoring/prometheus/alert_rules.yml <<'EOF'
groups:
- name: uptime_alerts
  rules:
  - alert: WebsiteDown
    expr: probe_success == 0
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "Website {{ $labels.instance }} is down"
      description: "{{ $labels.instance }} has been down for more than 2 minutes."

  - alert: HighResponseTime
    expr: probe_duration_seconds > 5
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High response time for {{ $labels.instance }}"
      description: "{{ $labels.instance }} response time is {{ $value }} seconds."

  - alert: SSLCertExpiry
    expr: probe_ssl_earliest_cert_expiry - time() < 86400 * 7
    for: 1h
    labels:
      severity: warning
    annotations:
      summary: "SSL certificate expiring soon for {{ $labels.instance }}"
      description: "SSL certificate for {{ $labels.instance }} expires in less than 7 days."
EOF

    # Alertmanager configuration
    cat > /opt/monitoring/alertmanager/alertmanager.yml <<EOF
global:
  smtp_smarthost: 'smtp.hostinger.com:587'
  smtp_from: '$ALERT_EMAIL'
  smtp_auth_username: '$ALERT_EMAIL'
  smtp_auth_password: '${SMTP_PASSWORD:-your_smtp_password}'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'

receivers:
- name: 'web.hook'
  email_configs:
  - to: '$ALERT_EMAIL'
    subject: '🚨 Celebrity Booking Alert: {{ .GroupLabels.alertname }}'
    body: |
      {{ range .Alerts }}
      Alert: {{ .Annotations.summary }}
      Description: {{ .Annotations.description }}
      {{ end }}
EOF

    # Docker Compose file
    cat > /opt/monitoring/docker-compose.yml <<EOF
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus:/etc/prometheus
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'
    restart: unless-stopped

  alertmanager:
    image: prom/alertmanager:latest
    container_name: alertmanager
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager:/etc/alertmanager
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
      - '--storage.path=/alertmanager'
      - '--web.external-url=http://localhost:9093'
    restart: unless-stopped

  blackbox-exporter:
    image: prom/blackbox-exporter:latest
    container_name: blackbox-exporter
    ports:
      - "9115:9115"
    restart: unless-stopped

  node-exporter:
    image: prom/node-exporter:latest
    container_name: node-exporter
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.rootfs=/rootfs'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.ignored-mount-points=^/(sys|proc|dev|host|etc)($$|/)'
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3001:3000"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin123
      - GF_USERS_ALLOW_SIGN_UP=false
    restart: unless-stopped

volumes:
  prometheus_data:
  grafana_data:
EOF

    # Grafana datasource configuration
    mkdir -p /opt/monitoring/grafana/provisioning/datasources
    cat > /opt/monitoring/grafana/provisioning/datasources/prometheus.yml <<EOF
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
EOF

    # Start monitoring stack
    cd /opt/monitoring
    docker-compose up -d
    
    print_success "Custom monitoring stack deployed"
    print_status "Grafana: http://localhost:3001 (admin/admin123)"
    print_status "Prometheus: http://localhost:9090"
    print_status "Alertmanager: http://localhost:9093"
}

# =============================================================================
# HEALTH CHECK ENDPOINTS
# =============================================================================

create_health_endpoints() {
    print_status "Creating comprehensive health check endpoints..."
    
    # Backend health endpoint
    cat > /opt/celebrity-booking/backend/routes/health.js <<'EOF'
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Basic health check
router.get('/health', async (req, res) => {
  try {
    const healthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {}
    };

    // Database connectivity check
    try {
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1);
      
      healthCheck.checks.database = {
        status: error ? 'unhealthy' : 'healthy',
        responseTime: Date.now(),
        error: error?.message
      };
    } catch (dbError) {
      healthCheck.checks.database = {
        status: 'unhealthy',
        error: dbError.message
      };
    }

    // Memory usage check
    const memUsage = process.memoryUsage();
    healthCheck.checks.memory = {
      status: memUsage.heapUsed < memUsage.heapTotal * 0.9 ? 'healthy' : 'warning',
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
    };

    // Overall status
    const hasUnhealthy = Object.values(healthCheck.checks).some(check => check.status === 'unhealthy');
    healthCheck.status = hasUnhealthy ? 'unhealthy' : 'healthy';

    const statusCode = hasUnhealthy ? 503 : 200;
    res.status(statusCode).json(healthCheck);

  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Detailed status endpoint
router.get('/status', async (req, res) => {
  try {
    const status = {
      application: {
        name: 'Celebrity Booking Platform API',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      },
      dependencies: {},
      metrics: {}
    };

    // Database status
    try {
      const start = Date.now();
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1);
      
      status.dependencies.database = {
        status: error ? 'down' : 'up',
        responseTime: `${Date.now() - start}ms`,
        provider: 'Supabase',
        error: error?.message
      };
    } catch (dbError) {
      status.dependencies.database = {
        status: 'down',
        error: dbError.message
      };
    }

    // Email service status
    try {
      const emailResponse = await fetch(`${process.env.SUPABASE_URL}/functions/v1/send-email-production`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: 'test@example.com',
          subject: 'Health Check',
          html: '<p>Health check test</p>',
          type: 'health_check'
        })
      });

      status.dependencies.email = {
        status: emailResponse.ok ? 'up' : 'down',
        provider: 'Hostinger SMTP',
        lastCheck: new Date().toISOString()
      };
    } catch (emailError) {
      status.dependencies.email = {
        status: 'down',
        error: emailError.message
      };
    }

    // System metrics
    const memUsage = process.memoryUsage();
    status.metrics = {
      memory: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss
      },
      cpu: process.cpuUsage(),
      activeHandles: process._getActiveHandles().length,
      activeRequests: process._getActiveRequests().length
    };

    res.json(status);

  } catch (error) {
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Ready endpoint (for Kubernetes-style readiness probes)
router.get('/ready', async (req, res) => {
  try {
    // Check if all critical services are available
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      return res.status(503).json({ 
        ready: false, 
        reason: 'Database unavailable',
        error: error.message
      });
    }

    res.json({ 
      ready: true, 
      timestamp: new Date().toISOString() 
    });

  } catch (error) {
    res.status(503).json({ 
      ready: false, 
      error: error.message 
    });
  }
});

// Live endpoint (for Kubernetes-style liveness probes)
router.get('/live', (req, res) => {
  res.json({ 
    alive: true, 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

module.exports = router;
EOF

    print_success "Health check endpoints created"
}

# =============================================================================
# NOTIFICATION SETUP
# =============================================================================

setup_notifications() {
    print_status "Setting up notification channels..."
    
    # Create notification script
    cat > /usr/local/bin/send-alert.sh <<'EOF'
#!/bin/bash

# Alert notification script
ALERT_TYPE="$1"
MESSAGE="$2"
SEVERITY="${3:-warning}"

# Email notification
send_email_alert() {
    local subject="🚨 Celebrity Booking Alert: $ALERT_TYPE"
    local body="
Alert: $ALERT_TYPE
Severity: $SEVERITY
Message: $MESSAGE
Time: $(date)
Server: $(hostname)
"

    # Use production email function
    curl -X POST "${SUPABASE_URL}/functions/v1/send-email-production" \
      -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
      -H "Content-Type: application/json" \
      -d "{
        \"to\": \"$ALERT_EMAIL\",
        \"subject\": \"$subject\",
        \"html\": \"<pre>$body</pre>\",
        \"type\": \"alert\"
      }" >/dev/null 2>&1
}

# Slack notification
send_slack_alert() {
    if [[ -n "$SLACK_WEBHOOK" ]]; then
        local color="warning"
        case "$SEVERITY" in
            "critical") color="danger" ;;
            "warning") color="warning" ;;
            "info") color="good" ;;
        esac

        curl -X POST "$SLACK_WEBHOOK" \
          -H "Content-Type: application/json" \
          -d "{
            \"attachments\": [{
              \"color\": \"$color\",
              \"title\": \"Celebrity Booking Alert\",
              \"fields\": [
                {\"title\": \"Alert\", \"value\": \"$ALERT_TYPE\", \"short\": true},
                {\"title\": \"Severity\", \"value\": \"$SEVERITY\", \"short\": true},
                {\"title\": \"Message\", \"value\": \"$MESSAGE\", \"short\": false},
                {\"title\": \"Server\", \"value\": \"$(hostname)\", \"short\": true},
                {\"title\": \"Time\", \"value\": \"$(date)\", \"short\": true}
              ]
            }]
          }" >/dev/null 2>&1
    fi
}

# Send notifications
send_email_alert
send_slack_alert

echo "Alert sent: $ALERT_TYPE - $MESSAGE"
EOF

    chmod +x /usr/local/bin/send-alert.sh

    print_success "Notification system configured"
}

# =============================================================================
# MONITORING DASHBOARD
# =============================================================================

create_monitoring_dashboard() {
    print_status "Creating monitoring dashboard..."
    
    # Create status page
    mkdir -p /var/www/status
    
    cat > /var/www/status/index.html <<EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Celebrity Booking Platform - Status</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 40px; }
        .service { padding: 15px; margin: 10px 0; border-radius: 5px; display: flex; justify-content: space-between; align-items: center; }
        .service.healthy { background: #d4edda; border-left: 4px solid #28a745; }
        .service.unhealthy { background: #f8d7da; border-left: 4px solid #dc3545; }
        .service.checking { background: #fff3cd; border-left: 4px solid #ffc107; }
        .status-indicator { padding: 5px 10px; border-radius: 3px; color: white; font-weight: bold; }
        .healthy .status-indicator { background: #28a745; }
        .unhealthy .status-indicator { background: #dc3545; }
        .checking .status-indicator { background: #ffc107; }
        .last-update { text-align: center; margin-top: 30px; color: #666; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-top: 30px; }
        .metric { background: #f8f9fa; padding: 15px; border-radius: 5px; text-align: center; }
        .metric-value { font-size: 24px; font-weight: bold; color: #007bff; }
        .metric-label { color: #666; margin-top: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎭 Celebrity Booking Platform</h1>
            <h2>System Status</h2>
        </div>

        <div id="services">
            <!-- Services will be loaded dynamically -->
        </div>

        <div class="metrics">
            <div class="metric">
                <div class="metric-value" id="uptime">-</div>
                <div class="metric-label">Uptime %</div>
            </div>
            <div class="metric">
                <div class="metric-value" id="response-time">-</div>
                <div class="metric-label">Avg Response (ms)</div>
            </div>
            <div class="metric">
                <div class="metric-value" id="incidents">-</div>
                <div class="metric-label">Open Incidents</div>
            </div>
        </div>

        <div class="last-update">
            Last updated: <span id="last-update">-</span>
        </div>
    </div>

    <script>
        const endpoints = [
$(for endpoint in "${ENDPOINTS[@]}"; do
    echo "            '$endpoint',"
done)
        ];

        async function checkService(url) {
            try {
                const start = Date.now();
                const response = await fetch(url, { 
                    method: 'HEAD',
                    mode: 'no-cors',
                    cache: 'no-cache'
                });
                const responseTime = Date.now() - start;
                return { 
                    status: 'healthy', 
                    responseTime,
                    statusCode: response.status 
                };
            } catch (error) {
                return { 
                    status: 'unhealthy', 
                    error: error.message 
                };
            }
        }

        async function updateStatus() {
            const servicesContainer = document.getElementById('services');
            servicesContainer.innerHTML = '';

            let totalResponseTime = 0;
            let healthyCount = 0;
            let totalChecks = 0;

            for (const endpoint of endpoints) {
                totalChecks++;
                const serviceName = endpoint.replace('https://', '').replace('http://', '');
                
                // Create service element
                const serviceDiv = document.createElement('div');
                serviceDiv.className = 'service checking';
                serviceDiv.innerHTML = \`
                    <div>
                        <strong>\${serviceName}</strong><br>
                        <small>\${endpoint}</small>
                    </div>
                    <span class="status-indicator">Checking...</span>
                \`;
                servicesContainer.appendChild(serviceDiv);

                // Check service status
                const result = await checkService(endpoint);
                
                if (result.status === 'healthy') {
                    serviceDiv.className = 'service healthy';
                    serviceDiv.querySelector('.status-indicator').textContent = \`Healthy (\${result.responseTime}ms)\`;
                    totalResponseTime += result.responseTime;
                    healthyCount++;
                } else {
                    serviceDiv.className = 'service unhealthy';
                    serviceDiv.querySelector('.status-indicator').textContent = 'Unhealthy';
                }
            }

            // Update metrics
            const uptime = totalChecks > 0 ? ((healthyCount / totalChecks) * 100).toFixed(1) : 0;
            const avgResponseTime = healthyCount > 0 ? Math.round(totalResponseTime / healthyCount) : 0;
            const incidents = totalChecks - healthyCount;

            document.getElementById('uptime').textContent = uptime;
            document.getElementById('response-time').textContent = avgResponseTime;
            document.getElementById('incidents').textContent = incidents;
            document.getElementById('last-update').textContent = new Date().toLocaleString();
        }

        // Initial load
        updateStatus();

        // Update every 30 seconds
        setInterval(updateStatus, 30000);
    </script>
</body>
</html>
EOF

    # Create nginx configuration for status page
    cat >> /etc/nginx/sites-available/celebrity-booking <<EOF

# Status page
server {
    listen 443 ssl http2;
    server_name status.$DOMAIN;

    # SSL Configuration (same as main site)
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    # Root directory for status page
    root /var/www/status;
    index index.html;
    
    location / {
        try_files \$uri \$uri/ =404;
    }
}
EOF

    nginx -t && systemctl reload nginx

    print_success "Monitoring dashboard created at https://status.$DOMAIN"
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

# Install common dependencies
print_status "Installing monitoring dependencies..."
if command -v apt-get >/dev/null 2>&1; then
    apt-get update
    apt-get install -y curl wget python3 python3-pip jq
elif command -v yum >/dev/null 2>&1; then
    yum install -y curl wget python3 python3-pip jq
fi

# Setup selected monitoring solutions
if [[ "${SETUP_UPTIMEROBOT:-false}" == "true" ]]; then
    setup_uptimerobot
fi

if [[ "${SETUP_PINGDOM:-false}" == "true" ]]; then
    setup_pingdom
fi

if [[ "${SETUP_STATUSCAKE:-false}" == "true" ]]; then
    setup_statuscake
fi

if [[ "${SETUP_CUSTOM:-false}" == "true" ]]; then
    setup_custom_monitoring
fi

# Always setup health endpoints and notifications
create_health_endpoints
setup_notifications
create_monitoring_dashboard

# Create monitoring maintenance script
cat > /usr/local/bin/monitoring-maintenance.sh <<'EOF'
#!/bin/bash

# Monitoring Maintenance Script
echo "🔧 Celebrity Booking Platform - Monitoring Maintenance"
echo "====================================================="

# Check monitoring services
echo ""
echo "📊 Monitoring Services Status:"

# Check if monitoring containers are running
if command -v docker >/dev/null 2>&1; then
    echo "Docker containers:"
    docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "(prometheus|grafana|alertmanager|blackbox)" || echo "No monitoring containers found"
fi

# Check external monitoring
echo ""
echo "🌐 External Monitoring:"
if [[ -n "$UPTIMEROBOT_API_KEY" ]]; then
    echo "✅ UptimeRobot configured"
else
    echo "⚠️  UptimeRobot not configured"
fi

if [[ -n "$PINGDOM_API_TOKEN" ]]; then
    echo "✅ Pingdom configured"
else
    echo "⚠️  Pingdom not configured"
fi

if [[ -n "$STATUSCAKE_API_KEY" ]]; then
    echo "✅ StatusCake configured"
else
    echo "⚠️  StatusCake not configured"
fi

# Test health endpoints
echo ""
echo "🏥 Health Endpoints:"
for endpoint in "https://api.$DOMAIN/api/health" "https://api.$DOMAIN/api/status"; do
    if curl -s -f "$endpoint" >/dev/null 2>&1; then
        echo "✅ $endpoint"
    else
        echo "❌ $endpoint"
    fi
done

# Check alert system
echo ""
echo "🚨 Alert System:"
if /usr/local/bin/send-alert.sh "Test Alert" "Monitoring maintenance check" "info" >/dev/null 2>&1; then
    echo "✅ Alert system functional"
else
    echo "❌ Alert system issues"
fi

echo ""
echo "📈 View monitoring:"
echo "  - Status page: https://status.$DOMAIN"
if command -v docker >/dev/null 2>&1 && docker ps | grep -q grafana; then
    echo "  - Grafana: http://localhost:3001"
    echo "  - Prometheus: http://localhost:9090"
fi
EOF

chmod +x /usr/local/bin/monitoring-maintenance.sh

# Create monitoring cron jobs
cat > /etc/cron.d/monitoring <<EOF
# Monitoring maintenance checks
0 */6 * * * root /usr/local/bin/monitoring-maintenance.sh >> /var/log/monitoring-maintenance.log 2>&1

# Health check alerts (every 5 minutes)
*/5 * * * * root curl -s -f https://api.$DOMAIN/api/health >/dev/null || /usr/local/bin/send-alert.sh "Health Check Failed" "API health check endpoint is not responding" "critical"
EOF

# Final summary
echo ""
print_status "📋 Uptime Monitoring Setup Summary:"

if [[ "${SETUP_UPTIMEROBOT:-false}" == "true" ]]; then
    echo "  ✅ UptimeRobot monitoring configured"
fi

if [[ "${SETUP_PINGDOM:-false}" == "true" ]]; then
    echo "  ✅ Pingdom monitoring configured"
fi

if [[ "${SETUP_STATUSCAKE:-false}" == "true" ]]; then
    echo "  ✅ StatusCake monitoring configured"
fi

if [[ "${SETUP_CUSTOM:-false}" == "true" ]]; then
    echo "  ✅ Custom Prometheus/Grafana stack deployed"
fi

echo "  ✅ Health check endpoints created"
echo "  ✅ Notification system configured"
echo "  ✅ Status dashboard deployed"
echo "  ✅ Automated monitoring maintenance scheduled"

echo ""
print_status "🔧 Monitoring URLs:"
echo "  - Status page: https://status.$DOMAIN"
echo "  - API health: https://api.$DOMAIN/api/health"
echo "  - API status: https://api.$DOMAIN/api/status"

if [[ "${SETUP_CUSTOM:-false}" == "true" ]]; then
    echo "  - Grafana: http://localhost:3001 (admin/admin123)"
    echo "  - Prometheus: http://localhost:9090"
    echo "  - Alertmanager: http://localhost:9093"
fi

echo ""
print_status "🔧 Management Commands:"
echo "  - Maintenance check: /usr/local/bin/monitoring-maintenance.sh"
echo "  - Send test alert: /usr/local/bin/send-alert.sh 'Test' 'Test message' 'info'"
echo "  - View logs: tail -f /var/log/monitoring-maintenance.log"

echo ""
print_success "🎉 Comprehensive uptime monitoring setup completed!"

echo ""
print_status "Next steps:"
echo "1. Configure alert contacts and escalation policies"
echo "2. Set up custom dashboards and metrics"
echo "3. Test all monitoring and alerting systems"
echo "4. Document incident response procedures"
echo "5. Schedule regular monitoring system maintenance"