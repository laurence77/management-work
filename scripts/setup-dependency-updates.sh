#!/bin/bash

# Automated Dependency Vulnerability Scanning and Updates
# This script sets up automated dependency management and security updates

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

print_status "🔄 Celebrity Booking Platform - Dependency Update Automation"
echo ""

# =============================================================================
# DEPENDENCY SCANNING TOOLS SETUP
# =============================================================================

setup_dependency_scanners() {
    print_status "Setting up dependency vulnerability scanners..."
    
    # Install global tools
    npm install -g npm-check-updates audit-ci npm-audit-resolver snyk
    
    # Create dependency management directory
    mkdir -p /opt/dependency-management
    
    # Comprehensive dependency scanner
    cat > /opt/dependency-management/dependency-scanner.js <<'EOF'
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class DependencyScanner {
  constructor() {
    this.projectPaths = [
      '/opt/celebrity-booking',
      '/opt/celebrity-booking/backend',
      '/opt/celebrity-booking/admin-dashboard'
    ];
    this.reportDir = '/var/log/dependency-scans';
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    this.vulnerabilityLevels = {
      critical: { score: 10, action: 'immediate' },
      high: { score: 7, action: 'urgent' },
      moderate: { score: 4, action: 'schedule' },
      low: { score: 1, action: 'monitor' }
    };
    
    this.ensureReportDir();
  }

  ensureReportDir() {
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
  }

  async scanAllProjects() {
    const results = {};
    
    for (const projectPath of this.projectPaths) {
      if (fs.existsSync(path.join(projectPath, 'package.json'))) {
        console.log(`Scanning ${projectPath}...`);
        results[projectPath] = await this.scanProject(projectPath);
      } else {
        console.log(`Skipping ${projectPath} - no package.json found`);
      }
    }
    
    return this.generateConsolidatedReport(results);
  }

  async scanProject(projectPath) {
    const results = {
      path: projectPath,
      npm_audit: null,
      outdated_packages: null,
      snyk_scan: null,
      dependency_tree: null,
      package_info: this.getPackageInfo(projectPath)
    };

    try {
      // NPM Audit
      results.npm_audit = await this.runNpmAudit(projectPath);
      
      // Check outdated packages
      results.outdated_packages = await this.checkOutdatedPackages(projectPath);
      
      // Snyk scan if available
      results.snyk_scan = await this.runSnykScan(projectPath);
      
      // Analyze dependency tree
      results.dependency_tree = await this.analyzeDependencyTree(projectPath);
      
    } catch (error) {
      console.error(`Error scanning ${projectPath}:`, error.message);
      results.error = error.message;
    }

    return results;
  }

  getPackageInfo(projectPath) {
    try {
      const packageJsonPath = path.join(projectPath, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      return {
        name: packageJson.name,
        version: packageJson.version,
        dependencies: Object.keys(packageJson.dependencies || {}),
        devDependencies: Object.keys(packageJson.devDependencies || {}),
        totalDependencies: Object.keys({
          ...packageJson.dependencies,
          ...packageJson.devDependencies
        }).length
      };
    } catch (error) {
      return { error: 'Could not read package.json' };
    }
  }

  async runNpmAudit(projectPath) {
    try {
      const auditResult = execSync('npm audit --json', {
        cwd: projectPath,
        encoding: 'utf8',
        timeout: 30000
      });
      
      const audit = JSON.parse(auditResult);
      
      return {
        vulnerabilities: audit.metadata?.vulnerabilities || {},
        advisories: Object.keys(audit.advisories || {}).length,
        summary: this.summarizeVulnerabilities(audit.metadata?.vulnerabilities || {})
      };
    } catch (error) {
      // npm audit returns non-zero exit code when vulnerabilities found
      if (error.stdout) {
        try {
          const audit = JSON.parse(error.stdout);
          return {
            vulnerabilities: audit.metadata?.vulnerabilities || {},
            advisories: Object.keys(audit.advisories || {}).length,
            summary: this.summarizeVulnerabilities(audit.metadata?.vulnerabilities || {})
          };
        } catch (parseError) {
          return { error: 'Failed to parse npm audit output' };
        }
      }
      return { error: error.message };
    }
  }

  async checkOutdatedPackages(projectPath) {
    try {
      const outdatedResult = execSync('npm outdated --json', {
        cwd: projectPath,
        encoding: 'utf8',
        timeout: 30000
      });
      
      const outdated = JSON.parse(outdatedResult || '{}');
      
      return {
        count: Object.keys(outdated).length,
        packages: Object.entries(outdated).map(([name, info]) => ({
          name,
          current: info.current,
          wanted: info.wanted,
          latest: info.latest,
          severity: this.calculateUpdateSeverity(info.current, info.latest)
        }))
      };
    } catch (error) {
      // npm outdated returns non-zero when outdated packages found
      if (error.stdout) {
        try {
          const outdated = JSON.parse(error.stdout || '{}');
          return {
            count: Object.keys(outdated).length,
            packages: Object.entries(outdated).map(([name, info]) => ({
              name,
              current: info.current,
              wanted: info.wanted,
              latest: info.latest,
              severity: this.calculateUpdateSeverity(info.current, info.latest)
            }))
          };
        } catch (parseError) {
          return { error: 'Failed to parse npm outdated output' };
        }
      }
      return { error: error.message };
    }
  }

  async runSnykScan(projectPath) {
    try {
      // Check if Snyk is authenticated
      execSync('snyk auth', { stdio: 'ignore' });
      
      const snykResult = execSync('snyk test --json', {
        cwd: projectPath,
        encoding: 'utf8',
        timeout: 60000
      });
      
      const snyk = JSON.parse(snykResult);
      
      return {
        vulnerabilities: snyk.vulnerabilities?.length || 0,
        uniqueCount: snyk.uniqueCount || 0,
        summary: snyk.summary || {},
        ok: snyk.ok
      };
    } catch (error) {
      if (error.stdout) {
        try {
          const snyk = JSON.parse(error.stdout);
          return {
            vulnerabilities: snyk.vulnerabilities?.length || 0,
            uniqueCount: snyk.uniqueCount || 0,
            summary: snyk.summary || {},
            ok: false
          };
        } catch (parseError) {
          return { error: 'Snyk not authenticated or unavailable' };
        }
      }
      return { error: 'Snyk not authenticated or unavailable' };
    }
  }

  async analyzeDependencyTree(projectPath) {
    try {
      const treeResult = execSync('npm ls --json --depth=0', {
        cwd: projectPath,
        encoding: 'utf8',
        timeout: 30000
      });
      
      const tree = JSON.parse(treeResult);
      
      return {
        name: tree.name,
        version: tree.version,
        dependencies: Object.keys(tree.dependencies || {}).length,
        problems: tree.problems || []
      };
    } catch (error) {
      return { error: 'Could not analyze dependency tree' };
    }
  }

  summarizeVulnerabilities(vulnerabilities) {
    const total = Object.values(vulnerabilities).reduce((sum, count) => sum + count, 0);
    const riskScore = this.calculateRiskScore(vulnerabilities);
    
    return {
      total,
      breakdown: vulnerabilities,
      riskScore,
      riskLevel: this.getRiskLevel(riskScore)
    };
  }

  calculateRiskScore(vulnerabilities) {
    let score = 0;
    Object.entries(vulnerabilities).forEach(([level, count]) => {
      if (this.vulnerabilityLevels[level]) {
        score += count * this.vulnerabilityLevels[level].score;
      }
    });
    return score;
  }

  getRiskLevel(score) {
    if (score >= 50) return 'critical';
    if (score >= 20) return 'high';
    if (score >= 5) return 'moderate';
    return 'low';
  }

  calculateUpdateSeverity(current, latest) {
    try {
      const currentParts = current.split('.').map(Number);
      const latestParts = latest.split('.').map(Number);
      
      if (latestParts[0] > currentParts[0]) return 'major';
      if (latestParts[1] > currentParts[1]) return 'minor';
      if (latestParts[2] > currentParts[2]) return 'patch';
      return 'none';
    } catch (error) {
      return 'unknown';
    }
  }

  generateConsolidatedReport(results) {
    const report = {
      timestamp: new Date().toISOString(),
      scan_type: 'dependency_vulnerability',
      projects: results,
      summary: {
        total_projects: Object.keys(results).length,
        total_vulnerabilities: 0,
        total_outdated: 0,
        highest_risk_level: 'low',
        critical_vulnerabilities: 0,
        high_vulnerabilities: 0
      },
      recommendations: [],
      automated_actions: []
    };

    // Calculate summary statistics
    Object.values(results).forEach(project => {
      if (project.npm_audit && project.npm_audit.vulnerabilities) {
        const vulns = project.npm_audit.vulnerabilities;
        report.summary.total_vulnerabilities += Object.values(vulns).reduce((sum, count) => sum + count, 0);
        report.summary.critical_vulnerabilities += vulns.critical || 0;
        report.summary.high_vulnerabilities += vulns.high || 0;
        
        if (project.npm_audit.summary) {
          const projectRiskLevel = project.npm_audit.summary.riskLevel;
          if (this.compareRiskLevels(projectRiskLevel, report.summary.highest_risk_level) > 0) {
            report.summary.highest_risk_level = projectRiskLevel;
          }
        }
      }
      
      if (project.outdated_packages) {
        report.summary.total_outdated += project.outdated_packages.count || 0;
      }
    });

    // Generate recommendations
    this.generateRecommendations(report);
    
    // Save report
    const reportPath = path.join(this.reportDir, `dependency-scan-${this.timestamp}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Save latest report
    const latestPath = path.join(this.reportDir, 'dependency-scan-latest.json');
    fs.writeFileSync(latestPath, JSON.stringify(report, null, 2));

    console.log(`Scan completed. Report saved to: ${reportPath}`);
    
    return report;
  }

  generateRecommendations(report) {
    if (report.summary.critical_vulnerabilities > 0) {
      report.recommendations.push('URGENT: Address critical vulnerabilities immediately');
      report.automated_actions.push('schedule_immediate_update');
    }
    
    if (report.summary.high_vulnerabilities > 0) {
      report.recommendations.push('Address high-severity vulnerabilities within 24 hours');
      report.automated_actions.push('schedule_urgent_update');
    }
    
    if (report.summary.total_outdated > 10) {
      report.recommendations.push('Consider updating outdated packages to improve security');
      report.automated_actions.push('schedule_package_updates');
    }
    
    if (report.summary.highest_risk_level === 'critical') {
      report.recommendations.push('Deploy security patches to production immediately');
      report.automated_actions.push('alert_security_team');
    }
  }

  compareRiskLevels(level1, level2) {
    const levels = ['low', 'moderate', 'high', 'critical'];
    return levels.indexOf(level1) - levels.indexOf(level2);
  }
}

// Export for use in other modules
if (require.main === module) {
  const scanner = new DependencyScanner();
  scanner.scanAllProjects()
    .then(report => {
      console.log('\n📊 Scan Summary:');
      console.log(`Projects scanned: ${report.summary.total_projects}`);
      console.log(`Total vulnerabilities: ${report.summary.total_vulnerabilities}`);
      console.log(`Critical vulnerabilities: ${report.summary.critical_vulnerabilities}`);
      console.log(`High vulnerabilities: ${report.summary.high_vulnerabilities}`);
      console.log(`Outdated packages: ${report.summary.total_outdated}`);
      console.log(`Overall risk level: ${report.summary.highest_risk_level}`);
      
      if (report.recommendations.length > 0) {
        console.log('\n📋 Recommendations:');
        report.recommendations.forEach((rec, index) => {
          console.log(`${index + 1}. ${rec}`);
        });
      }
      
      // Send alerts for critical issues
      if (report.summary.critical_vulnerabilities > 0 || report.summary.highest_risk_level === 'critical') {
        const { execSync } = require('child_process');
        const message = `Critical security vulnerabilities detected: ${report.summary.critical_vulnerabilities} critical, ${report.summary.high_vulnerabilities} high`;
        execSync(`/usr/local/bin/send-alert.sh "Critical Dependencies" "${message}" "critical"`);
      }
      
      process.exit(0);
    })
    .catch(error => {
      console.error('Dependency scan failed:', error);
      process.exit(1);
    });
}

module.exports = DependencyScanner;
EOF

    chmod +x /opt/dependency-management/dependency-scanner.js

    print_success "Dependency scanning tools configured"
}

# =============================================================================
# AUTOMATED UPDATE SYSTEM
# =============================================================================

setup_automated_updates() {
    print_status "Setting up automated dependency update system..."
    
    # Automated dependency updater
    cat > /opt/dependency-management/dependency-updater.js <<'EOF'
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class DependencyUpdater {
  constructor() {
    this.projectPaths = [
      '/opt/celebrity-booking',
      '/opt/celebrity-booking/backend',
      '/opt/celebrity-booking/admin-dashboard'
    ];
    this.backupDir = '/var/backups/dependency-updates';
    this.logFile = '/var/log/dependency-updates.log';
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    this.updateStrategy = {
      critical: { auto: true, test: true, deploy: false },
      high: { auto: true, test: true, deploy: false },
      moderate: { auto: false, test: true, deploy: false },
      low: { auto: false, test: false, deploy: false }
    };
    
    this.ensureDirectories();
  }

  ensureDirectories() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp} ${message}\n`;
    
    console.log(message);
    
    try {
      fs.appendFileSync(this.logFile, logEntry);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  async updateAllProjects(options = {}) {
    const {
      autoUpdate = false,
      securityOnly = true,
      testAfterUpdate = true,
      createBackup = true
    } = options;

    this.log('🔄 Starting automated dependency updates');
    
    const results = {};
    
    for (const projectPath of this.projectPaths) {
      if (fs.existsSync(path.join(projectPath, 'package.json'))) {
        this.log(`Updating dependencies for ${projectPath}`);
        results[projectPath] = await this.updateProject(projectPath, {
          autoUpdate,
          securityOnly,
          testAfterUpdate,
          createBackup
        });
      }
    }
    
    return this.generateUpdateReport(results);
  }

  async updateProject(projectPath, options) {
    const result = {
      path: projectPath,
      backup_created: false,
      security_updates: [],
      package_updates: [],
      tests_passed: null,
      errors: []
    };

    try {
      // Create backup if requested
      if (options.createBackup) {
        result.backup_created = await this.createBackup(projectPath);
      }

      // Security updates first
      if (options.securityOnly) {
        result.security_updates = await this.applySecurityUpdates(projectPath);
      } else {
        result.package_updates = await this.updatePackages(projectPath);
      }

      // Run tests if requested
      if (options.testAfterUpdate) {
        result.tests_passed = await this.runTests(projectPath);
      }

    } catch (error) {
      result.errors.push(error.message);
      this.log(`❌ Error updating ${projectPath}: ${error.message}`);
    }

    return result;
  }

  async createBackup(projectPath) {
    try {
      const projectName = path.basename(projectPath);
      const backupPath = path.join(this.backupDir, `${projectName}-${this.timestamp}`);
      
      // Copy package.json and package-lock.json
      const packageJsonPath = path.join(projectPath, 'package.json');
      const packageLockPath = path.join(projectPath, 'package-lock.json');
      
      fs.mkdirSync(backupPath, { recursive: true });
      
      if (fs.existsSync(packageJsonPath)) {
        fs.copyFileSync(packageJsonPath, path.join(backupPath, 'package.json'));
      }
      
      if (fs.existsSync(packageLockPath)) {
        fs.copyFileSync(packageLockPath, path.join(backupPath, 'package-lock.json'));
      }
      
      this.log(`✅ Backup created for ${projectPath} at ${backupPath}`);
      return true;
    } catch (error) {
      this.log(`❌ Failed to create backup for ${projectPath}: ${error.message}`);
      return false;
    }
  }

  async applySecurityUpdates(projectPath) {
    const updates = [];
    
    try {
      // First, get audit report
      let auditOutput;
      try {
        auditOutput = execSync('npm audit --json', {
          cwd: projectPath,
          encoding: 'utf8',
          timeout: 30000
        });
      } catch (error) {
        // npm audit returns non-zero for vulnerabilities
        auditOutput = error.stdout;
      }
      
      if (auditOutput) {
        const audit = JSON.parse(auditOutput);
        const vulnerabilities = audit.metadata?.vulnerabilities || {};
        
        // Apply automatic fixes for critical and high vulnerabilities
        if (vulnerabilities.critical > 0 || vulnerabilities.high > 0) {
          this.log(`Applying security fixes for ${vulnerabilities.critical} critical and ${vulnerabilities.high} high vulnerabilities`);
          
          try {
            const fixOutput = execSync('npm audit fix --force', {
              cwd: projectPath,
              encoding: 'utf8',
              timeout: 120000
            });
            
            updates.push({
              type: 'security_fix',
              vulnerabilities_before: vulnerabilities,
              output: fixOutput
            });
            
            this.log(`✅ Security fixes applied for ${projectPath}`);
          } catch (fixError) {
            this.log(`⚠️ Some security fixes failed for ${projectPath}: ${fixError.message}`);
            updates.push({
              type: 'security_fix_partial',
              error: fixError.message
            });
          }
        }
      }
    } catch (error) {
      this.log(`❌ Failed to apply security updates for ${projectPath}: ${error.message}`);
      updates.push({
        type: 'security_fix_failed',
        error: error.message
      });
    }
    
    return updates;
  }

  async updatePackages(projectPath) {
    const updates = [];
    
    try {
      // Get outdated packages
      let outdatedOutput;
      try {
        outdatedOutput = execSync('npm outdated --json', {
          cwd: projectPath,
          encoding: 'utf8',
          timeout: 30000
        });
      } catch (error) {
        outdatedOutput = error.stdout;
      }
      
      if (outdatedOutput) {
        const outdated = JSON.parse(outdatedOutput || '{}');
        const packageNames = Object.keys(outdated);
        
        if (packageNames.length > 0) {
          this.log(`Updating ${packageNames.length} outdated packages in ${projectPath}`);
          
          // Update packages using npm-check-updates
          try {
            // Update patch and minor versions only for safety
            const ncuOutput = execSync('ncu -u --target minor', {
              cwd: projectPath,
              encoding: 'utf8',
              timeout: 60000
            });
            
            // Install updated packages
            execSync('npm install', {
              cwd: projectPath,
              encoding: 'utf8',
              timeout: 180000
            });
            
            updates.push({
              type: 'package_update',
              packages_updated: packageNames.length,
              output: ncuOutput
            });
            
            this.log(`✅ Package updates completed for ${projectPath}`);
          } catch (updateError) {
            this.log(`❌ Package update failed for ${projectPath}: ${updateError.message}`);
            updates.push({
              type: 'package_update_failed',
              error: updateError.message
            });
          }
        }
      }
    } catch (error) {
      this.log(`❌ Failed to update packages for ${projectPath}: ${error.message}`);
      updates.push({
        type: 'package_update_failed',
        error: error.message
      });
    }
    
    return updates;
  }

  async runTests(projectPath) {
    try {
      this.log(`Running tests for ${projectPath}`);
      
      // Check if test script exists
      const packageJsonPath = path.join(projectPath, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      if (!packageJson.scripts || !packageJson.scripts.test) {
        this.log(`No test script found for ${projectPath}`);
        return { status: 'no_tests', message: 'No test script configured' };
      }
      
      const testOutput = execSync('npm test', {
        cwd: projectPath,
        encoding: 'utf8',
        timeout: 300000
      });
      
      this.log(`✅ Tests passed for ${projectPath}`);
      return { status: 'passed', output: testOutput };
      
    } catch (error) {
      this.log(`❌ Tests failed for ${projectPath}: ${error.message}`);
      return { status: 'failed', error: error.message };
    }
  }

  generateUpdateReport(results) {
    const report = {
      timestamp: new Date().toISOString(),
      update_type: 'automated_dependency_update',
      projects: results,
      summary: {
        total_projects: Object.keys(results).length,
        successful_updates: 0,
        failed_updates: 0,
        tests_passed: 0,
        tests_failed: 0,
        backups_created: 0
      },
      recommendations: []
    };

    // Calculate summary
    Object.values(results).forEach(project => {
      if (project.security_updates.length > 0 || project.package_updates.length > 0) {
        if (project.errors.length === 0) {
          report.summary.successful_updates++;
        } else {
          report.summary.failed_updates++;
        }
      }
      
      if (project.tests_passed) {
        if (project.tests_passed.status === 'passed') {
          report.summary.tests_passed++;
        } else if (project.tests_passed.status === 'failed') {
          report.summary.tests_failed++;
        }
      }
      
      if (project.backup_created) {
        report.summary.backups_created++;
      }
    });

    // Generate recommendations
    if (report.summary.failed_updates > 0) {
      report.recommendations.push('Review failed updates and resolve conflicts manually');
    }
    
    if (report.summary.tests_failed > 0) {
      report.recommendations.push('Investigate test failures before deploying updates');
    }
    
    // Save report
    const reportPath = path.join('/var/log/dependency-scans', `update-report-${this.timestamp}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    this.log(`Update report saved to: ${reportPath}`);
    
    return report;
  }

  async rollbackProject(projectPath, backupTimestamp) {
    try {
      const projectName = path.basename(projectPath);
      const backupPath = path.join(this.backupDir, `${projectName}-${backupTimestamp}`);
      
      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup not found: ${backupPath}`);
      }
      
      // Restore package.json and package-lock.json
      const backupPackageJson = path.join(backupPath, 'package.json');
      const backupPackageLock = path.join(backupPath, 'package-lock.json');
      
      if (fs.existsSync(backupPackageJson)) {
        fs.copyFileSync(backupPackageJson, path.join(projectPath, 'package.json'));
      }
      
      if (fs.existsSync(backupPackageLock)) {
        fs.copyFileSync(backupPackageLock, path.join(projectPath, 'package-lock.json'));
      }
      
      // Reinstall packages
      execSync('npm install', {
        cwd: projectPath,
        encoding: 'utf8',
        timeout: 180000
      });
      
      this.log(`✅ Rollback completed for ${projectPath} to ${backupTimestamp}`);
      return true;
    } catch (error) {
      this.log(`❌ Rollback failed for ${projectPath}: ${error.message}`);
      return false;
    }
  }
}

if (require.main === module) {
  const updater = new DependencyUpdater();
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  const securityOnly = args.includes('--security-only');
  const autoUpdate = args.includes('--auto');
  const skipTests = args.includes('--skip-tests');
  
  updater.updateAllProjects({
    autoUpdate,
    securityOnly,
    testAfterUpdate: !skipTests,
    createBackup: true
  })
  .then(report => {
    console.log('\n📊 Update Summary:');
    console.log(`Projects updated: ${report.summary.successful_updates}/${report.summary.total_projects}`);
    console.log(`Tests passed: ${report.summary.tests_passed}`);
    console.log(`Tests failed: ${report.summary.tests_failed}`);
    console.log(`Backups created: ${report.summary.backups_created}`);
    
    if (report.summary.failed_updates > 0) {
      console.log('\n⚠️ Some updates failed. Check the logs for details.');
      process.exit(1);
    }
    
    process.exit(0);
  })
  .catch(error => {
    console.error('Dependency update failed:', error);
    process.exit(1);
  });
}

module.exports = DependencyUpdater;
EOF

    chmod +x /opt/dependency-management/dependency-updater.js

    print_success "Automated update system configured"
}

# =============================================================================
# MONITORING AND ALERTING
# =============================================================================

setup_dependency_monitoring() {
    print_status "Setting up dependency monitoring and alerting..."
    
    # Dependency monitoring dashboard
    cat > /usr/local/bin/dependency-dashboard.sh <<'EOF'
#!/bin/bash

echo "📦 Celebrity Booking Platform - Dependency Dashboard"
echo "==================================================="

SCAN_DIR="/var/log/dependency-scans"
UPDATE_LOG="/var/log/dependency-updates.log"

# Check latest scan results
echo ""
echo "📊 Latest Dependency Scan:"
if [[ -f "$SCAN_DIR/dependency-scan-latest.json" ]]; then
    python3 - <<PYTHON
import json
import os
from datetime import datetime

try:
    with open('$SCAN_DIR/dependency-scan-latest.json', 'r') as f:
        report = json.load(f)
    
    print(f"  Scan Date: {report['timestamp']}")
    print(f"  Projects Scanned: {report['summary']['total_projects']}")
    print(f"  Total Vulnerabilities: {report['summary']['total_vulnerabilities']}")
    print(f"  Critical: {report['summary']['critical_vulnerabilities']}")
    print(f"  High: {report['summary']['high_vulnerabilities']}")
    print(f"  Outdated Packages: {report['summary']['total_outdated']}")
    print(f"  Risk Level: {report['summary']['highest_risk_level'].upper()}")
    
    if report['recommendations']:
        print(f"\\n📋 Top Recommendations:")
        for i, rec in enumerate(report['recommendations'][:3], 1):
            print(f"  {i}. {rec}")

except Exception as e:
    print(f"  Error reading scan report: {e}")
PYTHON
else
    echo "  No scan results found. Run: node /opt/dependency-management/dependency-scanner.js"
fi

# Check recent updates
echo ""
echo "🔄 Recent Dependency Updates:"
if [[ -f "$UPDATE_LOG" ]]; then
    echo "  Last 5 update events:"
    tail -5 "$UPDATE_LOG" | while read line; do
        echo "    $line"
    done
else
    echo "  No update log found"
fi

# Check for pending security updates
echo ""
echo "🚨 Security Status:"
for project_dir in "/opt/celebrity-booking" "/opt/celebrity-booking/backend" "/opt/celebrity-booking/admin-dashboard"; do
    if [[ -f "$project_dir/package.json" ]]; then
        project_name=$(basename "$project_dir")
        
        # Quick audit check
        cd "$project_dir"
        audit_result=$(npm audit --json 2>/dev/null || echo '{}')
        
        python3 - <<PYTHON
import json
import sys

try:
    audit = json.loads('$audit_result')
    vulns = audit.get('metadata', {}).get('vulnerabilities', {})
    
    critical = vulns.get('critical', 0)
    high = vulns.get('high', 0)
    
    if critical > 0 or high > 0:
        print(f"  ⚠️  $project_name: {critical} critical, {high} high vulnerabilities")
    else:
        print(f"  ✅ $project_name: No critical/high vulnerabilities")

except:
    print(f"  ❓ $project_name: Could not check vulnerabilities")
PYTHON
    fi
done

# Package freshness check
echo ""
echo "📅 Package Freshness:"
for project_dir in "/opt/celebrity-booking" "/opt/celebrity-booking/backend" "/opt/celebrity-booking/admin-dashboard"; do
    if [[ -f "$project_dir/package.json" ]]; then
        project_name=$(basename "$project_dir")
        
        cd "$project_dir"
        outdated_count=$(npm outdated --json 2>/dev/null | jq '. | length' 2>/dev/null || echo "0")
        
        if [[ "$outdated_count" -gt 10 ]]; then
            echo "  ⚠️  $project_name: $outdated_count outdated packages"
        elif [[ "$outdated_count" -gt 0 ]]; then
            echo "  📦 $project_name: $outdated_count outdated packages"
        else
            echo "  ✅ $project_name: All packages up to date"
        fi
    fi
done

echo ""
echo "🔧 Management Commands:"
echo "  Scan dependencies: node /opt/dependency-management/dependency-scanner.js"
echo "  Security updates: node /opt/dependency-management/dependency-updater.js --security-only"
echo "  Full update: node /opt/dependency-management/dependency-updater.js --auto"
echo "  View scan reports: ls -la $SCAN_DIR/"
echo "  View update logs: tail -f $UPDATE_LOG"
EOF

    chmod +x /usr/local/bin/dependency-dashboard.sh

    # Automated alerting script
    cat > /opt/dependency-management/dependency-alerter.js <<'EOF'
const fs = require('fs');
const { execSync } = require('child_process');

class DependencyAlerter {
  constructor() {
    this.thresholds = {
      critical_vulnerabilities: 0,  // Alert on any critical vulnerability
      high_vulnerabilities: 3,      // Alert on 3+ high vulnerabilities
      total_vulnerabilities: 10,    // Alert on 10+ total vulnerabilities
      outdated_packages: 20         // Alert on 20+ outdated packages
    };
    
    this.lastAlertFile = '/var/log/dependency-last-alert.json';
    this.alertCooldown = 6 * 60 * 60 * 1000; // 6 hours
  }

  shouldSendAlert(report) {
    const summary = report.summary;
    
    // Check vulnerability thresholds
    if (summary.critical_vulnerabilities >= this.thresholds.critical_vulnerabilities) {
      return { reason: 'critical_vulnerabilities', value: summary.critical_vulnerabilities };
    }
    
    if (summary.high_vulnerabilities >= this.thresholds.high_vulnerabilities) {
      return { reason: 'high_vulnerabilities', value: summary.high_vulnerabilities };
    }
    
    if (summary.total_vulnerabilities >= this.thresholds.total_vulnerabilities) {
      return { reason: 'total_vulnerabilities', value: summary.total_vulnerabilities };
    }
    
    if (summary.total_outdated >= this.thresholds.outdated_packages) {
      return { reason: 'outdated_packages', value: summary.total_outdated };
    }
    
    return null;
  }

  hasRecentAlert(reason) {
    try {
      if (!fs.existsSync(this.lastAlertFile)) {
        return false;
      }
      
      const lastAlerts = JSON.parse(fs.readFileSync(this.lastAlertFile, 'utf8'));
      const lastAlert = lastAlerts[reason];
      
      if (!lastAlert) {
        return false;
      }
      
      const timeSinceAlert = Date.now() - new Date(lastAlert.timestamp).getTime();
      return timeSinceAlert < this.alertCooldown;
    } catch (error) {
      return false;
    }
  }

  recordAlert(reason, value) {
    try {
      let lastAlerts = {};
      
      if (fs.existsSync(this.lastAlertFile)) {
        lastAlerts = JSON.parse(fs.readFileSync(this.lastAlertFile, 'utf8'));
      }
      
      lastAlerts[reason] = {
        timestamp: new Date().toISOString(),
        value
      };
      
      fs.writeFileSync(this.lastAlertFile, JSON.stringify(lastAlerts, null, 2));
    } catch (error) {
      console.error('Failed to record alert:', error);
    }
  }

  sendAlert(reason, value, report) {
    const alertMessages = {
      critical_vulnerabilities: `🚨 CRITICAL: ${value} critical security vulnerabilities detected in dependencies`,
      high_vulnerabilities: `⚠️ HIGH: ${value} high-severity vulnerabilities detected in dependencies`,
      total_vulnerabilities: `📊 ${value} total security vulnerabilities detected in dependencies`,
      outdated_packages: `📦 ${value} outdated packages detected across projects`
    };

    const message = alertMessages[reason] || `Dependency alert: ${reason} = ${value}`;
    const severity = reason === 'critical_vulnerabilities' ? 'critical' : 'warning';

    try {
      // Send alert via existing notification system
      execSync(`/usr/local/bin/send-alert.sh "Dependency Security" "${message}" "${severity}"`);
      
      console.log(`Alert sent: ${message}`);
      this.recordAlert(reason, value);
    } catch (error) {
      console.error('Failed to send alert:', error);
    }
  }

  checkAndAlert(reportPath) {
    try {
      const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      const alertCondition = this.shouldSendAlert(report);
      
      if (alertCondition) {
        const { reason, value } = alertCondition;
        
        if (!this.hasRecentAlert(reason)) {
          this.sendAlert(reason, value, report);
        } else {
          console.log(`Alert suppressed due to cooldown: ${reason}`);
        }
      } else {
        console.log('No alert conditions met');
      }
    } catch (error) {
      console.error('Failed to check alerts:', error);
    }
  }
}

if (require.main === module) {
  const alerter = new DependencyAlerter();
  const reportPath = process.argv[2] || '/var/log/dependency-scans/dependency-scan-latest.json';
  
  alerter.checkAndAlert(reportPath);
}

module.exports = DependencyAlerter;
EOF

    chmod +x /opt/dependency-management/dependency-alerter.js

    print_success "Dependency monitoring and alerting configured"
}

# =============================================================================
# AUTOMATION SETUP
# =============================================================================

setup_automation() {
    print_status "Setting up dependency automation and scheduling..."
    
    # Master dependency management script
    cat > /usr/local/bin/manage-dependencies.sh <<'EOF'
#!/bin/bash

echo "📦 Celebrity Booking Platform - Dependency Management"
echo "==================================================="

ACTION="${1:-scan}"
FORCE="${2:-false}"

case $ACTION in
    "scan")
        echo "🔍 Running dependency vulnerability scan..."
        node /opt/dependency-management/dependency-scanner.js
        
        # Check for alerts
        node /opt/dependency-management/dependency-alerter.js
        ;;
    
    "update-security")
        echo "🔒 Applying security updates..."
        node /opt/dependency-management/dependency-updater.js --security-only
        
        # Run scan after updates
        node /opt/dependency-management/dependency-scanner.js
        ;;
    
    "update-all")
        echo "📦 Updating all dependencies..."
        if [[ "$FORCE" == "force" ]]; then
            node /opt/dependency-management/dependency-updater.js --auto
        else
            echo "⚠️  Use 'force' parameter to confirm full dependency update"
            echo "   This will update all outdated packages and may introduce breaking changes"
            echo "   Usage: $0 update-all force"
            exit 1
        fi
        
        # Run scan after updates
        node /opt/dependency-management/dependency-scanner.js
        ;;
    
    "rollback")
        if [[ -z "$2" ]]; then
            echo "❌ Rollback requires timestamp parameter"
            echo "Usage: $0 rollback <timestamp>"
            echo "Available backups:"
            ls -la /var/backups/dependency-updates/ 2>/dev/null || echo "No backups found"
            exit 1
        fi
        
        TIMESTAMP="$2"
        echo "🔄 Rolling back dependencies to $TIMESTAMP..."
        
        # Rollback each project
        for project in "celebrity-booking" "backend" "admin-dashboard"; do
            project_path="/opt/celebrity-booking"
            if [[ "$project" != "celebrity-booking" ]]; then
                project_path="/opt/celebrity-booking/$project"
            fi
            
            if [[ -f "$project_path/package.json" ]]; then
                echo "Rolling back $project..."
                node -e "
                const DependencyUpdater = require('/opt/dependency-management/dependency-updater.js');
                const updater = new DependencyUpdater();
                updater.rollbackProject('$project_path', '$TIMESTAMP')
                  .then(success => process.exit(success ? 0 : 1))
                  .catch(() => process.exit(1));
                "
            fi
        done
        ;;
    
    "dashboard")
        /usr/local/bin/dependency-dashboard.sh
        ;;
    
    "cleanup")
        echo "🧹 Cleaning up old dependency data..."
        
        # Clean old scan reports (keep last 30 days)
        find /var/log/dependency-scans -name "dependency-scan-*.json" -mtime +30 -delete 2>/dev/null || true
        
        # Clean old backups (keep last 14 days)
        find /var/backups/dependency-updates -type d -mtime +14 -exec rm -rf {} + 2>/dev/null || true
        
        # Rotate logs (keep last 100MB)
        if [[ -f "/var/log/dependency-updates.log" ]]; then
            tail -c 100M /var/log/dependency-updates.log > /tmp/dep-updates.log.tmp
            mv /tmp/dep-updates.log.tmp /var/log/dependency-updates.log
        fi
        
        echo "✅ Cleanup completed"
        ;;
    
    *)
        echo "Usage: $0 {scan|update-security|update-all|rollback|dashboard|cleanup}"
        echo ""
        echo "Commands:"
        echo "  scan           - Run vulnerability scan on all projects"
        echo "  update-security - Apply security updates only"
        echo "  update-all     - Update all outdated packages (requires 'force')"
        echo "  rollback       - Rollback to previous dependency state"
        echo "  dashboard      - Show dependency status dashboard"
        echo "  cleanup        - Clean up old logs and backups"
        echo ""
        echo "Examples:"
        echo "  $0 scan"
        echo "  $0 update-security"
        echo "  $0 update-all force"
        echo "  $0 rollback 2024-01-15T10-30-00-000Z"
        exit 1
        ;;
esac

echo ""
echo "✅ Dependency management task completed"
EOF

    chmod +x /usr/local/bin/manage-dependencies.sh

    # Automated scheduling
    cat > /etc/cron.d/dependency-management <<'EOF'
# Dependency management automation

# Daily vulnerability scan
0 8 * * * root /usr/local/bin/manage-dependencies.sh scan >> /var/log/dependency-cron.log 2>&1

# Weekly security updates (Sundays)
0 6 * * 0 root /usr/local/bin/manage-dependencies.sh update-security >> /var/log/dependency-cron.log 2>&1

# Monthly cleanup (1st of each month)
0 5 1 * * root /usr/local/bin/manage-dependencies.sh cleanup >> /var/log/dependency-cron.log 2>&1

# Alert check after scans
30 8 * * * root node /opt/dependency-management/dependency-alerter.js >> /var/log/dependency-cron.log 2>&1
EOF

    # GitHub Actions workflow for dependency management
    mkdir -p /opt/celebrity-booking/.github/workflows
    cat > /opt/celebrity-booking/.github/workflows/dependency-updates.yml <<'EOF'
name: Dependency Security Updates

on:
  schedule:
    # Run daily at 9 AM UTC
    - cron: '0 9 * * *'
  workflow_dispatch:
    inputs:
      update_type:
        description: 'Type of update to perform'
        required: true
        default: 'security'
        type: choice
        options:
          - security
          - all

jobs:
  dependency-scan:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Use Node.js 18
      uses: actions/setup-node@v3
      with:
        node-version: 18
        cache: 'npm'
    
    - name: Install dependencies
      run: |
        npm ci
        cd backend && npm ci
        cd ../admin-dashboard && npm ci
    
    - name: Run dependency scan
      run: |
        npm audit --audit-level moderate
        cd backend && npm audit --audit-level moderate
        cd ../admin-dashboard && npm audit --audit-level moderate
    
    - name: Apply security updates
      if: github.event.inputs.update_type == 'security' || github.event_name == 'schedule'
      run: |
        npm audit fix
        cd backend && npm audit fix
        cd ../admin-dashboard && npm audit fix
    
    - name: Apply all updates
      if: github.event.inputs.update_type == 'all'
      run: |
        npx npm-check-updates -u --target minor
        npm install
        cd backend && npx npm-check-updates -u --target minor && npm install
        cd ../admin-dashboard && npx npm-check-updates -u --target minor && npm install
    
    - name: Run tests
      run: |
        npm test
        cd backend && npm test
    
    - name: Create Pull Request
      uses: peter-evans/create-pull-request@v5
      with:
        token: ${{ secrets.GITHUB_TOKEN }}
        commit-message: 'chore: update dependencies for security'
        title: 'Automated Dependency Updates'
        body: |
          ## Automated Dependency Updates
          
          This PR contains automated dependency updates for security vulnerabilities.
          
          ### Changes
          - Security patches applied
          - Dependencies updated to latest secure versions
          - Tests passing
          
          ### Review Checklist
          - [ ] Review dependency changes
          - [ ] Verify tests are passing
          - [ ] Check for any breaking changes
          
          Generated by automated dependency management workflow.
        branch: automated-dependency-updates
        delete-branch: true
EOF

    print_success "Dependency automation configured"
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

# Create necessary directories
mkdir -p /opt/dependency-management
mkdir -p /var/log/dependency-scans
mkdir -p /var/backups/dependency-updates

# Install common dependencies
if command -v apt-get >/dev/null 2>&1; then
    apt-get update
    apt-get install -y curl wget python3 python3-pip jq
fi

# Setup all dependency management components
setup_dependency_scanners
setup_automated_updates
setup_dependency_monitoring
setup_automation

# Run initial dependency scan
print_status "Running initial dependency vulnerability scan..."
/usr/local/bin/manage-dependencies.sh scan || print_warning "Initial scan had some issues"

# Final summary
echo ""
print_status "📋 Dependency Management Setup Summary:"
echo "  ✅ Vulnerability scanning with npm audit, Snyk integration"
echo "  ✅ Automated security updates with backup and rollback"
echo "  ✅ Package freshness monitoring and updates"
echo "  ✅ Comprehensive reporting and alerting"
echo "  ✅ CI/CD integration with GitHub Actions"
echo "  ✅ Automated scheduling and maintenance"

echo ""
print_status "🔧 Management Commands:"
echo "  - Dependency dashboard: /usr/local/bin/dependency-dashboard.sh"
echo "  - Run vulnerability scan: /usr/local/bin/manage-dependencies.sh scan"
echo "  - Apply security updates: /usr/local/bin/manage-dependencies.sh update-security"
echo "  - Update all packages: /usr/local/bin/manage-dependencies.sh update-all force"
echo "  - View scan reports: ls -la /var/log/dependency-scans/"

echo ""
print_status "📊 Monitoring Features:"
echo "  - Daily vulnerability scans"
echo "  - Weekly automated security updates"
echo "  - Real-time alerting for critical vulnerabilities"
echo "  - Backup and rollback capabilities"
echo "  - Integration with existing notification system"

echo ""
print_status "🔧 Automation Schedule:"
echo "  - Daily: Vulnerability scanning at 8 AM"
echo "  - Weekly: Security updates on Sundays at 6 AM"
echo "  - Monthly: Cleanup and maintenance on 1st at 5 AM"

echo ""
print_success "🎉 Dependency vulnerability scanning and updates setup completed!"

echo ""
print_status "Next steps:"
echo "1. Review initial vulnerability scan results"
echo "2. Configure Snyk API key for enhanced scanning"
echo "3. Test automated update process in non-production environment"
echo "4. Set up notification preferences for dependency alerts"
echo "5. Train development team on dependency management best practices"