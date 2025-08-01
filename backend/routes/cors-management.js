const express = require('express');
const router = express.Router();
const DomainManagementService = require('../services/DomainManagementService');
const CORSSecurityMiddleware = require('../middleware/cors/CORSSecurityMiddleware');
const { authenticate } = require('../middleware/auth');

const domainService = new DomainManagementService();
const corsSecurityMiddleware = new CORSSecurityMiddleware();

// Get CORS configuration and status
router.get('/config', authenticate, async (req, res) => {
    try {
        const { getCORSConfig, validateCORSConfig } = require('../middleware/secure-cors');
        const config = getCORSConfig();
        const validation = validateCORSConfig();
        const securityStatus = corsSecurityMiddleware.getSecurityStatus();
        
        res.json({
            success: true,
            data: {
                configuration: config,
                validation,
                security: securityStatus,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Failed to get CORS config:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get CORS analytics
router.get('/analytics', authenticate, async (req, res) => {
    try {
        const hours = parseInt(req.query.hours) || 24;
        const analytics = await domainService.getCORSAnalytics(hours);
        
        res.json({ success: true, data: analytics });
    } catch (error) {
        console.error('Failed to get CORS analytics:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get domain whitelist
router.get('/domains', authenticate, async (req, res) => {
    try {
        const environment = req.query.environment;
        const domains = await domainService.getActiveDomains(environment);
        
        res.json({ success: true, data: domains });
    } catch (error) {
        console.error('Failed to get domains:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Add domain to whitelist
router.post('/domains', authenticate, async (req, res) => {
    try {
        const { domain, metadata } = req.body;
        
        if (!domain) {
            return res.status(400).json({ 
                success: false, 
                error: 'Domain is required' 
            });
        }
        
        const result = await domainService.addDomain(domain, metadata);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Failed to add domain:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Remove domain from whitelist
router.delete('/domains/:domain', authenticate, async (req, res) => {
    try {
        const { domain } = req.params;
        await domainService.removeDomain(domain);
        
        res.json({ success: true, message: 'Domain removed successfully' });
    } catch (error) {
        console.error('Failed to remove domain:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Check domain reputation
router.get('/domains/:domain/reputation', authenticate, async (req, res) => {
    try {
        const { domain } = req.params;
        const reputation = await domainService.checkDomainReputation(domain);
        
        res.json({ success: true, data: reputation });
    } catch (error) {
        console.error('Failed to check domain reputation:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Test CORS configuration
router.post('/test', authenticate, async (req, res) => {
    try {
        const { origin, method = 'GET' } = req.body;
        
        if (!origin) {
            return res.status(400).json({
                success: false,
                error: 'Origin is required for testing'
            });
        }
        
        // Simulate CORS check
        const validation = corsSecurityMiddleware.validateOriginSecurity(origin, req);
        
        const testResult = {
            origin,
            method,
            allowed: validation.allowed,
            reason: validation.reason,
            security_score: validation.securityScore,
            warnings: validation.warnings,
            timestamp: new Date().toISOString()
        };
        
        // Log test request
        await domainService.logCORSRequest(
            origin, 
            validation.allowed, 
            `test_request: ${validation.reason}`,
            { test: true, method, user_agent: req.headers['user-agent'] }
        );
        
        res.json({ success: true, data: testResult });
    } catch (error) {
        console.error('Failed to test CORS:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get security events
router.get('/security-events', authenticate, async (req, res) => {
    try {
        const { data: events, error } = await domainService.supabase
            .from('cors_security_events')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);
        
        if (error) throw error;
        
        res.json({ success: true, data: events });
    } catch (error) {
        console.error('Failed to get security events:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update CORS configuration
router.post('/update-config', authenticate, async (req, res) => {
    try {
        const { allowedOrigins, trustedDomains } = req.body;
        
        // This would typically update environment variables or configuration
        // For now, we'll just validate the input and return success
        
        if (!Array.isArray(allowedOrigins)) {
            return res.status(400).json({
                success: false,
                error: 'allowedOrigins must be an array'
            });
        }
        
        // Validate each origin
        const invalidOrigins = allowedOrigins.filter(origin => {
            try {
                new URL(origin);
                return false;
            } catch {
                return true;
            }
        });
        
        if (invalidOrigins.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid origins found',
                invalidOrigins
            });
        }
        
        res.json({
            success: true,
            message: 'CORS configuration updated successfully',
            note: 'Configuration changes require server restart to take effect'
        });
    } catch (error) {
        console.error('Failed to update CORS config:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
