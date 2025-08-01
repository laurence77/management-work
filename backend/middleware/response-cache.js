const { cacheManager } = require('./cache-manager');
const { logger } = require('../utils/logger');

/**
 * Response Caching Middleware
 * Provides intelligent caching for API responses with cache control headers
 */

class ResponseCache {
  constructor() {
    this.cacheConfigs = {
      // Celebrity endpoints
      'GET:/api/celebrities': {
        ttl: 300, // 5 minutes
        keyGenerator: (req) => `celebrities:list:${JSON.stringify(req.query)}:org:${req.user?.organization_id}`,
        condition: (req) => !req.user?.role?.includes('admin'), // Don't cache for admins
        varyHeaders: ['Authorization']
      },
      'GET:/api/celebrities/:id': {
        ttl: 600, // 10 minutes
        keyGenerator: (req) => `celebrity:${req.params.id}:org:${req.user?.organization_id}`,
        condition: (req) => true,
        varyHeaders: ['Authorization']
      },
      
      // Events endpoints
      'GET:/api/events': {
        ttl: 180, // 3 minutes
        keyGenerator: (req) => `events:list:${JSON.stringify(req.query)}:org:${req.user?.organization_id}`,
        condition: (req) => req.query.status !== 'draft',
        varyHeaders: ['Authorization']
      },
      'GET:/api/events/:id': {
        ttl: 300, // 5 minutes
        keyGenerator: (req) => `event:${req.params.id}:org:${req.user?.organization_id}`,
        condition: (req) => true,
        varyHeaders: ['Authorization']
      },
      
      // Venues endpoints
      'GET:/api/venues': {
        ttl: 900, // 15 minutes
        keyGenerator: (req) => `venues:list:${JSON.stringify(req.query)}:org:${req.user?.organization_id}`,
        condition: (req) => true,
        varyHeaders: ['Authorization']
      },
      
      // Settings endpoints (public settings only)
      'GET:/api/settings/public': {
        ttl: 1800, // 30 minutes
        keyGenerator: (req) => `settings:public:org:${req.user?.organization_id || 'default'}`,
        condition: (req) => true,
        varyHeaders: []
      },
      
      // Analytics endpoints (cached with shorter TTL)
      'GET:/api/analytics/dashboard': {
        ttl: 300, // 5 minutes
        keyGenerator: (req) => `analytics:dashboard:${JSON.stringify(req.query)}:org:${req.user?.organization_id}`,
        condition: (req) => req.user?.role === 'admin',
        varyHeaders: ['Authorization']
      },
      'GET:/api/analytics/celebrities': {
        ttl: 600, // 10 minutes
        keyGenerator: (req) => `analytics:celebrities:${JSON.stringify(req.query)}:org:${req.user?.organization_id}`,
        condition: (req) => req.user?.role === 'admin',
        varyHeaders: ['Authorization']
      },
      
      // Search endpoints
      'GET:/api/search/celebrities': {
        ttl: 120, // 2 minutes
        keyGenerator: (req) => `search:celebrities:${req.query.q}:${JSON.stringify(req.query.filters)}:org:${req.user?.organization_id}`,
        condition: (req) => req.query.q && req.query.q.length > 2,
        varyHeaders: ['Authorization']
      },
      
      // Category and static data
      'GET:/api/categories': {
        ttl: 3600, // 1 hour
        keyGenerator: (req) => `categories:all:org:${req.user?.organization_id || 'default'}`,
        condition: (req) => true,
        varyHeaders: []
      }
    };
  }

  /**
   * Get cache configuration for a route
   */
  getCacheConfig(method, path) {
    // Convert path with parameters to pattern
    const routePattern = path.replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id');
    const key = `${method}:${routePattern}`;
    
    return this.cacheConfigs[key] || null;
  }

  /**
   * Generate cache key with parameter substitution
   */
  generateCacheKey(config, req) {
    if (typeof config.keyGenerator === 'function') {
      return config.keyGenerator(req);
    }
    
    // Default key generation
    return `${req.method}:${req.originalUrl}:user:${req.user?.id || 'anonymous'}`;
  }

  /**
   * Check if request should be cached
   */
  shouldCache(config, req, res) {
    // Don't cache if no config
    if (!config) return false;
    
    // Don't cache errors
    if (res.statusCode >= 400) return false;
    
    // Don't cache if condition fails
    if (config.condition && !config.condition(req)) return false;
    
    // Don't cache if request has cache-control: no-cache
    const cacheControl = req.get('Cache-Control');
    if (cacheControl && cacheControl.includes('no-cache')) return false;
    
    return true;
  }

  /**
   * Set cache control headers
   */
  setCacheHeaders(res, config, cached = false) {
    if (cached) {
      res.set({
        'X-Cache': 'HIT',
        'Cache-Control': `public, max-age=${config.ttl}`,
        'Expires': new Date(Date.now() + (config.ttl * 1000)).toUTCString()
      });
    } else {
      res.set({
        'X-Cache': 'MISS',
        'Cache-Control': `public, max-age=${config.ttl}`,
        'Expires': new Date(Date.now() + (config.ttl * 1000)).toUTCString()
      });
    }
    
    // Set Vary headers
    if (config.varyHeaders && config.varyHeaders.length > 0) {
      res.set('Vary', config.varyHeaders.join(', '));
    }
  }

  /**
   * Cache middleware factory
   */
  middleware() {
    return async (req, res, next) => {
      try {
        const config = this.getCacheConfig(req.method, req.route?.path || req.path);
        
        if (!config) {
          return next();
        }
        
        const cacheKey = this.generateCacheKey(config, req);
        
        // Try to get cached response
        const cachedData = await cacheManager.get(cacheKey);
        
        if (cachedData && cachedData.data) {
          this.setCacheHeaders(res, config, true);
          logger.debug('Serving cached response', { 
            cacheKey, 
            endpoint: `${req.method}:${req.originalUrl}`,
            age: Math.floor((Date.now() - new Date(cachedData.timestamp).getTime()) / 1000)
          });
          
          return res.status(cachedData.statusCode || 200).json(cachedData.data);
        }
        
        // Store original res.json
        const originalJson = res.json;
        
        // Override res.json to cache the response
        res.json = function(data) {
          // Check if we should cache this response
          if (responseCache.shouldCache(config, req, res)) {
            const cacheData = {
              data: data,
              statusCode: res.statusCode,
              timestamp: new Date().toISOString()
            };
            
            // Cache asynchronously
            cacheManager.set(cacheKey, cacheData, config.ttl).catch(error => {
              logger.error('Failed to cache response:', error);
            });
            
            responseCache.setCacheHeaders(res, config, false);
          }
          
          return originalJson.call(this, data);
        };
        
        next();
        
      } catch (error) {
        logger.error('Response cache middleware error:', error);
        next();
      }
    };
  }

  /**
   * Cache invalidation middleware for write operations
   */
  invalidationMiddleware() {
    return async (req, res, next) => {
      // Store original methods
      const originalJson = res.json;
      const originalSend = res.send;
      
      // Override response methods to trigger cache invalidation
      const triggerInvalidation = async () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          await this.invalidateRelatedCaches(req);
        }
      };
      
      res.json = function(data) {
        triggerInvalidation();
        return originalJson.call(this, data);
      };
      
      res.send = function(data) {
        triggerInvalidation();
        return originalSend.call(this, data);
      };
      
      next();
    };
  }

  /**
   * Invalidate related caches based on the request
   */
  async invalidateRelatedCaches(req) {
    try {
      const { method, path } = req;
      const organizationId = req.user?.organization_id;
      
      // Celebrity-related invalidations
      if (path.includes('/celebrities')) {
        await cacheManager.invalidateCelebrity(req.params.id, organizationId);
        await cacheManager.deletePattern(`celebrities:list:*:org:${organizationId}`);
        await cacheManager.deletePattern(`search:celebrities:*:org:${organizationId}`);
        await cacheManager.deletePattern(`analytics:celebrities:*:org:${organizationId}`);
        
        logger.debug('Invalidated celebrity caches', { organizationId, celebrityId: req.params.id });
      }
      
      // Event-related invalidations
      if (path.includes('/events')) {
        await cacheManager.invalidateEvents(organizationId);
        await cacheManager.deletePattern(`analytics:*:org:${organizationId}`);
        
        logger.debug('Invalidated event caches', { organizationId });
      }
      
      // Settings invalidations
      if (path.includes('/settings')) {
        await cacheManager.invalidateSettings(organizationId);
        
        logger.debug('Invalidated settings caches', { organizationId });
      }
      
      // Booking-related invalidations (affects analytics)
      if (path.includes('/bookings')) {
        await cacheManager.deletePattern(`analytics:*:org:${organizationId}`);
        await cacheManager.deletePattern(`celebrity:*:org:${organizationId}`); // Celebrity stats may change
        
        logger.debug('Invalidated booking-related caches', { organizationId });
      }
      
      // User-related invalidations
      if (path.includes('/users') || path.includes('/auth')) {
        if (req.params.id) {
          await cacheManager.invalidateUserRelatedData(req.params.id);
        }
        
        logger.debug('Invalidated user-related caches', { userId: req.params.id });
      }
      
    } catch (error) {
      logger.error('Cache invalidation error:', error);
    }
  }

  /**
   * Cache warming - preload frequently accessed data
   */
  async warmCache(organizationId) {
    try {
      logger.info('Starting cache warming', { organizationId });
      
      // Warm celebrity lists (common filters)
      const commonFilters = [
        {},
        { category: 'actor' },
        { category: 'musician' },
        { is_featured: true },
        { is_available: true }
      ];
      
      for (const filters of commonFilters) {
        const key = `celebrities:list:${JSON.stringify(filters)}:org:${organizationId}`;
        // This would typically make actual API calls to warm the cache
        // For now, we just ensure the cache keys are ready
        logger.debug('Cache warming key prepared', { key });
      }
      
      logger.info('Cache warming completed', { organizationId });
      
    } catch (error) {
      logger.error('Cache warming error:', error);
    }
  }

  /**
   * Conditional cache middleware - only cache for specific conditions
   */
  conditionalCache(conditions = {}) {
    return (req, res, next) => {
      const {
        methods = ['GET'],
        roles = [],
        excludePaths = [],
        requireAuth = false
      } = conditions;
      
      // Check method
      if (!methods.includes(req.method)) {
        return next();
      }
      
      // Check excluded paths
      if (excludePaths.some(path => req.originalUrl.includes(path))) {
        return next();
      }
      
      // Check authentication requirement
      if (requireAuth && !req.user) {
        return next();
      }
      
      // Check user roles
      if (roles.length > 0 && (!req.user || !roles.includes(req.user.role))) {
        return next();
      }
      
      // Apply caching
      return this.middleware()(req, res, next);
    };
  }

  /**
   * Cache statistics for monitoring
   */
  async getStats() {
    const stats = await cacheManager.getStats();
    
    return {
      ...stats,
      configurations: Object.keys(this.cacheConfigs).length,
      averageTTL: Object.values(this.cacheConfigs).reduce((sum, config) => sum + config.ttl, 0) / Object.keys(this.cacheConfigs).length
    };
  }

  /**
   * Manual cache operations for admin use
   */
  async adminClearCache(pattern = '*') {
    if (pattern === '*') {
      await cacheManager.clearAllCache();
      logger.info('Admin cleared all cache');
    } else {
      await cacheManager.deletePattern(pattern);
      logger.info('Admin cleared cache pattern', { pattern });
    }
  }
}

// Create singleton instance
const responseCache = new ResponseCache();

module.exports = {
  ResponseCache,
  responseCache
};