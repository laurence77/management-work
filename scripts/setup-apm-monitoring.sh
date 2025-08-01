#!/bin/bash

# Application Performance Monitoring (APM) Setup
# This script sets up comprehensive APM with multiple providers and custom metrics

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

print_status "🚀 Celebrity Booking Platform - Application Performance Monitoring Setup"
echo ""

# Configuration
DOMAIN="${DOMAIN:-bookmyreservation.org}"
APP_NAME="celebrity-booking-platform"

echo "Select APM solution:"
echo "1. New Relic (Comprehensive APM)"
echo "2. Datadog (Full-stack monitoring)"
echo "3. AppDynamics (Enterprise APM)"
echo "4. Elastic APM (Part of ELK stack)"
echo "5. Custom APM with Prometheus + Grafana"
echo "6. Multiple providers (comprehensive setup)"
echo ""
read -p "Enter your choice (1-6): " choice

case $choice in
    1)
        SETUP_NEWRELIC=true
        ;;
    2)
        SETUP_DATADOG=true
        ;;
    3)
        SETUP_APPDYNAMICS=true
        ;;
    4)
        SETUP_ELASTIC_APM=true
        ;;
    5)
        SETUP_CUSTOM_APM=true
        ;;
    6)
        SETUP_NEWRELIC=true
        SETUP_DATADOG=true
        SETUP_ELASTIC_APM=true
        SETUP_CUSTOM_APM=true
        ;;
    *)
        print_error "Invalid choice"
        exit 1
        ;;
esac

# =============================================================================
# NEW RELIC SETUP
# =============================================================================

setup_newrelic() {
    print_status "Setting up New Relic APM..."
    
    if [[ -z "$NEW_RELIC_LICENSE_KEY" ]]; then
        print_warning "New Relic license key not provided"
        print_status "Get your license key from: https://one.newrelic.com"
        read -p "Enter New Relic license key (or press Enter to skip): " NEW_RELIC_LICENSE_KEY
    fi
    
    if [[ -n "$NEW_RELIC_LICENSE_KEY" ]]; then
        # Install New Relic Infrastructure agent
        print_status "Installing New Relic Infrastructure agent..."
        curl -Ls https://download.newrelic.com/install/newrelic-cli/scripts/install.sh | bash
        
        # Configure environment
        export NEW_RELIC_API_KEY="$NEW_RELIC_LICENSE_KEY"
        export NEW_RELIC_ACCOUNT_ID="${NEW_RELIC_ACCOUNT_ID:-}"
        export NEW_RELIC_REGION="${NEW_RELIC_REGION:-US}"
        
        # Install guided installation
        /usr/local/bin/newrelic install
        
        # Backend APM configuration
        print_status "Configuring Node.js APM agent..."
        
        # Install Node.js agent
        cd /opt/celebrity-booking/backend
        npm install newrelic --save
        
        # New Relic configuration
        cat > /opt/celebrity-booking/backend/newrelic.js <<EOF
'use strict'

/**
 * New Relic agent configuration for Celebrity Booking Platform
 */
exports.config = {
  app_name: ['Celebrity Booking API'],
  license_key: '$NEW_RELIC_LICENSE_KEY',
  logging: {
    level: 'info'
  },
  distributed_tracing: {
    enabled: true
  },
  transaction_tracer: {
    enabled: true,
    transaction_threshold: 'apdex_f',
    record_sql: 'obfuscated',
    explain_threshold: 500
  },
  error_collector: {
    enabled: true,
    ignore_status_codes: [404]
  },
  browser_monitoring: {
    enable: false
  },
  application_logging: {
    enabled: true,
    forwarding: {
      enabled: true,
      max_samples_stored: 10000
    },
    metrics: {
      enabled: true
    },
    local_decorating: {
      enabled: false
    }
  },
  attributes: {
    exclude: [
      'request.headers.cookie',
      'request.headers.authorization',
      'request.headers.x-api-key'
    ]
  },
  custom_insights_events: {
    enabled: true
  },
  security: {
    agent: {
      enabled: false
    }
  }
}
EOF

        # Update backend entry point to load New Relic first
        cat > /opt/celebrity-booking/backend/server.js <<'EOF'
// New Relic must be the first require
require('newrelic');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');
const { logger, requestLogger, errorLogger } = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(requestLogger);

// Custom New Relic instrumentation
const newrelic = require('newrelic');

// Custom middleware to add New Relic attributes
app.use((req, res, next) => {
  newrelic.addCustomAttribute('userId', req.user?.id);
  newrelic.addCustomAttribute('userRole', req.user?.role);
  newrelic.addCustomAttribute('apiVersion', 'v1');
  next();
});

// Performance monitoring middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Record custom metrics
    newrelic.recordMetric('Custom/API/ResponseTime', duration);
    newrelic.recordMetric(`Custom/API/Endpoint/${req.route?.path || req.path}`, duration);
    
    if (res.statusCode >= 400) {
      newrelic.recordMetric('Custom/API/Errors', 1);
    }
  });
  
  next();
});

// Routes
app.use('/api/health', require('./routes/health'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/celebrities', require('./routes/celebrities'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/n8n', require('./routes/n8n'));

// Error handling
app.use(errorLogger);
app.use((err, req, res, next) => {
  // Send error to New Relic
  newrelic.noticeError(err);
  
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  
  // Record application start event
  newrelic.recordCustomEvent('ApplicationStart', {
    port: PORT,
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

module.exports = app;
EOF

        # Frontend APM configuration
        print_status "Configuring Frontend APM..."
        
        cd /opt/celebrity-booking
        npm install --save @newrelic/browser
        
        # Create New Relic browser configuration
        cat > /opt/celebrity-booking/src/utils/newrelic.js <<EOF
import { BrowserAgent } from '@newrelic/browser';

// Initialize New Relic Browser Agent
const agent = new BrowserAgent({
  init: {
    distributed_tracing: { enabled: true },
    privacy: { cookies_enabled: true },
    ajax: { deny_list: ['bam.nr-data.net'] }
  },
  info: {
    beacon: 'bam.nr-data.net',
    errorBeacon: 'bam.nr-data.net',
    licenseKey: '$NEW_RELIC_LICENSE_KEY',
    applicationID: process.env.REACT_APP_NEW_RELIC_APP_ID,
    sa: 1
  },
  loader_config: {
    accountID: process.env.REACT_APP_NEW_RELIC_ACCOUNT_ID,
    trustKey: process.env.REACT_APP_NEW_RELIC_TRUST_KEY,
    agentID: process.env.REACT_APP_NEW_RELIC_AGENT_ID,
    licenseKey: '$NEW_RELIC_LICENSE_KEY',
    applicationID: process.env.REACT_APP_NEW_RELIC_APP_ID
  }
});

// Start the agent
agent.start();

// Custom instrumentation functions
export const recordCustomEvent = (eventType, attributes) => {
  if (window.newrelic) {
    window.newrelic.addPageAction(eventType, attributes);
  }
};

export const recordMetric = (name, value) => {
  if (window.newrelic) {
    window.newrelic.addPageAction('CustomMetric', { name, value });
  }
};

export const setCustomAttribute = (name, value) => {
  if (window.newrelic) {
    window.newrelic.setCustomAttribute(name, value);
  }
};

export const noticeError = (error, customAttributes = {}) => {
  if (window.newrelic) {
    window.newrelic.noticeError(error, customAttributes);
  }
};

export default agent;
EOF

        print_success "New Relic APM configured"
    else
        print_warning "Skipping New Relic setup - no license key provided"
    fi
}

# =============================================================================
# DATADOG SETUP
# =============================================================================

setup_datadog() {
    print_status "Setting up Datadog APM..."
    
    if [[ -z "$DATADOG_API_KEY" ]]; then
        print_warning "Datadog API key not provided"
        print_status "Get your API key from: https://app.datadoghq.com/account/settings#api"
        read -p "Enter Datadog API key (or press Enter to skip): " DATADOG_API_KEY
    fi
    
    if [[ -n "$DATADOG_API_KEY" ]]; then
        # Install Datadog Agent
        print_status "Installing Datadog Agent..."
        
        DD_AGENT_MAJOR_VERSION=7 DD_API_KEY=$DATADOG_API_KEY bash -c "$(curl -L https://s3.amazonaws.com/dd-agent/scripts/install_script.sh)"
        
        # Configure APM
        cat > /etc/datadog-agent/conf.d/apm.yaml <<EOF
init_config:

instances:
  - {}

# APM Configuration
apm_config:
  enabled: true
  env: production
  receiver_port: 8126
  apm_non_local_traffic: true
  max_traces_per_second: 10
  analyzed_rate_by_service:
    celebrity-booking-api: 1.0
    celebrity-booking-frontend: 0.1
EOF

        # Configure logs collection
        cat > /etc/datadog-agent/conf.d/logs.yaml <<EOF
logs:
  - type: file
    path: "/var/log/celebrity-booking/*.log"
    service: "celebrity-booking-api"
    source: "nodejs"
    sourcecategory: "application"
    
  - type: file
    path: "/var/log/nginx/access.log"
    service: "celebrity-booking-nginx"
    source: "nginx"
    sourcecategory: "http_web_access"
    
  - type: file
    path: "/var/log/nginx/error.log"
    service: "celebrity-booking-nginx"
    source: "nginx"
    sourcecategory: "http_web_access"
    log_processing_rules:
      - type: multi_line
        name: new_log_start_with_date
        pattern: \d{4}\/\d{2}\/\d{2}
EOF

        # Backend tracing setup
        cd /opt/celebrity-booking/backend
        npm install dd-trace --save
        
        # Create Datadog tracer
        cat > /opt/celebrity-booking/backend/datadog-tracer.js <<'EOF'
const tracer = require('dd-trace').init({
  service: 'celebrity-booking-api',
  env: process.env.NODE_ENV || 'development',
  version: process.env.npm_package_version || '1.0.0',
  logInjection: true,
  profiling: true,
  runtimeMetrics: true,
  plugins: false
});

// Enable specific integrations
tracer.use('express', {
  service: 'celebrity-booking-api',
  headers: ['user-agent', 'content-type']
});

tracer.use('http', {
  service: 'celebrity-booking-api-http'
});

tracer.use('pg', {
  service: 'celebrity-booking-db'
});

// Custom instrumentation
tracer.setTag = (key, value) => {
  const span = tracer.scope().active();
  if (span) {
    span.setTag(key, value);
  }
};

tracer.increment = (metric, value = 1, tags = []) => {
  tracer.dogstatsd.increment(metric, value, tags);
};

tracer.histogram = (metric, value, tags = []) => {
  tracer.dogstatsd.histogram(metric, value, tags);
};

module.exports = tracer;
EOF

        # Update server.js to include Datadog
        sed -i '1i// Datadog tracing must be imported first\nrequire("./datadog-tracer");' /opt/celebrity-booking/backend/server.js

        # Frontend RUM setup
        cd /opt/celebrity-booking
        npm install --save @datadog/browser-rum
        
        cat > /opt/celebrity-booking/src/utils/datadog.js <<EOF
import { datadogRum } from '@datadog/browser-rum';

datadogRum.init({
  applicationId: process.env.REACT_APP_DATADOG_APPLICATION_ID,
  clientToken: process.env.REACT_APP_DATADOG_CLIENT_TOKEN,
  site: 'datadoghq.com',
  service: 'celebrity-booking-frontend',
  env: process.env.NODE_ENV || 'development',
  version: process.env.REACT_APP_VERSION || '1.0.0',
  sessionSampleRate: 100,
  sessionReplaySampleRate: 20,
  trackUserInteractions: true,
  trackResources: true,
  trackLongTasks: true,
  defaultPrivacyLevel: 'mask-user-input',
  allowedTracingUrls: [
    { match: process.env.REACT_APP_API_URL, propagatorTypes: ['datadog'] }
  ]
});

datadogRum.startSessionReplayRecording();

// Custom event tracking
export const trackEvent = (name, context = {}) => {
  datadogRum.addAction(name, context);
};

export const trackError = (error, context = {}) => {
  datadogRum.addError(error, context);
};

export const setUser = (user) => {
  datadogRum.setUser({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  });
};

export const addAttribute = (key, value) => {
  datadogRum.addAttribute(key, value);
};

export default datadogRum;
EOF

        # Start Datadog agent
        systemctl enable datadog-agent
        systemctl start datadog-agent
        
        print_success "Datadog APM configured"
    else
        print_warning "Skipping Datadog setup - no API key provided"
    fi
}

# =============================================================================
# ELASTIC APM SETUP
# =============================================================================

setup_elastic_apm() {
    print_status "Setting up Elastic APM..."
    
    # Check if Elasticsearch is running
    if ! curl -s "http://localhost:9200" >/dev/null 2>&1; then
        print_warning "Elasticsearch not available. Starting basic Elastic APM server..."
        
        # Install APM Server
        curl -L -O https://artifacts.elastic.co/downloads/apm-server/apm-server-8.11.0-amd64.deb
        dpkg -i apm-server-8.11.0-amd64.deb
        rm apm-server-8.11.0-amd64.deb
        
        # Configure APM Server
        cat > /etc/apm-server/apm-server.yml <<EOF
apm-server:
  host: "0.0.0.0:8200"
  rum:
    enabled: true
    allow_origins: ["*"]
    library_pattern: "node_modules|bower_components|~"
    exclude_from_grouping: "^/webpack"
    source_mapping:
      enabled: true

output.elasticsearch:
  hosts: ["localhost:9200"]
  
setup.kibana:
  host: "localhost:5601"

logging.level: info
logging.to_files: true
logging.files:
  path: /var/log/apm-server
  name: apm-server
  keepfiles: 7
  permissions: 0644
EOF

        systemctl enable apm-server
        systemctl start apm-server
    fi
    
    # Backend APM setup
    cd /opt/celebrity-booking/backend
    npm install elastic-apm-node --save
    
    # Create Elastic APM configuration
    cat > /opt/celebrity-booking/backend/elastic-apm.js <<'EOF'
const apm = require('elastic-apm-node').start({
  serviceName: 'celebrity-booking-api',
  secretToken: process.env.ELASTIC_APM_SECRET_TOKEN,
  serverUrl: process.env.ELASTIC_APM_SERVER_URL || 'http://localhost:8200',
  environment: process.env.NODE_ENV || 'development',
  active: process.env.NODE_ENV === 'production',
  captureBody: 'errors',
  errorOnAbortedRequests: true,
  captureErrorLogStackTraces: 'always',
  usePathAsTransactionName: true,
  transactionSampleRate: 1.0,
  spanFramesMinDuration: '5ms',
  stackTraceLimit: 50,
  captureSpanStackTraces: true
});

// Custom instrumentation helpers
apm.addLabels = (labels) => {
  const transaction = apm.currentTransaction;
  if (transaction) {
    Object.keys(labels).forEach(key => {
      transaction.setLabel(key, labels[key]);
    });
  }
};

apm.setUserContext = (user) => {
  apm.setUserContext({
    id: user.id,
    username: user.username || user.email,
    email: user.email
  });
};

apm.setCustomContext = (context) => {
  apm.setCustomContext(context);
};

module.exports = apm;
EOF

        # Update server.js for Elastic APM
        sed -i '1i// Elastic APM must be imported first\nconst apm = require("./elastic-apm");' /opt/celebrity-booking/backend/server.js

        # Frontend RUM setup
        cd /opt/celebrity-booking
        npm install --save @elastic/apm-rum
        
        cat > /opt/celebrity-booking/src/utils/elastic-apm.js <<'EOF'
import { init as initApm } from '@elastic/apm-rum';

const apm = initApm({
  serviceName: 'celebrity-booking-frontend',
  serverUrl: process.env.REACT_APP_ELASTIC_APM_SERVER_URL || 'http://localhost:8200',
  serviceVersion: process.env.REACT_APP_VERSION || '1.0.0',
  environment: process.env.NODE_ENV || 'development',
  distributedTracingOrigins: [
    process.env.REACT_APP_API_URL
  ],
  active: process.env.NODE_ENV === 'production'
});

// Custom instrumentation
export const startTransaction = (name, type = 'custom') => {
  return apm.startTransaction(name, type);
};

export const startSpan = (name, type = 'custom') => {
  return apm.startSpan(name, type);
};

export const setUserContext = (user) => {
  apm.setUserContext({
    id: user.id,
    username: user.name || user.email,
    email: user.email
  });
};

export const setCustomContext = (context) => {
  apm.setCustomContext(context);
};

export const setLabels = (labels) => {
  apm.setLabels(labels);
};

export const captureError = (error) => {
  apm.captureError(error);
};

export default apm;
EOF

        print_success "Elastic APM configured"
}

# =============================================================================
# CUSTOM APM WITH PROMETHEUS + GRAFANA
# =============================================================================

setup_custom_apm() {
    print_status "Setting up Custom APM with Prometheus + Grafana..."
    
    # Create metrics directory
    mkdir -p /opt/apm/{prometheus,grafana,node-exporter}
    
    # Prometheus configuration for APM
    cat > /opt/apm/prometheus/prometheus.yml <<EOF
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "apm_rules.yml"

scrape_configs:
  - job_name: 'celebrity-booking-api'
    static_configs:
      - targets: ['localhost:3001']  # Metrics endpoint
    scrape_interval: 5s
    metrics_path: /metrics

  - job_name: 'nginx'
    static_configs:
      - targets: ['localhost:9113']  # Nginx exporter
    scrape_interval: 15s

  - job_name: 'node'
    static_configs:
      - targets: ['localhost:9100']  # Node exporter
    scrape_interval: 15s

  - job_name: 'postgres'
    static_configs:
      - targets: ['localhost:9187']  # Postgres exporter
    scrape_interval: 15s
EOF

    # APM alerting rules
    cat > /opt/apm/prometheus/apm_rules.yml <<'EOF'
groups:
- name: apm_alerts
  rules:
  - alert: HighResponseTime
    expr: http_request_duration_seconds{quantile="0.95"} > 2
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High response time detected"
      description: "95th percentile response time is {{ $value }} seconds"

  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "High error rate detected"
      description: "Error rate is {{ $value }} errors per second"

  - alert: HighMemoryUsage
    expr: process_resident_memory_bytes / 1024 / 1024 > 500
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High memory usage"
      description: "Process using {{ $value }}MB of memory"

  - alert: HighCPUUsage
    expr: rate(process_cpu_seconds_total[5m]) * 100 > 80
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High CPU usage"
      description: "CPU usage is {{ $value }}%"
EOF

    # Backend metrics collection
    cd /opt/celebrity-booking/backend
    npm install prom-client express-prometheus-middleware --save
    
    cat > /opt/celebrity-booking/backend/utils/metrics.js <<'EOF'
const client = require('prom-client');
const promMid = require('express-prometheus-middleware');

// Create a Registry to register the metrics
const register = new client.Registry();

// Add default metrics
client.collectDefaultMetrics({
  app: 'celebrity-booking-api',
  timeout: 10000,
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
  register
});

// Custom metrics
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  registers: [register]
});

const activeConnections = new client.Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  registers: [register]
});

const databaseQueries = new client.Counter({
  name: 'database_queries_total',
  help: 'Total number of database queries',
  labelNames: ['operation', 'table'],
  registers: [register]
});

const databaseQueryDuration = new client.Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register]
});

const businessMetrics = {
  bookingsTotal: new client.Counter({
    name: 'bookings_total',
    help: 'Total number of bookings',
    labelNames: ['status', 'celebrity_category'],
    registers: [register]
  }),
  
  revenueTotal: new client.Counter({
    name: 'revenue_total',
    help: 'Total revenue in dollars',
    labelNames: ['payment_method'],
    registers: [register]
  }),
  
  userRegistrations: new client.Counter({
    name: 'user_registrations_total',
    help: 'Total number of user registrations',
    labelNames: ['source'],
    registers: [register]
  }),
  
  emailsSent: new client.Counter({
    name: 'emails_sent_total',
    help: 'Total number of emails sent',
    labelNames: ['type', 'status'],
    registers: [register]
  })
};

// Middleware for automatic HTTP metrics
const metricsMiddleware = promMid({
  metricsPath: '/metrics',
  collectDefaultMetrics: true,
  requestDurationBuckets: [0.1, 0.5, 1, 1.5, 2, 3, 5, 10],
  requestLengthBuckets: [512, 1024, 5120, 10240, 51200, 102400],
  responseLengthBuckets: [512, 1024, 5120, 10240, 51200, 102400],
  promClient: client,
  promRegistry: register
});

// Custom middleware for detailed metrics
const customMetricsMiddleware = (req, res, next) => {
  const start = Date.now();
  
  // Track active connections
  activeConnections.inc();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;
    
    // Record metrics
    httpRequestsTotal.inc({
      method: req.method,
      route,
      status_code: res.statusCode
    });
    
    httpRequestDuration.observe({
      method: req.method,
      route,
      status_code: res.statusCode
    }, duration);
    
    activeConnections.dec();
  });
  
  next();
};

// Database metrics helper
const trackDatabaseQuery = (operation, table, duration) => {
  databaseQueries.inc({ operation, table });
  databaseQueryDuration.observe({ operation, table }, duration / 1000);
};

// Business metrics helpers
const trackBooking = (status, category) => {
  businessMetrics.bookingsTotal.inc({ status, celebrity_category: category });
};

const trackRevenue = (amount, paymentMethod) => {
  businessMetrics.revenueTotal.inc({ payment_method: paymentMethod }, amount);
};

const trackUserRegistration = (source) => {
  businessMetrics.userRegistrations.inc({ source });
};

const trackEmailSent = (type, status) => {
  businessMetrics.emailsSent.inc({ type, status });
};

// Metrics endpoint
const getMetrics = async () => {
  return await register.metrics();
};

module.exports = {
  register,
  metricsMiddleware,
  customMetricsMiddleware,
  trackDatabaseQuery,
  trackBooking,
  trackRevenue,
  trackUserRegistration,
  trackEmailSent,
  getMetrics,
  client
};
EOF

    # Frontend performance metrics
    cat > /opt/celebrity-booking/src/utils/performance.js <<'EOF'
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.observers = new Map();
    this.initializeObservers();
  }

  initializeObservers() {
    if ('PerformanceObserver' in window) {
      // Navigation timing
      const navObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordNavigationMetrics(entry);
        }
      });
      navObserver.observe({ entryTypes: ['navigation'] });
      
      // Resource timing
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordResourceMetrics(entry);
        }
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
      
      // Paint timing
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordPaintMetrics(entry);
        }
      });
      paintObserver.observe({ entryTypes: ['paint'] });
      
      // Layout shift
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordLayoutShift(entry);
        }
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    }
  }

  recordNavigationMetrics(entry) {
    const metrics = {
      dns_lookup: entry.domainLookupEnd - entry.domainLookupStart,
      tcp_connect: entry.connectEnd - entry.connectStart,
      tls_negotiate: entry.secureConnectionStart ? entry.connectEnd - entry.secureConnectionStart : 0,
      request_time: entry.responseStart - entry.requestStart,
      response_time: entry.responseEnd - entry.responseStart,
      dom_parse: entry.domContentLoadedEventEnd - entry.responseEnd,
      dom_ready: entry.domContentLoadedEventEnd - entry.navigationStart,
      page_load: entry.loadEventEnd - entry.navigationStart,
      ttfb: entry.responseStart - entry.navigationStart
    };

    this.sendMetrics('navigation', metrics);
  }

  recordResourceMetrics(entry) {
    if (entry.duration > 100) { // Only track slow resources
      const metrics = {
        name: entry.name,
        duration: entry.duration,
        size: entry.transferSize || 0,
        type: this.getResourceType(entry.name)
      };

      this.sendMetrics('resource', metrics);
    }
  }

  recordPaintMetrics(entry) {
    const metrics = {
      [entry.name.replace('-', '_')]: entry.startTime
    };

    this.sendMetrics('paint', metrics);
  }

  recordLayoutShift(entry) {
    if (entry.hadRecentInput) return; // Ignore shifts caused by user input

    const metrics = {
      value: entry.value,
      sources: entry.sources?.length || 0
    };

    this.sendMetrics('layout_shift', metrics);
  }

  getResourceType(url) {
    if (url.includes('.js')) return 'javascript';
    if (url.includes('.css')) return 'stylesheet';
    if (url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) return 'image';
    if (url.includes('/api/')) return 'api';
    return 'other';
  }

  // Custom timing measurement
  startTiming(name) {
    this.metrics.set(name, performance.now());
  }

  endTiming(name, metadata = {}) {
    const startTime = this.metrics.get(name);
    if (startTime) {
      const duration = performance.now() - startTime;
      this.sendMetrics('custom_timing', {
        name,
        duration,
        ...metadata
      });
      this.metrics.delete(name);
    }
  }

  // User interaction tracking
  trackUserAction(action, element, metadata = {}) {
    this.sendMetrics('user_action', {
      action,
      element: element?.tagName || 'unknown',
      timestamp: Date.now(),
      ...metadata
    });
  }

  // Error tracking
  trackError(error, context = {}) {
    this.sendMetrics('frontend_error', {
      message: error.message,
      stack: error.stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
      ...context
    });
  }

  // Send metrics to backend
  sendMetrics(type, data) {
    const payload = {
      type,
      data,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      userId: this.getUserId()
    };

    // Use beacon API for reliability
    if ('sendBeacon' in navigator) {
      navigator.sendBeacon('/api/metrics', JSON.stringify(payload));
    } else {
      // Fallback to fetch
      fetch('/api/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => {}); // Ignore errors
    }
  }

  getUserId() {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user.id || null;
    } catch {
      return null;
    }
  }

  // Web Vitals measurement
  measureWebVitals() {
    // Largest Contentful Paint
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.sendMetrics('web_vitals', {
        metric: 'lcp',
        value: lastEntry.startTime
      });
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay
    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        this.sendMetrics('web_vitals', {
          metric: 'fid',
          value: entry.processingStart - entry.startTime
        });
      }
    }).observe({ entryTypes: ['first-input'] });
  }
}

// Initialize performance monitor
const performanceMonitor = new PerformanceMonitor();

// Auto-track page load
window.addEventListener('load', () => {
  performanceMonitor.measureWebVitals();
});

export default performanceMonitor;
EOF

    # Docker Compose for Custom APM
    cat > /opt/apm/docker-compose.yml <<EOF
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus-apm
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
      - '--web.enable-admin-api'
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    container_name: grafana-apm
    ports:
      - "3003:3000"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning
      - ./grafana/dashboards:/var/lib/grafana/dashboards
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin123
      - GF_USERS_ALLOW_SIGN_UP=false
      - GF_INSTALL_PLUGINS=grafana-piechart-panel,grafana-worldmap-panel
    restart: unless-stopped

  node-exporter:
    image: prom/node-exporter:latest
    container_name: node-exporter-apm
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

  nginx-exporter:
    image: nginx/nginx-prometheus-exporter:latest
    container_name: nginx-exporter
    ports:
      - "9113:9113"
    command:
      - '-nginx.scrape-uri=http://host.docker.internal/nginx_status'
    restart: unless-stopped

volumes:
  prometheus_data:
  grafana_data:
EOF

    # Start Custom APM stack
    cd /opt/apm
    docker-compose up -d
    
    print_success "Custom APM with Prometheus + Grafana configured"
}

# =============================================================================
# PERFORMANCE OPTIMIZATION
# =============================================================================

setup_performance_optimization() {
    print_status "Setting up performance optimization..."
    
    # Backend performance optimizations
    cat > /opt/celebrity-booking/backend/utils/performance.js <<'EOF'
const cluster = require('cluster');
const os = require('os');

class PerformanceOptimizer {
  constructor() {
    this.responseTimeThreshold = 1000; // 1 second
    this.memoryThreshold = 500 * 1024 * 1024; // 500MB
  }

  // Cluster setup for production
  setupCluster() {
    if (process.env.NODE_ENV === 'production' && cluster.isMaster) {
      const numCPUs = os.cpus().length;
      console.log(`Master ${process.pid} is running`);

      // Fork workers
      for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
      }

      cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died`);
        cluster.fork();
      });

      return false; // Don't start the server in master process
    }
    return true; // Start server in worker process
  }

  // Memory monitoring
  monitorMemory() {
    setInterval(() => {
      const memUsage = process.memoryUsage();
      
      if (memUsage.heapUsed > this.memoryThreshold) {
        console.warn(`High memory usage: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
    }, 30000); // Check every 30 seconds
  }

  // Response time monitoring
  responseTimeMiddleware() {
    return (req, res, next) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        
        if (duration > this.responseTimeThreshold) {
          console.warn(`Slow response: ${req.method} ${req.path} - ${duration}ms`);
        }
      });
      
      next();
    };
  }

  // Database connection optimization
  optimizeDatabase() {
    // Connection pooling is handled by Supabase
    // But we can optimize queries
    return {
      // Query timeout
      statement_timeout: '30s',
      
      // Connection limits
      max_connections: 100,
      
      // Query optimization
      work_mem: '4MB',
      shared_buffers: '256MB'
    };
  }

  // Cache warming
  warmCache() {
    // Warm up critical endpoints
    const criticalEndpoints = [
      '/api/celebrities',
      '/api/categories',
      '/api/health'
    ];

    criticalEndpoints.forEach(endpoint => {
      setTimeout(() => {
        require('http').get(`http://localhost:3000${endpoint}`, (res) => {
          console.log(`Cache warmed: ${endpoint}`);
        });
      }, 1000);
    });
  }
}

module.exports = PerformanceOptimizer;
EOF

    # Frontend performance optimizations
    cat > /opt/celebrity-booking/src/utils/performance-optimizer.js <<'EOF'
class FrontendPerformanceOptimizer {
  constructor() {
    this.lazyLoadImages();
    this.setupIntersectionObserver();
    this.optimizeBundle();
  }

  // Lazy loading for images
  lazyLoadImages() {
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.classList.remove('lazy');
            observer.unobserve(img);
          }
        });
      });

      document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
      });
    }
  }

  // Intersection observer for analytics
  setupIntersectionObserver() {
    if ('IntersectionObserver' in window) {
      const analyticsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const element = entry.target;
            if (element.dataset.track) {
              this.trackVisibility(element.dataset.track);
            }
          }
        });
      }, { threshold: 0.5 });

      document.querySelectorAll('[data-track]').forEach(el => {
        analyticsObserver.observe(el);
      });
    }
  }

  // Bundle optimization techniques
  optimizeBundle() {
    // Preload critical resources
    this.preloadCriticalResources();
    
    // Prefetch non-critical resources
    this.prefetchResources();
  }

  preloadCriticalResources() {
    const criticalResources = [
      '/api/user/profile',
      '/api/celebrities?featured=true'
    ];

    criticalResources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'fetch';
      link.href = resource;
      document.head.appendChild(link);
    });
  }

  prefetchResources() {
    // Prefetch likely next pages
    const prefetchUrls = [
      '/celebrities',
      '/bookings',
      '/profile'
    ];

    prefetchUrls.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = url;
      document.head.appendChild(link);
    });
  }

  // Performance budgets
  monitorPerformanceBudget() {
    const budget = {
      initialLoad: 3000,  // 3 seconds
      interactionDelay: 100,  // 100ms
      memoryUsage: 50 * 1024 * 1024  // 50MB
    };

    // Monitor initial load time
    window.addEventListener('load', () => {
      const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
      if (loadTime > budget.initialLoad) {
        console.warn(`Performance budget exceeded: Load time ${loadTime}ms`);
      }
    });

    // Monitor memory usage
    if ('memory' in performance) {
      setInterval(() => {
        const memInfo = performance.memory;
        if (memInfo.usedJSHeapSize > budget.memoryUsage) {
          console.warn(`Memory budget exceeded: ${Math.round(memInfo.usedJSHeapSize / 1024 / 1024)}MB`);
        }
      }, 60000);
    }
  }

  // Network optimization
  optimizeNetworkRequests() {
    // Request deduplication
    this.requestCache = new Map();
    
    // Debounced requests
    this.debouncedRequests = new Map();
  }

  // Debounce network requests
  debounceRequest(key, fn, delay = 300) {
    if (this.debouncedRequests.has(key)) {
      clearTimeout(this.debouncedRequests.get(key));
    }

    const timeoutId = setTimeout(fn, delay);
    this.debouncedRequests.set(key, timeoutId);
  }

  // Track visibility for analytics
  trackVisibility(element) {
    if (window.analytics) {
      window.analytics.track('Element Viewed', {
        element,
        timestamp: Date.now(),
        page: window.location.pathname
      });
    }
  }
}

// Initialize performance optimizer
const performanceOptimizer = new FrontendPerformanceOptimizer();

export default performanceOptimizer;
EOF

    print_success "Performance optimization configured"
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

# Install common dependencies
print_status "Installing APM dependencies..."
if command -v apt-get >/dev/null 2>&1; then
    apt-get update
    apt-get install -y curl wget python3 python3-pip
elif command -v yum >/dev/null 2>&1; then
    yum install -y curl wget python3 python3-pip
fi

# Setup selected APM solutions
if [[ "${SETUP_NEWRELIC:-false}" == "true" ]]; then
    setup_newrelic
fi

if [[ "${SETUP_DATADOG:-false}" == "true" ]]; then
    setup_datadog
fi

if [[ "${SETUP_ELASTIC_APM:-false}" == "true" ]]; then
    setup_elastic_apm
fi

if [[ "${SETUP_CUSTOM_APM:-false}" == "true" ]]; then
    setup_custom_apm
fi

# Always setup performance optimization
setup_performance_optimization

# Create APM dashboard script
cat > /usr/local/bin/apm-dashboard.sh <<'EOF'
#!/bin/bash

echo "🚀 Celebrity Booking Platform - APM Dashboard"
echo "============================================="

echo ""
echo "📊 APM Services Status:"

# Check if APM containers are running
if command -v docker >/dev/null 2>&1; then
    echo "Docker containers:"
    docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "(prometheus|grafana|apm)" || echo "No APM containers found"
fi

# Check system performance
echo ""
echo "⚡ System Performance:"
echo "CPU Usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')%"
echo "Memory Usage: $(free | grep Mem | awk '{printf("%.1f%%", $3/$2 * 100.0)}')"
echo "Disk Usage: $(df -h / | awk 'NR==2 {print $5}')"

# Check application metrics
echo ""
echo "📈 Application Metrics:"
if curl -s http://localhost:3001/metrics >/dev/null 2>&1; then
    echo "✅ Metrics endpoint available"
    echo "Response time (avg): $(curl -s http://localhost:3001/metrics | grep http_request_duration_seconds_sum | tail -1 | awk '{print $2}')s"
else
    echo "❌ Metrics endpoint not available"
fi

echo ""
echo "🔗 APM Access URLs:"
if docker ps | grep -q prometheus; then
    echo "  Prometheus: http://localhost:9090"
fi
if docker ps | grep -q grafana; then
    echo "  Grafana: http://localhost:3003 (admin/admin123)"
fi
echo "  Application Metrics: http://localhost:3001/metrics"
EOF

chmod +x /usr/local/bin/apm-dashboard.sh

# Final summary
echo ""
print_status "📋 Application Performance Monitoring Setup Summary:"

if [[ "${SETUP_NEWRELIC:-false}" == "true" ]]; then
    echo "  ✅ New Relic APM configured"
fi

if [[ "${SETUP_DATADOG:-false}" == "true" ]]; then
    echo "  ✅ Datadog APM configured"
fi

if [[ "${SETUP_ELASTIC_APM:-false}" == "true" ]]; then
    echo "  ✅ Elastic APM configured"
fi

if [[ "${SETUP_CUSTOM_APM:-false}" == "true" ]]; then
    echo "  ✅ Custom APM with Prometheus + Grafana configured"
fi

echo "  ✅ Performance optimization configured"
echo "  ✅ Custom metrics collection enabled"
echo "  ✅ Frontend performance monitoring setup"
echo "  ✅ Business metrics tracking implemented"

echo ""
print_status "🔧 Access Points:"
if [[ "${SETUP_CUSTOM_APM:-false}" == "true" ]]; then
    echo "  - Grafana: http://localhost:3003 (admin/admin123)"
    echo "  - Prometheus: http://localhost:9090"
fi
echo "  - Application metrics: http://localhost:3001/metrics"

echo ""
print_status "🔧 Management Commands:"
echo "  - APM dashboard: /usr/local/bin/apm-dashboard.sh"
echo "  - View metrics: curl http://localhost:3001/metrics"
echo "  - Check performance: top, htop, iotop"

echo ""
print_success "🎉 Comprehensive APM setup completed!"

echo ""
print_status "Next steps:"
echo "1. Configure alert thresholds and escalation policies"
echo "2. Create custom dashboards for business metrics"
echo "3. Set up automated performance testing"
echo "4. Train team on APM tools and troubleshooting"
echo "5. Implement performance budgets and SLAs"