#!/bin/bash

# Comprehensive Health Check Endpoints Setup
# This script configures health check endpoints for all services in the celebrity booking platform

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🏥 Setting up Comprehensive Health Check Endpoints...${NC}"

# Create health check service
create_health_service() {
    echo -e "${YELLOW}🩺 Creating health check service...${NC}"
    
    mkdir -p backend/services/health
    
    cat > backend/services/health/HealthCheckService.js << 'EOF'
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
const Redis = require('redis');
const fs = require('fs').promises;
const os = require('os');
const { performance } = require('perf_hooks');

class HealthCheckService {
    constructor() {
        this.supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
        
        this.checks = new Map();
        this.thresholds = {
            database: { timeout: 5000, maxResponseTime: 1000 },
            email: { timeout: 10000, maxResponseTime: 2000 },
            redis: { timeout: 3000, maxResponseTime: 500 },
            filesystem: { timeout: 2000, maxResponseTime: 200 },
            memory: { maxUsagePercent: 85 },
            cpu: { maxUsagePercent: 80 },
            disk: { maxUsagePercent: 90 }
        };
    }

    // Main health check orchestrator
    async performHealthCheck(includeDetailed = false) {
        const startTime = performance.now();
        const results = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: process.env.npm_package_version || '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            uptime: process.uptime(),
            checks: {},
            summary: {
                total: 0,
                passed: 0,
                failed: 0,
                warnings: 0
            }
        };

        // Core service checks
        const coreChecks = [
            { name: 'database', fn: () => this.checkDatabase() },
            { name: 'email', fn: () => this.checkEmail() },
            { name: 'filesystem', fn: () => this.checkFilesystem() },
            { name: 'memory', fn: () => this.checkMemory() },
            { name: 'cpu', fn: () => this.checkCPU() },
            { name: 'disk', fn: () => this.checkDisk() }
        ];

        // Optional checks
        if (process.env.REDIS_URL) {
            coreChecks.push({ name: 'redis', fn: () => this.checkRedis() });
        }

        // Execute all checks in parallel
        const checkPromises = coreChecks.map(async (check) => {
            try {
                const result = await Promise.race([
                    check.fn(),
                    this.timeoutPromise(this.thresholds[check.name]?.timeout || 5000)
                ]);
                return { name: check.name, result };
            } catch (error) {
                return { 
                    name: check.name, 
                    result: { 
                        status: 'failed', 
                        error: error.message,
                        timestamp: new Date().toISOString()
                    } 
                };
            }
        });

        const checkResults = await Promise.allSettled(checkPromises);
        
        // Process results
        checkResults.forEach((promiseResult, index) => {
            const checkName = coreChecks[index].name;
            results.summary.total++;
            
            if (promiseResult.status === 'fulfilled') {
                const { result } = promiseResult.value;
                results.checks[checkName] = result;
                
                if (result.status === 'healthy') {
                    results.summary.passed++;
                } else if (result.status === 'warning') {
                    results.summary.warnings++;
                    if (results.status === 'healthy') results.status = 'degraded';
                } else {
                    results.summary.failed++;
                    results.status = 'unhealthy';
                }
            } else {
                results.checks[checkName] = {
                    status: 'failed',
                    error: 'Check execution failed',
                    timestamp: new Date().toISOString()
                };
                results.summary.failed++;
                results.status = 'unhealthy';
            }
        });

        // Add detailed system info if requested
        if (includeDetailed) {
            results.system = await this.getSystemInfo();
            results.dependencies = await this.checkDependencies();
        }

        results.responseTime = Math.round(performance.now() - startTime);
        return results;
    }

    // Database health check
    async checkDatabase() {
        const startTime = performance.now();
        
        try {
            // Test basic connectivity
            const { data, error } = await this.supabase
                .from('auth.users')
                .select('count')
                .limit(1)
                .single();

            if (error) throw error;

            const responseTime = Math.round(performance.now() - startTime);
            
            // Check connection pool
            const poolStatus = await this.checkDatabasePool();
            
            return {
                status: responseTime > this.thresholds.database.maxResponseTime ? 'warning' : 'healthy',
                responseTime,
                details: {
                    connected: true,
                    pool: poolStatus,
                    url: process.env.SUPABASE_URL ? 'configured' : 'missing'
                },
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'failed',
                error: error.message,
                details: {
                    connected: false,
                    url: process.env.SUPABASE_URL ? 'configured' : 'missing'
                },
                timestamp: new Date().toISOString()
            };
        }
    }

    // Email service health check
    async checkEmail() {
        const startTime = performance.now();
        
        try {
            if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
                return {
                    status: 'warning',
                    message: 'Email service not configured',
                    details: {
                        smtp_host: process.env.SMTP_HOST ? 'configured' : 'missing',
                        smtp_user: process.env.SMTP_USER ? 'configured' : 'missing',
                        smtp_pass: process.env.SMTP_PASS ? 'configured' : 'missing'
                    },
                    timestamp: new Date().toISOString()
                };
            }

            const transporter = nodemailer.createTransporter({
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT,
                secure: true,
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            });

            await transporter.verify();
            const responseTime = Math.round(performance.now() - startTime);

            return {
                status: responseTime > this.thresholds.email.maxResponseTime ? 'warning' : 'healthy',
                responseTime,
                details: {
                    smtp_host: process.env.SMTP_HOST,
                    smtp_port: process.env.SMTP_PORT,
                    authenticated: true
                },
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'failed',
                error: error.message,
                details: {
                    smtp_host: process.env.SMTP_HOST || 'not configured',
                    authenticated: false
                },
                timestamp: new Date().toISOString()
            };
        }
    }

    // Redis health check
    async checkRedis() {
        const startTime = performance.now();
        
        try {
            const client = Redis.createClient({
                url: process.env.REDIS_URL
            });
            
            await client.connect();
            await client.ping();
            
            const info = await client.info('memory');
            await client.disconnect();
            
            const responseTime = Math.round(performance.now() - startTime);
            
            return {
                status: responseTime > this.thresholds.redis.maxResponseTime ? 'warning' : 'healthy',
                responseTime,
                details: {
                    connected: true,
                    memory_info: info.split('\n')[0]
                },
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'failed',
                error: error.message,
                details: {
                    connected: false,
                    url: process.env.REDIS_URL ? 'configured' : 'missing'
                },
                timestamp: new Date().toISOString()
            };
        }
    }

    // Filesystem health check
    async checkFilesystem() {
        const startTime = performance.now();
        
        try {
            const testFile = '/tmp/health-check-test.txt';
            const testContent = 'health-check-test';
            
            await fs.writeFile(testFile, testContent);
            const readContent = await fs.readFile(testFile, 'utf8');
            await fs.unlink(testFile);
            
            const responseTime = Math.round(performance.now() - startTime);
            
            if (readContent !== testContent) {
                throw new Error('File content mismatch');
            }
            
            return {
                status: responseTime > this.thresholds.filesystem.maxResponseTime ? 'warning' : 'healthy',
                responseTime,
                details: {
                    readable: true,
                    writable: true,
                    test_file: testFile
                },
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'failed',
                error: error.message,
                details: {
                    readable: false,
                    writable: false
                },
                timestamp: new Date().toISOString()
            };
        }
    }

    // Memory health check
    async checkMemory() {
        try {
            const memoryUsage = process.memoryUsage();
            const totalMemory = os.totalmem();
            const freeMemory = os.freemem();
            const usedMemory = totalMemory - freeMemory;
            const usagePercent = (usedMemory / totalMemory) * 100;
            
            let status = 'healthy';
            if (usagePercent > this.thresholds.memory.maxUsagePercent) {
                status = 'warning';
            }
            if (usagePercent > 95) {
                status = 'failed';
            }
            
            return {
                status,
                details: {
                    usage_percent: Math.round(usagePercent * 100) / 100,
                    total_mb: Math.round(totalMemory / 1024 / 1024),
                    used_mb: Math.round(usedMemory / 1024 / 1024),
                    free_mb: Math.round(freeMemory / 1024 / 1024),
                    process_heap_used_mb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
                    process_heap_total_mb: Math.round(memoryUsage.heapTotal / 1024 / 1024)
                },
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'failed',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    // CPU health check
    async checkCPU() {
        try {
            const cpus = os.cpus();
            const loadAvg = os.loadavg();
            
            // Simple CPU usage estimation
            const usage = (loadAvg[0] / cpus.length) * 100;
            
            let status = 'healthy';
            if (usage > this.thresholds.cpu.maxUsagePercent) {
                status = 'warning';
            }
            if (usage > 95) {
                status = 'failed';
            }
            
            return {
                status,
                details: {
                    usage_percent: Math.round(usage * 100) / 100,
                    load_average: loadAvg,
                    cpu_count: cpus.length,
                    model: cpus[0]?.model || 'unknown'
                },
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'failed',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    // Disk health check
    async checkDisk() {
        try {
            const stats = await fs.stat(process.cwd());
            
            // This is a simplified check - in production you'd want to check actual disk usage
            return {
                status: 'healthy',
                details: {
                    accessible: true,
                    working_directory: process.cwd(),
                    node_modules_exists: await this.pathExists('./node_modules')
                },
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'failed',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    // Database pool check helper
    async checkDatabasePool() {
        try {
            // This is a simplified check since Supabase manages the pool
            const startTime = Date.now();
            await this.supabase.from('auth.users').select('count').limit(1);
            const responseTime = Date.now() - startTime;
            
            return {
                status: 'active',
                response_time_ms: responseTime
            };
        } catch (error) {
            return {
                status: 'error',
                error: error.message
            };
        }
    }

    // Get detailed system information
    async getSystemInfo() {
        return {
            platform: os.platform(),
            architecture: os.arch(),
            node_version: process.version,
            pid: process.pid,
            hostname: os.hostname(),
            uptime_seconds: Math.floor(process.uptime()),
            system_uptime_seconds: Math.floor(os.uptime())
        };
    }

    // Check dependencies
    async checkDependencies() {
        const dependencies = {};
        
        try {
            const packageJson = JSON.parse(await fs.readFile('./package.json', 'utf8'));
            const deps = packageJson.dependencies || {};
            
            // Check a few critical dependencies
            const criticalDeps = ['express', '@supabase/supabase-js', 'nodemailer'];
            
            for (const dep of criticalDeps) {
                dependencies[dep] = {
                    required: deps[dep] || 'not found',
                    status: deps[dep] ? 'installed' : 'missing'
                };
            }
        } catch (error) {
            dependencies.error = error.message;
        }
        
        return dependencies;
    }

    // Helper methods
    async timeoutPromise(ms) {
        return new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`Health check timed out after ${ms}ms`)), ms);
        });
    }

    async pathExists(path) {
        try {
            await fs.access(path);
            return true;
        } catch {
            return false;
        }
    }
}

module.exports = HealthCheckService;
EOF

    echo -e "${GREEN}✅ Health check service created${NC}"
}

# Create health check routes
create_health_routes() {
    echo -e "${YELLOW}🛣️ Creating health check routes...${NC}"
    
    cat > backend/routes/health.js << 'EOF'
const express = require('express');
const router = express.Router();
const HealthCheckService = require('../services/health/HealthCheckService');
const { authenticate } = require('../middleware/auth');

const healthService = new HealthCheckService();

// Basic health check (public)
router.get('/', async (req, res) => {
    try {
        const result = await healthService.performHealthCheck(false);
        
        const statusCode = result.status === 'healthy' ? 200 :
                          result.status === 'degraded' ? 200 : 503;
        
        res.status(statusCode).json(result);
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Detailed health check (authenticated)
router.get('/detailed', authenticate, async (req, res) => {
    try {
        const result = await healthService.performHealthCheck(true);
        
        const statusCode = result.status === 'healthy' ? 200 :
                          result.status === 'degraded' ? 200 : 503;
        
        res.status(statusCode).json(result);
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Individual service checks
router.get('/database', authenticate, async (req, res) => {
    try {
        const result = await healthService.checkDatabase();
        const statusCode = result.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(result);
    } catch (error) {
        res.status(503).json({
            status: 'failed',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

router.get('/email', authenticate, async (req, res) => {
    try {
        const result = await healthService.checkEmail();
        const statusCode = result.status === 'healthy' || result.status === 'warning' ? 200 : 503;
        res.status(statusCode).json(result);
    } catch (error) {
        res.status(503).json({
            status: 'failed',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

router.get('/memory', authenticate, async (req, res) => {
    try {
        const result = await healthService.checkMemory();
        const statusCode = result.status === 'healthy' || result.status === 'warning' ? 200 : 503;
        res.status(statusCode).json(result);
    } catch (error) {
        res.status(503).json({
            status: 'failed',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

router.get('/filesystem', authenticate, async (req, res) => {
    try {
        const result = await healthService.checkFilesystem();
        const statusCode = result.status === 'healthy' || result.status === 'warning' ? 200 : 503;
        res.status(statusCode).json(result);
    } catch (error) {
        res.status(503).json({
            status: 'failed',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Kubernetes/Docker health checks
router.get('/ready', async (req, res) => {
    try {
        const result = await healthService.performHealthCheck(false);
        
        // Ready if all critical services are working
        const criticalFailed = ['database', 'filesystem'].some(
            service => result.checks[service]?.status === 'failed'
        );
        
        if (criticalFailed) {
            return res.status(503).json({
                status: 'not_ready',
                message: 'Critical services are failing',
                timestamp: new Date().toISOString()
            });
        }
        
        res.json({
            status: 'ready',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(503).json({
            status: 'not_ready',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

router.get('/live', (req, res) => {
    // Simple liveness check
    res.json({
        status: 'alive',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

module.exports = router;
EOF

    echo -e "${GREEN}✅ Health check routes created${NC}"
}

# Create health monitoring dashboard
create_health_dashboard() {
    echo -e "${YELLOW}📊 Creating health monitoring dashboard...${NC}"
    
    mkdir -p admin-dashboard/src/components/health
    
    cat > admin-dashboard/src/components/health/HealthDashboard.tsx << 'EOF'
import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Activity, Server, Database, Mail, HardDrive, Cpu, MemoryStick } from 'lucide-react';

interface HealthCheck {
    status: 'healthy' | 'warning' | 'failed';
    responseTime?: number;
    error?: string;
    details?: any;
    timestamp: string;
}

interface HealthData {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    version: string;
    environment: string;
    uptime: number;
    responseTime: number;
    checks: {
        database?: HealthCheck;
        email?: HealthCheck;
        redis?: HealthCheck;
        filesystem?: HealthCheck;
        memory?: HealthCheck;
        cpu?: HealthCheck;
        disk?: HealthCheck;
    };
    summary: {
        total: number;
        passed: number;
        failed: number;
        warnings: number;
    };
    system?: any;
}

const StatusIcon: React.FC<{ status: string; size?: number }> = ({ status, size = 20 }) => {
    switch (status) {
        case 'healthy':
            return <CheckCircle className="text-green-500" size={size} />;
        case 'warning':
            return <AlertTriangle className="text-yellow-500" size={size} />;
        case 'failed':
            return <XCircle className="text-red-500" size={size} />;
        default:
            return <Activity className="text-gray-400" size={size} />;
    }
};

const ServiceIcon: React.FC<{ service: string; size?: number }> = ({ service, size = 24 }) => {
    const iconProps = { size, className: "text-gray-600" };
    
    switch (service) {
        case 'database':
            return <Database {...iconProps} />;
        case 'email':
            return <Mail {...iconProps} />;
        case 'redis':
            return <Server {...iconProps} />;
        case 'filesystem':
            return <HardDrive {...iconProps} />;
        case 'memory':
            return <MemoryStick {...iconProps} />;
        case 'cpu':
            return <Cpu {...iconProps} />;
        case 'disk':
            return <HardDrive {...iconProps} />;
        default:
            return <Activity {...iconProps} />;
    }
};

export const HealthDashboard: React.FC = () => {
    const [healthData, setHealthData] = useState<HealthData | null>(null);
    const [loading, setLoading] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchHealthData = async () => {
        try {
            const response = await fetch('/api/health/detailed');
            const data = await response.json();
            setHealthData(data);
            setLastUpdated(new Date());
        } catch (error) {
            console.error('Failed to fetch health data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHealthData();
    }, []);

    useEffect(() => {
        if (!autoRefresh) return;
        
        const interval = setInterval(fetchHealthData, 30000); // Refresh every 30 seconds
        return () => clearInterval(interval);
    }, [autoRefresh]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'healthy': return 'text-green-600 bg-green-50 border-green-200';
            case 'degraded': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
            case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
            case 'unhealthy': return 'text-red-600 bg-red-50 border-red-200';
            case 'failed': return 'text-red-600 bg-red-50 border-red-200';
            default: return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    const formatUptime = (seconds: number) => {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (days > 0) return `${days}d ${hours}h ${minutes}m`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!healthData) {
        return (
            <div className="text-center p-8">
                <XCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load health data</h3>
                <button 
                    onClick={fetchHealthData}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">System Health</h2>
                    <p className="text-gray-600">
                        Last updated: {lastUpdated?.toLocaleTimeString()}
                    </p>
                </div>
                <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                            className="mr-2"
                        />
                        Auto-refresh
                    </label>
                    <button
                        onClick={fetchHealthData}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        Refresh
                    </button>
                </div>
            </div>

            {/* Overall Status */}
            <div className={`p-6 rounded-lg border-2 ${getStatusColor(healthData.status)}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <StatusIcon status={healthData.status} size={32} />
                        <div>
                            <h3 className="text-xl font-semibold capitalize">{healthData.status}</h3>
                            <p className="text-sm opacity-75">
                                {healthData.summary.passed}/{healthData.summary.total} services healthy
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm">Response Time: {healthData.responseTime}ms</p>
                        <p className="text-sm">Uptime: {formatUptime(healthData.uptime)}</p>
                    </div>
                </div>
            </div>

            {/* System Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg shadow border">
                    <h4 className="font-medium text-gray-900 mb-2">Environment</h4>
                    <p className="text-2xl font-bold text-blue-600">{healthData.environment}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border">
                    <h4 className="font-medium text-gray-900 mb-2">Version</h4>
                    <p className="text-2xl font-bold text-green-600">{healthData.version}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border">
                    <h4 className="font-medium text-gray-900 mb-2">Services</h4>
                    <p className="text-2xl font-bold text-purple-600">{healthData.summary.total}</p>
                </div>
            </div>

            {/* Service Checks */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(healthData.checks).map(([service, check]) => (
                    <div key={service} className={`p-4 rounded-lg border ${getStatusColor(check.status)}`}>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-2">
                                <ServiceIcon service={service} />
                                <h4 className="font-medium capitalize">{service}</h4>
                            </div>
                            <StatusIcon status={check.status} />
                        </div>
                        
                        {check.responseTime && (
                            <p className="text-sm mb-1">Response: {check.responseTime}ms</p>
                        )}
                        
                        {check.error && (
                            <p className="text-sm text-red-600 mb-1">Error: {check.error}</p>
                        )}
                        
                        {check.details && (
                            <div className="text-xs space-y-1 mt-2 opacity-75">
                                {Object.entries(check.details).map(([key, value]) => (
                                    <div key={key} className="flex justify-between">
                                        <span>{key}:</span>
                                        <span>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        <p className="text-xs opacity-60 mt-2">
                            {new Date(check.timestamp).toLocaleTimeString()}
                        </p>
                    </div>
                ))}
            </div>

            {/* System Details */}
            {healthData.system && (
                <div className="bg-white p-6 rounded-lg shadow border">
                    <h3 className="text-lg font-semibold mb-4">System Information</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        {Object.entries(healthData.system).map(([key, value]) => (
                            <div key={key}>
                                <span className="font-medium text-gray-600">{key.replace(/_/g, ' ')}:</span>
                                <p className="text-gray-900">{String(value)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
EOF

    echo -e "${GREEN}✅ Health monitoring dashboard created${NC}"
}

# Create health check monitoring script
create_monitoring_script() {
    echo -e "${YELLOW}📈 Creating health monitoring script...${NC}"
    
    cat > scripts/health-monitor.js << 'EOF'
const HealthCheckService = require('../backend/services/health/HealthCheckService');
const { logger } = require('../backend/utils/logger');

class HealthMonitor {
    constructor() {
        this.healthService = new HealthCheckService();
        this.alertThresholds = {
            consecutiveFailures: 3,
            responseTimeWarning: 5000,
            responseTimeCritical: 10000
        };
        this.failureCount = new Map();
        this.isRunning = false;
    }

    start(intervalMs = 60000) {
        if (this.isRunning) {
            logger.warn('Health monitor is already running');
            return;
        }

        logger.info('🏥 Starting health monitor...');
        this.isRunning = true;

        this.interval = setInterval(async () => {
            try {
                await this.performCheck();
            } catch (error) {
                logger.error('Health monitor check failed:', error);
            }
        }, intervalMs);

        // Perform initial check
        this.performCheck();
    }

    stop() {
        if (!this.isRunning) return;

        logger.info('Stopping health monitor...');
        this.isRunning = false;
        
        if (this.interval) {
            clearInterval(this.interval);
        }
    }

    async performCheck() {
        const startTime = Date.now();
        
        try {
            const result = await this.healthService.performHealthCheck(false);
            const checkTime = Date.now() - startTime;

            // Log overall status
            logger.info(`Health check completed: ${result.status} (${checkTime}ms)`, {
                status: result.status,
                responseTime: result.responseTime,
                passed: result.summary.passed,
                failed: result.summary.failed,
                warnings: result.summary.warnings
            });

            // Check for alerts
            await this.checkAlerts(result);

            // Reset failure count on success
            if (result.status === 'healthy') {
                this.failureCount.clear();
            }

        } catch (error) {
            logger.error('Health check failed:', error);
            this.incrementFailureCount('system');
        }
    }

    async checkAlerts(result) {
        // Check overall system health
        if (result.status === 'unhealthy') {
            this.incrementFailureCount('system');
            
            if (this.getFailureCount('system') >= this.alertThresholds.consecutiveFailures) {
                await this.sendAlert('CRITICAL', 'System is unhealthy', result);
            }
        }

        // Check response time
        if (result.responseTime > this.alertThresholds.responseTimeCritical) {
            await this.sendAlert('CRITICAL', `Response time is critically high: ${result.responseTime}ms`, result);
        } else if (result.responseTime > this.alertThresholds.responseTimeWarning) {
            await this.sendAlert('WARNING', `Response time is high: ${result.responseTime}ms`, result);
        }

        // Check individual services
        for (const [serviceName, check] of Object.entries(result.checks)) {
            if (check.status === 'failed') {
                this.incrementFailureCount(serviceName);
                
                if (this.getFailureCount(serviceName) >= this.alertThresholds.consecutiveFailures) {
                    await this.sendAlert('CRITICAL', `Service ${serviceName} has failed`, {
                        service: serviceName,
                        error: check.error,
                        timestamp: check.timestamp
                    });
                }
            } else {
                // Reset failure count on success
                this.failureCount.delete(serviceName);
            }
        }
    }

    incrementFailureCount(service) {
        const current = this.failureCount.get(service) || 0;
        this.failureCount.set(service, current + 1);
    }

    getFailureCount(service) {
        return this.failureCount.get(service) || 0;
    }

    async sendAlert(severity, message, data) {
        logger.error(`🚨 HEALTH ALERT [${severity}]: ${message}`, data);
        
        // Here you could integrate with external alerting systems:
        // - Send to Slack/Discord webhook
        // - Send email notification
        // - Send to PagerDuty
        // - Send to Sentry
        
        try {
            // Example: Send to webhook (uncomment and configure)
            // if (process.env.ALERT_WEBHOOK_URL) {
            //     await fetch(process.env.ALERT_WEBHOOK_URL, {
            //         method: 'POST',
            //         headers: { 'Content-Type': 'application/json' },
            //         body: JSON.stringify({
            //             severity,
            //             message,
            //             data,
            //             timestamp: new Date().toISOString()
            //         })
            //     });
            // }
        } catch (error) {
            logger.error('Failed to send alert:', error);
        }
    }
}

// CLI usage
if (require.main === module) {
    const monitor = new HealthMonitor();
    
    // Parse command line arguments
    const args = process.argv.slice(2);
    const intervalMs = args.includes('--interval') ? 
        parseInt(args[args.indexOf('--interval') + 1]) * 1000 : 60000;

    monitor.start(intervalMs);

    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\nReceived SIGINT, shutting down gracefully...');
        monitor.stop();
        process.exit(0);
    });

    process.on('SIGTERM', () => {
        console.log('\nReceived SIGTERM, shutting down gracefully...');
        monitor.stop();
        process.exit(0);
    });
}

module.exports = HealthMonitor;
EOF

    chmod +x scripts/health-monitor.js
    echo -e "${GREEN}✅ Health monitoring script created${NC}"
}

# Main execution
main() {
    echo -e "${BLUE}🚀 Starting Health Check Setup...${NC}"
    
    # Create all components
    create_health_service
    create_health_routes
    create_health_dashboard
    create_monitoring_script
    
    echo -e "${GREEN}✅ Health Check Setup Complete!${NC}"
    echo -e "${BLUE}📋 Available endpoints:${NC}"
    echo "• GET /api/health - Basic health check (public)"
    echo "• GET /api/health/detailed - Detailed health check (auth required)"
    echo "• GET /api/health/database - Database health check"
    echo "• GET /api/health/email - Email service health check"
    echo "• GET /api/health/memory - Memory usage check"
    echo "• GET /api/health/filesystem - Filesystem check"
    echo "• GET /api/health/ready - Kubernetes readiness probe"
    echo "• GET /api/health/live - Kubernetes liveness probe"
    echo ""
    echo -e "${BLUE}📋 Usage:${NC}"
    echo "• Start monitoring: node scripts/health-monitor.js"
    echo "• Custom interval: node scripts/health-monitor.js --interval 30"
    echo "• Access dashboard: /admin/health"
}

# Execute main function
main "$@"