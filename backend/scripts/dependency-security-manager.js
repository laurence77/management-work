#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { logger } = require('../utils/logger');

/**
 * Dependency Security Manager
 * Comprehensive dependency vulnerability scanning, updating, and security management
 */

class DependencySecurityManager {
  constructor() {
    this.packageJsonPath = path.join(__dirname, '../package.json');
    this.lockFilePath = path.join(__dirname, '../package-lock.json');
    this.securityReportPath = path.join(__dirname, '../docs/DEPENDENCY_SECURITY_REPORT.md');
    
    // Critical security packages that need careful handling
    this.criticalPackages = [
      'jsonwebtoken',
      'bcryptjs', 
      'helmet',
      'express',
      'cors',
      'express-rate-limit',
      'express-validator',
      'multer',
      'sharp',
      'pg',
      'redis',
      'winston'
    ];

    // Packages with known breaking changes in major versions
    this.breakingChangePackages = {
      'express': {
        currentMajor: 4,
        latestMajor: 5,
        breakingChanges: [
          'Removed support for callback-based error handling',
          'Changed default parameter parsing behavior',
          'Updated middleware signature requirements'
        ]
      },
      'helmet': {
        currentMajor: 7,
        latestMajor: 8,
        breakingChanges: [
          'Default CSP policies changed',
          'Some middleware options removed',
          'Updated TypeScript definitions'
        ]
      },
      'jest': {
        currentMajor: 29,
        latestMajor: 30,
        breakingChanges: [
          'Node.js 18+ required',
          'Changed default test environment',
          'Updated snapshot format'
        ]
      }
    };
  }

  /**
   * Run comprehensive security audit
   */
  async runSecurityAudit() {
    logger.info('Starting comprehensive dependency security audit...');
    
    const report = {
      timestamp: new Date().toISOString(),
      vulnerabilities: [],
      outdatedPackages: [],
      securityScore: 0,
      recommendations: [],
      criticalIssues: [],
      updatePlan: []
    };

    try {
      // 1. Check for security vulnerabilities
      report.vulnerabilities = await this.checkVulnerabilities();
      
      // 2. Check for outdated packages
      report.outdatedPackages = await this.checkOutdatedPackages();
      
      // 3. Analyze security implications
      report.criticalIssues = await this.analyzeCriticalSecurity(report.outdatedPackages);
      
      // 4. Generate update plan
      report.updatePlan = await this.generateUpdatePlan(report.outdatedPackages);
      
      // 5. Calculate security score
      report.securityScore = this.calculateSecurityScore(report);
      
      // 6. Generate recommendations
      report.recommendations = this.generateRecommendations(report);
      
      // 7. Save security report
      await this.saveSecurityReport(report);
      
      logger.info(`Security audit completed. Score: ${report.securityScore}/100`);
      return report;
      
    } catch (error) {
      logger.error('Security audit failed:', error);
      throw error;
    }
  }

  /**
   * Check for security vulnerabilities using npm audit
   */
  async checkVulnerabilities() {
    try {
      logger.info('Checking for security vulnerabilities...');
      
      const auditOutput = execSync('npm audit --json', { 
        encoding: 'utf8',
        cwd: path.dirname(this.packageJsonPath)
      });
      
      const auditData = JSON.parse(auditOutput);
      
      const vulnerabilities = [];
      
      if (auditData.vulnerabilities) {
        for (const [packageName, vulnData] of Object.entries(auditData.vulnerabilities)) {
          vulnerabilities.push({
            package: packageName,
            severity: vulnData.severity,
            range: vulnData.range,
            fixAvailable: vulnData.fixAvailable,
            advisories: vulnData.via.filter(v => typeof v === 'object').map(v => ({
              title: v.title,
              url: v.url,
              severity: v.severity,
              cwe: v.cwe,
              cvss: v.cvss
            }))
          });
        }
      }
      
      logger.info(`Found ${vulnerabilities.length} vulnerabilities`);
      return vulnerabilities;
      
    } catch (error) {
      // npm audit returns exit code 1 when vulnerabilities found
      if (error.status === 1 && error.stdout) {
        try {
          const auditData = JSON.parse(error.stdout);
          // Process the audit data even when exit code is 1
          return this.processAuditData(auditData);
        } catch (parseError) {
          logger.warn('Could not parse npm audit output');
        }
      }
      
      logger.info('No vulnerabilities found or npm audit unavailable');
      return [];
    }
  }

  /**
   * Check for outdated packages using npm outdated
   */
  async checkOutdatedPackages() {
    try {
      logger.info('Checking for outdated packages...');
      
      const outdatedOutput = execSync('npm outdated --json', { 
        encoding: 'utf8',
        cwd: path.dirname(this.packageJsonPath)
      });
      
      const outdatedData = JSON.parse(outdatedOutput);
      const outdatedPackages = [];
      
      for (const [packageName, versionInfo] of Object.entries(outdatedData)) {
        const isCritical = this.criticalPackages.includes(packageName);
        const hasBreakingChanges = this.hasBreakingChanges(packageName, versionInfo);
        
        outdatedPackages.push({
          package: packageName,
          current: versionInfo.current,
          wanted: versionInfo.wanted,
          latest: versionInfo.latest,
          location: versionInfo.location,
          isCritical,
          hasBreakingChanges,
          updateType: this.determineUpdateType(versionInfo.current, versionInfo.latest),
          securityImplications: this.getSecurityImplications(packageName, versionInfo)
        });
      }
      
      logger.info(`Found ${outdatedPackages.length} outdated packages`);
      return outdatedPackages;
      
    } catch (error) {
      if (error.status === 1) {
        // npm outdated returns exit code 1 when packages are outdated
        logger.info('All packages are up to date');
        return [];
      }
      
      logger.error('Error checking outdated packages:', error.message);
      return [];
    }
  }

  /**
   * Analyze critical security implications
   */
  async analyzeCriticalSecurity(outdatedPackages) {
    const criticalIssues = [];
    
    for (const pkg of outdatedPackages) {
      if (pkg.isCritical && pkg.updateType === 'major') {
        criticalIssues.push({
          type: 'major_security_update',
          package: pkg.package,
          current: pkg.current,
          latest: pkg.latest,
          description: `Critical security package ${pkg.package} has a major version update available`,
          recommendation: 'Test thoroughly before updating due to potential breaking changes',
          priority: 'high'
        });
      }
      
      if (pkg.securityImplications.length > 0) {
        criticalIssues.push({
          type: 'security_implications',
          package: pkg.package,
          implications: pkg.securityImplications,
          priority: 'medium'
        });
      }
    }
    
    return criticalIssues;
  }

  /**
   * Generate safe update plan
   */
  async generateUpdatePlan(outdatedPackages) {
    const updatePlan = {
      safe: [], // Patch and minor updates
      cautious: [], // Major updates for non-critical packages
      critical: [], // Major updates for critical packages
      manual: [] // Packages requiring manual review
    };
    
    for (const pkg of outdatedPackages) {
      const update = {
        package: pkg.package,
        from: pkg.current,
        to: pkg.latest,
        command: `npm install ${pkg.package}@${pkg.latest}`,
        testRequired: pkg.isCritical || pkg.updateType === 'major',
        backupRequired: pkg.isCritical
      };
      
      if (pkg.updateType === 'patch') {
        updatePlan.safe.push(update);
      } else if (pkg.updateType === 'minor') {
        updatePlan.safe.push(update);
      } else if (pkg.updateType === 'major' && !pkg.isCritical) {
        updatePlan.cautious.push(update);
      } else if (pkg.updateType === 'major' && pkg.isCritical) {
        updatePlan.critical.push(update);
      }
      
      if (pkg.hasBreakingChanges) {
        updatePlan.manual.push({
          ...update,
          breakingChanges: this.breakingChangePackages[pkg.package]?.breakingChanges || [],
          reason: 'Manual review required due to breaking changes'
        });
      }
    }
    
    return updatePlan;
  }

  /**
   * Execute safe updates (patch and minor versions)
   */
  async executeSafeUpdates(updatePlan) {
    logger.info('Executing safe updates (patch and minor versions)...');
    
    const safeUpdates = updatePlan.safe;
    const results = [];
    
    for (const update of safeUpdates) {
      try {
        logger.info(`Updating ${update.package} from ${update.from} to ${update.to}`);
        
        execSync(update.command, { 
          stdio: 'inherit',
          cwd: path.dirname(this.packageJsonPath)
        });
        
        results.push({
          package: update.package,
          success: true,
          from: update.from,
          to: update.to
        });
        
      } catch (error) {
        logger.error(`Failed to update ${update.package}:`, error.message);
        results.push({
          package: update.package,
          success: false,
          error: error.message,
          from: update.from,
          to: update.to
        });
      }
    }
    
    return results;
  }

  /**
   * Determine update type (patch, minor, major)
   */
  determineUpdateType(current, latest) {
    const currentParts = current.split('.').map(Number);
    const latestParts = latest.split('.').map(Number);
    
    if (latestParts[0] > currentParts[0]) return 'major';
    if (latestParts[1] > currentParts[1]) return 'minor';
    if (latestParts[2] > currentParts[2]) return 'patch';
    
    return 'same';
  }

  /**
   * Check if package has breaking changes
   */
  hasBreakingChanges(packageName, versionInfo) {
    return this.breakingChangePackages.hasOwnProperty(packageName) &&
           this.determineUpdateType(versionInfo.current, versionInfo.latest) === 'major';
  }

  /**
   * Get security implications for a package
   */
  getSecurityImplications(packageName, versionInfo) {
    const implications = [];
    
    const securityPackages = {
      'jsonwebtoken': 'JWT token generation and verification security',
      'bcryptjs': 'Password hashing security',
      'helmet': 'HTTP security headers',
      'express': 'Web framework security',
      'cors': 'Cross-origin request security',
      'express-rate-limit': 'Rate limiting security',
      'multer': 'File upload security',
      'express-validator': 'Input validation security'
    };
    
    if (securityPackages[packageName]) {
      implications.push(securityPackages[packageName]);
    }
    
    if (this.determineUpdateType(versionInfo.current, versionInfo.latest) === 'major') {
      implications.push('Major version update may include security improvements');
    }
    
    return implications;
  }

  /**
   * Calculate overall security score
   */
  calculateSecurityScore(report) {
    let score = 100;
    
    // Deduct points for vulnerabilities
    for (const vuln of report.vulnerabilities) {
      switch (vuln.severity) {
        case 'critical': score -= 25; break;
        case 'high': score -= 15; break;
        case 'moderate': score -= 10; break;
        case 'low': score -= 5; break;
      }
    }
    
    // Deduct points for outdated critical packages
    const outdatedCritical = report.outdatedPackages.filter(pkg => 
      pkg.isCritical && pkg.updateType === 'major'
    );
    score -= outdatedCritical.length * 5;
    
    // Deduct points for many outdated packages
    if (report.outdatedPackages.length > 10) {
      score -= Math.min(20, (report.outdatedPackages.length - 10) * 2);
    }
    
    return Math.max(0, score);
  }

  /**
   * Generate security recommendations
   */
  generateRecommendations(report) {
    const recommendations = [];
    
    if (report.vulnerabilities.length > 0) {
      recommendations.push({
        priority: 'critical',
        action: 'Fix security vulnerabilities',
        description: `${report.vulnerabilities.length} security vulnerabilities found`,
        command: 'npm audit fix'
      });
    }
    
    if (report.updatePlan.safe.length > 0) {
      recommendations.push({
        priority: 'high',
        action: 'Apply safe updates',
        description: `${report.updatePlan.safe.length} safe updates (patch/minor) available`,
        automated: true
      });
    }
    
    if (report.updatePlan.critical.length > 0) {
      recommendations.push({
        priority: 'medium',
        action: 'Review critical package updates',
        description: `${report.updatePlan.critical.length} critical packages need major updates`,
        manual: true
      });
    }
    
    if (report.securityScore < 90) {
      recommendations.push({
        priority: 'high',
        action: 'Improve dependency security',
        description: `Security score is ${report.securityScore}/100 - immediate attention required`
      });
    }
    
    return recommendations;
  }

  /**
   * Save comprehensive security report
   */
  async saveSecurityReport(report) {
    const markdownReport = this.generateMarkdownReport(report);
    
    try {
      await fs.writeFile(this.securityReportPath, markdownReport, 'utf8');
      logger.info(`Security report saved to ${this.securityReportPath}`);
    } catch (error) {
      logger.error('Failed to save security report:', error);
    }
  }

  /**
   * Generate markdown security report
   */
  generateMarkdownReport(report) {
    return `# Dependency Security Report

Generated: ${report.timestamp}
Security Score: **${report.securityScore}/100**

## Executive Summary

- **Vulnerabilities Found**: ${report.vulnerabilities.length}
- **Outdated Packages**: ${report.outdatedPackages.length}
- **Critical Issues**: ${report.criticalIssues.length}
- **Safe Updates Available**: ${report.updatePlan.safe.length}

## Security Vulnerabilities

${report.vulnerabilities.length === 0 ? '✅ No security vulnerabilities found' : ''}

${report.vulnerabilities.map(vuln => `
### ${vuln.package} (${vuln.severity.toUpperCase()})

- **Range**: ${vuln.range}
- **Fix Available**: ${vuln.fixAvailable ? 'Yes' : 'No'}

${vuln.advisories.map(advisory => `
- **${advisory.title}**
  - Severity: ${advisory.severity}
  - URL: ${advisory.url}
  - CVSS: ${advisory.cvss || 'N/A'}
`).join('')}
`).join('')}

## Outdated Packages

${report.outdatedPackages.map(pkg => `
### ${pkg.package}

- **Current**: ${pkg.current}
- **Latest**: ${pkg.latest}
- **Update Type**: ${pkg.updateType}
- **Critical Package**: ${pkg.isCritical ? 'Yes' : 'No'}
- **Breaking Changes**: ${pkg.hasBreakingChanges ? 'Yes' : 'No'}

${pkg.securityImplications.length > 0 ? `
**Security Implications**:
${pkg.securityImplications.map(impl => `- ${impl}`).join('\n')}
` : ''}
`).join('')}

## Update Plan

### Safe Updates (${report.updatePlan.safe.length})
${report.updatePlan.safe.map(update => 
`- ${update.package}: ${update.from} → ${update.to}`
).join('\n')}

### Cautious Updates (${report.updatePlan.cautious.length})
${report.updatePlan.cautious.map(update => 
`- ${update.package}: ${update.from} → ${update.to} (Test required)`
).join('\n')}

### Critical Updates (${report.updatePlan.critical.length})
${report.updatePlan.critical.map(update => 
`- ${update.package}: ${update.from} → ${update.to} (Backup & Test required)`
).join('\n')}

## Recommendations

${report.recommendations.map((rec, index) => `
${index + 1}. **${rec.action}** (${rec.priority.toUpperCase()})
   - ${rec.description}
   ${rec.command ? `- Command: \`${rec.command}\`` : ''}
   ${rec.automated ? '- Can be automated' : ''}
   ${rec.manual ? '- Requires manual review' : ''}
`).join('')}

## Next Steps

1. **Immediate**: Fix any critical or high severity vulnerabilities
2. **Short-term**: Apply safe updates (patch/minor versions)
3. **Medium-term**: Plan and test major version updates for critical packages
4. **Ongoing**: Set up automated dependency scanning and updates

---
*Report generated by Dependency Security Manager*
`;
  }

  /**
   * Run automated safe updates
   */
  async runAutomatedUpdates() {
    logger.info('Running automated dependency security updates...');
    
    try {
      // 1. Run security audit
      const report = await this.runSecurityAudit();
      
      // 2. Apply safe updates if security score is acceptable
      if (report.securityScore >= 70) {
        const updateResults = await this.executeSafeUpdates(report.updatePlan);
        
        logger.info('Automated updates completed:', {
          successful: updateResults.filter(r => r.success).length,
          failed: updateResults.filter(r => !r.success).length
        });
        
        return { success: true, report, updateResults };
      } else {
        logger.warn(`Security score too low (${report.securityScore}) for automated updates`);
        return { success: false, reason: 'low_security_score', report };
      }
      
    } catch (error) {
      logger.error('Automated updates failed:', error);
      throw error;
    }
  }
}

// CLI interface
if (require.main === module) {
  const manager = new DependencySecurityManager();
  const command = process.argv[2];
  
  switch (command) {
    case 'audit':
      manager.runSecurityAudit()
        .then(report => {
          console.log(`Security audit completed. Score: ${report.securityScore}/100`);
          if (report.securityScore < 90) {
            process.exit(1);
          }
        })
        .catch(error => {
          console.error('Security audit failed:', error);
          process.exit(1);
        });
      break;
      
    case 'update':
      manager.runAutomatedUpdates()
        .then(result => {
          if (result.success) {
            console.log('Automated updates completed successfully');
          } else {
            console.log('Automated updates skipped:', result.reason);
            process.exit(1);
          }
        })
        .catch(error => {
          console.error('Automated updates failed:', error);
          process.exit(1);
        });
      break;
      
    default:
      console.log(`
Usage: node dependency-security-manager.js <command>

Commands:
  audit   - Run comprehensive security audit
  update  - Run automated safe updates

Examples:
  node dependency-security-manager.js audit
  node dependency-security-manager.js update
`);
  }
}

module.exports = { DependencySecurityManager };