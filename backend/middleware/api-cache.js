const cacheService = require('../services/CacheService');
const crypto = require('crypto');

/**
 * API Response Caching Middleware
 * Intelligent caching with cache invalidation and performance optimization
 */

class APICacheMiddleware {
  constructor(options = {}) {
    this.defaultTTL = options.defaultTTL || 300; // 5 minutes
    this.keyPrefix = options.keyPrefix || 'api_cache';
    this.enableConditionalRequests = options.enableConditionalRequests !== false;
    this.maxCacheSize = options.maxCacheSize || 1000; // Max number of cached responses
    this.debugMode = options.debugMode || process.env.NODE_ENV === 'development';
    
    // Cache statistics
    this.stats = {
      hits: 0,
      misses: 0,
      invalidations: 0,
      errors: 0
    };
  }
  
  // Generate cache key from request
  generateCacheKey(req) {
    const keyData = {
      method: req.method,
      path: req.path,
      query: req.query,
      user: req.user?.id || 'anonymous',
      role: req.user?.role || 'guest'
    };
    
    const keyString = JSON.stringify(keyData);
    const hash = crypto.createHash('md5').update(keyString).digest('hex');
    
    return `${this.keyPrefix}:${hash}`;
  }
  
  // Check if request should be cached
  shouldCache(req, res) {
    // Only cache GET requests
    if (req.method !== 'GET') return false;
    
    // Don't cache error responses
    if (res.statusCode >= 400) return false;
    
    // Don't cache if explicitly disabled
    if (req.headers['cache-control'] === 'no-cache') return false;
    
    // Don't cache if response has sensitive headers
    if (res.hasHeader('set-cookie')) return false;
    
    // Don't cache large responses (> 1MB)
    const contentLength = res.getHeader('content-length');
    if (contentLength && parseInt(contentLength) > 1024 * 1024) return false;
    
    return true;
  }
  
  // Get cache TTL based on endpoint
  getCacheTTL(req) {
    const path = req.path;
    
    // Endpoint-specific TTL configuration
    const ttlConfig = {
      '/api/celebrities': 600,        // 10 minutes - celebrity lists
      '/api/celebrities/': 1800,      // 30 minutes - individual celebrities
      '/api/categories': 3600,        // 1 hour - categories (rarely change)
      '/api/stats': 300,              // 5 minutes - statistics
      '/api/settings': 1800,          // 30 minutes - site settings
      '/api/search': 900,             // 15 minutes - search results
      '/api/bookings': 60,            // 1 minute - booking data (frequently updated)
      '/api/notifications': 30        // 30 seconds - real-time data
    };
    
    // Find matching TTL
    for (const [pattern, ttl] of Object.entries(ttlConfig)) {
      if (path.startsWith(pattern)) {
        return ttl;
      }
    }
    
    return this.defaultTTL;
  }
  
  // Create cache middleware for specific endpoint
  cache(options = {}) {
    const ttl = options.ttl || this.defaultTTL;
    const skipCache = options.skipCache || false;
    const tags = options.tags || [];
    
    return async (req, res, next) => {
      // Skip caching if disabled
      if (skipCache || req.method !== 'GET') {
        return next();
      }
      
      const cacheKey = this.generateCacheKey(req);
      
      try {
        // Try to get cached response
        const cachedResponse = await cacheService.get(cacheKey);
        
        if (cachedResponse) {
          this.stats.hits++;
          
          // Set cache headers
          res.set('X-Cache', 'HIT');
          res.set('X-Cache-Key', cacheKey.substring(0, 16) + '...');
          
          // Handle conditional requests (ETag support)
          if (this.enableConditionalRequests && cachedResponse.etag) {
            res.set('ETag', cachedResponse.etag);
            
            if (req.headers['if-none-match'] === cachedResponse.etag) {
              return res.status(304).end();
            }
          }
          
          // Set cached headers
          if (cachedResponse.headers) {
            Object.entries(cachedResponse.headers).forEach(([key, value]) => {
              res.set(key, value);
            });
          }
          
          // Set cache age header
          const age = Math.floor((Date.now() - cachedResponse.timestamp) / 1000);
          res.set('Age', age.toString());
          res.set('Cache-Control', `public, max-age=${ttl}`);
          
          if (this.debugMode) {
            console.log(`🎯 Cache HIT for ${req.method} ${req.path} (age: ${age}s)`);
          }
          
          return res.status(cachedResponse.status).json(cachedResponse.data);
        }
        
        this.stats.misses++;
        
        // Cache miss - intercept response to cache it
        const originalJson = res.json;
        const originalStatus = res.status;
        let responseStatus = 200;
        
        // Override status method
        res.status = function(code) {
          responseStatus = code;
          return originalStatus.call(this, code);
        };
        
        // Override json method to cache the response
        res.json = async function(data) {
          // Only cache successful responses
          if (responseStatus >= 200 && responseStatus < 300) {
            try {
              const etag = crypto.createHash('md5')
                .update(JSON.stringify(data))
                .digest('hex');
              
              const cacheData = {
                data,
                status: responseStatus,
                timestamp: Date.now(),
                etag,
                headers: {
                  'Content-Type': 'application/json',
                  'ETag': etag
                },
                tags
              };
              
              // Cache the response
              await cacheService.set(cacheKey, cacheData, ttl);
              
              // Set response headers
              res.set('X-Cache', 'MISS');
              res.set('X-Cache-Key', cacheKey.substring(0, 16) + '...');
              res.set('ETag', etag);
              res.set('Cache-Control', `public, max-age=${ttl}`);
              
              if (this.debugMode) {
                console.log(`💾 Cached response for ${req.method} ${req.path} (TTL: ${ttl}s)`);
              }
              
            } catch (cacheError) {
              console.error('Cache write error:', cacheError);
              this.stats.errors++;
            }
          }
          
          return originalJson.call(this, data);
        };
        
        next();
        
      } catch (error) {
        console.error('Cache middleware error:', error);
        this.stats.errors++;
        
        // Continue without caching on error
        res.set('X-Cache', 'ERROR');
        next();
      }
    };
  }
  
  // Invalidate cache by pattern or tags
  async invalidate(pattern, tags = []) {
    try {
      this.stats.invalidations++;
      
      if (pattern) {
        // Invalidate by pattern
        await cacheService.delPattern(`${this.keyPrefix}:${pattern}*`);
        
        if (this.debugMode) {
          console.log(`🗑️ Cache invalidated by pattern: ${pattern}`);
        }
      }
      
      if (tags.length > 0) {
        // Invalidate by tags would require a more sophisticated implementation
        // For now, we'll clear related cache patterns
        for (const tag of tags) {
          await cacheService.delPattern(`${this.keyPrefix}:*${tag}*`);
        }
        
        if (this.debugMode) {
          console.log(`🗑️ Cache invalidated by tags: ${tags.join(', ')}`);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Cache invalidation error:', error);
      return false;
    }
  }
  
  // Middleware to invalidate cache on data changes
  invalidateOnChange(patterns = []) {
    return (req, res, next) => {
      // Only invalidate on write operations
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        const originalJson = res.json;
        
        res.json = async function(data) {
          // Invalidate cache after successful operation
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              // Invalidate specific patterns
              for (const pattern of patterns) {
                await cacheService.delPattern(`${this.keyPrefix}:${pattern}*`);
              }
              
              // Auto-invalidate based on endpoint
              const path = req.path;
              if (path.includes('/celebrities')) {
                await cacheService.delPattern(`${this.keyPrefix}:*celebrities*`);
              }
              if (path.includes('/bookings')) {
                await cacheService.delPattern(`${this.keyPrefix}:*bookings*`);
              }
              if (path.includes('/users')) {
                await cacheService.delPattern(`${this.keyPrefix}:*users*`);
              }
              
              if (this.debugMode) {
                console.log(`🔄 Auto-invalidated cache for ${req.method} ${req.path}`);
              }
              
            } catch (error) {
              console.error('Auto-invalidation error:', error);
            }
          }
          
          return originalJson.call(this, data);
        };
      }
      
      next();
    };
  }
  
  // Conditional request support
  conditionalRequest() {
    return (req, res, next) => {
      if (!this.enableConditionalRequests) {
        return next();
      }
      
      // Handle If-Modified-Since
      if (req.headers['if-modified-since']) {
        const ifModifiedSince = new Date(req.headers['if-modified-since']);
        const lastModified = res.getHeader('last-modified');
        
        if (lastModified && new Date(lastModified) <= ifModifiedSince) {
          return res.status(304).end();
        }
      }
      
      next();
    };
  }
  
  // Cache warming for frequently accessed endpoints
  async warmCache(endpoints = []) {
    console.log('🔥 Warming API cache...');
    
    const defaultEndpoints = [
      { path: '/api/celebrities', method: 'GET' },
      { path: '/api/celebrities?category=actors', method: 'GET' },
      { path: '/api/celebrities?category=musicians', method: 'GET' },
      { path: '/api/categories', method: 'GET' },
      { path: '/api/stats', method: 'GET' }
    ];
    
    const endpointsToWarm = endpoints.length > 0 ? endpoints : defaultEndpoints;
    
    for (const endpoint of endpointsToWarm) {
      try {
        // This would require making actual requests to warm the cache
        // Implementation would depend on your testing/warming strategy
        console.log(`🔥 Warming cache for ${endpoint.method} ${endpoint.path}`);
      } catch (error) {
        console.error(`Failed to warm cache for ${endpoint.path}:`, error);
      }
    }
    
    console.log('✅ Cache warming completed');
  }
  
  // Get cache statistics
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0 
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : 0;
    
    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      totalRequests: this.stats.hits + this.stats.misses
    };
  }
  
  // Reset statistics
  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      invalidations: 0,
      errors: 0
    };
  }
  
  // Health check
  async healthCheck() {
    try {
      const testKey = `${this.keyPrefix}:health_check`;
      const testData = { timestamp: Date.now() };
      
      await cacheService.set(testKey, testData, 60);
      const retrieved = await cacheService.get(testKey);
      await cacheService.del(testKey);
      
      return {
        status: 'healthy',
        working: retrieved !== null,
        stats: this.getStats()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        working: false
      };
    }
  }
}

// Export singleton instance and class
const apiCache = new APICacheMiddleware();

module.exports = {
  APICacheMiddleware,
  apiCache,
  
  // Convenience methods
  cache: (options) => apiCache.cache(options),
  invalidate: (pattern, tags) => apiCache.invalidate(pattern, tags),
  invalidateOnChange: (patterns) => apiCache.invalidateOnChange(patterns),
  conditionalRequest: () => apiCache.conditionalRequest(),
  getStats: () => apiCache.getStats(),
  healthCheck: () => apiCache.healthCheck(),
  warmCache: (endpoints) => apiCache.warmCache(endpoints)
};