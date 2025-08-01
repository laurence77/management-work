#!/bin/bash

# Automated Security Scanning and Vulnerability Assessment Setup
# This script sets up comprehensive security scanning with multiple tools

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

print_status "🔒 Celebrity Booking Platform - Security Scanning Setup"
echo ""

# Configuration
DOMAIN="${DOMAIN:-bookmyreservation.org}"
SCAN_SCHEDULE="${SCAN_SCHEDULE:-daily}"

# =============================================================================
# DEPENDENCY VULNERABILITY SCANNING
# =============================================================================

setup_dependency_scanning() {
    print_status "Setting up dependency vulnerability scanning..."
    
    # Install npm audit tools
    npm install -g npm-audit-resolver audit-ci
    
    # Backend dependency scanning
    cat > /opt/celebrity-booking/backend/scripts/security-audit.js <<'EOF'
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class SecurityAuditor {
  constructor() {
    this.reportDir = '/var/log/security-scans';
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  }

  async runNpmAudit() {
    console.log('Running npm security audit...');
    
    try {
      const auditResult = execSync('npm audit --json', { 
        encoding: 'utf8',
        cwd: '/opt/celebrity-booking/backend'
      });
      
      const audit = JSON.parse(auditResult);
      const report = {
        timestamp: new Date().toISOString(),
        type: 'npm_audit',
        summary: {
          vulnerabilities: audit.metadata.vulnerabilities,
          dependencies: audit.metadata.dependencies,
          totalDependencies: audit.metadata.totalDependencies
        },
        advisories: audit.advisories,
        severity: this.calculateSeverity(audit.metadata.vulnerabilities)
      };

      this.saveReport('npm-audit', report);
      return report;
    } catch (error) {
      console.error('npm audit failed:', error.message);
      return null;
    }
  }

  async runRetireJS() {
    console.log('Running Retire.js scan...');
    
    try {
      // Install retire if not present
      try {
        execSync('which retire', { stdio: 'ignore' });
      } catch {
        execSync('npm install -g retire', { stdio: 'inherit' });
      }

      const retireResult = execSync('retire --outputformat json --outputpath /tmp/retire-report.json', {
        encoding: 'utf8',
        cwd: '/opt/celebrity-booking'
      });

      const retireReport = JSON.parse(fs.readFileSync('/tmp/retire-report.json', 'utf8'));
      
      const report = {
        timestamp: new Date().toISOString(),
        type: 'retire_js',
        vulnerabilities: retireReport,
        summary: {
          total: retireReport.length,
          high: retireReport.filter(v => v.severity === 'high').length,
          medium: retireReport.filter(v => v.severity === 'medium').length,
          low: retireReport.filter(v => v.severity === 'low').length
        }
      };

      this.saveReport('retire-js', report);
      return report;
    } catch (error) {
      console.error('Retire.js scan failed:', error.message);
      return null;
    }
  }

  async runSnyk() {
    console.log('Running Snyk scan...');
    
    try {
      // Check if Snyk is installed and authenticated
      try {
        execSync('snyk auth', { stdio: 'ignore' });
      } catch {
        console.log('Snyk not authenticated. Run: snyk auth');
        return null;
      }

      const snykResult = execSync('snyk test --json', {
        encoding: 'utf8',
        cwd: '/opt/celebrity-booking/backend'
      });

      const snykReport = JSON.parse(snykResult);
      
      const report = {
        timestamp: new Date().toISOString(),
        type: 'snyk',
        vulnerabilities: snykReport.vulnerabilities || [],
        summary: snykReport.summary || {},
        dependencyCount: snykReport.dependencyCount || 0
      };

      this.saveReport('snyk', report);
      return report;
    } catch (error) {
      console.log('Snyk scan completed with issues or not configured');
      return null;
    }
  }

  calculateSeverity(vulnerabilities) {
    const { critical = 0, high = 0, moderate = 0, low = 0 } = vulnerabilities;
    
    if (critical > 0) return 'critical';
    if (high > 0) return 'high';
    if (moderate > 0) return 'moderate';
    if (low > 0) return 'low';
    return 'none';
  }

  saveReport(type, report) {
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }

    const filename = `${type}-${this.timestamp}.json`;
    const filepath = path.join(this.reportDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    console.log(`Report saved: ${filepath}`);

    // Also save latest report
    const latestPath = path.join(this.reportDir, `${type}-latest.json`);
    fs.writeFileSync(latestPath, JSON.stringify(report, null, 2));
  }

  async generateSummaryReport() {
    const reports = [];
    
    const npmReport = await this.runNpmAudit();
    if (npmReport) reports.push(npmReport);
    
    const retireReport = await this.runRetireJS();
    if (retireReport) reports.push(retireReport);
    
    const snykReport = await this.runSnyk();
    if (snykReport) reports.push(snykReport);

    const summary = {
      timestamp: new Date().toISOString(),
      type: 'security_summary',
      reports: reports.map(r => ({
        type: r.type,
        severity: r.severity || 'unknown',
        vulnerabilities: r.summary?.total || r.vulnerabilities?.length || 0
      })),
      overallSeverity: this.calculateOverallSeverity(reports),
      recommendations: this.generateRecommendations(reports)
    };

    this.saveReport('security-summary', summary);
    
    // Send alerts for critical/high severity
    if (summary.overallSeverity === 'critical' || summary.overallSeverity === 'high') {
      this.sendSecurityAlert(summary);
    }

    return summary;
  }

  calculateOverallSeverity(reports) {
    const severities = reports.map(r => r.severity || 'none');
    
    if (severities.includes('critical')) return 'critical';
    if (severities.includes('high')) return 'high';
    if (severities.includes('moderate')) return 'moderate';
    if (severities.includes('low')) return 'low';
    return 'none';
  }

  generateRecommendations(reports) {
    const recommendations = [];
    
    reports.forEach(report => {
      if (report.type === 'npm_audit' && report.summary.vulnerabilities.total > 0) {
        recommendations.push('Run "npm audit fix" to automatically fix vulnerabilities');
      }
      
      if (report.type === 'retire_js' && report.summary.total > 0) {
        recommendations.push('Update outdated JavaScript libraries identified by Retire.js');
      }
      
      if (report.type === 'snyk' && report.vulnerabilities.length > 0) {
        recommendations.push('Review Snyk recommendations and apply security patches');
      }
    });

    return recommendations;
  }

  sendSecurityAlert(summary) {
    const message = `Security scan completed with ${summary.overallSeverity} severity issues. ${summary.reports.length} tools reported vulnerabilities.`;
    
    // Send alert via existing notification system
    require('child_process').execSync(`/usr/local/bin/send-alert.sh "Security Vulnerability" "${message}" "${summary.overallSeverity}"`, {
      stdio: 'inherit'
    });
  }
}

// Run security audit
if (require.main === module) {
  const auditor = new SecurityAuditor();
  auditor.generateSummaryReport()
    .then(summary => {
      console.log('Security audit completed');
      console.log(`Overall severity: ${summary.overallSeverity}`);
      process.exit(0);
    })
    .catch(error => {
      console.error('Security audit failed:', error);
      process.exit(1);
    });
}

module.exports = SecurityAuditor;
EOF

    chmod +x /opt/celebrity-booking/backend/scripts/security-audit.js

    print_success "Dependency vulnerability scanning configured"
}

# =============================================================================
# STATIC CODE ANALYSIS
# =============================================================================

setup_static_analysis() {
    print_status "Setting up static code analysis..."
    
    # Install ESLint security plugins for Node.js
    cd /opt/celebrity-booking/backend
    npm install --save-dev eslint eslint-plugin-security eslint-plugin-node eslint-config-security
    
    # ESLint security configuration
    cat > /opt/celebrity-booking/backend/.eslintrc.security.js <<'EOF'
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:security/recommended',
    'plugin:node/recommended'
  ],
  plugins: ['security', 'node'],
  env: {
    node: true,
    es2021: true
  },
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module'
  },
  rules: {
    // Security rules
    'security/detect-buffer-noassert': 'error',
    'security/detect-child-process': 'warn',
    'security/detect-disable-mustache-escape': 'error',
    'security/detect-eval-with-expression': 'error',
    'security/detect-new-buffer': 'error',
    'security/detect-no-csrf-before-method-override': 'error',
    'security/detect-non-literal-fs-filename': 'warn',
    'security/detect-non-literal-regexp': 'warn',
    'security/detect-non-literal-require': 'warn',
    'security/detect-object-injection': 'warn',
    'security/detect-possible-timing-attacks': 'warn',
    'security/detect-pseudoRandomBytes': 'error',
    'security/detect-unsafe-regex': 'error',
    
    // Node.js specific security rules
    'node/no-deprecated-api': 'error',
    'node/no-exports-assign': 'error',
    'node/no-unpublished-require': 'off',
    
    // General security practices
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error'
  }
};
EOF

    # Frontend security linting
    cd /opt/celebrity-booking
    npm install --save-dev eslint-plugin-react-hooks eslint-plugin-jsx-a11y
    
    cat > /opt/celebrity-booking/.eslintrc.security.js <<'EOF'
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:security/recommended'
  ],
  plugins: ['react', 'react-hooks', 'jsx-a11y', 'security'],
  env: {
    browser: true,
    es2021: true
  },
  parserOptions: {
    ecmaFeatures: {
      jsx: true
    },
    ecmaVersion: 12,
    sourceType: 'module'
  },
  rules: {
    // React security rules
    'react/no-danger': 'error',
    'react/no-danger-with-children': 'error',
    'react/jsx-no-script-url': 'error',
    'react/jsx-no-target-blank': 'error',
    
    // Security rules
    'security/detect-object-injection': 'warn',
    'security/detect-non-literal-regexp': 'warn',
    'security/detect-unsafe-regex': 'error',
    
    // Accessibility (security through proper UX)
    'jsx-a11y/no-autofocus': 'warn',
    'jsx-a11y/anchor-is-valid': 'error'
  }
};
EOF

    # SonarQube setup for advanced static analysis
    setup_sonarqube

    print_success "Static code analysis configured"
}

setup_sonarqube() {
    print_status "Setting up SonarQube for advanced static analysis..."
    
    # SonarQube Docker setup
    mkdir -p /opt/sonarqube/{data,logs,extensions}
    chown -R 999:999 /opt/sonarqube
    
    cat > /opt/sonarqube/docker-compose.yml <<EOF
version: '3.8'

services:
  sonarqube:
    image: sonarqube:community
    container_name: sonarqube
    ports:
      - "9000:9000"
    environment:
      - SONAR_JDBC_URL=jdbc:postgresql://db:5432/sonar
      - SONAR_JDBC_USERNAME=sonar
      - SONAR_JDBC_PASSWORD=sonar
    volumes:
      - ./data:/opt/sonarqube/data
      - ./logs:/opt/sonarqube/logs
      - ./extensions:/opt/sonarqube/extensions
    networks:
      - sonarnet
    depends_on:
      - db

  db:
    image: postgres:13
    container_name: sonarqube-db
    environment:
      - POSTGRES_USER=sonar
      - POSTGRES_PASSWORD=sonar
      - POSTGRES_DB=sonar
    volumes:
      - postgresql:/var/lib/postgresql
      - postgresql_data:/var/lib/postgresql/data
    networks:
      - sonarnet

networks:
  sonarnet:

volumes:
  postgresql:
  postgresql_data:
EOF

    # Start SonarQube
    cd /opt/sonarqube
    docker-compose up -d
    
    # Wait for SonarQube to be ready
    print_status "Waiting for SonarQube to be ready..."
    for i in {1..30}; do
        if curl -s "http://localhost:9000" >/dev/null 2>&1; then
            break
        fi
        sleep 10
    done

    # SonarQube project configuration
    cat > /opt/celebrity-booking/sonar-project.properties <<EOF
sonar.projectKey=celebrity-booking-platform
sonar.projectName=Celebrity Booking Platform
sonar.projectVersion=1.0
sonar.sources=src,backend
sonar.exclusions=**/node_modules/**,**/dist/**,**/build/**
sonar.javascript.lcov.reportPaths=coverage/lcov.info
sonar.typescript.lcov.reportPaths=coverage/lcov.info
sonar.host.url=http://localhost:9000
sonar.login=admin
sonar.password=admin
EOF

    print_success "SonarQube configured"
}

# =============================================================================
# CONTAINER SECURITY SCANNING
# =============================================================================

setup_container_scanning() {
    print_status "Setting up container security scanning..."
    
    # Install Trivy for container vulnerability scanning
    if ! command -v trivy >/dev/null 2>&1; then
        print_status "Installing Trivy..."
        apt-get update
        apt-get install -y wget apt-transport-https gnupg lsb-release
        wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | apt-key add -
        echo "deb https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main" | tee -a /etc/apt/sources.list.d/trivy.list
        apt-get update
        apt-get install -y trivy
    fi

    # Container scanning script
    cat > /usr/local/bin/container-security-scan.sh <<'EOF'
#!/bin/bash

SCAN_DIR="/var/log/security-scans"
TIMESTAMP=$(date -Iseconds)

mkdir -p "$SCAN_DIR"

echo "🔍 Running container security scans..."

# Scan Docker images
if command -v docker >/dev/null 2>&1; then
    echo "Scanning Docker images..."
    
    # Get all running containers
    docker ps --format "{{.Image}}" | sort -u | while read image; do
        echo "Scanning image: $image"
        
        # Trivy scan
        trivy image --format json --output "$SCAN_DIR/trivy-${image//\//_}-${TIMESTAMP}.json" "$image"
        
        # Hadolint for Dockerfile scanning (if Dockerfile exists)
        if [ -f "Dockerfile" ]; then
            if command -v hadolint >/dev/null 2>&1; then
                hadolint Dockerfile > "$SCAN_DIR/hadolint-${TIMESTAMP}.txt" 2>&1 || true
            fi
        fi
    done
fi

# Scan filesystem for vulnerabilities
echo "Scanning filesystem..."
trivy fs --format json --output "$SCAN_DIR/trivy-filesystem-${TIMESTAMP}.json" /opt/celebrity-booking

# Generate summary report
python3 - <<PYTHON
import json
import glob
import os
from datetime import datetime

scan_dir = "$SCAN_DIR"
timestamp = "$TIMESTAMP"

def analyze_trivy_report(filepath):
    try:
        with open(filepath, 'r') as f:
            data = json.load(f)
        
        vulnerabilities = []
        if 'Results' in data:
            for result in data['Results']:
                if 'Vulnerabilities' in result:
                    vulnerabilities.extend(result['Vulnerabilities'])
        
        severity_count = {'CRITICAL': 0, 'HIGH': 0, 'MEDIUM': 0, 'LOW': 0}
        for vuln in vulnerabilities:
            severity = vuln.get('Severity', 'UNKNOWN')
            if severity in severity_count:
                severity_count[severity] += 1
        
        return {
            'file': os.path.basename(filepath),
            'total_vulnerabilities': len(vulnerabilities),
            'severity_breakdown': severity_count,
            'critical_vulnerabilities': [v for v in vulnerabilities if v.get('Severity') == 'CRITICAL'][:5]  # Top 5
        }
    except Exception as e:
        return {'file': os.path.basename(filepath), 'error': str(e)}

# Analyze all Trivy reports
reports = []
for trivy_file in glob.glob(f"{scan_dir}/trivy-*{timestamp}.json"):
    report = analyze_trivy_report(trivy_file)
    reports.append(report)

# Generate summary
summary = {
    'timestamp': datetime.now().isoformat(),
    'scan_type': 'container_security',
    'reports': reports,
    'total_critical': sum(r.get('severity_breakdown', {}).get('CRITICAL', 0) for r in reports),
    'total_high': sum(r.get('severity_breakdown', {}).get('HIGH', 0) for r in reports),
    'recommendations': []
}

# Add recommendations
if summary['total_critical'] > 0:
    summary['recommendations'].append('URGENT: Address critical vulnerabilities immediately')
if summary['total_high'] > 5:
    summary['recommendations'].append('Review and patch high-severity vulnerabilities')

# Save summary
with open(f"{scan_dir}/container-security-summary-{timestamp}.json", 'w') as f:
    json.dump(summary, f, indent=2)

print(f"Container security scan completed. {summary['total_critical']} critical, {summary['total_high']} high severity issues found.")

# Alert if critical vulnerabilities found
if summary['total_critical'] > 0:
    os.system(f"/usr/local/bin/send-alert.sh 'Critical Container Vulnerabilities' '{summary['total_critical']} critical vulnerabilities found in containers' 'critical'")

PYTHON

echo "Container security scan completed. Reports saved to $SCAN_DIR"
EOF

    chmod +x /usr/local/bin/container-security-scan.sh

    print_success "Container security scanning configured"
}

# =============================================================================
# WEB APPLICATION SECURITY TESTING
# =============================================================================

setup_web_security_testing() {
    print_status "Setting up web application security testing..."
    
    # Install OWASP ZAP for web application security testing
    if ! command -v zaproxy >/dev/null 2>&1; then
        print_status "Installing OWASP ZAP..."
        wget -q -O - https://github.com/zaproxy/zaproxy/releases/download/v2.14.0/ZAP_2_14_0_unix.sh | bash -s -- -q
        ln -sf /opt/zaproxy/zap.sh /usr/local/bin/zaproxy
    fi

    # Web security scanning script
    cat > /usr/local/bin/web-security-scan.sh <<'EOF'
#!/bin/bash

DOMAIN="${1:-bookmyreservation.org}"
SCAN_DIR="/var/log/security-scans"
TIMESTAMP=$(date -Iseconds)
ZAP_PORT="8090"

mkdir -p "$SCAN_DIR"

echo "🕷️ Running web application security scan for $DOMAIN..."

# Start ZAP daemon
echo "Starting OWASP ZAP daemon..."
zaproxy -daemon -port $ZAP_PORT -quickurl "https://$DOMAIN" -quickprogress &
ZAP_PID=$!

# Wait for ZAP to start
sleep 30

# Function to call ZAP API
zap_api() {
    curl -s "http://localhost:$ZAP_PORT/JSON/$1"
}

# Spider the application
echo "Spidering application..."
SPIDER_ID=$(zap_api "spider/action/scan/?url=https://$DOMAIN" | jq -r '.scan')

# Wait for spider to complete
while [ "$(zap_api "spider/view/status/?scanId=$SPIDER_ID" | jq -r '.status')" -lt "100" ]; do
    echo "Spider progress: $(zap_api "spider/view/status/?scanId=$SPIDER_ID" | jq -r '.status')%"
    sleep 10
done

echo "Spider completed"

# Active security scan
echo "Running active security scan..."
ASCAN_ID=$(zap_api "ascan/action/scan/?url=https://$DOMAIN" | jq -r '.scan')

# Wait for active scan to complete
while [ "$(zap_api "ascan/view/status/?scanId=$ASCAN_ID" | jq -r '.status')" -lt "100" ]; do
    echo "Active scan progress: $(zap_api "ascan/view/status/?scanId=$ASCAN_ID" | jq -r '.status')%"
    sleep 30
done

echo "Active scan completed"

# Generate reports
echo "Generating security reports..."

# HTML report
zap_api "core/other/htmlreport/" > "$SCAN_DIR/zap-report-$TIMESTAMP.html"

# XML report
zap_api "core/other/xmlreport/" > "$SCAN_DIR/zap-report-$TIMESTAMP.xml"

# JSON report for analysis
ALERTS=$(zap_api "core/view/alerts/")
echo "$ALERTS" > "$SCAN_DIR/zap-alerts-$TIMESTAMP.json"

# Analyze results
python3 - <<PYTHON
import json
import sys

alerts_file = "$SCAN_DIR/zap-alerts-$TIMESTAMP.json"

try:
    with open(alerts_file, 'r') as f:
        data = json.load(f)
    
    alerts = data.get('alerts', [])
    
    # Categorize by risk level
    risk_levels = {'High': 0, 'Medium': 0, 'Low': 0, 'Informational': 0}
    
    for alert in alerts:
        risk = alert.get('risk', 'Informational')
        if risk in risk_levels:
            risk_levels[risk] += 1
    
    # Generate summary
    summary = {
        'timestamp': '$TIMESTAMP',
        'domain': '$DOMAIN',
        'scan_type': 'web_application_security',
        'total_alerts': len(alerts),
        'risk_breakdown': risk_levels,
        'high_risk_alerts': [a for a in alerts if a.get('risk') == 'High'][:5],  # Top 5
        'recommendations': []
    }
    
    # Add recommendations
    if risk_levels['High'] > 0:
        summary['recommendations'].append('URGENT: Address high-risk security issues immediately')
    if risk_levels['Medium'] > 10:
        summary['recommendations'].append('Review and fix medium-risk security issues')
    
    # Save summary
    with open(f"$SCAN_DIR/web-security-summary-$TIMESTAMP.json", 'w') as f:
        json.dump(summary, f, indent=2)
    
    print(f"Web security scan completed. Found {risk_levels['High']} high-risk, {risk_levels['Medium']} medium-risk issues.")
    
    # Send alert for high-risk issues
    if risk_levels['High'] > 0:
        import os
        os.system(f"/usr/local/bin/send-alert.sh 'High-Risk Web Vulnerabilities' '{risk_levels['High']} high-risk web vulnerabilities found' 'critical'")

except Exception as e:
    print(f"Error analyzing ZAP results: {e}")
    sys.exit(1)

PYTHON

# Stop ZAP
kill $ZAP_PID 2>/dev/null || true

echo "Web security scan completed. Reports saved to $SCAN_DIR"
EOF

    chmod +x /usr/local/bin/web-security-scan.sh

    # Install additional security testing tools
    apt-get update
    apt-get install -y nmap nikto sqlmap

    print_success "Web application security testing configured"
}

# =============================================================================
# INFRASTRUCTURE SECURITY SCANNING
# =============================================================================

setup_infrastructure_scanning() {
    print_status "Setting up infrastructure security scanning..."
    
    # Network security scanning script
    cat > /usr/local/bin/infrastructure-security-scan.sh <<'EOF'
#!/bin/bash

DOMAIN="${1:-bookmyreservation.org}"
SCAN_DIR="/var/log/security-scans"
TIMESTAMP=$(date -Iseconds)

mkdir -p "$SCAN_DIR"

echo "🏗️ Running infrastructure security scan for $DOMAIN..."

# Resolve domain to IP
IP=$(dig +short $DOMAIN | head -1)
echo "Scanning IP: $IP for domain: $DOMAIN"

# Port scanning with nmap
echo "Running port scan..."
nmap -sS -sV -O -A --script vuln -oX "$SCAN_DIR/nmap-$TIMESTAMP.xml" -oN "$SCAN_DIR/nmap-$TIMESTAMP.txt" $IP

# SSL/TLS testing
echo "Testing SSL/TLS configuration..."
if command -v testssl >/dev/null 2>&1; then
    testssl --jsonfile "$SCAN_DIR/testssl-$TIMESTAMP.json" --htmlfile "$SCAN_DIR/testssl-$TIMESTAMP.html" $DOMAIN
else
    echo "testssl not installed, installing..."
    git clone --depth 1 https://github.com/drwetter/testssl.sh.git /opt/testssl
    ln -sf /opt/testssl/testssl.sh /usr/local/bin/testssl
    testssl --jsonfile "$SCAN_DIR/testssl-$TIMESTAMP.json" --htmlfile "$SCAN_DIR/testssl-$TIMESTAMP.html" $DOMAIN
fi

# DNS security testing
echo "Testing DNS configuration..."
dig $DOMAIN ANY > "$SCAN_DIR/dns-$TIMESTAMP.txt"
dig $DOMAIN TXT >> "$SCAN_DIR/dns-$TIMESTAMP.txt"
nslookup $DOMAIN >> "$SCAN_DIR/dns-$TIMESTAMP.txt"

# HTTP security headers check
echo "Checking HTTP security headers..."
curl -I "https://$DOMAIN" > "$SCAN_DIR/http-headers-$TIMESTAMP.txt" 2>/dev/null

# Security headers analysis
python3 - <<PYTHON
import json
import subprocess
import re
from datetime import datetime

def check_security_headers(domain):
    try:
        result = subprocess.run(['curl', '-I', f'https://{domain}'], 
                              capture_output=True, text=True, timeout=30)
        headers = result.stdout.lower()
        
        security_checks = {
            'strict-transport-security': 'strict-transport-security' in headers,
            'x-frame-options': 'x-frame-options' in headers,
            'x-content-type-options': 'x-content-type-options' in headers,
            'x-xss-protection': 'x-xss-protection' in headers,
            'content-security-policy': 'content-security-policy' in headers,
            'referrer-policy': 'referrer-policy' in headers,
            'permissions-policy': 'permissions-policy' in headers or 'feature-policy' in headers
        }
        
        return security_checks
    except Exception as e:
        return {'error': str(e)}

def analyze_nmap_results(filepath):
    try:
        with open(filepath, 'r') as f:
            content = f.read()
        
        # Extract open ports
        open_ports = re.findall(r'(\d+/\w+)\s+open', content)
        
        # Extract vulnerabilities
        vulns = re.findall(r'VULNERABLE:(.*)', content)
        
        return {
            'open_ports': open_ports,
            'vulnerabilities': vulns,
            'total_vulns': len(vulns)
        }
    except Exception as e:
        return {'error': str(e)}

# Analyze results
domain = '$DOMAIN'
timestamp = '$TIMESTAMP'
scan_dir = '$SCAN_DIR'

security_headers = check_security_headers(domain)
nmap_analysis = analyze_nmap_results(f'{scan_dir}/nmap-{timestamp}.txt')

# Generate summary
summary = {
    'timestamp': datetime.now().isoformat(),
    'domain': domain,
    'scan_type': 'infrastructure_security',
    'security_headers': security_headers,
    'network_scan': nmap_analysis,
    'recommendations': []
}

# Generate recommendations
missing_headers = [k for k, v in security_headers.items() if not v and k != 'error']
if missing_headers:
    summary['recommendations'].append(f'Implement missing security headers: {", ".join(missing_headers)}')

if nmap_analysis.get('total_vulns', 0) > 0:
    summary['recommendations'].append('Review and patch network vulnerabilities found by nmap')

if len(nmap_analysis.get('open_ports', [])) > 5:
    summary['recommendations'].append('Review open ports and close unnecessary services')

# Save summary
with open(f'{scan_dir}/infrastructure-security-summary-{timestamp}.json', 'w') as f:
    json.dump(summary, f, indent=2)

print(f"Infrastructure scan completed. Found {nmap_analysis.get('total_vulns', 0)} vulnerabilities, {len(missing_headers)} missing security headers.")

# Send alert for critical issues
if nmap_analysis.get('total_vulns', 0) > 0 or len(missing_headers) > 3:
    import os
    severity = 'critical' if nmap_analysis.get('total_vulns', 0) > 0 else 'warning'
    os.system(f"/usr/local/bin/send-alert.sh 'Infrastructure Security Issues' 'Infrastructure scan found security issues' '{severity}'")

PYTHON

echo "Infrastructure security scan completed. Reports saved to $SCAN_DIR"
EOF

    chmod +x /usr/local/bin/infrastructure-security-scan.sh

    print_success "Infrastructure security scanning configured"
}

# =============================================================================
# COMPREHENSIVE SECURITY DASHBOARD
# =============================================================================

setup_security_dashboard() {
    print_status "Setting up comprehensive security dashboard..."
    
    # Security dashboard script
    cat > /usr/local/bin/security-dashboard.sh <<'EOF'
#!/bin/bash

echo "🔒 Celebrity Booking Platform - Security Dashboard"
echo "================================================="

SCAN_DIR="/var/log/security-scans"

# Check recent scans
echo ""
echo "📊 Recent Security Scans:"
if [ -d "$SCAN_DIR" ]; then
    echo "  Latest dependency scan: $(ls -t $SCAN_DIR/security-summary-*.json 2>/dev/null | head -1 | xargs basename 2>/dev/null || echo 'None')"
    echo "  Latest container scan: $(ls -t $SCAN_DIR/container-security-summary-*.json 2>/dev/null | head -1 | xargs basename 2>/dev/null || echo 'None')"
    echo "  Latest web scan: $(ls -t $SCAN_DIR/web-security-summary-*.json 2>/dev/null | head -1 | xargs basename 2>/dev/null || echo 'None')"
    echo "  Latest infrastructure scan: $(ls -t $SCAN_DIR/infrastructure-security-summary-*.json 2>/dev/null | head -1 | xargs basename 2>/dev/null || echo 'None')"
else
    echo "  No scans found"
fi

# Security status summary
echo ""
echo "🛡️ Security Status Summary:"

# Analyze latest reports
python3 - <<PYTHON
import json
import glob
import os
from datetime import datetime, timedelta

scan_dir = "$SCAN_DIR"

def get_latest_report(pattern):
    files = glob.glob(f"{scan_dir}/{pattern}")
    if files:
        latest = max(files, key=os.path.getctime)
        try:
            with open(latest, 'r') as f:
                return json.load(f)
        except:
            return None
    return None

# Get latest reports
dependency_report = get_latest_report("security-summary-*.json")
container_report = get_latest_report("container-security-summary-*.json")
web_report = get_latest_report("web-security-summary-*.json")
infra_report = get_latest_report("infrastructure-security-summary-*.json")

# Calculate overall security score
total_critical = 0
total_high = 0
total_issues = 0

if dependency_report:
    deps_critical = sum(1 for r in dependency_report.get('reports', []) if r.get('severity') == 'critical')
    deps_high = sum(1 for r in dependency_report.get('reports', []) if r.get('severity') == 'high')
    total_critical += deps_critical
    total_high += deps_high
    print(f"  Dependencies: {deps_critical} critical, {deps_high} high")

if container_report:
    cont_critical = container_report.get('total_critical', 0)
    cont_high = container_report.get('total_high', 0)
    total_critical += cont_critical
    total_high += cont_high
    print(f"  Containers: {cont_critical} critical, {cont_high} high")

if web_report:
    web_high = web_report.get('risk_breakdown', {}).get('High', 0)
    web_medium = web_report.get('risk_breakdown', {}).get('Medium', 0)
    total_high += web_high
    print(f"  Web Application: {web_high} high-risk, {web_medium} medium-risk")

if infra_report:
    infra_vulns = infra_report.get('network_scan', {}).get('total_vulns', 0)
    missing_headers = len([k for k, v in infra_report.get('security_headers', {}).items() if not v and k != 'error'])
    print(f"  Infrastructure: {infra_vulns} vulnerabilities, {missing_headers} missing headers")

# Overall security score (100 - penalties)
score = 100
score -= total_critical * 20  # -20 per critical
score -= total_high * 5       # -5 per high
score = max(0, score)

print(f"\n🎯 Overall Security Score: {score}/100")

if score >= 90:
    print("   Status: ✅ Excellent")
elif score >= 70:
    print("   Status: ⚠️  Good")
elif score >= 50:
    print("   Status: ⚠️  Needs Attention")
else:
    print("   Status: 🚨 Critical Issues")

# Top recommendations
print(f"\n📋 Top Security Recommendations:")
all_recommendations = []

for report in [dependency_report, container_report, web_report, infra_report]:
    if report and 'recommendations' in report:
        all_recommendations.extend(report['recommendations'])

for i, rec in enumerate(all_recommendations[:5], 1):
    print(f"  {i}. {rec}")

PYTHON

# Check security tools status
echo ""
echo "🔧 Security Tools Status:"
command -v trivy >/dev/null && echo "  ✅ Trivy (container scanning)" || echo "  ❌ Trivy not installed"
command -v zaproxy >/dev/null && echo "  ✅ OWASP ZAP (web scanning)" || echo "  ❌ OWASP ZAP not installed"
command -v nmap >/dev/null && echo "  ✅ Nmap (network scanning)" || echo "  ❌ Nmap not installed"
command -v eslint >/dev/null && echo "  ✅ ESLint (static analysis)" || echo "  ❌ ESLint not installed"

# Check for SonarQube
if docker ps | grep -q sonarqube; then
    echo "  ✅ SonarQube (code quality)"
else
    echo "  ❌ SonarQube not running"
fi

echo ""
echo "🔗 Security Resources:"
echo "  - Security scan logs: $SCAN_DIR"
echo "  - SonarQube: http://localhost:9000"
echo "  - Run full security scan: /usr/local/bin/run-security-scans.sh"
EOF

    chmod +x /usr/local/bin/security-dashboard.sh

    print_success "Security dashboard configured"
}

# =============================================================================
# AUTOMATED SECURITY SCANNING ORCHESTRATION
# =============================================================================

setup_security_orchestration() {
    print_status "Setting up automated security scanning orchestration..."
    
    # Master security scanning script
    cat > /usr/local/bin/run-security-scans.sh <<'EOF'
#!/bin/bash

echo "🔒 Running Comprehensive Security Scans"
echo "======================================"

DOMAIN="${1:-bookmyreservation.org}"
SCAN_TYPE="${2:-all}"

# Create scan directory
SCAN_DIR="/var/log/security-scans"
mkdir -p "$SCAN_DIR"

# Log scan start
echo "$(date): Starting security scans" >> "$SCAN_DIR/scan.log"

case $SCAN_TYPE in
    "dependencies"|"all")
        echo "🔍 Running dependency vulnerability scan..."
        cd /opt/celebrity-booking/backend && node scripts/security-audit.js
        ;;
esac

case $SCAN_TYPE in
    "containers"|"all")
        echo "🐳 Running container security scan..."
        /usr/local/bin/container-security-scan.sh
        ;;
esac

case $SCAN_TYPE in
    "web"|"all")
        echo "🕷️ Running web application security scan..."
        /usr/local/bin/web-security-scan.sh "$DOMAIN"
        ;;
esac

case $SCAN_TYPE in
    "infrastructure"|"all")
        echo "🏗️ Running infrastructure security scan..."
        /usr/local/bin/infrastructure-security-scan.sh "$DOMAIN"
        ;;
esac

case $SCAN_TYPE in
    "static"|"all")
        echo "📝 Running static code analysis..."
        cd /opt/celebrity-booking/backend && npx eslint --config .eslintrc.security.js . --format json > "$SCAN_DIR/eslint-backend-$(date -Iseconds).json" || true
        cd /opt/celebrity-booking && npx eslint --config .eslintrc.security.js src --format json > "$SCAN_DIR/eslint-frontend-$(date -Iseconds).json" || true
        ;;
esac

# Generate consolidated report
echo "📊 Generating consolidated security report..."
python3 - <<PYTHON
import json
import glob
import os
from datetime import datetime

scan_dir = "$SCAN_DIR"
report_timestamp = datetime.now().isoformat()

def get_recent_reports(pattern, hours=24):
    files = glob.glob(f"{scan_dir}/{pattern}")
    recent_files = []
    cutoff = datetime.now().timestamp() - (hours * 3600)
    
    for file in files:
        if os.path.getctime(file) > cutoff:
            recent_files.append(file)
    
    return recent_files

# Collect all recent security reports
consolidated_report = {
    'timestamp': report_timestamp,
    'scan_type': 'consolidated_security',
    'scans_included': [],
    'total_critical_issues': 0,
    'total_high_issues': 0,
    'total_medium_issues': 0,
    'overall_risk_level': 'low',
    'recommendations': [],
    'scan_coverage': {
        'dependencies': False,
        'containers': False,
        'web_application': False,
        'infrastructure': False,
        'static_analysis': False
    }
}

# Analyze dependency scans
dep_reports = get_recent_reports("security-summary-*.json")
if dep_reports:
    consolidated_report['scan_coverage']['dependencies'] = True
    consolidated_report['scans_included'].append('dependency_scan')

# Analyze container scans
container_reports = get_recent_reports("container-security-summary-*.json")
if container_reports:
    consolidated_report['scan_coverage']['containers'] = True
    consolidated_report['scans_included'].append('container_scan')

# Analyze web scans
web_reports = get_recent_reports("web-security-summary-*.json")
if web_reports:
    consolidated_report['scan_coverage']['web_application'] = True
    consolidated_report['scans_included'].append('web_application_scan')

# Analyze infrastructure scans
infra_reports = get_recent_reports("infrastructure-security-summary-*.json")
if infra_reports:
    consolidated_report['scan_coverage']['infrastructure'] = True
    consolidated_report['scans_included'].append('infrastructure_scan')

# Calculate overall risk
critical_count = consolidated_report['total_critical_issues']
high_count = consolidated_report['total_high_issues']

if critical_count > 0:
    consolidated_report['overall_risk_level'] = 'critical'
elif high_count > 5:
    consolidated_report['overall_risk_level'] = 'high'
elif high_count > 0:
    consolidated_report['overall_risk_level'] = 'medium'

# Save consolidated report
with open(f"{scan_dir}/consolidated-security-report-{report_timestamp.replace(':', '-')}.json", 'w') as f:
    json.dump(consolidated_report, f, indent=2)

print(f"Consolidated security report generated")
print(f"Overall risk level: {consolidated_report['overall_risk_level']}")
print(f"Scans completed: {', '.join(consolidated_report['scans_included'])}")

# Send summary alert
if consolidated_report['overall_risk_level'] in ['critical', 'high']:
    os.system(f"/usr/local/bin/send-alert.sh 'Security Scan Summary' 'Comprehensive security scan completed with {consolidated_report['overall_risk_level']} risk level' '{consolidated_report['overall_risk_level']}'")

PYTHON

echo "$(date): Security scans completed" >> "$SCAN_DIR/scan.log"
echo "✅ Comprehensive security scans completed"
echo "📊 View results: /usr/local/bin/security-dashboard.sh"
EOF

    chmod +x /usr/local/bin/run-security-scans.sh

    # Setup automated scanning schedule
    cat > /etc/cron.d/security-scanning <<EOF
# Automated security scanning schedule
# Daily dependency scan
0 2 * * * root cd /opt/celebrity-booking/backend && node scripts/security-audit.js >> /var/log/security-scans/scan.log 2>&1

# Weekly comprehensive scan
0 3 * * 0 root /usr/local/bin/run-security-scans.sh >> /var/log/security-scans/scan.log 2>&1

# Monthly infrastructure scan
0 4 1 * * root /usr/local/bin/infrastructure-security-scan.sh >> /var/log/security-scans/scan.log 2>&1
EOF

    print_success "Security scanning orchestration configured"
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

# Create necessary directories
mkdir -p /var/log/security-scans
mkdir -p /opt/celebrity-booking/backend/scripts

# Install common dependencies
if command -v apt-get >/dev/null 2>&1; then
    apt-get update
    apt-get install -y curl wget python3 python3-pip jq git docker.io docker-compose
elif command -v yum >/dev/null 2>&1; then
    yum install -y curl wget python3 python3-pip jq git docker docker-compose
fi

# Setup all security scanning components
setup_dependency_scanning
setup_static_analysis
setup_container_scanning
setup_web_security_testing
setup_infrastructure_scanning
setup_security_dashboard
setup_security_orchestration

# Run initial security scan
print_status "Running initial security assessment..."
/usr/local/bin/run-security-scans.sh

# Final summary
echo ""
print_status "📋 Security Scanning Setup Summary:"
echo "  ✅ Dependency vulnerability scanning (npm audit, Retire.js, Snyk)"
echo "  ✅ Static code analysis (ESLint security plugins, SonarQube)"
echo "  ✅ Container security scanning (Trivy, Hadolint)"
echo "  ✅ Web application security testing (OWASP ZAP)"
echo "  ✅ Infrastructure security scanning (Nmap, SSL testing)"
echo "  ✅ Automated scanning orchestration"
echo "  ✅ Security dashboard and reporting"

echo ""
print_status "🔧 Security Tools Access:"
echo "  - Security dashboard: /usr/local/bin/security-dashboard.sh"
echo "  - Run all scans: /usr/local/bin/run-security-scans.sh"
echo "  - SonarQube: http://localhost:9000 (admin/admin)"
echo "  - Scan reports: /var/log/security-scans/"

echo ""
print_status "🔧 Scanning Schedule:"
echo "  - Daily: Dependency vulnerability scanning"
echo "  - Weekly: Comprehensive security scan"
echo "  - Monthly: Infrastructure security scan"

echo ""
print_success "🎉 Comprehensive security scanning setup completed!"

echo ""
print_status "Next steps:"
echo "1. Review initial security scan results"
echo "2. Configure API keys for external tools (Snyk, etc.)"
echo "3. Customize scanning schedules based on deployment frequency"
echo "4. Integrate security scanning into CI/CD pipeline"
echo "5. Train development team on security best practices"