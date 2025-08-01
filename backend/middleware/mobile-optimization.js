const MobileOptimizationService = require('../services/MobileOptimizationService');
const { logger } = require('../services/LoggingService');

const mobileOptimizationService = new MobileOptimizationService();

/**
 * Device Detection Middleware
 * Detects device type and adds device information to request
 */
const deviceDetection = (req, res, next) => {
  try {
    const userAgent = req.get('User-Agent') || '';
    const deviceType = mobileOptimizationService.detectDevice(userAgent, req.headers);
    const capabilities = mobileOptimizationService.getDeviceCapabilities(deviceType);
    
    // Add device information to request
    req.device = {
      type: deviceType,
      capabilities,
      userAgent,
      isMobile: deviceType === 'mobile',
      isTablet: deviceType === 'tablet',
      isDesktop: deviceType === 'desktop',
      supportsTouch: capabilities.touchScreen,
      hasLimitedBandwidth: capabilities.limitedBandwidth
    };
    
    // Add device type header for caching
    res.set('Vary', 'User-Agent, Accept, Accept-Encoding');
    res.set('X-Device-Type', deviceType);
    
    next();
  } catch (error) {
    logger.error('Device detection middleware error', error, {
      userAgent: req.get('User-Agent'),
      path: req.path
    });
    
    // Set default device type on error
    req.device = {
      type: 'desktop',
      capabilities: mobileOptimizationService.getDeviceCapabilities('desktop'),
      userAgent: req.get('User-Agent') || '',
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      supportsTouch: false,
      hasLimitedBandwidth: false
    };
    
    next();
  }
};

/**
 * Response Optimization Middleware
 * Optimizes API responses based on device type
 */
const responseOptimization = (req, res, next) => {
  try {
    // Store original json method
    const originalJson = res.json;
    const originalSend = res.send;
    
    // Override json method for optimization
    res.json = async function(data) {
      try {
        // Skip optimization for desktop or if explicitly disabled
        if (req.device.isDesktop || req.query.optimize === 'false') {
          return originalJson.call(this, data);
        }
        
        // Determine resource type from path
        const pathSegments = req.path.split('/').filter(Boolean);
        const resourceType = pathSegments[pathSegments.indexOf('api') + 1];
        
        // Apply mobile optimization
        const optimizedData = mobileOptimizationService.optimizeResponse(
          data,
          req.device.type,
          {
            resourceType,
            limit: parseInt(req.query.limit) || null,
            fields: req.query.fields,
            userAgent: req.device.userAgent
          }
        );
        
        // Set mobile optimization headers
        res.set('X-Mobile-Optimized', 'true');
        res.set('X-Original-Size', JSON.stringify(data).length.toString());
        res.set('X-Optimized-Size', JSON.stringify(optimizedData).length.toString());
        
        // Set appropriate cache control for mobile
        if (req.device.isMobile) {
          res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
        } else if (req.device.isTablet) {
          res.set('Cache-Control', 'public, max-age=450, stale-while-revalidate=90');
        }
        
        return originalJson.call(this, optimizedData);
        
      } catch (error) {
        logger.error('Response optimization failed', error, {
          deviceType: req.device.type,
          path: req.path
        });
        
        // Fallback to original response
        return originalJson.call(this, data);
      }
    };
    
    // Override send method for non-JSON responses
    res.send = function(data) {
      try {
        // Add device-specific headers for all responses
        if (req.device.isMobile || req.device.isTablet) {
          res.set('X-Mobile-Optimized', 'true');
          
          // Compress text responses for mobile
          if (typeof data === 'string' && req.device.hasLimitedBandwidth) {
            res.set('Content-Encoding', 'gzip');
          }
        }
        
        return originalSend.call(this, data);
        
      } catch (error) {
        logger.error('Send optimization failed', error);
        return originalSend.call(this, data);
      }
    };
    
    next();
    
  } catch (error) {
    logger.error('Response optimization middleware error', error);
    next();
  }
};

/**
 * Image Optimization Middleware
 * Optimizes image requests based on device capabilities
 */
const imageOptimization = (req, res, next) => {
  try {
    // Only apply to image requests
    if (!req.path.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
      return next();
    }
    
    const deviceType = req.device.type;
    const capabilities = req.device.capabilities;
    
    // Get image optimization config
    const imageConfig = mobileOptimizationService.imageOptimizations[deviceType];
    
    if (imageConfig && req.device.hasLimitedBandwidth) {
      // Add image transformation parameters
      req.query = {
        ...req.query,
        w: req.query.w || imageConfig.maxWidth,
        q: req.query.q || imageConfig.quality,
        f: req.query.f || imageConfig.format
      };
      
      // Set appropriate headers
      res.set('X-Image-Optimized', 'true');
      res.set('X-Target-Width', imageConfig.maxWidth.toString());
      res.set('X-Target-Quality', imageConfig.quality.toString());
      res.set('X-Target-Format', imageConfig.format);
      
      // Set longer cache for optimized images
      res.set('Cache-Control', 'public, max-age=86400, immutable');
    }
    
    next();
    
  } catch (error) {
    logger.error('Image optimization middleware error', error);
    next();
  }
};

/**
 * Mobile-Specific Headers Middleware
 * Adds mobile-specific headers and PWA support
 */
const mobileHeaders = (req, res, next) => {
  try {
    if (req.device.isMobile || req.device.isTablet) {
      // PWA and mobile app headers
      res.set('X-UA-Compatible', 'IE=edge');
      res.set('X-Mobile-Optimized', 'true');
      
      // Prevent automatic telephone number detection
      res.set('format-detection', 'telephone=no');
      
      // Viewport meta tag for mobile
      if (req.path === '/' || req.path.includes('.html')) {
        res.set('X-Viewport', 'width=device-width, initial-scale=1.0, viewport-fit=cover');
      }
      
      // Service worker support headers
      if (req.device.capabilities.supportsPush) {
        res.set('X-SW-Supported', 'true');
      }
      
      // Touch icon and manifest hints
      res.set('X-Apple-Mobile-Web-App-Capable', 'yes');
      res.set('X-Apple-Mobile-Web-App-Status-Bar-Style', 'black-translucent');
      
      // Performance hints
      if (req.device.hasLimitedBandwidth) {
        res.set('X-Bandwidth-Hint', 'limited');
        res.set('Save-Data', 'on');
      }
    }
    
    next();
    
  } catch (error) {
    logger.error('Mobile headers middleware error', error);
    next();
  }
};

/**
 * Bandwidth Optimization Middleware
 * Implements data-saving features for limited bandwidth connections
 */
const bandwidthOptimization = (req, res, next) => {
  try {
    const saveData = req.headers['save-data'] === 'on' || req.device.hasLimitedBandwidth;
    
    if (saveData) {
      // Add save-data preference to request
      req.saveData = true;
      
      // Set response headers for data saving
      res.set('X-Save-Data', 'true');
      
      // Modify query parameters for reduced data usage
      if (req.query.limit) {
        req.query.limit = Math.min(parseInt(req.query.limit), 10);
      } else {
        req.query.limit = req.device.isMobile ? 5 : 10;
      }
      
      // Disable heavy features
      req.query.includeImages = 'false';
      req.query.includeDetails = 'false';
      
      logger.debug('Bandwidth optimization applied', {
        path: req.path,
        deviceType: req.device.type,
        saveData: true
      });
    }
    
    next();
    
  } catch (error) {
    logger.error('Bandwidth optimization middleware error', error);
    next();
  }
};

/**
 * Progressive Web App (PWA) Support Middleware
 * Handles PWA-specific requests and headers
 */
const pwaSupport = (req, res, next) => {
  try {
    // Handle manifest.json requests
    if (req.path === '/manifest.json' || req.path === '/site.webmanifest') {
      const manifest = mobileOptimizationService.generateMobileManifest({
        name: process.env.APP_NAME || 'Celebrity Booking Platform',
        shortName: process.env.APP_SHORT_NAME || 'CelebBooking',
        description: process.env.APP_DESCRIPTION || 'Book celebrities for your events',
        themeColor: process.env.APP_THEME_COLOR || '#000000',
        backgroundColor: process.env.APP_BACKGROUND_COLOR || '#ffffff'
      });
      
      res.set('Content-Type', 'application/manifest+json');
      res.set('Cache-Control', 'public, max-age=86400');
      
      return res.json(manifest);
    }
    
    // Handle service worker requests
    if (req.path === '/sw.js' || req.path === '/service-worker.js') {
      res.set('Content-Type', 'application/javascript');
      res.set('Cache-Control', 'no-cache');
      res.set('Service-Worker-Allowed', '/');
      
      // Basic service worker content (implement full version separately)
      const serviceWorkerContent = `
        const CACHE_NAME = 'celebrity-booking-v1';
        const urlsToCache = [
          '/',
          '/static/css/main.css',
          '/static/js/main.js',
          '/icons/icon-192x192.png'
        ];
        
        self.addEventListener('install', (event) => {
          event.waitUntil(
            caches.open(CACHE_NAME)
              .then((cache) => cache.addAll(urlsToCache))
          );
        });
        
        self.addEventListener('fetch', (event) => {
          event.respondWith(
            caches.match(event.request)
              .then((response) => {
                return response || fetch(event.request);
              })
          );
        });
      `;
      
      return res.send(serviceWorkerContent);
    }
    
    next();
    
  } catch (error) {
    logger.error('PWA support middleware error', error);
    next();
  }
};

/**
 * Mobile Analytics Middleware
 * Tracks mobile-specific metrics and usage patterns
 */
const mobileAnalytics = (req, res, next) => {
  try {
    if (req.device.isMobile || req.device.isTablet) {
      // Track mobile request
      const analyticsData = {
        deviceType: req.device.type,
        userAgent: req.device.userAgent,
        path: req.path,
        method: req.method,
        timestamp: new Date(),
        hasLimitedBandwidth: req.device.hasLimitedBandwidth,
        supportsTouch: req.device.supportsTouch,
        saveData: req.saveData || false
      };
      
      // Log for analytics (async, don't block request)
      setImmediate(() => {
        logger.info('Mobile request tracked', analyticsData);
      });
      
      // Add response time tracking
      const startTime = Date.now();
      
      res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        
        setImmediate(() => {
          logger.info('Mobile response completed', {
            ...analyticsData,
            statusCode: res.statusCode,
            responseTime,
            contentLength: res.get('Content-Length') || 0
          });
        });
      });
    }
    
    next();
    
  } catch (error) {
    logger.error('Mobile analytics middleware error', error);
    next();
  }
};

/**
 * Combined mobile optimization middleware
 * Applies all mobile optimizations in the correct order
 */
const applyMobileOptimizations = (app) => {
  logger.info('🔧 Applying mobile optimizations...');
  
  // Apply middleware in order
  app.use(deviceDetection);
  app.use(mobileHeaders);
  app.use(bandwidthOptimization);
  app.use(imageOptimization);
  app.use(pwaSupport);
  app.use(responseOptimization);
  app.use(mobileAnalytics);
  
  // Make mobile optimization service available to routes
  app.locals.mobileOptimizationService = mobileOptimizationService;
  
  logger.info('📱 Mobile optimizations applied successfully');
};

module.exports = {
  deviceDetection,
  responseOptimization,
  imageOptimization,
  mobileHeaders,
  bandwidthOptimization,
  pwaSupport,
  mobileAnalytics,
  applyMobileOptimizations,
  mobileOptimizationService
};