const express = require('express');
const router = express.Router();
const { mobileOptimizationService } = require('../middleware/mobile-optimization');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { rateLimits } = require('../middleware/security');
const { logger } = require('../services/LoggingService');

// Apply authentication and rate limiting
router.use(authenticateToken);
router.use(requireRole(['admin', 'manager']));
router.use(rateLimits.api);

/**
 * @route GET /api/mobile/stats
 * @desc Get mobile optimization statistics
 * @access Admin, Manager
 */
router.get('/stats', async (req, res) => {
  try {
    const result = await mobileOptimizationService.getMobileOptimizationStats();
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to get mobile optimization stats',
        error: result.error
      });
    }
    
    logger.info('Mobile optimization stats accessed', {
      userId: req.user.id,
      timestamp: new Date()
    });
    
    res.json({
      success: true,
      data: result.stats,
      meta: {
        accessedBy: req.user.id,
        accessedAt: new Date()
      }
    });
    
  } catch (error) {
    logger.error('Failed to get mobile optimization stats', error, {
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching mobile optimization stats'
    });
  }
});

/**
 * @route GET /api/mobile/device-info
 * @desc Get device information for current request
 * @access All authenticated users
 */
router.get('/device-info', (req, res) => {
  try {
    const deviceInfo = {
      type: req.device?.type || 'unknown',
      capabilities: req.device?.capabilities || {},
      userAgent: req.get('User-Agent'),
      isMobile: req.device?.isMobile || false,
      isTablet: req.device?.isTablet || false,
      isDesktop: req.device?.isDesktop || true,
      supportsTouch: req.device?.supportsTouch || false,
      hasLimitedBandwidth: req.device?.hasLimitedBandwidth || false,
      headers: {
        saveData: req.headers['save-data'],
        dnt: req.headers['dnt'],
        acceptEncoding: req.headers['accept-encoding'],
        acceptLanguage: req.headers['accept-language']
      }
    };
    
    res.json({
      success: true,
      data: deviceInfo,
      meta: {
        detectedAt: new Date(),
        requestedBy: req.user.id
      }
    });
    
  } catch (error) {
    logger.error('Failed to get device info', error, {
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Internal server error while getting device info'
    });
  }
});

/**
 * @route GET /api/mobile/manifest
 * @desc Get PWA manifest configuration
 * @access Public
 */
router.get('/manifest', (req, res) => {
  try {
    const manifest = mobileOptimizationService.generateMobileManifest({
      name: process.env.APP_NAME || 'Celebrity Booking Platform',
      shortName: process.env.APP_SHORT_NAME || 'CelebBooking',
      description: process.env.APP_DESCRIPTION || 'Book celebrities for your events',
      themeColor: process.env.APP_THEME_COLOR || '#000000',
      backgroundColor: process.env.APP_BACKGROUND_COLOR || '#ffffff'
    });
    
    res.set('Content-Type', 'application/manifest+json');
    res.set('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    
    res.json(manifest);
    
  } catch (error) {
    logger.error('Failed to generate manifest', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to generate PWA manifest'
    });
  }
});

/**
 * @route POST /api/mobile/test-optimization
 * @desc Test mobile optimization for specific data
 * @access Admin, Manager
 */
router.post('/test-optimization', async (req, res) => {
  try {
    const { data, deviceType = 'mobile', resourceType } = req.body;
    
    if (!data) {
      return res.status(400).json({
        success: false,
        message: 'Data is required for optimization testing'
      });
    }
    
    const validDeviceTypes = ['mobile', 'tablet', 'desktop'];
    if (!validDeviceTypes.includes(deviceType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid device type. Must be one of: mobile, tablet, desktop'
      });
    }
    
    const originalSize = JSON.stringify(data).length;
    
    const optimizedData = mobileOptimizationService.optimizeResponse(
      data,
      deviceType,
      { resourceType }
    );
    
    const optimizedSize = JSON.stringify(optimizedData).length;
    const compressionRatio = ((originalSize - optimizedSize) / originalSize) * 100;
    
    logger.info('Mobile optimization test performed', {
      userId: req.user.id,
      deviceType,
      resourceType,
      originalSize,
      optimizedSize,
      compressionRatio
    });
    
    res.json({
      success: true,
      data: {
        original: data,
        optimized: optimizedData,
        metrics: {
          originalSize,
          optimizedSize,
          compressionRatio: compressionRatio.toFixed(2),
          savedBytes: originalSize - optimizedSize
        }
      },
      meta: {
        deviceType,
        resourceType,
        testedBy: req.user.id,
        testedAt: new Date()
      }
    });
    
  } catch (error) {
    logger.error('Failed to test mobile optimization', error, {
      userId: req.user.id,
      body: req.body
    });
    
    res.status(500).json({
      success: false,
      message: 'Internal server error while testing mobile optimization'
    });
  }
});

/**
 * @route GET /api/mobile/optimization-config
 * @desc Get current mobile optimization configuration
 * @access Admin, Manager
 */
router.get('/optimization-config', (req, res) => {
  try {
    const config = {
      deviceTypes: mobileOptimizationService.deviceTypes,
      imageOptimizations: mobileOptimizationService.imageOptimizations,
      responseOptimizations: mobileOptimizationService.responseOptimizations,
      supportedFeatures: {
        deviceDetection: true,
        responseOptimization: true,
        imageOptimization: true,
        pwaSupport: true,
        pushNotifications: true,
        bandwidthOptimization: true
      }
    };
    
    res.json({
      success: true,
      data: config,
      meta: {
        accessedBy: req.user.id,
        accessedAt: new Date()
      }
    });
    
  } catch (error) {
    logger.error('Failed to get optimization config', error, {
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Internal server error while getting optimization config'
    });
  }
});

/**
 * @route POST /api/mobile/push-notification
 * @desc Generate push notification payload for specific device
 * @access Admin, Manager
 */
router.post('/push-notification', (req, res) => {
  try {
    const { 
      deviceType = 'mobile',
      notification
    } = req.body;
    
    if (!notification || !notification.title || !notification.body) {
      return res.status(400).json({
        success: false,
        message: 'Notification object with title and body is required'
      });
    }
    
    const validDeviceTypes = ['mobile', 'tablet', 'desktop'];
    if (!validDeviceTypes.includes(deviceType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid device type. Must be one of: mobile, tablet, desktop'
      });
    }
    
    const payload = mobileOptimizationService.generatePushNotificationPayload(
      deviceType,
      notification
    );
    
    logger.info('Push notification payload generated', {
      userId: req.user.id,
      deviceType,
      notificationTitle: notification.title
    });
    
    res.json({
      success: true,
      data: {
        payload,
        deviceType,
        optimizedForDevice: true
      },
      meta: {
        generatedBy: req.user.id,
        generatedAt: new Date()
      }
    });
    
  } catch (error) {
    logger.error('Failed to generate push notification payload', error, {
      userId: req.user.id,
      body: req.body
    });
    
    res.status(500).json({
      success: false,
      message: 'Internal server error while generating push notification payload'
    });
  }
});

/**
 * @route GET /api/mobile/health
 * @desc Health check for mobile optimization service
 * @access Admin, Manager
 */
router.get('/health', async (req, res) => {
  try {
    const health = await mobileOptimizationService.healthCheck();
    
    res.json({
      success: true,
      data: health
    });
    
  } catch (error) {
    logger.error('Mobile optimization health check failed', error);
    
    res.status(500).json({
      success: false,
      message: 'Mobile optimization service health check failed',
      error: error.message
    });
  }
});

/**
 * @route GET /api/mobile/bandwidth-test
 * @desc Test bandwidth optimization features
 * @access Admin, Manager
 */
router.get('/bandwidth-test', (req, res) => {
  try {
    // Generate test data of various sizes
    const testData = {
      small: { message: 'Small test data', size: 'small' },
      medium: {
        message: 'Medium test data',
        size: 'medium',
        data: Array(100).fill('test data item')
      },
      large: {
        message: 'Large test data',
        size: 'large',
        data: Array(1000).fill('large test data item with more content'),
        images: Array(50).fill({
          url: 'https://example.com/large-image.jpg',
          alt: 'Large test image',
          metadata: { width: 1920, height: 1080, size: '2MB' }
        })
      }
    };
    
    const requestedSize = req.query.size || 'medium';
    const deviceType = req.device?.type || 'desktop';
    const saveData = req.headers['save-data'] === 'on' || req.device?.hasLimitedBandwidth;
    
    let responseData = testData[requestedSize] || testData.medium;
    
    // Apply bandwidth optimization if needed
    if (saveData || deviceType === 'mobile') {
      responseData = mobileOptimizationService.optimizeResponse(
        responseData,
        deviceType,
        { resourceType: 'test' }
      );
    }
    
    const originalSize = JSON.stringify(testData[requestedSize]).length;
    const optimizedSize = JSON.stringify(responseData).length;
    
    res.json({
      success: true,
      data: responseData,
      optimization: {
        applied: saveData || deviceType === 'mobile',
        deviceType,
        saveData,
        originalSize,
        optimizedSize,
        compressionRatio: ((originalSize - optimizedSize) / originalSize * 100).toFixed(2)
      },
      meta: {
        requestedSize,
        testedBy: req.user.id,
        testedAt: new Date()
      }
    });
    
  } catch (error) {
    logger.error('Failed to perform bandwidth test', error, {
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Internal server error during bandwidth test'
    });
  }
});

module.exports = router;