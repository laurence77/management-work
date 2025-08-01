const express = require('express');
const router = express.Router();
const MobileTestingService = require('../services/mobile-testing/MobileTestingService');
const { authenticateUser, requireRole } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const mobileTestingService = new MobileTestingService();

// Rate limiting for mobile testing endpoints
const testingRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 tests per hour
    message: { success: false, error: 'Too many mobile testing requests' }
});

// Run comprehensive mobile test
router.post('/run-test', 
    testingRateLimit,
    authenticateUser,
    requireRole(['admin', 'manager']),
    async (req, res) => {
        try {
            const options = req.body;
            
            // Start test asynchronously
            const testPromise = mobileTestingService.runComprehensiveTest(options);
            
            // Return immediately with test ID
            const testId = mobileTestingService.generateTestId();
            
            res.json({
                success: true,
                message: 'Mobile testing started',
                data: {
                    test_id: testId,
                    status: 'running',
                    estimated_duration: '5-10 minutes'
                }
            });

            // Continue test in background
            try {
                const results = await testPromise;
                console.log('Mobile test completed:', results.test_id);
            } catch (error) {
                console.error('Mobile test failed:', error);
            }

        } catch (error) {
            console.error('Mobile test initiation error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to start mobile testing'
            });
        }
    }
);

// Get test results
router.get('/results/:testId', 
    authenticateUser,
    requireRole(['admin', 'manager']),
    async (req, res) => {
        try {
            const { testId } = req.params;

            const { data: testResult, error } = await supabase
                .from('mobile_test_results')
                .select('*')
                .eq('test_id', testId)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            if (!testResult) {
                return res.status(404).json({
                    success: false,
                    error: 'Test results not found'
                });
            }

            res.json({
                success: true,
                data: testResult
            });

        } catch (error) {
            console.error('Get test results error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve test results'
            });
        }
    }
);

// Get all test results with pagination
router.get('/results', 
    authenticateUser,
    requireRole(['admin', 'manager']),
    async (req, res) => {
        try {
            const { page = 1, limit = 10 } = req.query;
            const offset = (page - 1) * limit;

            const { data: results, error, count } = await supabase
                .from('mobile_test_results')
                .select('test_id, summary, created_at', { count: 'exact' })
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) throw error;

            res.json({
                success: true,
                data: {
                    results: results || [],
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: count || 0,
                        pages: Math.ceil((count || 0) / limit)
                    }
                }
            });

        } catch (error) {
            console.error('Get test results list error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve test results list'
            });
        }
    }
);

// Generate mobile report
router.get('/report/:testId', 
    authenticateUser,
    requireRole(['admin', 'manager']),
    async (req, res) => {
        try {
            const { testId } = req.params;
            
            const report = await mobileTestingService.generateMobileReport(testId);

            res.json({
                success: true,
                data: report
            });

        } catch (error) {
            console.error('Generate mobile report error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to generate mobile report'
            });
        }
    }
);

// Run quick mobile test (single device, single page)
router.post('/quick-test', 
    authenticateUser,
    requireRole(['admin', 'manager']),
    async (req, res) => {
        try {
            const { url, device = 'iPhone 13' } = req.body;

            if (!url) {
                return res.status(400).json({
                    success: false,
                    error: 'URL is required for quick test'
                });
            }

            const options = {
                devices: [device],
                pages: [new URL(url).pathname],
                baseUrl: new URL(url).origin,
                includePerformance: true,
                includeFunctionality: false,
                includeAccessibility: true
            };

            const results = await mobileTestingService.runComprehensiveTest(options);

            res.json({
                success: true,
                data: results
            });

        } catch (error) {
            console.error('Quick mobile test error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to run quick mobile test'
            });
        }
    }
);

// Get supported devices
router.get('/devices', 
    authenticateUser,
    async (req, res) => {
        try {
            const devices = Object.keys(mobileTestingService.deviceProfiles).map(deviceName => ({
                name: deviceName,
                category: mobileTestingService.deviceProfiles[deviceName].category,
                viewport: mobileTestingService.deviceProfiles[deviceName].viewport
            }));

            res.json({
                success: true,
                data: { devices }
            });

        } catch (error) {
            console.error('Get devices error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get supported devices'
            });
        }
    }
);

module.exports = router;
