const { logger } = require('./LoggingService');
const cacheService = require('./CacheService');

/**
 * Mobile Optimization Service
 * Provides mobile-specific optimizations for API responses and content delivery
 */

class MobileOptimizationService {
  constructor() {
    this.deviceTypes = {
      MOBILE: 'mobile',
      TABLET: 'tablet',
      DESKTOP: 'desktop'
    };
    
    this.mobileUserAgents = [
      /Android/i,
      /webOS/i,
      /iPhone/i,
      /iPad/i,
      /iPod/i,
      /BlackBerry/i,
      /Windows Phone/i,
      /Opera Mini/i,
      /IEMobile/i,
      /Mobile/i
    ];
    
    this.tabletUserAgents = [
      /iPad/i,
      /Android(?!.*Mobile)/i,
      /Tablet/i
    ];
    
    this.imageOptimizations = {
      mobile: {
        maxWidth: 640,
        quality: 80,
        format: 'webp'
      },
      tablet: {
        maxWidth: 1024,
        quality: 85,
        format: 'webp'
      },
      desktop: {
        maxWidth: 1920,
        quality: 90,
        format: 'webp'
      }
    };
    
    this.responseOptimizations = {
      mobile: {
        pagination: {
          defaultLimit: 10,
          maxLimit: 20
        },
        fields: {
          celebrities: ['id', 'name', 'category', 'base_price', 'image_url', 'rating'],
          bookings: ['id', 'celebrity_id', 'status', 'amount', 'event_date', 'created_at'],
          messages: ['id', 'content', 'sender_id', 'created_at']
        }
      },
      tablet: {
        pagination: {
          defaultLimit: 15,
          maxLimit: 30
        },
        fields: {
          celebrities: ['id', 'name', 'category', 'base_price', 'image_url', 'rating', 'bio'],
          bookings: ['id', 'celebrity_id', 'status', 'amount', 'event_date', 'created_at', 'location'],
          messages: ['id', 'content', 'sender_id', 'created_at', 'message_type']
        }
      },
      desktop: {
        pagination: {
          defaultLimit: 25,
          maxLimit: 50
        },
        fields: null // Return all fields
      }
    };
    
    logger.info('📱 Mobile optimization service initialized');
  }
  
  // =============================================================================
  // DEVICE DETECTION
  // =============================================================================
  
  detectDevice(userAgent, headers = {}) {
    try {
      if (!userAgent) {
        return this.deviceTypes.DESKTOP;
      }
      
      // Check for tablet first (more specific)
      if (this.tabletUserAgents.some(regex => regex.test(userAgent))) {
        return this.deviceTypes.TABLET;
      }
      
      // Check for mobile
      if (this.mobileUserAgents.some(regex => regex.test(userAgent))) {
        return this.deviceTypes.MOBILE;
      }
      
      // Check viewport hints from headers
      const viewport = headers['sec-ch-viewport-width'] || headers['viewport-width'];
      if (viewport) {
        const width = parseInt(viewport);
        if (width <= 768) return this.deviceTypes.MOBILE;
        if (width <= 1024) return this.deviceTypes.TABLET;
      }
      
      return this.deviceTypes.DESKTOP;
      
    } catch (error) {
      logger.error('Device detection failed', error, { userAgent });
      return this.deviceTypes.DESKTOP;
    }
  }
  
  getDeviceCapabilities(deviceType) {
    const capabilities = {
      [this.deviceTypes.MOBILE]: {
        touchScreen: true,
        smallScreen: true,
        limitedBandwidth: true,
        supportsPush: true,
        supportsGeolocation: true,
        preferredImageFormat: 'webp',
        maxImageSize: '640x480',
        preferredVideoFormat: 'mp4',
        maxVideoQuality: '720p'
      },
      [this.deviceTypes.TABLET]: {
        touchScreen: true,
        mediumScreen: true,
        limitedBandwidth: false,
        supportsPush: true,
        supportsGeolocation: true,
        preferredImageFormat: 'webp',
        maxImageSize: '1024x768',
        preferredVideoFormat: 'mp4',
        maxVideoQuality: '1080p'
      },
      [this.deviceTypes.DESKTOP]: {
        touchScreen: false,
        largeScreen: true,
        limitedBandwidth: false,
        supportsPush: false,
        supportsGeolocation: false,
        preferredImageFormat: 'webp',
        maxImageSize: '1920x1080',
        preferredVideoFormat: 'mp4',
        maxVideoQuality: '4k'
      }
    };
    
    return capabilities[deviceType] || capabilities[this.deviceTypes.DESKTOP];
  }
  
  // =============================================================================
  // RESPONSE OPTIMIZATION
  // =============================================================================
  
  optimizeResponse(data, deviceType, context = {}) {
    try {
      const optimization = this.responseOptimizations[deviceType];
      
      if (!optimization) {
        return data;
      }
      
      let optimizedData = { ...data };
      
      // Apply pagination optimization
      if (Array.isArray(data) || (data.data && Array.isArray(data.data))) {
        optimizedData = this.optimizePagination(optimizedData, optimization.pagination, context);
      }
      
      // Apply field filtering
      if (optimization.fields && context.resourceType) {
        optimizedData = this.optimizeFields(optimizedData, optimization.fields, context.resourceType);
      }
      
      // Apply image optimization
      optimizedData = this.optimizeImages(optimizedData, deviceType);
      
      // Apply content compression
      optimizedData = this.optimizeContent(optimizedData, deviceType);
      
      return optimizedData;
      
    } catch (error) {
      logger.error('Response optimization failed', error, { deviceType, context });
      return data;
    }
  }
  
  optimizePagination(data, paginationConfig, context) {
    const { defaultLimit, maxLimit } = paginationConfig;
    
    if (Array.isArray(data)) {
      return {
        data: data.slice(0, defaultLimit),
        pagination: {
          limit: defaultLimit,
          total: data.length,
          hasMore: data.length > defaultLimit
        }
      };
    }
    
    if (data.data && Array.isArray(data.data)) {
      const requestedLimit = Math.min(context.limit || defaultLimit, maxLimit);
      
      return {
        ...data,
        data: data.data.slice(0, requestedLimit),
        pagination: {
          ...data.pagination,
          limit: requestedLimit,
          hasMore: data.data.length > requestedLimit
        }
      };
    }
    
    return data;
  }
  
  optimizeFields(data, fieldMappings, resourceType) {
    const allowedFields = fieldMappings[resourceType];
    
    if (!allowedFields) {
      return data;
    }
    
    const filterFields = (item) => {
      if (!item || typeof item !== 'object') {
        return item;
      }
      
      const filtered = {};
      allowedFields.forEach(field => {
        if (item.hasOwnProperty(field)) {
          filtered[field] = item[field];
        }
      });
      
      return filtered;
    };
    
    if (Array.isArray(data)) {
      return data.map(filterFields);
    }
    
    if (data.data && Array.isArray(data.data)) {
      return {
        ...data,
        data: data.data.map(filterFields)
      };
    }
    
    return filterFields(data);
  }
  
  optimizeImages(data, deviceType) {
    const imageConfig = this.imageOptimizations[deviceType];
    
    const optimizeImageUrls = (obj) => {
      if (!obj || typeof obj !== 'object') {
        return obj;
      }
      
      if (Array.isArray(obj)) {
        return obj.map(optimizeImageUrls);
      }
      
      const optimized = {};
      
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string' && this.isImageUrl(value)) {
          optimized[key] = this.addImageOptimizationParams(value, imageConfig);
        } else if (typeof value === 'object') {
          optimized[key] = optimizeImageUrls(value);
        } else {
          optimized[key] = value;
        }
      }
      
      return optimized;
    };
    
    return optimizeImageUrls(data);
  }
  
  optimizeContent(data, deviceType) {
    if (deviceType !== this.deviceTypes.MOBILE) {
      return data;
    }
    
    const optimizeTextContent = (obj) => {
      if (!obj || typeof obj !== 'object') {
        return obj;
      }
      
      if (Array.isArray(obj)) {
        return obj.map(optimizeTextContent);
      }
      
      const optimized = {};
      
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
          // Truncate long text fields for mobile
          if (key === 'bio' || key === 'description') {
            optimized[key] = this.truncateText(value, 150);
          } else if (key === 'content' || key === 'message') {
            optimized[key] = this.truncateText(value, 300);
          } else {
            optimized[key] = value;
          }
        } else if (typeof value === 'object') {
          optimized[key] = optimizeTextContent(value);
        } else {
          optimized[key] = value;
        }
      }
      
      return optimized;
    };
    
    return optimizeTextContent(data);
  }
  
  // =============================================================================
  // MOBILE-SPECIFIC FEATURES
  // =============================================================================
  
  generateMobileManifest(appConfig = {}) {
    return {
      name: appConfig.name || 'Celebrity Booking Platform',
      short_name: appConfig.shortName || 'CelebBooking',
      description: appConfig.description || 'Book celebrities for your events',
      start_url: '/',
      display: 'standalone',
      background_color: appConfig.backgroundColor || '#ffffff',
      theme_color: appConfig.themeColor || '#000000',
      orientation: 'portrait',
      icons: [
        {
          src: '/icons/icon-72x72.png',
          sizes: '72x72',
          type: 'image/png'
        },
        {
          src: '/icons/icon-96x96.png',
          sizes: '96x96',
          type: 'image/png'
        },
        {
          src: '/icons/icon-128x128.png',
          sizes: '128x128',
          type: 'image/png'
        },
        {
          src: '/icons/icon-144x144.png',
          sizes: '144x144',
          type: 'image/png'
        },
        {
          src: '/icons/icon-152x152.png',
          sizes: '152x152',
          type: 'image/png'
        },
        {
          src: '/icons/icon-192x192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: '/icons/icon-384x384.png',
          sizes: '384x384',
          type: 'image/png'
        },
        {
          src: '/icons/icon-512x512.png',
          sizes: '512x512',
          type: 'image/png'
        }
      ]
    };
  }
  
  generatePushNotificationPayload(deviceType, notification) {
    const basePayload = {
      title: notification.title,
      body: notification.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: notification.tag || 'default',
      requireInteraction: notification.important || false
    };
    
    if (deviceType === this.deviceTypes.MOBILE) {
      return {
        ...basePayload,
        actions: notification.actions?.slice(0, 2) || [], // Limit to 2 actions on mobile
        vibrate: notification.urgent ? [200, 100, 200] : [100],
        silent: false
      };
    }
    
    return {
      ...basePayload,
      actions: notification.actions || [],
      silent: notification.silent || false
    };
  }
  
  // =============================================================================
  // PERFORMANCE OPTIMIZATIONS
  // =============================================================================
  
  async optimizeApiResponse(req, res, data, options = {}) {
    try {
      const deviceType = req.deviceType || this.detectDevice(req.get('User-Agent'), req.headers);
      
      // Add device type to request for middleware chain
      req.deviceType = deviceType;
      
      // Cache optimization settings
      const cacheKey = `mobile_optimization:${deviceType}:${req.path}`;
      let cachedOptimization = await cacheService.get(cacheKey);
      
      if (!cachedOptimization) {
        const deviceCapabilities = this.getDeviceCapabilities(deviceType);
        
        cachedOptimization = {
          deviceType,
          capabilities: deviceCapabilities,
          optimization: this.responseOptimizations[deviceType],
          timestamp: Date.now()
        };
        
        await cacheService.set(cacheKey, cachedOptimization, 300); // 5 minutes
      }
      
      // Apply optimizations
      const optimizedData = this.optimizeResponse(data, deviceType, {
        resourceType: options.resourceType,
        limit: req.query.limit,
        ...options
      });
      
      // Set mobile-specific headers
      this.setMobileHeaders(res, deviceType, cachedOptimization.capabilities);
      
      // Track mobile optimization metrics
      this.trackOptimizationMetrics(req, deviceType, {
        originalSize: JSON.stringify(data).length,
        optimizedSize: JSON.stringify(optimizedData).length
      });
      
      return optimizedData;
      
    } catch (error) {
      logger.error('API response optimization failed', error, {
        path: req.path,
        userAgent: req.get('User-Agent')
      });
      return data;
    }
  }
  
  setMobileHeaders(res, deviceType, capabilities) {
    // Set vary header for caching
    res.set('Vary', 'User-Agent, Accept, Accept-Encoding');
    
    // Set device-specific cache control
    if (deviceType === this.deviceTypes.MOBILE) {
      res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
    } else {
      res.set('Cache-Control', 'public, max-age=600, stale-while-revalidate=120');
    }
    
    // Set content hints
    res.set('X-Device-Type', deviceType);
    res.set('X-Mobile-Optimized', 'true');
    
    // Set service worker hints
    if (capabilities.supportsPush) {
      res.set('X-Supports-Push', 'true');
    }
    
    // Set performance hints
    if (capabilities.limitedBandwidth) {
      res.set('X-Bandwidth-Limited', 'true');
    }
  }
  
  // =============================================================================
  // UTILITY METHODS
  // =============================================================================
  
  isImageUrl(url) {
    if (typeof url !== 'string') {
      return false;
    }
    
    const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i;
    const imageHosts = ['cloudinary.com', 'images.unsplash.com', 'imgur.com'];
    
    return imageExtensions.test(url) || imageHosts.some(host => url.includes(host));
  }
  
  addImageOptimizationParams(url, config) {
    if (!url || typeof url !== 'string') {
      return url;
    }
    
    try {
      const urlObj = new URL(url);
      
      // Cloudinary optimization
      if (url.includes('cloudinary.com')) {
        const pathSegments = urlObj.pathname.split('/');
        const uploadIndex = pathSegments.indexOf('upload');
        
        if (uploadIndex !== -1) {
          const transformations = [
            `w_${config.maxWidth}`,
            `q_${config.quality}`,
            `f_${config.format}`,
            'c_scale'
          ].join(',');
          
          pathSegments.splice(uploadIndex + 1, 0, transformations);
          urlObj.pathname = pathSegments.join('/');
        }
      } else {
        // Generic optimization parameters
        urlObj.searchParams.set('w', config.maxWidth.toString());
        urlObj.searchParams.set('q', config.quality.toString());
        urlObj.searchParams.set('format', config.format);
      }
      
      return urlObj.toString();
    } catch (error) {
      logger.error('Image optimization failed', error, { url });
      return url;
    }
  }
  
  truncateText(text, maxLength) {
    if (!text || typeof text !== 'string' || text.length <= maxLength) {
      return text;
    }
    
    return text.substring(0, maxLength - 3) + '...';
  }
  
  trackOptimizationMetrics(req, deviceType, metrics) {
    try {
      const optimizationRatio = metrics.optimizedSize / metrics.originalSize;
      
      logger.info('Mobile optimization applied', {
        deviceType,
        path: req.path,
        originalSize: metrics.originalSize,
        optimizedSize: metrics.optimizedSize,
        compressionRatio: (1 - optimizationRatio) * 100,
        userAgent: req.get('User-Agent')
      });
      
      // Store metrics for analytics
      const metricsKey = `mobile_metrics:${deviceType}:${new Date().toISOString().split('T')[0]}`;
      this.updateMetricsCounter(metricsKey, {
        requests: 1,
        totalOriginalSize: metrics.originalSize,
        totalOptimizedSize: metrics.optimizedSize
      });
      
    } catch (error) {
      logger.error('Failed to track optimization metrics', error);
    }
  }
  
  async updateMetricsCounter(key, metrics) {
    try {
      const existing = await cacheService.get(key) || {
        requests: 0,
        totalOriginalSize: 0,
        totalOptimizedSize: 0
      };
      
      const updated = {
        requests: existing.requests + metrics.requests,
        totalOriginalSize: existing.totalOriginalSize + metrics.totalOriginalSize,
        totalOptimizedSize: existing.totalOptimizedSize + metrics.totalOptimizedSize,
        lastUpdate: new Date()
      };
      
      await cacheService.set(key, updated, 86400); // 24 hours
    } catch (error) {
      logger.error('Failed to update metrics counter', error);
    }
  }
  
  // =============================================================================
  // MIDDLEWARE METHODS
  // =============================================================================
  
  deviceDetectionMiddleware() {
    return (req, res, next) => {
      const deviceType = this.detectDevice(req.get('User-Agent'), req.headers);
      req.deviceType = deviceType;
      req.deviceCapabilities = this.getDeviceCapabilities(deviceType);
      
      next();
    };
  }
  
  responseOptimizationMiddleware() {
    return (req, res, next) => {
      const originalJson = res.json;
      
      res.json = async function(data) {
        if (req.deviceType && req.deviceType !== 'desktop') {
          const optimizedData = await req.app.locals.mobileOptimizationService
            .optimizeApiResponse(req, res, data, {
              resourceType: req.route?.path?.split('/')[1] // Extract resource type from path
            });
          
          return originalJson.call(this, optimizedData);
        }
        
        return originalJson.call(this, data);
      };
      
      next();
    };
  }
  
  // =============================================================================
  // PUBLIC API METHODS
  // =============================================================================
  
  async getMobileOptimizationStats() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const deviceTypes = [this.deviceTypes.MOBILE, this.deviceTypes.TABLET, this.deviceTypes.DESKTOP];
      
      const stats = {};
      
      for (const deviceType of deviceTypes) {
        const metricsKey = `mobile_metrics:${deviceType}:${today}`;
        const metrics = await cacheService.get(metricsKey);
        
        if (metrics) {
          stats[deviceType] = {
            requests: metrics.requests,
            averageCompressionRatio: ((metrics.totalOriginalSize - metrics.totalOptimizedSize) / metrics.totalOriginalSize) * 100,
            totalBandwidthSaved: metrics.totalOriginalSize - metrics.totalOptimizedSize,
            lastUpdate: metrics.lastUpdate
          };
        } else {
          stats[deviceType] = {
            requests: 0,
            averageCompressionRatio: 0,
            totalBandwidthSaved: 0,
            lastUpdate: null
          };
        }
      }
      
      return { success: true, stats };
      
    } catch (error) {
      logger.error('Failed to get mobile optimization stats', error);
      return { success: false, error: error.message };
    }
  }
  
  async healthCheck() {
    try {
      return {
        status: 'healthy',
        features: {
          deviceDetection: true,
          responseOptimization: true,
          imageOptimization: true,
          pushNotifications: true,
          pwaSupport: true
        },
        supportedDevices: Object.values(this.deviceTypes),
        optimizationTypes: Object.keys(this.responseOptimizations),
        timestamp: new Date()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date()
      };
    }
  }
}

module.exports = MobileOptimizationService;