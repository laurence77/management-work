#!/bin/bash

# Log Aggregation and Monitoring Setup (ELK Stack + Cloud Logging)
# This script sets up comprehensive log aggregation with Elasticsearch, Logstash, Kibana, and cloud logging

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

print_status "📊 Celebrity Booking Platform - Log Monitoring Setup"
echo ""

# Configuration
DOMAIN="${DOMAIN:-bookmyreservation.org}"
ELK_VERSION="8.11.0"
LOG_RETENTION_DAYS="${LOG_RETENTION_DAYS:-30}"

echo "Select logging solution:"
echo "1. ELK Stack (Elasticsearch, Logstash, Kibana) - Self-hosted"
echo "2. Cloud Logging (AWS CloudWatch, Google Cloud Logging)"
echo "3. Hybrid (ELK + Cloud Logging)"
echo "4. Lightweight (Loki + Grafana)"
echo "5. All solutions (comprehensive setup)"
echo ""
read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        SETUP_ELK=true
        ;;
    2)
        SETUP_CLOUD=true
        ;;
    3)
        SETUP_ELK=true
        SETUP_CLOUD=true
        ;;
    4)
        SETUP_LOKI=true
        ;;
    5)
        SETUP_ELK=true
        SETUP_CLOUD=true
        SETUP_LOKI=true
        ;;
    *)
        print_error "Invalid choice"
        exit 1
        ;;
esac

# =============================================================================
# ELK STACK SETUP
# =============================================================================

setup_elk_stack() {
    print_status "Setting up ELK Stack (Elasticsearch, Logstash, Kibana)..."
    
    # Check system requirements
    TOTAL_RAM=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    TOTAL_RAM_GB=$((TOTAL_RAM / 1024 / 1024))
    
    if [[ $TOTAL_RAM_GB -lt 8 ]]; then
        print_warning "ELK Stack requires at least 8GB RAM. Current: ${TOTAL_RAM_GB}GB"
        print_status "Proceeding with reduced memory settings..."
        ES_HEAP_SIZE="2g"
        LS_HEAP_SIZE="1g"
    else
        ES_HEAP_SIZE="4g"
        LS_HEAP_SIZE="2g"
    fi
    
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
    
    # Create ELK directory structure
    mkdir -p /opt/elk/{elasticsearch,logstash,kibana,filebeat}
    mkdir -p /opt/elk/elasticsearch/{data,logs}
    mkdir -p /opt/elk/logstash/{config,pipeline,logs}
    mkdir -p /opt/elk/kibana/{config,logs}
    
    # Set proper permissions
    chown -R 1000:1000 /opt/elk/elasticsearch
    chown -R 1000:1000 /opt/elk/kibana
    
    # Elasticsearch configuration
    cat > /opt/elk/elasticsearch/elasticsearch.yml <<EOF
cluster.name: "celebrity-booking-logs"
node.name: "celebrity-booking-node-1"
network.host: 0.0.0.0
http.port: 9200
discovery.type: single-node

# Security
xpack.security.enabled: true
xpack.security.authc.api_key.enabled: true
xpack.security.transport.ssl.enabled: true
xpack.security.transport.ssl.verification_mode: certificate
xpack.security.transport.ssl.keystore.path: elastic-certificates.p12
xpack.security.transport.ssl.truststore.path: elastic-certificates.p12

# Performance
indices.memory.index_buffer_size: 20%
indices.queries.cache.size: 20%

# Index lifecycle management
action.destructive_requires_name: true
EOF

    # Logstash configuration
    cat > /opt/elk/logstash/logstash.yml <<EOF
node.name: celebrity-booking-logstash
pipeline.workers: 2
pipeline.batch.size: 1000
pipeline.batch.delay: 50
path.config: /usr/share/logstash/pipeline
path.logs: /var/log/logstash
xpack.monitoring.enabled: true
xpack.monitoring.elasticsearch.hosts: ["http://elasticsearch:9200"]
EOF

    # Logstash pipeline configuration
    cat > /opt/elk/logstash/pipeline/celebrity-booking.conf <<'EOF'
input {
  beats {
    port => 5044
  }
  
  # Syslog input
  syslog {
    port => 514
    type => "syslog"
  }
  
  # Application logs via HTTP
  http {
    port => 8080
    type => "application"
  }
}

filter {
  if [type] == "application" {
    # Parse JSON logs
    if [message] =~ /^{.*}$/ {
      json {
        source => "message"
      }
    }
    
    # Parse timestamp
    if [timestamp] {
      date {
        match => [ "timestamp", "ISO8601" ]
      }
    }
    
    # Add application-specific fields
    mutate {
      add_field => { "application" => "celebrity-booking" }
      add_field => { "environment" => "%{[@metadata][environment]}" }
    }
  }
  
  if [type] == "nginx" {
    grok {
      match => { 
        "message" => "%{NGINXACCESS}"
      }
    }
    
    # Parse response time
    if [request_time] {
      mutate {
        convert => { "request_time" => "float" }
      }
    }
    
    # GeoIP lookup
    if [clientip] {
      geoip {
        source => "clientip"
        target => "geoip"
      }
    }
  }
  
  if [type] == "supabase" {
    # Parse Supabase logs
    json {
      source => "message"
    }
    
    # Extract SQL queries
    if [msg] and [msg] =~ /.*SQL.*/ {
      mutate {
        add_tag => ["sql_query"]
      }
    }
  }
  
  # Common filters
  mutate {
    remove_field => [ "host", "agent", "ecs" ]
  }
  
  # Add severity level
  if [level] {
    if [level] in ["error", "fatal", "ERROR", "FATAL"] {
      mutate { add_tag => ["severity_high"] }
    } else if [level] in ["warn", "warning", "WARN", "WARNING"] {
      mutate { add_tag => ["severity_medium"] }
    } else {
      mutate { add_tag => ["severity_low"] }
    }
  }
}

output {
  elasticsearch {
    hosts => ["http://elasticsearch:9200"]
    index => "celebrity-booking-logs-%{+YYYY.MM.dd}"
    user => "elastic"
    password => "${ELASTIC_PASSWORD}"
  }
  
  # High severity alerts
  if "severity_high" in [tags] {
    http {
      url => "http://localhost:3000/api/alerts/log"
      http_method => "post"
      format => "json"
      mapping => {
        "level" => "%{level}"
        "message" => "%{message}"
        "timestamp" => "%{@timestamp}"
        "application" => "%{application}"
        "type" => "%{type}"
      }
    }
  }
  
  # Debug output (remove in production)
  # stdout { codec => rubydebug }
}
EOF

    # Kibana configuration
    cat > /opt/elk/kibana/kibana.yml <<EOF
server.name: "celebrity-booking-kibana"
server.host: "0.0.0.0"
server.port: 5601
elasticsearch.hosts: ["http://elasticsearch:9200"]
elasticsearch.username: "elastic"
elasticsearch.password: "${ELASTIC_PASSWORD:-changeme}"

# Security
xpack.security.enabled: true
xpack.encryptedSavedObjects.encryptionKey: "celebrity-booking-kibana-encryption-key-32-chars"
xpack.reporting.encryptionKey: "celebrity-booking-kibana-reporting-key-32-chars"
xpack.security.encryptionKey: "celebrity-booking-kibana-security-key-32-chars"

# Performance
server.maxPayload: 1048576
elasticsearch.requestTimeout: 30000
elasticsearch.shardTimeout: 30000
logging.dest: /var/log/kibana/kibana.log
EOF

    # Docker Compose for ELK Stack
    cat > /opt/elk/docker-compose.yml <<EOF
version: '3.8'

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:${ELK_VERSION}
    container_name: elasticsearch
    environment:
      - node.name=celebrity-booking-es
      - cluster.name=celebrity-booking-logs
      - discovery.type=single-node
      - bootstrap.memory_lock=true
      - "ES_JAVA_OPTS=-Xms${ES_HEAP_SIZE} -Xmx${ES_HEAP_SIZE}"
      - ELASTIC_PASSWORD=\${ELASTIC_PASSWORD:-changeme}
      - xpack.security.enabled=true
    ulimits:
      memlock:
        soft: -1
        hard: -1
    volumes:
      - ./elasticsearch/elasticsearch.yml:/usr/share/elasticsearch/config/elasticsearch.yml:ro
      - ./elasticsearch/data:/usr/share/elasticsearch/data
      - ./elasticsearch/logs:/usr/share/elasticsearch/logs
    ports:
      - "9200:9200"
    networks:
      - elk
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "curl -s -f http://localhost:9200/_cluster/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 5

  logstash:
    image: docker.elastic.co/logstash/logstash:${ELK_VERSION}
    container_name: logstash
    environment:
      - "LS_JAVA_OPTS=-Xms${LS_HEAP_SIZE} -Xmx${LS_HEAP_SIZE}"
      - ELASTIC_PASSWORD=\${ELASTIC_PASSWORD:-changeme}
    volumes:
      - ./logstash/logstash.yml:/usr/share/logstash/config/logstash.yml:ro
      - ./logstash/pipeline:/usr/share/logstash/pipeline:ro
      - ./logstash/logs:/var/log/logstash
    ports:
      - "5044:5044"  # Beats input
      - "5000:5000"  # TCP input
      - "9600:9600"  # API
      - "514:514/udp"  # Syslog
      - "8080:8080"  # HTTP input
    networks:
      - elk
    depends_on:
      elasticsearch:
        condition: service_healthy
    restart: unless-stopped

  kibana:
    image: docker.elastic.co/kibana/kibana:${ELK_VERSION}
    container_name: kibana
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
      - ELASTICSEARCH_USERNAME=elastic
      - ELASTICSEARCH_PASSWORD=\${ELASTIC_PASSWORD:-changeme}
    volumes:
      - ./kibana/kibana.yml:/usr/share/kibana/config/kibana.yml:ro
      - ./kibana/logs:/var/log/kibana
    ports:
      - "5601:5601"
    networks:
      - elk
    depends_on:
      elasticsearch:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "curl -s -f http://localhost:5601/api/status || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 5

  filebeat:
    image: docker.elastic.co/beats/filebeat:${ELK_VERSION}
    container_name: filebeat
    user: root
    volumes:
      - ./filebeat/filebeat.yml:/usr/share/filebeat/filebeat.yml:ro
      - /var/log:/var/log:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
    environment:
      - ELASTIC_PASSWORD=\${ELASTIC_PASSWORD:-changeme}
    networks:
      - elk
    depends_on:
      logstash:
        condition: service_started
    restart: unless-stopped

networks:
  elk:
    driver: bridge

volumes:
  elasticsearch_data:
  kibana_data:
EOF

    # Filebeat configuration
    cat > /opt/elk/filebeat/filebeat.yml <<EOF
filebeat.inputs:
- type: log
  enabled: true
  paths:
    - /var/log/nginx/*.log
  fields:
    service: nginx
    environment: production
  fields_under_root: true
  multiline.pattern: '^\d{4}-\d{2}-\d{2}'
  multiline.negate: true
  multiline.match: after

- type: log
  enabled: true
  paths:
    - /var/log/celebrity-booking/*.log
  fields:
    service: celebrity-booking
    environment: production
  fields_under_root: true
  json.keys_under_root: true
  json.add_error_key: true

- type: docker
  enabled: true
  containers.ids:
    - "*"
  containers.path: "/var/lib/docker/containers"
  containers.stream: "all"
  
processors:
- add_host_metadata:
    when.not.contains.tags: forwarded
- add_docker_metadata: ~

output.logstash:
  hosts: ["logstash:5044"]

logging.level: info
logging.to_files: true
logging.files:
  path: /var/log/filebeat
  name: filebeat
  keepfiles: 7
  permissions: 0644
EOF

    # Set ELK password
    if [[ -z "$ELASTIC_PASSWORD" ]]; then
        ELASTIC_PASSWORD="CelebrityBooking2024!"
        print_warning "Setting default Elasticsearch password: $ELASTIC_PASSWORD"
    fi
    
    # Create environment file
    cat > /opt/elk/.env <<EOF
ELASTIC_PASSWORD=$ELASTIC_PASSWORD
ELK_VERSION=$ELK_VERSION
EOF

    # Start ELK Stack
    cd /opt/elk
    docker-compose up -d
    
    # Wait for Elasticsearch to be ready
    print_status "Waiting for Elasticsearch to be ready..."
    for i in {1..30}; do
        if curl -s -u "elastic:$ELASTIC_PASSWORD" "http://localhost:9200/_cluster/health" >/dev/null 2>&1; then
            break
        fi
        sleep 10
    done
    
    print_success "ELK Stack deployed and running"
    
    # Create index templates
    create_elk_index_templates
}

create_elk_index_templates() {
    print_status "Creating Elasticsearch index templates..."
    
    # Index template for application logs
    curl -X PUT "localhost:9200/_index_template/celebrity-booking-logs" \
      -u "elastic:$ELASTIC_PASSWORD" \
      -H "Content-Type: application/json" \
      -d '{
        "index_patterns": ["celebrity-booking-logs-*"],
        "template": {
          "settings": {
            "number_of_shards": 1,
            "number_of_replicas": 0,
            "index.lifecycle.name": "celebrity-booking-policy",
            "index.lifecycle.rollover_alias": "celebrity-booking-logs"
          },
          "mappings": {
            "properties": {
              "@timestamp": { "type": "date" },
              "level": { "type": "keyword" },
              "message": { "type": "text" },
              "service": { "type": "keyword" },
              "environment": { "type": "keyword" },
              "user_id": { "type": "keyword" },
              "request_id": { "type": "keyword" },
              "ip_address": { "type": "ip" },
              "response_time": { "type": "float" },
              "status_code": { "type": "integer" },
              "url": { "type": "keyword" },
              "method": { "type": "keyword" },
              "user_agent": { "type": "text" },
              "error": {
                "properties": {
                  "message": { "type": "text" },
                  "stack": { "type": "text" },
                  "type": { "type": "keyword" }
                }
              }
            }
          }
        }
      }' >/dev/null 2>&1
    
    # Index lifecycle policy
    curl -X PUT "localhost:9200/_ilm/policy/celebrity-booking-policy" \
      -u "elastic:$ELASTIC_PASSWORD" \
      -H "Content-Type: application/json" \
      -d "{
        \"policy\": {
          \"phases\": {
            \"hot\": {
              \"actions\": {
                \"rollover\": {
                  \"max_size\": \"10GB\",
                  \"max_age\": \"7d\"
                }
              }
            },
            \"delete\": {
              \"min_age\": \"${LOG_RETENTION_DAYS}d\",
              \"actions\": {
                \"delete\": {}
              }
            }
          }
        }
      }" >/dev/null 2>&1
    
    print_success "Index templates and policies created"
}

# =============================================================================
# CLOUD LOGGING SETUP
# =============================================================================

setup_cloud_logging() {
    print_status "Setting up cloud logging integration..."
    
    echo "Select cloud provider:"
    echo "1. AWS CloudWatch"
    echo "2. Google Cloud Logging"
    echo "3. Azure Monitor"
    echo "4. All providers"
    read -p "Enter choice (1-4): " cloud_choice
    
    case $cloud_choice in
        1|4)
            setup_aws_cloudwatch
            ;;
        2|4)
            setup_gcp_logging
            ;;
        3|4)
            setup_azure_monitor
            ;;
    esac
}

setup_aws_cloudwatch() {
    print_status "Setting up AWS CloudWatch logging..."
    
    # Install CloudWatch agent
    if ! command -v /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent >/dev/null 2>&1; then
        print_status "Installing CloudWatch agent..."
        wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
        dpkg -i amazon-cloudwatch-agent.deb
        rm amazon-cloudwatch-agent.deb
    fi
    
    # CloudWatch agent configuration
    cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json <<EOF
{
  "agent": {
    "metrics_collection_interval": 60,
    "run_as_user": "cwagent"
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/nginx/access.log",
            "log_group_name": "celebrity-booking/nginx/access",
            "log_stream_name": "{instance_id}",
            "timezone": "UTC",
            "retention_in_days": ${LOG_RETENTION_DAYS}
          },
          {
            "file_path": "/var/log/nginx/error.log",
            "log_group_name": "celebrity-booking/nginx/error",
            "log_stream_name": "{instance_id}",
            "timezone": "UTC",
            "retention_in_days": ${LOG_RETENTION_DAYS}
          },
          {
            "file_path": "/var/log/celebrity-booking/*.log",
            "log_group_name": "celebrity-booking/application",
            "log_stream_name": "{instance_id}",
            "timezone": "UTC",
            "retention_in_days": ${LOG_RETENTION_DAYS}
          }
        ]
      }
    }
  },
  "metrics": {
    "namespace": "Celebrity-Booking/Application",
    "metrics_collected": {
      "cpu": {
        "measurement": [
          "cpu_usage_idle",
          "cpu_usage_iowait",
          "cpu_usage_user",
          "cpu_usage_system"
        ],
        "metrics_collection_interval": 60
      },
      "disk": {
        "measurement": [
          "used_percent"
        ],
        "metrics_collection_interval": 60,
        "resources": [
          "*"
        ]
      },
      "diskio": {
        "measurement": [
          "io_time"
        ],
        "metrics_collection_interval": 60,
        "resources": [
          "*"
        ]
      },
      "mem": {
        "measurement": [
          "mem_used_percent"
        ],
        "metrics_collection_interval": 60
      }
    }
  }
}
EOF

    # Start CloudWatch agent
    systemctl enable amazon-cloudwatch-agent
    systemctl start amazon-cloudwatch-agent
    
    print_success "AWS CloudWatch logging configured"
}

setup_gcp_logging() {
    print_status "Setting up Google Cloud Logging..."
    
    # Install Google Cloud Logging agent
    curl -sSO https://dl.google.com/cloudagents/add-google-cloud-ops-agent-repo.sh
    bash add-google-cloud-ops-agent-repo.sh --also-install
    rm add-google-cloud-ops-agent-repo.sh
    
    # Google Cloud Ops Agent configuration
    cat > /etc/google-cloud-ops-agent/config.yaml <<EOF
logging:
  receivers:
    nginx_access:
      type: files
      include_paths:
        - /var/log/nginx/access.log
    nginx_error:
      type: files
      include_paths:
        - /var/log/nginx/error.log
    application:
      type: files
      include_paths:
        - /var/log/celebrity-booking/*.log
  processors:
    application_parser:
      type: parse_json
  service:
    pipelines:
      default_pipeline:
        receivers: [nginx_access, nginx_error]
      application_pipeline:
        receivers: [application]
        processors: [application_parser]

metrics:
  receivers:
    hostmetrics:
      type: hostmetrics
      collection_interval: 60s
  service:
    pipelines:
      default_pipeline:
        receivers: [hostmetrics]
EOF

    systemctl restart google-cloud-ops-agent
    
    print_success "Google Cloud Logging configured"
}

# =============================================================================
# LOKI + GRAFANA SETUP (Lightweight Alternative)
# =============================================================================

setup_loki() {
    print_status "Setting up Loki + Grafana for lightweight log aggregation..."
    
    mkdir -p /opt/loki/{loki,promtail,grafana}
    
    # Loki configuration
    cat > /opt/loki/loki/loki.yml <<EOF
auth_enabled: false

server:
  http_listen_port: 3100
  grpc_listen_port: 9096

common:
  path_prefix: /loki
  storage:
    filesystem:
      chunks_directory: /loki/chunks
      rules_directory: /loki/rules
  replication_factor: 1
  ring:
    instance_addr: 127.0.0.1
    kvstore:
      store: inmemory

query_range:
  results_cache:
    cache:
      embedded_cache:
        enabled: true
        max_size_mb: 100

schema_config:
  configs:
    - from: 2020-10-24
      store: boltdb-shipper
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h

ruler:
  alertmanager_url: http://localhost:9093

limits_config:
  retention_period: ${LOG_RETENTION_DAYS}d
EOF

    # Promtail configuration
    cat > /opt/loki/promtail/promtail.yml <<EOF
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: nginx
    static_configs:
      - targets:
          - localhost
        labels:
          job: nginx
          __path__: /var/log/nginx/*.log

  - job_name: application
    static_configs:
      - targets:
          - localhost
        labels:
          job: celebrity-booking
          __path__: /var/log/celebrity-booking/*.log

  - job_name: system
    static_configs:
      - targets:
          - localhost
        labels:
          job: system
          __path__: /var/log/syslog
EOF

    # Docker Compose for Loki stack
    cat > /opt/loki/docker-compose.yml <<EOF
version: '3.8'

services:
  loki:
    image: grafana/loki:latest
    container_name: loki
    ports:
      - "3100:3100"
    volumes:
      - ./loki/loki.yml:/etc/loki/local-config.yaml:ro
      - loki_data:/loki
    command: -config.file=/etc/loki/local-config.yaml
    networks:
      - loki
    restart: unless-stopped

  promtail:
    image: grafana/promtail:latest
    container_name: promtail
    volumes:
      - ./promtail/promtail.yml:/etc/promtail/config.yml:ro
      - /var/log:/var/log:ro
    command: -config.file=/etc/promtail/config.yml
    networks:
      - loki
    depends_on:
      - loki
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    container_name: grafana-logs
    ports:
      - "3002:3000"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin123
      - GF_USERS_ALLOW_SIGN_UP=false
    networks:
      - loki
    restart: unless-stopped

networks:
  loki:
    driver: bridge

volumes:
  loki_data:
  grafana_data:
EOF

    # Grafana datasource for Loki
    mkdir -p /opt/loki/grafana/provisioning/datasources
    cat > /opt/loki/grafana/provisioning/datasources/loki.yml <<EOF
apiVersion: 1

datasources:
  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    isDefault: true
EOF

    # Start Loki stack
    cd /opt/loki
    docker-compose up -d
    
    print_success "Loki + Grafana logging stack deployed"
}

# =============================================================================
# APPLICATION LOG INTEGRATION
# =============================================================================

setup_application_logging() {
    print_status "Setting up application log integration..."
    
    # Create log directory
    mkdir -p /var/log/celebrity-booking
    
    # Backend logging configuration
    cat > /opt/celebrity-booking/backend/utils/logger.js <<'EOF'
const winston = require('winston');
const path = require('path');

// Custom format for structured logging
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return JSON.stringify({
      timestamp,
      level,
      message,
      service: 'celebrity-booking-api',
      environment: process.env.NODE_ENV || 'development',
      ...meta
    });
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: {
    service: 'celebrity-booking-api',
    version: process.env.npm_package_version || '1.0.0'
  },
  transports: [
    // File transport for all logs
    new winston.transports.File({
      filename: '/var/log/celebrity-booking/application.log',
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 10,
      tailable: true
    }),
    
    // Separate file for errors
    new winston.transports.File({
      filename: '/var/log/celebrity-booking/error.log',
      level: 'error',
      maxsize: 50 * 1024 * 1024,
      maxFiles: 5,
      tailable: true
    }),
    
    // Console transport for development
    ...(process.env.NODE_ENV !== 'production' ? [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      })
    ] : [])
  ]
});

// HTTP request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    logger.info('HTTP Request', {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id,
      requestId: req.headers['x-request-id'] || req.id
    });
  });
  
  next();
};

// Error logging middleware
const errorLogger = (err, req, res, next) => {
  logger.error('Application Error', {
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userId: req.user?.id,
    requestId: req.headers['x-request-id'] || req.id,
    error: {
      name: err.name,
      message: err.message,
      code: err.code,
      statusCode: err.statusCode || 500
    }
  });
  
  next(err);
};

// Database query logger
const dbLogger = {
  log: (query, duration) => {
    logger.info('Database Query', {
      query: query.sql || query,
      duration,
      type: 'database'
    });
  },
  
  error: (error, query) => {
    logger.error('Database Error', {
      message: error.message,
      query: query.sql || query,
      type: 'database',
      error: {
        name: error.name,
        message: error.message,
        code: error.code
      }
    });
  }
};

// Performance logger
const performanceLogger = {
  measure: (name, fn) => {
    return async (...args) => {
      const start = Date.now();
      try {
        const result = await fn(...args);
        const duration = Date.now() - start;
        
        logger.info('Performance Metric', {
          operation: name,
          duration,
          success: true,
          type: 'performance'
        });
        
        return result;
      } catch (error) {
        const duration = Date.now() - start;
        
        logger.error('Performance Metric', {
          operation: name,
          duration,
          success: false,
          error: error.message,
          type: 'performance'
        });
        
        throw error;
      }
    };
  }
};

module.exports = {
  logger,
  requestLogger,
  errorLogger,
  dbLogger,
  performanceLogger
};
EOF

    # Frontend logging integration
    cat > /opt/celebrity-booking/src/utils/logger.js <<'EOF'
class FrontendLogger {
  constructor() {
    this.endpoint = `${process.env.REACT_APP_API_URL}/api/logs`;
    this.batchSize = 10;
    this.batchTimeout = 5000;
    this.logQueue = [];
    this.batchTimer = null;
  }

  log(level, message, meta = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: 'celebrity-booking-frontend',
      environment: process.env.NODE_ENV || 'development',
      url: window.location.href,
      userAgent: navigator.userAgent,
      userId: this.getUserId(),
      sessionId: this.getSessionId(),
      ...meta
    };

    // Add to queue
    this.logQueue.push(logEntry);

    // Send immediately for errors
    if (level === 'error') {
      this.flush();
    } else {
      this.scheduleBatch();
    }
  }

  info(message, meta) {
    this.log('info', message, meta);
  }

  warn(message, meta) {
    this.log('warn', message, meta);
  }

  error(message, meta) {
    this.log('error', message, meta);
  }

  debug(message, meta) {
    if (process.env.NODE_ENV === 'development') {
      this.log('debug', message, meta);
    }
  }

  getUserId() {
    // Get user ID from auth context or localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.id || null;
  }

  getSessionId() {
    let sessionId = sessionStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
  }

  scheduleBatch() {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    this.batchTimer = setTimeout(() => {
      this.flush();
    }, this.batchTimeout);

    if (this.logQueue.length >= this.batchSize) {
      this.flush();
    }
  }

  async flush() {
    if (this.logQueue.length === 0) return;

    const logs = [...this.logQueue];
    this.logQueue = [];

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ logs })
      });
    } catch (error) {
      console.error('Failed to send logs:', error);
      // Re-add logs to queue for retry
      this.logQueue.unshift(...logs);
    }
  }

  // Track user interactions
  trackEvent(event, properties = {}) {
    this.info('User Event', {
      event,
      properties,
      type: 'user_interaction'
    });
  }

  // Track performance metrics
  trackPerformance(name, duration, metadata = {}) {
    this.info('Performance Metric', {
      metric: name,
      duration,
      metadata,
      type: 'performance'
    });
  }

  // Track errors with context
  trackError(error, context = {}) {
    this.error('Frontend Error', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      context,
      type: 'error'
    });
  }
}

// Global error handler
window.addEventListener('error', (event) => {
  logger.trackError(event.error, {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  });
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  logger.trackError(new Error(event.reason), {
    type: 'unhandled_promise_rejection'
  });
});

// Performance observer for page load metrics
if ('PerformanceObserver' in window) {
  const perfObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'navigation') {
        logger.trackPerformance('page_load', entry.loadEventEnd - entry.navigationStart, {
          url: entry.name
        });
      }
    }
  });
  
  perfObserver.observe({ entryTypes: ['navigation'] });
}

const logger = new FrontendLogger();
export default logger;
EOF

    # Log rotation configuration
    cat > /etc/logrotate.d/celebrity-booking <<EOF
/var/log/celebrity-booking/*.log {
    daily
    missingok
    rotate ${LOG_RETENTION_DAYS}
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        systemctl reload nginx > /dev/null 2>&1 || true
        systemctl reload celebrity-booking-api > /dev/null 2>&1 || true
    endscript
}
EOF

    print_success "Application logging integration configured"
}

# =============================================================================
# LOG ANALYSIS AND ALERTING
# =============================================================================

setup_log_alerting() {
    print_status "Setting up log-based alerting..."
    
    # Create log analysis script
    cat > /usr/local/bin/log-analyzer.py <<'EOF'
#!/usr/bin/env python3

import json
import re
import time
import subprocess
from datetime import datetime, timedelta
from collections import Counter, defaultdict

class LogAnalyzer:
    def __init__(self):
        self.error_patterns = [
            r'ERROR|error|Error',
            r'FATAL|fatal|Fatal',
            r'CRITICAL|critical|Critical',
            r'Exception|exception',
            r'Stack trace|stack trace',
            r'500|502|503|504',
            r'Connection refused|Connection timeout',
            r'Database error|DB error',
            r'Authentication failed|Auth failed'
        ]
        
        self.warning_patterns = [
            r'WARN|warning|Warning',
            r'400|401|403|404',
            r'Slow query|slow query',
            r'High memory|high memory',
            r'Rate limit|rate limit'
        ]
        
        self.alert_thresholds = {
            'error_rate': 10,  # errors per minute
            'response_time': 5000,  # milliseconds
            'error_spike': 5,  # 5x normal rate
            'unique_errors': 3  # different error types
        }
    
    def analyze_logs(self, log_file, minutes=5):
        """Analyze logs from the last N minutes"""
        cutoff_time = datetime.now() - timedelta(minutes=minutes)
        
        errors = []
        warnings = []
        response_times = []
        status_codes = Counter()
        error_types = set()
        
        try:
            with open(log_file, 'r') as f:
                for line in f:
                    try:
                        if line.strip():
                            log_entry = json.loads(line)
                            timestamp = datetime.fromisoformat(log_entry.get('timestamp', '').replace('Z', '+00:00'))
                            
                            if timestamp < cutoff_time:
                                continue
                            
                            # Check for errors
                            message = log_entry.get('message', '')
                            level = log_entry.get('level', '').lower()
                            
                            if level in ['error', 'fatal', 'critical'] or any(re.search(pattern, message) for pattern in self.error_patterns):
                                errors.append(log_entry)
                                error_types.add(log_entry.get('error', {}).get('name', 'Unknown'))
                            
                            elif level == 'warn' or any(re.search(pattern, message) for pattern in self.warning_patterns):
                                warnings.append(log_entry)
                            
                            # Track response times
                            if 'duration' in log_entry:
                                response_times.append(log_entry['duration'])
                            
                            # Track status codes
                            if 'status' in log_entry:
                                status_codes[log_entry['status']] += 1
                    
                    except (json.JSONDecodeError, ValueError):
                        # Skip non-JSON lines
                        continue
        
        except FileNotFoundError:
            return None
        
        return {
            'errors': errors,
            'warnings': warnings,
            'error_count': len(errors),
            'warning_count': len(warnings),
            'error_rate': len(errors) / minutes,
            'avg_response_time': sum(response_times) / len(response_times) if response_times else 0,
            'max_response_time': max(response_times) if response_times else 0,
            'status_codes': dict(status_codes),
            'unique_error_types': len(error_types),
            'error_types': list(error_types)
        }
    
    def check_alerts(self, analysis):
        """Check if any alert conditions are met"""
        alerts = []
        
        if not analysis:
            return alerts
        
        # High error rate
        if analysis['error_rate'] > self.alert_thresholds['error_rate']:
            alerts.append({
                'type': 'high_error_rate',
                'severity': 'critical',
                'message': f"High error rate: {analysis['error_rate']:.1f} errors/min",
                'value': analysis['error_rate'],
                'threshold': self.alert_thresholds['error_rate']
            })
        
        # High response time
        if analysis['avg_response_time'] > self.alert_thresholds['response_time']:
            alerts.append({
                'type': 'high_response_time',
                'severity': 'warning',
                'message': f"High average response time: {analysis['avg_response_time']:.0f}ms",
                'value': analysis['avg_response_time'],
                'threshold': self.alert_thresholds['response_time']
            })
        
        # Multiple error types (indicating systemic issues)
        if analysis['unique_error_types'] >= self.alert_thresholds['unique_errors']:
            alerts.append({
                'type': 'multiple_error_types',
                'severity': 'warning',
                'message': f"Multiple error types detected: {', '.join(analysis['error_types'])}",
                'value': analysis['unique_error_types'],
                'threshold': self.alert_thresholds['unique_errors']
            })
        
        # High 5xx error rate
        error_5xx = sum(count for status, count in analysis['status_codes'].items() if str(status).startswith('5'))
        total_requests = sum(analysis['status_codes'].values())
        if total_requests > 0:
            error_5xx_rate = (error_5xx / total_requests) * 100
            if error_5xx_rate > 5:  # 5% error rate
                alerts.append({
                    'type': 'high_5xx_rate',
                    'severity': 'critical',
                    'message': f"High 5xx error rate: {error_5xx_rate:.1f}%",
                    'value': error_5xx_rate,
                    'threshold': 5
                })
        
        return alerts
    
    def send_alert(self, alert):
        """Send alert notification"""
        message = f"🚨 Log Alert: {alert['message']}"
        
        # Send via notification script
        subprocess.run([
            '/usr/local/bin/send-alert.sh',
            alert['type'],
            alert['message'],
            alert['severity']
        ], check=False)
    
    def run_analysis(self):
        """Run complete log analysis"""
        log_files = [
            '/var/log/celebrity-booking/application.log',
            '/var/log/nginx/access.log'
        ]
        
        all_alerts = []
        
        for log_file in log_files:
            analysis = self.analyze_logs(log_file)
            if analysis:
                alerts = self.check_alerts(analysis)
                for alert in alerts:
                    alert['log_file'] = log_file
                    all_alerts.append(alert)
        
        # Send alerts
        for alert in all_alerts:
            self.send_alert(alert)
        
        # Log analysis results
        if all_alerts:
            print(f"Generated {len(all_alerts)} alerts")
        else:
            print("No alerts generated")
        
        return all_alerts

if __name__ == "__main__":
    analyzer = LogAnalyzer()
    analyzer.run_analysis()
EOF

    chmod +x /usr/local/bin/log-analyzer.py
    
    # Install Python dependencies
    pip3 install python-dateutil >/dev/null 2>&1 || {
        apt-get update && apt-get install -y python3-pip
        pip3 install python-dateutil
    }
    
    # Create cron job for log analysis
    cat > /etc/cron.d/log-analysis <<EOF
# Log analysis and alerting (every 5 minutes)
*/5 * * * * root /usr/local/bin/log-analyzer.py >> /var/log/log-analysis.log 2>&1
EOF

    print_success "Log alerting configured"
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

# Check system requirements
print_status "Checking system requirements..."

# Ensure log directories exist
mkdir -p /var/log/celebrity-booking
chown www-data:www-data /var/log/celebrity-booking

# Install common dependencies
if command -v apt-get >/dev/null 2>&1; then
    apt-get update
    apt-get install -y curl wget python3 python3-pip logrotate
elif command -v yum >/dev/null 2>&1; then
    yum install -y curl wget python3 python3-pip logrotate
fi

# Setup selected logging solutions
if [[ "${SETUP_ELK:-false}" == "true" ]]; then
    setup_elk_stack
fi

if [[ "${SETUP_CLOUD:-false}" == "true" ]]; then
    setup_cloud_logging
fi

if [[ "${SETUP_LOKI:-false}" == "true" ]]; then
    setup_loki
fi

# Always setup application logging and alerting
setup_application_logging
setup_log_alerting

# Create log monitoring dashboard
cat > /usr/local/bin/log-dashboard.sh <<'EOF'
#!/bin/bash

echo "📊 Celebrity Booking Platform - Log Monitoring Dashboard"
echo "======================================================"

# Check log file sizes and recent activity
echo ""
echo "📁 Log Files Status:"
for log_file in /var/log/celebrity-booking/*.log /var/log/nginx/*.log; do
    if [[ -f "$log_file" ]]; then
        size=$(du -h "$log_file" | cut -f1)
        lines=$(wc -l < "$log_file" 2>/dev/null || echo "0")
        last_modified=$(stat -c %y "$log_file" | cut -d. -f1)
        echo "  $log_file: $size ($lines lines, modified: $last_modified)"
    fi
done

# Check recent errors
echo ""
echo "🚨 Recent Errors (last 10):"
grep -h "ERROR\|error\|Error" /var/log/celebrity-booking/*.log 2>/dev/null | tail -10 | while read line; do
    echo "  $line"
done

# Check logging services
echo ""
echo "🔧 Logging Services:"
if command -v docker >/dev/null 2>&1; then
    docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "(elasticsearch|logstash|kibana|loki|promtail)" || echo "  No logging containers found"
fi

# Log analysis summary
echo ""
echo "📈 Log Analysis (last 5 minutes):"
/usr/local/bin/log-analyzer.py 2>/dev/null || echo "  Log analyzer not available"

echo ""
echo "🔗 Access URLs:"
if docker ps | grep -q kibana; then
    echo "  Kibana: http://localhost:5601"
fi
if docker ps | grep -q grafana; then
    echo "  Grafana: http://localhost:3002"
fi
EOF

chmod +x /usr/local/bin/log-dashboard.sh

# Final summary
echo ""
print_status "📋 Log Monitoring Setup Summary:"

if [[ "${SETUP_ELK:-false}" == "true" ]]; then
    echo "  ✅ ELK Stack (Elasticsearch, Logstash, Kibana) deployed"
fi

if [[ "${SETUP_CLOUD:-false}" == "true" ]]; then
    echo "  ✅ Cloud logging configured"
fi

if [[ "${SETUP_LOKI:-false}" == "true" ]]; then
    echo "  ✅ Loki + Grafana stack deployed"
fi

echo "  ✅ Application logging integration configured"
echo "  ✅ Log rotation and retention policies set"
echo "  ✅ Automated log analysis and alerting enabled"
echo "  ✅ Log monitoring dashboard created"

echo ""
print_status "🔧 Access Points:"
if [[ "${SETUP_ELK:-false}" == "true" ]]; then
    echo "  - Kibana: http://localhost:5601 (elastic/$ELASTIC_PASSWORD)"
    echo "  - Elasticsearch: http://localhost:9200"
fi

if [[ "${SETUP_LOKI:-false}" == "true" ]]; then
    echo "  - Grafana (Loki): http://localhost:3002 (admin/admin123)"
    echo "  - Loki: http://localhost:3100"
fi

echo ""
print_status "🔧 Management Commands:"
echo "  - Log dashboard: /usr/local/bin/log-dashboard.sh"
echo "  - Manual log analysis: /usr/local/bin/log-analyzer.py"
echo "  - View application logs: tail -f /var/log/celebrity-booking/application.log"
echo "  - View nginx logs: tail -f /var/log/nginx/access.log"

echo ""
print_success "🎉 Comprehensive log monitoring setup completed!"

echo ""
print_status "Next steps:"
echo "1. Configure log retention policies based on compliance requirements"
echo "2. Set up custom dashboards and visualizations"
echo "3. Fine-tune alerting thresholds"
echo "4. Integrate with incident management systems"
echo "5. Train team on log analysis and troubleshooting procedures"