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
