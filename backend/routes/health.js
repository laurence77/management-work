const express = require('express');
const router = express.Router();
const monitoringService = require('../services/MonitoringService');
const { logger } = require('../services/LoggingService');
const { authenticate } = require('../middleware/auth');

// Basic health check (public)
router.get('/', async (req, res) => {
    try {
        const startTime = Date.now();
        const healthStatus = await monitoringService.runAllHealthChecks();
        const responseTime = Date.now() - startTime;
        
        const statusCode = healthStatus.status === 'healthy' ? 200 
                         : healthStatus.status === 'degraded' ? 200 
                         : 503;
        
        res.status(statusCode).json({
            status: healthStatus.status,
            timestamp: healthStatus.timestamp,
            responseTime,
            version: process.env.npm_package_version || '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            uptime: process.uptime(),
            checks: healthStatus.checks
        });
        
    } catch (error) {
        logger.error('Health check failed', error);
        
        res.status(503).json({
            status: 'unhealthy',
            timestamp: Date.now(),
            error: error.message,
            version: process.env.npm_package_version || '1.0.0',
            environment: process.env.NODE_ENV || 'development'
        });
    }
});

// Detailed health check (authenticated)
router.get('/detailed', authenticate, async (req, res) => {
    try {
        const [healthStatus, metrics, systemInfo] = await Promise.all([
            monitoringService.runAllHealthChecks(),
            Promise.resolve(monitoringService.getMetrics()),
            Promise.resolve(monitoringService.getSystemInfo())
        ]);
        
        const statusCode = healthStatus.status === 'healthy' ? 200 
                         : healthStatus.status === 'degraded' ? 200 
                         : 503;
        
        res.status(statusCode).json({
            status: healthStatus.status,
            timestamp: healthStatus.timestamp,
            health: healthStatus.checks,
            metrics: {
                requests: metrics.requests,
                database: metrics.database,
                cache: metrics.cache,
                calculated: metrics.calculated
            },
            system: systemInfo,
            alerts: metrics.alerts
        });
        
    } catch (error) {
        logger.error('Detailed health check failed', error);
        
        res.status(503).json({
            status: 'unhealthy',
            timestamp: Date.now(),
            error: error.message
        });
    }
});

// Individual service checks
router.get('/database', authenticate, async (req, res) => {
    try {
        const result = await monitoringService.runHealthCheck('database');
        const statusCode = result.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(result);
    } catch (error) {
        res.status(503).json({
            status: 'failed',
            error: error.message,
            timestamp: Date.now()
        });
    }
});

router.get('/cache', authenticate, async (req, res) => {
    try {
        const result = await monitoringService.runHealthCheck('cache');
        const statusCode = result.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(result);
    } catch (error) {
        res.status(503).json({
            status: 'failed',
            error: error.message,
            timestamp: Date.now()
        });
    }
});

router.get('/disk', authenticate, async (req, res) => {
    try {
        const result = await monitoringService.runHealthCheck('disk');
        const statusCode = result.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(result);
    } catch (error) {
        res.status(503).json({
            status: 'failed',
            error: error.message,
            timestamp: Date.now()
        });
    }
});

router.get('/external', authenticate, async (req, res) => {
    try {
        const result = await monitoringService.runHealthCheck('external');
        const statusCode = result.status === 'healthy' || result.status === 'degraded' ? 200 : 503;
        res.status(statusCode).json(result);
    } catch (error) {
        res.status(503).json({
            status: 'failed',
            error: error.message,
            timestamp: Date.now()
        });
    }
});

// Kubernetes/Docker health checks
router.get('/ready', async (req, res) => {
    try {
        // Check critical services only for readiness
        const dbCheck = await monitoringService.runHealthCheck('database');
        const cacheCheck = await monitoringService.runHealthCheck('cache');
        
        const isReady = dbCheck.status === 'healthy';
        
        res.status(isReady ? 200 : 503).json({
            status: isReady ? 'ready' : 'not_ready',
            timestamp: Date.now(),
            checks: {
                database: dbCheck,
                cache: cacheCheck
            }
        });
        
    } catch (error) {
        logger.error('Readiness check failed', error);
        
        res.status(503).json({
            status: 'not_ready',
            timestamp: Date.now(),
            error: error.message
        });
    }
});

router.get('/live', (req, res) => {
    // Simple liveness check - if the process is running, it's alive
    res.status(200).json({
        status: 'alive',
        timestamp: Date.now(),
        pid: process.pid
    });
});

// Metrics endpoint (JSON format)
router.get('/metrics', authenticate, (req, res) => {
    try {
        const metrics = monitoringService.getMetrics();
        
        res.json({
            timestamp: Date.now(),
            ...metrics
        });
        
    } catch (error) {
        logger.error('Failed to get metrics', error);
        
        res.status(500).json({
            error: 'Failed to retrieve metrics',
            timestamp: Date.now()
        });
    }
});

// Prometheus metrics endpoint
router.get('/metrics/prometheus', (req, res) => {
    try {
        const prometheusMetrics = monitoringService.getPrometheusMetrics();
        
        res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
        res.send(prometheusMetrics);
        
    } catch (error) {
        logger.error('Failed to get Prometheus metrics', error);
        
        res.status(500).send('# Error retrieving metrics\n');
    }
});

module.exports = router;
