const express = require('express');
const router = express.Router();
const advancedRateLimiter = require('../middleware/advanced-rate-limiter');
const { logger } = require('../utils/logger');

/**
 * Admin endpoints for rate limiting management
 */

// Get rate limiting statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await advancedRateLimiter.getStats();
    
    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting rate limit stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get rate limiting statistics'
    });
  }
});

// Get failed authentication attempts for an IP
router.get('/failed-attempts/:ip', async (req, res) => {
  try {
    const { ip } = req.params;
    
    if (!ip || ip === 'undefined') {
      return res.status(400).json({
        success: false,
        error: 'IP address is required'
      });
    }
    
    const attempts = await advancedRateLimiter.getFailedAttempts(ip);
    
    res.json({
      success: true,
      ip,
      failedAttempts: attempts,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting failed attempts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get failed attempts count'
    });
  }
});

// Reset failed authentication attempts for an IP
router.post('/reset-attempts/:ip', async (req, res) => {
  try {
    const { ip } = req.params;
    
    if (!ip || ip === 'undefined') {
      return res.status(400).json({
        success: false,
        error: 'IP address is required'
      });
    }
    
    await advancedRateLimiter.resetFailedAttempts(ip);
    
    logger.info('Failed attempts reset for IP:', { ip, adminUser: req.user?.email });
    
    res.json({
      success: true,
      message: `Failed attempts reset for IP: ${ip}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error resetting failed attempts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset attempts'
    });
  }
});

// Get rate limiting configuration
router.get('/config', (req, res) => {
  const config = {
    authentication: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxAttempts: '5 (dynamic based on failures)',
      description: 'Progressive rate limiting for auth endpoints'
    },
    payments: {
      windowMs: 5 * 60 * 1000, // 5 minutes
      maxAttempts: 3,
      description: 'Strict rate limiting for payment endpoints'
    },
    admin: {
      windowMs: 10 * 60 * 1000, // 10 minutes
      maxAttempts: 50,
      description: 'Moderate rate limiting for admin operations'
    },
    api: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxAttempts: '100-1000 (role-based)',
      description: 'Tiered rate limiting based on user role'
    },
    registration: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxAttempts: 3,
      description: 'IP-based registration rate limiting'
    },
    search: {
      windowMs: 1 * 60 * 1000, // 1 minute
      maxAttempts: 30,
      description: 'Search endpoint rate limiting'
    },
    upload: {
      windowMs: 10 * 60 * 1000, // 10 minutes
      maxAttempts: 20,
      description: 'File upload rate limiting'
    },
    contact: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxAttempts: 5,
      description: 'Contact form submission rate limiting'
    },
    booking: {
      windowMs: 30 * 60 * 1000, // 30 minutes
      maxAttempts: 10,
      description: 'Booking request rate limiting'
    }
  };

  res.json({
    success: true,
    config,
    redisConnected: advancedRateLimiter.redisClient !== null,
    timestamp: new Date().toISOString()
  });
});

// Test rate limiting for a specific endpoint
router.post('/test/:endpoint', async (req, res) => {
  try {
    const { endpoint } = req.params;
    const { ip, userRole } = req.body;
    
    const testRequest = {
      ip: ip || req.ip,
      path: endpoint,
      user: { role: userRole || 'user' },
      method: 'GET'
    };
    
    const testResponse = {
      status: (code) => ({
        json: (data) => data
      })
    };
    
    // This is a simplified test - in real implementation you'd need to mock the middleware
    res.json({
      success: true,
      message: 'Rate limiting test simulated',
      testRequest,
      endpoint,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error testing rate limit:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test rate limiting'
    });
  }
});

module.exports = router;