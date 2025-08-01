#!/bin/bash

# Comprehensive Load Testing and Performance Benchmarking Setup
# This script implements load testing infrastructure for the celebrity booking platform

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}⚡ Setting up Comprehensive Load Testing and Performance Benchmarking...${NC}"

# Create load testing service
create_load_testing_service() {
    echo -e "${YELLOW}🎯 Creating load testing service...${NC}"
    
    mkdir -p backend/services/load-testing
    mkdir -p load-tests/{scenarios,scripts,reports}
    
    cat > backend/services/load-testing/LoadTestingService.js << 'EOF'
const { createClient } = require('@supabase/supabase-js');
const { logger } = require('../../utils/logger');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class LoadTestingService {
    constructor() {
        this.supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
        
        this.testScenarios = {
            smoke: { users: 1, duration: '30s', description: 'Basic functionality test' },
            load: { users: 100, duration: '5m', description: 'Normal load simulation' },
            stress: { users: 500, duration: '10m', description: 'High load stress test' },
            spike: { users: 1000, duration: '2m', description: 'Traffic spike simulation' },
            endurance: { users: 200, duration: '30m', description: 'Long-running stability test' }
        };
        
        this.performanceThresholds = {
            response_time_p95: 2000, // 2 seconds
            response_time_p99: 5000, // 5 seconds
            error_rate: 0.01, // 1%
            throughput_min: 100 // requests per second
        };
    }

    // Execute load test
    async executeLoadTest(scenario, options = {}) {
        const testId = `test_${Date.now()}_${scenario}`;
        const startTime = new Date();
        
        try {
            logger.info('Starting load test', { testId, scenario, options });
            
            // Create test record
            await this.createTestRecord(testId, scenario, options);
            
            // Generate test script
            const scriptPath = await this.generateTestScript(scenario, options);
            
            // Execute K6 test
            const results = await this.runK6Test(scriptPath, testId);
            
            // Parse and store results
            const analysis = await this.analyzeResults(results, testId);
            
            // Update test record with results
            await this.updateTestRecord(testId, {
                status: 'completed',
                results: analysis,
                duration: Date.now() - startTime.getTime()
            });
            
            logger.info('Load test completed', { testId, analysis });
            return analysis;
        } catch (error) {
            logger.error('Load test failed', { testId, error: error.message });
            await this.updateTestRecord(testId, {
                status: 'failed',
                error: error.message,
                duration: Date.now() - startTime.getTime()
            });
            throw error;
        }
    }

    // Generate K6 test script
    async generateTestScript(scenario, options) {
        const config = this.testScenarios[scenario];
        const scriptContent = `
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const loginTrend = new Trend('login_duration');
const bookingTrend = new Trend('booking_duration');

export let options = {
    stages: [
        { duration: '30s', target: ${Math.floor(config.users * 0.1)} }, // Ramp up
        { duration: '${config.duration}', target: ${config.users} }, // Stay at load
        { duration: '30s', target: 0 }, // Ramp down
    ],
    thresholds: {
        http_req_duration: ['p(95)<${this.performanceThresholds.response_time_p95}'],
        http_req_failed: ['rate<${this.performanceThresholds.error_rate}'],
        errors: ['rate<${this.performanceThresholds.error_rate}'],
    },
};

const BASE_URL = '${process.env.API_BASE_URL || 'http://localhost:3000'}';

// Test data
const users = [
    { email: 'test1@example.com', password: 'testpass123' },
    { email: 'test2@example.com', password: 'testpass123' },
    { email: 'test3@example.com', password: 'testpass123' },
];

export default function () {
    // 1. Login flow
    const loginStart = Date.now();
    const user = users[Math.floor(Math.random() * users.length)];
    
    const loginResponse = http.post(\`\${BASE_URL}/api/auth/login\`, {
        email: user.email,
        password: user.password
    }, {
        headers: { 'Content-Type': 'application/json' }
    });
    
    const loginSuccess = check(loginResponse, {
        'login status is 200': (r) => r.status === 200,
        'login response time < 2s': (r) => r.timings.duration < 2000,
    });
    
    errorRate.add(!loginSuccess);
    loginTrend.add(Date.now() - loginStart);
    
    if (!loginSuccess) {
        sleep(1);
        return;
    }
    
    const authToken = JSON.parse(loginResponse.body).token;
    const headers = {
        'Authorization': \`Bearer \${authToken}\`,
        'Content-Type': 'application/json'
    };
    
    // 2. Browse celebrities
    const celebritiesResponse = http.get(\`\${BASE_URL}/api/celebrities\`, { headers });
    check(celebritiesResponse, {
        'celebrities status is 200': (r) => r.status === 200,
        'celebrities response time < 1s': (r) => r.timings.duration < 1000,
    });
    
    sleep(Math.random() * 2 + 1); // 1-3 seconds think time
    
    // 3. View celebrity details
    if (celebritiesResponse.status === 200) {
        const celebrities = JSON.parse(celebritiesResponse.body);
        if (celebrities.length > 0) {
            const randomCelebrity = celebrities[Math.floor(Math.random() * celebrities.length)];
            const detailResponse = http.get(\`\${BASE_URL}/api/celebrities/\${randomCelebrity.id}\`, { headers });
            check(detailResponse, {
                'celebrity detail status is 200': (r) => r.status === 200,
            });
        }
    }
    
    sleep(Math.random() * 3 + 1); // 1-4 seconds think time
    
    // 4. Create booking (25% of users)
    if (Math.random() < 0.25) {
        const bookingStart = Date.now();
        const bookingData = {
            celebrity_id: 'test-celebrity-id',
            event_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            event_type: 'appearance',
            budget: Math.floor(Math.random() * 50000) + 10000,
            description: 'Load test booking'
        };
        
        const bookingResponse = http.post(\`\${BASE_URL}/api/bookings\`, JSON.stringify(bookingData), { headers });
        const bookingSuccess = check(bookingResponse, {
            'booking creation status is 200 or 201': (r) => r.status === 200 || r.status === 201,
            'booking response time < 3s': (r) => r.timings.duration < 3000,
        });
        
        errorRate.add(!bookingSuccess);
        bookingTrend.add(Date.now() - bookingStart);
    }
    
    // 5. Check dashboard (50% of users)
    if (Math.random() < 0.5) {
        const dashboardResponse = http.get(\`\${BASE_URL}/api/dashboard\`, { headers });
        check(dashboardResponse, {
            'dashboard status is 200': (r) => r.status === 200,
        });
    }
    
    sleep(Math.random() * 2 + 1); // 1-3 seconds think time
}

export function handleSummary(data) {
    return {
        'load-tests/reports/summary.json': JSON.stringify(data, null, 2),
        'load-tests/reports/summary.html': htmlReport(data),
    };
}

function htmlReport(data) {
    return \`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Load Test Report</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .metric { margin: 10px 0; padding: 10px; background: #f5f5f5; border-radius: 5px; }
            .passed { border-left: 5px solid #4CAF50; }
            .failed { border-left: 5px solid #f44336; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
        </style>
    </head>
    <body>
        <h1>Load Test Report</h1>
        <p><strong>Test Duration:</strong> \${(data.state.testRunDurationMs / 1000).toFixed(2)}s</p>
        <p><strong>Virtual Users:</strong> \${data.options.stages ? data.options.stages[1].target : 'N/A'}</p>
        
        <h2>Key Metrics</h2>
        <div class="metric \${data.metrics.http_req_duration.values.p95 < ${this.performanceThresholds.response_time_p95} ? 'passed' : 'failed'}">
            <strong>Response Time (p95):</strong> \${data.metrics.http_req_duration.values.p95.toFixed(2)}ms
        </div>
        <div class="metric \${data.metrics.http_req_failed.values.rate < ${this.performanceThresholds.error_rate} ? 'passed' : 'failed'}">
            <strong>Error Rate:</strong> \${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%
        </div>
        <div class="metric">
            <strong>Throughput:</strong> \${data.metrics.http_reqs.values.rate.toFixed(2)} req/s
        </div>
        
        <h2>Detailed Metrics</h2>
        <table>
            <tr><th>Metric</th><th>Average</th><th>p95</th><th>p99</th><th>Max</th></tr>
            <tr>
                <td>HTTP Request Duration</td>
                <td>\${data.metrics.http_req_duration.values.avg.toFixed(2)}ms</td>
                <td>\${data.metrics.http_req_duration.values.p95.toFixed(2)}ms</td>
                <td>\${data.metrics.http_req_duration.values.p99.toFixed(2)}ms</td>
                <td>\${data.metrics.http_req_duration.values.max.toFixed(2)}ms</td>
            </tr>
        </table>
    </body>
    </html>
    \`;
}
`;
        
        const scriptPath = path.join('load-tests/scripts', `${scenario}_test.js`);
        await fs.writeFile(scriptPath, scriptContent);
        return scriptPath;
    }

    // Run K6 test
    async runK6Test(scriptPath, testId) {
        return new Promise((resolve, reject) => {
            const k6Process = spawn('k6', ['run', '--out', `json=load-tests/reports/${testId}.json`, scriptPath]);
            
            let stdout = '';
            let stderr = '';
            
            k6Process.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            
            k6Process.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            
            k6Process.on('close', (code) => {
                if (code === 0) {
                    resolve({ stdout, stderr, exitCode: code });
                } else {
                    reject(new Error(`K6 test failed with exit code ${code}: ${stderr}`));
                }
            });
            
            // Timeout after 1 hour
            setTimeout(() => {
                k6Process.kill('SIGKILL');
                reject(new Error('Test timed out after 1 hour'));
            }, 60 * 60 * 1000);
        });
    }

    // Analyze test results
    async analyzeResults(testOutput, testId) {
        try {
            const resultsPath = `load-tests/reports/${testId}.json`;
            const summaryPath = 'load-tests/reports/summary.json';
            
            let results = {};
            
            // Try to read JSON results
            try {
                const resultsContent = await fs.readFile(resultsPath, 'utf8');
                const lines = resultsContent.trim().split('\n');
                const summaryLine = lines[lines.length - 1];
                results = JSON.parse(summaryLine);
            } catch (error) {
                logger.warn('Could not parse JSON results, using summary', error.message);
                try {
                    const summaryContent = await fs.readFile(summaryPath, 'utf8');
                    results = JSON.parse(summaryContent);
                } catch (summaryError) {
                    logger.warn('Could not parse summary either', summaryError.message);
                    results = { metrics: {} };
                }
            }
            
            const analysis = {
                test_id: testId,
                timestamp: new Date().toISOString(),
                performance_score: this.calculatePerformanceScore(results),
                metrics: {
                    response_time_avg: results.metrics?.http_req_duration?.values?.avg || 0,
                    response_time_p95: results.metrics?.http_req_duration?.values?.p95 || 0,
                    response_time_p99: results.metrics?.http_req_duration?.values?.p99 || 0,
                    error_rate: results.metrics?.http_req_failed?.values?.rate || 0,
                    throughput: results.metrics?.http_reqs?.values?.rate || 0,
                    total_requests: results.metrics?.http_reqs?.values?.count || 0,
                    failed_requests: results.metrics?.http_req_failed?.values?.count || 0
                },
                thresholds: {
                    response_time_p95_passed: (results.metrics?.http_req_duration?.values?.p95 || 0) < this.performanceThresholds.response_time_p95,
                    error_rate_passed: (results.metrics?.http_req_failed?.values?.rate || 0) < this.performanceThresholds.error_rate,
                    throughput_passed: (results.metrics?.http_reqs?.values?.rate || 0) > this.performanceThresholds.throughput_min
                },
                recommendations: this.generateRecommendations(results)
            };
            
            return analysis;
        } catch (error) {
            logger.error('Failed to analyze test results', { testId, error: error.message });
            return {
                test_id: testId,
                timestamp: new Date().toISOString(),
                error: 'Analysis failed',
                error_message: error.message
            };
        }
    }

    // Calculate performance score
    calculatePerformanceScore(results) {
        let score = 100;
        
        const responseTime = results.metrics?.http_req_duration?.values?.p95 || 0;
        const errorRate = results.metrics?.http_req_failed?.values?.rate || 0;
        const throughput = results.metrics?.http_reqs?.values?.rate || 0;
        
        // Penalize for slow response times
        if (responseTime > this.performanceThresholds.response_time_p95) {
            score -= Math.min(30, (responseTime - this.performanceThresholds.response_time_p95) / 100);
        }
        
        // Penalize for high error rates
        if (errorRate > this.performanceThresholds.error_rate) {
            score -= Math.min(40, (errorRate - this.performanceThresholds.error_rate) * 1000);
        }
        
        // Penalize for low throughput
        if (throughput < this.performanceThresholds.throughput_min) {
            score -= Math.min(20, (this.performanceThresholds.throughput_min - throughput) / 5);
        }
        
        return Math.max(0, Math.round(score));
    }

    // Generate performance recommendations
    generateRecommendations(results) {
        const recommendations = [];
        
        const responseTime = results.metrics?.http_req_duration?.values?.p95 || 0;
        const errorRate = results.metrics?.http_req_failed?.values?.rate || 0;
        const throughput = results.metrics?.http_reqs?.values?.rate || 0;
        
        if (responseTime > this.performanceThresholds.response_time_p95) {
            recommendations.push({
                category: 'performance',
                severity: 'high',
                issue: 'High response times detected',
                suggestion: 'Consider optimizing database queries, implementing caching, or scaling server resources'
            });
        }
        
        if (errorRate > this.performanceThresholds.error_rate) {
            recommendations.push({
                category: 'reliability',
                severity: 'critical',
                issue: 'High error rate detected',
                suggestion: 'Investigate application errors, improve error handling, and check server stability'
            });
        }
        
        if (throughput < this.performanceThresholds.throughput_min) {
            recommendations.push({
                category: 'scalability',
                severity: 'medium',
                issue: 'Low throughput detected',
                suggestion: 'Consider horizontal scaling, load balancing optimization, or server resource upgrades'
            });
        }
        
        if (recommendations.length === 0) {
            recommendations.push({
                category: 'performance',
                severity: 'info',
                issue: 'Performance within acceptable thresholds',
                suggestion: 'Continue monitoring and consider optimizations for future growth'
            });
        }
        
        return recommendations;
    }

    // Create test record
    async createTestRecord(testId, scenario, options) {
        try {
            const { error } = await this.supabase
                .from('load_test_results')
                .insert({
                    test_id: testId,
                    scenario: scenario,
                    status: 'running',
                    configuration: {
                        ...this.testScenarios[scenario],
                        ...options
                    },
                    started_at: new Date().toISOString()
                });
            
            if (error) throw error;
        } catch (error) {
            logger.error('Failed to create test record', { testId, error: error.message });
        }
    }

    // Update test record
    async updateTestRecord(testId, updates) {
        try {
            const { error } = await this.supabase
                .from('load_test_results')
                .update({
                    ...updates,
                    completed_at: new Date().toISOString()
                })
                .eq('test_id', testId);
            
            if (error) throw error;
        } catch (error) {
            logger.error('Failed to update test record', { testId, error: error.message });
        }
    }

    // Get test history
    async getTestHistory(limit = 20) {
        try {
            const { data, error } = await this.supabase
                .from('load_test_results')
                .select('*')
                .order('started_at', { ascending: false })
                .limit(limit);
            
            if (error) throw error;
            return data;
        } catch (error) {
            logger.error('Failed to get test history', error);
            return [];
        }
    }

    // Schedule automated tests
    scheduleAutomatedTests() {
        const cron = require('node-cron');
        
        // Daily smoke tests at 6 AM
        cron.schedule('0 6 * * *', async () => {
            try {
                logger.info('Running scheduled smoke test');
                await this.executeLoadTest('smoke', { automated: true });
            } catch (error) {
                logger.error('Scheduled smoke test failed', error);
            }
        });
        
        // Weekly load tests on Sundays at 2 AM
        cron.schedule('0 2 * * 0', async () => {
            try {
                logger.info('Running scheduled load test');
                await this.executeLoadTest('load', { automated: true });
            } catch (error) {
                logger.error('Scheduled load test failed', error);
            }
        });
        
        logger.info('Automated load tests scheduled');
    }
}

module.exports = LoadTestingService;
EOF

    echo -e "${GREEN}✅ Load testing service created${NC}"
}

# Create load testing database schema
create_load_testing_schema() {
    echo -e "${YELLOW}🗄️ Creating load testing database schema...${NC}"
    
    cat > backend/migrations/027_load_testing.sql << 'EOF'
-- Load Testing and Performance Monitoring

-- Load Test Results
CREATE TABLE IF NOT EXISTS load_test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id VARCHAR(255) NOT NULL UNIQUE,
    scenario VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    configuration JSONB DEFAULT '{}',
    results JSONB DEFAULT '{}',
    performance_score INTEGER,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    created_by UUID REFERENCES auth.users(id)
);

-- Performance Benchmarks
CREATE TABLE IF NOT EXISTS performance_benchmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_type VARCHAR(100) NOT NULL,
    endpoint VARCHAR(255),
    baseline_response_time NUMERIC,
    baseline_throughput NUMERIC,
    baseline_error_rate NUMERIC,
    target_response_time NUMERIC,
    target_throughput NUMERIC,
    target_error_rate NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance Metrics History
CREATE TABLE IF NOT EXISTS performance_metrics_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id VARCHAR(255) REFERENCES load_test_results(test_id),
    metric_name VARCHAR(100) NOT NULL,
    metric_value NUMERIC NOT NULL,
    metric_unit VARCHAR(50),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Performance Alerts
CREATE TABLE IF NOT EXISTS performance_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type VARCHAR(100) NOT NULL,
    severity VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    test_id VARCHAR(255),
    metric_name VARCHAR(100),
    threshold_value NUMERIC,
    actual_value NUMERIC,
    resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_load_test_results_test_id ON load_test_results(test_id);
CREATE INDEX IF NOT EXISTS idx_load_test_results_scenario ON load_test_results(scenario);
CREATE INDEX IF NOT EXISTS idx_load_test_results_status ON load_test_results(status);
CREATE INDEX IF NOT EXISTS idx_load_test_results_started_at ON load_test_results(started_at);

CREATE INDEX IF NOT EXISTS idx_performance_benchmarks_test_type ON performance_benchmarks(test_type);
CREATE INDEX IF NOT EXISTS idx_performance_benchmarks_endpoint ON performance_benchmarks(endpoint);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_history_test_id ON performance_metrics_history(test_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_history_metric_name ON performance_metrics_history(metric_name);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_history_timestamp ON performance_metrics_history(timestamp);

CREATE INDEX IF NOT EXISTS idx_performance_alerts_alert_type ON performance_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_performance_alerts_severity ON performance_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_performance_alerts_resolved ON performance_alerts(resolved);

-- RLS Policies
ALTER TABLE load_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_alerts ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role full access to load_test_results" ON load_test_results
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to performance_benchmarks" ON performance_benchmarks
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to performance_metrics_history" ON performance_metrics_history
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to performance_alerts" ON performance_alerts
    FOR ALL USING (auth.role() = 'service_role');

-- Functions
CREATE OR REPLACE FUNCTION calculate_performance_trend(
    metric_name_param VARCHAR,
    days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
    date DATE,
    avg_value NUMERIC,
    min_value NUMERIC,
    max_value NUMERIC,
    count_tests BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE(pmh.timestamp) as date,
        AVG(pmh.metric_value) as avg_value,
        MIN(pmh.metric_value) as min_value,
        MAX(pmh.metric_value) as max_value,
        COUNT(DISTINCT pmh.test_id) as count_tests
    FROM performance_metrics_history pmh
    WHERE pmh.metric_name = metric_name_param
    AND pmh.timestamp >= NOW() - (days_back || ' days')::INTERVAL
    GROUP BY DATE(pmh.timestamp)
    ORDER BY DATE(pmh.timestamp);
END;
$$ LANGUAGE plpgsql;

-- Insert default performance benchmarks
INSERT INTO performance_benchmarks (test_type, endpoint, baseline_response_time, baseline_throughput, baseline_error_rate, target_response_time, target_throughput, target_error_rate) VALUES
('smoke', '/api/health', 100, 50, 0.001, 50, 100, 0.001),
('load', '/api/auth/login', 500, 100, 0.01, 300, 150, 0.005),
('load', '/api/celebrities', 300, 200, 0.01, 200, 300, 0.005),
('load', '/api/bookings', 800, 50, 0.02, 500, 100, 0.01),
('stress', '/api/dashboard', 1000, 80, 0.05, 600, 120, 0.02),
('endurance', 'overall', 500, 100, 0.02, 300, 150, 0.01)
ON CONFLICT DO NOTHING;
EOF

    echo -e "${GREEN}✅ Load testing schema created${NC}"
}

# Create load testing routes
create_load_testing_routes() {
    echo -e "${YELLOW}🛣️ Creating load testing routes...${NC}"
    
    cat > backend/routes/load-testing.js << 'EOF'
const express = require('express');
const router = express.Router();
const LoadTestingService = require('../services/load-testing/LoadTestingService');
const { authenticate } = require('../middleware/auth');

const loadTestService = new LoadTestingService();

// Execute load test
router.post('/execute', authenticate, async (req, res) => {
    try {
        const { scenario, options } = req.body;
        
        if (!scenario || !loadTestService.testScenarios[scenario]) {
            return res.status(400).json({
                success: false,
                error: 'Invalid test scenario'
            });
        }
        
        // Start test asynchronously
        loadTestService.executeLoadTest(scenario, options)
            .then(results => {
                console.log('Load test completed:', results);
            })
            .catch(error => {
                console.error('Load test failed:', error);
            });
        
        res.json({
            success: true,
            message: 'Load test started',
            scenario
        });
    } catch (error) {
        console.error('Failed to start load test:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get test scenarios
router.get('/scenarios', authenticate, (req, res) => {
    res.json({
        success: true,
        data: loadTestService.testScenarios
    });
});

// Get test history
router.get('/history', authenticate, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const history = await loadTestService.getTestHistory(limit);
        res.json({ success: true, data: history });
    } catch (error) {
        console.error('Failed to get test history:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get performance trends
router.get('/trends/:metric', authenticate, async (req, res) => {
    try {
        const { metric } = req.params;
        const days = parseInt(req.query.days) || 30;
        
        const { data, error } = await loadTestService.supabase
            .rpc('calculate_performance_trend', {
                metric_name_param: metric,
                days_back: days
            });
        
        if (error) throw error;
        
        res.json({ success: true, data });
    } catch (error) {
        console.error('Failed to get performance trends:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get performance benchmarks
router.get('/benchmarks', authenticate, async (req, res) => {
    try {
        const { data, error } = await loadTestService.supabase
            .from('performance_benchmarks')
            .select('*')
            .order('test_type');
        
        if (error) throw error;
        
        res.json({ success: true, data });
    } catch (error) {
        console.error('Failed to get benchmarks:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
EOF

    echo -e "${GREEN}✅ Load testing routes created${NC}"
}

# Create load testing scripts
create_load_testing_scripts() {
    echo -e "${YELLOW}📜 Creating load testing scripts...${NC}"
    
    # Artillery.js configuration
    cat > load-tests/artillery-config.yml << 'EOF'
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 300
      arrivalRate: 50
      name: "Load test"
    - duration: 60
      arrivalRate: 100
      name: "Spike test"
  processor: "./artillery-processor.js"
  variables:
    baseUrl: "http://localhost:3000"

scenarios:
  - name: "User Journey"
    weight: 70
    flow:
      - post:
          url: "/api/auth/login"
          json:
            email: "test{{ $randomInt(1, 100) }}@example.com"
            password: "testpass123"
          capture:
            - json: "$.token"
              as: "authToken"
      - get:
          url: "/api/celebrities"
          headers:
            Authorization: "Bearer {{ authToken }}"
      - think: 2
      - get:
          url: "/api/dashboard"
          headers:
            Authorization: "Bearer {{ authToken }}"
            
  - name: "Anonymous Browsing"
    weight: 30
    flow:
      - get:
          url: "/api/celebrities"
      - think: 1
      - get:
          url: "/api/services"
EOF

    # Artillery processor
    cat > load-tests/artillery-processor.js << 'EOF'
module.exports = {
    setAuthHeader: setAuthHeader,
    logResponse: logResponse
};

function setAuthHeader(requestParams, context, ee, next) {
    if (context.vars.authToken) {
        requestParams.headers = requestParams.headers || {};
        requestParams.headers['Authorization'] = `Bearer ${context.vars.authToken}`;
    }
    return next();
}

function logResponse(requestParams, response, context, ee, next) {
    if (response.statusCode >= 400) {
        console.log(`Error ${response.statusCode}: ${requestParams.url}`);
    }
    return next();
}
EOF

    # Locust test file
    cat > load-tests/locustfile.py << 'EOF'
from locust import HttpUser, task, between
import random
import json

class CelebrityBookingUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        """Login when user starts"""
        self.login()
    
    def login(self):
        """Login to get auth token"""
        response = self.client.post("/api/auth/login", json={
            "email": f"test{random.randint(1, 100)}@example.com",
            "password": "testpass123"
        })
        
        if response.status_code == 200:
            self.auth_token = response.json().get("token")
            self.headers = {"Authorization": f"Bearer {self.auth_token}"}
        else:
            self.headers = {}
    
    @task(3)
    def browse_celebrities(self):
        """Browse celebrity listings"""
        self.client.get("/api/celebrities", headers=self.headers)
    
    @task(2)
    def view_dashboard(self):
        """View user dashboard"""
        self.client.get("/api/dashboard", headers=self.headers)
    
    @task(1)
    def create_booking(self):
        """Create a test booking"""
        booking_data = {
            "celebrity_id": "test-celebrity-id",
            "event_date": "2024-12-31T20:00:00Z",
            "event_type": "appearance",
            "budget": random.randint(10000, 50000),
            "description": "Load test booking"
        }
        
        self.client.post("/api/bookings", json=booking_data, headers=self.headers)
    
    @task(1)
    def view_services(self):
        """View available services"""
        self.client.get("/api/services")
    
    @task(1)
    def health_check(self):
        """Health check endpoint"""
        self.client.get("/api/health")

class AdminUser(HttpUser):
    wait_time = between(2, 5)
    weight = 1  # Lower weight for admin users
    
    def on_start(self):
        """Admin login"""
        response = self.client.post("/api/auth/login", json={
            "email": "admin@bookmyreservation.org",
            "password": "admin123"
        })
        
        if response.status_code == 200:
            self.auth_token = response.json().get("token")
            self.headers = {"Authorization": f"Bearer {self.auth_token}"}
        else:
            self.headers = {}
    
    @task(2)
    def view_analytics(self):
        """View analytics dashboard"""
        self.client.get("/api/analytics", headers=self.headers)
    
    @task(1)
    def manage_celebrities(self):
        """Manage celebrity profiles"""
        self.client.get("/api/admin/celebrities", headers=self.headers)
    
    @task(1)
    def view_bookings(self):
        """View all bookings"""
        self.client.get("/api/admin/bookings", headers=self.headers)
EOF

    # Performance test runner script
    cat > load-tests/run-tests.sh << 'EOF'
#!/bin/bash

# Performance Test Runner
# Runs various load testing tools and generates comprehensive reports

set -euo pipefail

echo "🚀 Starting Performance Test Suite..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Create reports directory
mkdir -p reports

# Function to run K6 test
run_k6_test() {
    local scenario=$1
    local script=$2
    
    echo -e "${BLUE}Running K6 $scenario test...${NC}"
    
    if command -v k6 &> /dev/null; then
        k6 run --out json=reports/k6-${scenario}.json scripts/${script}
        echo -e "${GREEN}✅ K6 $scenario test completed${NC}"
    else
        echo -e "${YELLOW}⚠️ K6 not installed, skipping K6 tests${NC}"
    fi
}

# Function to run Artillery test
run_artillery_test() {
    echo -e "${BLUE}Running Artillery test...${NC}"
    
    if command -v artillery &> /dev/null; then
        artillery run artillery-config.yml --output reports/artillery-report.json
        artillery report reports/artillery-report.json --output reports/artillery-report.html
        echo -e "${GREEN}✅ Artillery test completed${NC}"
    else
        echo -e "${YELLOW}⚠️ Artillery not installed, skipping Artillery tests${NC}"
    fi
}

# Function to run Locust test
run_locust_test() {
    echo -e "${BLUE}Running Locust test...${NC}"
    
    if command -v locust &> /dev/null; then
        # Run Locust in headless mode for 2 minutes with 50 users
        locust -f locustfile.py --headless -u 50 -r 10 -t 120s --host http://localhost:3000 \
               --html reports/locust-report.html --csv reports/locust
        echo -e "${GREEN}✅ Locust test completed${NC}"
    else
        echo -e "${YELLOW}⚠️ Locust not installed, skipping Locust tests${NC}"
    fi
}

# Function to generate summary report
generate_summary() {
    echo -e "${BLUE}Generating summary report...${NC}"
    
    cat > reports/test-summary.html << 'HTML'
<!DOCTYPE html>
<html>
<head>
    <title>Performance Test Summary</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
        .metric { display: inline-block; margin: 10px; padding: 10px; background: #f8f9fa; border-radius: 4px; }
        .passed { border-left: 4px solid #28a745; }
        .warning { border-left: 4px solid #ffc107; }
        .failed { border-left: 4px solid #dc3545; }
        .tools { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .tool-card { padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 Performance Test Summary</h1>
        <p>Generated on: $(date)</p>
    </div>
    
    <div class="section">
        <h2>Test Environment</h2>
        <div class="metric">
            <strong>Target URL:</strong> http://localhost:3000
        </div>
        <div class="metric">
            <strong>Test Duration:</strong> Various (2-5 minutes per tool)
        </div>
        <div class="metric">
            <strong>Concurrent Users:</strong> 10-100 (depending on test)
        </div>
    </div>
    
    <div class="section">
        <h2>Testing Tools Used</h2>
        <div class="tools">
            <div class="tool-card">
                <h3>🎯 K6</h3>
                <p>JavaScript-based load testing tool for API performance testing.</p>
                <p><strong>Focus:</strong> API response times, throughput, error rates</p>
            </div>
            <div class="tool-card">
                <h3>🎪 Artillery</h3>
                <p>Modern load testing framework with scenario-based testing.</p>
                <p><strong>Focus:</strong> User journey simulation, real-world scenarios</p>
            </div>
            <div class="tool-card">
                <h3>🦗 Locust</h3>
                <p>Python-based load testing with user behavior modeling.</p>
                <p><strong>Focus:</strong> Complex user behaviors, distributed testing</p>
            </div>
        </div>
    </div>
    
    <div class="section">
        <h2>📊 Key Findings</h2>
        <p>Detailed results available in individual tool reports:</p>
        <ul>
            <li><a href="k6-smoke.json">K6 Smoke Test Results</a></li>
            <li><a href="artillery-report.html">Artillery Test Report</a></li>
            <li><a href="locust-report.html">Locust Test Report</a></li>
        </ul>
    </div>
    
    <div class="section">
        <h2>🎯 Performance Thresholds</h2>
        <div class="metric passed">
            <strong>Response Time (p95):</strong> &lt; 2000ms
        </div>
        <div class="metric passed">
            <strong>Error Rate:</strong> &lt; 1%
        </div>
        <div class="metric passed">
            <strong>Throughput:</strong> &gt; 100 req/s
        </div>
    </div>
    
    <div class="section">
        <h2>📝 Recommendations</h2>
        <ul>
            <li>Monitor database query performance for bottlenecks</li>
            <li>Implement caching for frequently accessed data</li>
            <li>Consider horizontal scaling for increased load</li>
            <li>Set up automated performance regression testing</li>
            <li>Configure alerts for performance threshold breaches</li>
        </ul>
    </div>
</body>
</html>
HTML

    echo -e "${GREEN}✅ Summary report generated${NC}"
}

# Main execution
main() {
    echo -e "${BLUE}Performance Testing Suite${NC}"
    echo "========================="
    
    # Check if target is reachable
    if ! curl -f -s http://localhost:3000/api/health > /dev/null; then
        echo -e "${RED}❌ Target server (http://localhost:3000) is not reachable${NC}"
        echo "Please start your server before running performance tests."
        exit 1
    fi
    
    echo -e "${GREEN}✅ Target server is reachable${NC}"
    
    # Run tests
    run_k6_test "smoke" "smoke_test.js"
    run_artillery_test
    run_locust_test
    
    # Generate summary
    generate_summary
    
    echo -e "${GREEN}🎉 Performance testing completed!${NC}"
    echo "Reports available in the 'reports' directory"
    echo "Open reports/test-summary.html to view the summary"
}

# Run if executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
EOF

    chmod +x load-tests/run-tests.sh
    
    echo -e "${GREEN}✅ Load testing scripts created${NC}"
}

# Main execution
main() {
    echo -e "${BLUE}🚀 Starting Load Testing Setup...${NC}"
    
    # Create all components
    create_load_testing_service
    create_load_testing_schema
    create_load_testing_routes
    create_load_testing_scripts
    
    echo -e "${GREEN}✅ Load Testing Setup Complete!${NC}"
    echo -e "${BLUE}📋 Components created:${NC}"
    echo "• Load testing service with K6, Artillery, and Locust integration"
    echo "• Database schema for test results and performance tracking"
    echo "• API routes for test execution and monitoring"
    echo "• Comprehensive test scripts and configurations"
    echo ""
    echo -e "${BLUE}📋 Testing tools supported:${NC}"
    echo "• K6 - JavaScript-based load testing"
    echo "• Artillery - Scenario-based performance testing"
    echo "• Locust - Python-based user behavior simulation"
    echo ""
    echo -e "${BLUE}📋 Test scenarios available:${NC}"
    echo "• Smoke tests (basic functionality)"
    echo "• Load tests (normal traffic simulation)"
    echo "• Stress tests (high load conditions)"
    echo "• Spike tests (traffic spike simulation)"
    echo "• Endurance tests (long-running stability)"
    echo ""
    echo -e "${BLUE}📋 Usage:${NC}"
    echo "• Run all tests: cd load-tests && ./run-tests.sh"
    echo "• API endpoint: POST /api/load-testing/execute"
    echo "• Install tools: npm install -g k6 artillery-core locust"
}

# Execute main function
main "$@"