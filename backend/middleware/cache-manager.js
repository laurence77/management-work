const Redis = require('redis');
const { logger } = require('../utils/logger');

/**
 * Comprehensive Caching Manager
 * Implements multi-tier caching with Redis and in-memory fallback
 */

class CacheManager {
  constructor() {
    this.redisClient = null;
    this.memoryCache = new Map();
    this.isRedisConnected = false;
    this.maxMemoryCacheSize = 1000; // Max items in memory cache
    this.defaultTTL = 300; // 5 minutes default TTL
    
    // Cache key prefixes for organization
    this.keyPrefixes = {
      CELEBRITIES: 'celebrities:',
      EVENTS: 'events:',
      VENUES: 'venues:',
      SETTINGS: 'settings:',
      ANALYTICS: 'analytics:',
      USER_SESSIONS: 'sessions:',
      RATE_LIMITS: 'rate_limits:',
      SEARCH: 'search:',
      CATEGORIES: 'categories:',
      AVAILABILITY: 'availability:'
    };
    
    // Cache TTL configurations (in seconds)
    this.cacheTTLs = {
      CELEBRITIES_LIST: 300, // 5 minutes
      CELEBRITY_DETAIL: 600, // 10 minutes
      EVENTS_LIST: 180, // 3 minutes
      EVENT_DETAIL: 300, // 5 minutes
      VENUES_LIST: 900, // 15 minutes
      SETTINGS: 1800, // 30 minutes
      ANALYTICS_DASHBOARD: 300, // 5 minutes
      SEARCH_RESULTS: 120, // 2 minutes
      CATEGORIES: 3600, // 1 hour
      AVAILABILITY: 60, // 1 minute
      USER_PROFILE: 600, // 10 minutes
      RATE_LIMIT_DATA: 900 // 15 minutes
    };
    
    this.initializeRedis();
  }

  /**
   * Initialize Redis connection with fallback to memory cache
   */
  async initializeRedis() {
    try {
      if (process.env.REDIS_URL) {
        this.redisClient = Redis.createClient({
          url: process.env.REDIS_URL,
          retry_strategy: (options) => {
            if (options.error && options.error.code === 'ECONNREFUSED') {
              logger.warn('Redis connection refused, falling back to memory cache');
              return null;
            }
            if (options.attempt > 3) {
              logger.warn('Redis max retry attempts reached, falling back to memory cache');
              return null;
            }
            return Math.min(options.attempt * 100, 3000);
          }
        });

        this.redisClient.on('connect', () => {
          this.isRedisConnected = true;
          logger.info('Redis cache connected successfully');
        });

        this.redisClient.on('error', (error) => {
          this.isRedisConnected = false;
          logger.warn('Redis connection error, using memory cache fallback:', error.message);
        });

        this.redisClient.on('end', () => {
          this.isRedisConnected = false;
          logger.warn('Redis connection ended, using memory cache fallback');
        });

        await this.redisClient.connect();
      } else {
        logger.info('No Redis URL provided, using memory cache only');
      }
    } catch (error) {
      this.isRedisConnected = false;
      logger.warn('Failed to initialize Redis, using memory cache fallback:', error.message);
    }
  }

  /**
   * Generate cache key with prefix and organization context
   */
  generateKey(prefix, identifier, organizationId = null) {
    const orgSuffix = organizationId ? `:org:${organizationId}` : '';
    return `${prefix}${identifier}${orgSuffix}`;
  }

  /**
   * Get cached data with fallback chain
   */
  async get(key) {
    try {
      // Try Redis first if available
      if (this.isRedisConnected && this.redisClient) {
        const result = await this.redisClient.get(key);
        if (result !== null) {
          logger.debug('Cache hit (Redis):', { key });
          return JSON.parse(result);
        }
      }

      // Fallback to memory cache
      if (this.memoryCache.has(key)) {
        const cached = this.memoryCache.get(key);
        if (cached.expiry > Date.now()) {
          logger.debug('Cache hit (Memory):', { key });
          return cached.data;
        } else {
          // Remove expired entry
          this.memoryCache.delete(key);
        }
      }

      logger.debug('Cache miss:', { key });
      return null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set cached data with TTL
   */
  async set(key, data, ttl = this.defaultTTL) {
    try {
      const serializedData = JSON.stringify(data);

      // Try Redis first if available
      if (this.isRedisConnected && this.redisClient) {
        await this.redisClient.setEx(key, ttl, serializedData);
        logger.debug('Cache set (Redis):', { key, ttl });
      }

      // Always set in memory cache as backup
      this.setMemoryCache(key, data, ttl);
      
    } catch (error) {
      logger.error('Cache set error:', error);
      // Ensure memory cache is set even if Redis fails
      this.setMemoryCache(key, data, ttl);
    }
  }

  /**
   * Set data in memory cache with size management
   */
  setMemoryCache(key, data, ttl) {
    try {
      // Remove oldest entries if cache is full
      if (this.memoryCache.size >= this.maxMemoryCacheSize) {
        const oldestKey = this.memoryCache.keys().next().value;
        this.memoryCache.delete(oldestKey);
      }

      this.memoryCache.set(key, {
        data,
        expiry: Date.now() + (ttl * 1000)
      });

      logger.debug('Cache set (Memory):', { key, ttl });
    } catch (error) {
      logger.error('Memory cache set error:', error);
    }
  }

  /**
   * Delete cached data
   */
  async delete(key) {
    try {
      // Delete from Redis
      if (this.isRedisConnected && this.redisClient) {
        await this.redisClient.del(key);
      }

      // Delete from memory cache
      this.memoryCache.delete(key);
      
      logger.debug('Cache deleted:', { key });
    } catch (error) {
      logger.error('Cache delete error:', error);
    }
  }

  /**
   * Delete all cached data matching a pattern
   */
  async deletePattern(pattern) {
    try {
      // Redis pattern deletion
      if (this.isRedisConnected && this.redisClient) {
        const keys = await this.redisClient.keys(pattern);
        if (keys.length > 0) {
          await this.redisClient.del(keys);
          logger.debug('Cache pattern deleted (Redis):', { pattern, count: keys.length });
        }
      }

      // Memory cache pattern deletion
      const memoryKeys = Array.from(this.memoryCache.keys());
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      const matchingKeys = memoryKeys.filter(key => regex.test(key));
      
      matchingKeys.forEach(key => this.memoryCache.delete(key));
      
      if (matchingKeys.length > 0) {
        logger.debug('Cache pattern deleted (Memory):', { pattern, count: matchingKeys.length });
      }
    } catch (error) {
      logger.error('Cache delete pattern error:', error);
    }
  }

  /**
   * Cache middleware for Express routes
   */
  middleware(options = {}) {
    const {
      keyGenerator = (req) => `${req.method}:${req.originalUrl}`,
      ttl = this.defaultTTL,
      condition = () => true,
      skipCache = false
    } = options;

    return async (req, res, next) => {
      if (skipCache || !condition(req)) {
        return next();
      }

      try {
        const cacheKey = keyGenerator(req);
        
        // Try to get cached response
        const cachedData = await this.get(cacheKey);
        if (cachedData && cachedData.statusCode && cachedData.data) {
          logger.debug('Serving cached response:', { cacheKey });
          res.setHeader('X-Cache', 'HIT');
          res.setHeader('X-Cache-Key', cacheKey);
          return res.status(cachedData.statusCode).json(cachedData.data);
        }

        // Store original res.json function
        const originalJson = res.json;
        
        // Override res.json to cache the response
        res.json = function(data) {
          // Cache successful responses only
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const cacheData = {
              statusCode: res.statusCode,
              data: data,
              timestamp: new Date().toISOString()
            };
            
            // Cache asynchronously to avoid blocking response
            cacheManager.set(cacheKey, cacheData, ttl).catch(error => {
              logger.error('Cache set error in middleware:', error);
            });
          }
          
          res.setHeader('X-Cache', 'MISS');
          res.setHeader('X-Cache-Key', cacheKey);
          return originalJson.call(this, data);
        };

        next();
      } catch (error) {
        logger.error('Cache middleware error:', error);
        next();
      }
    };
  }

  /**
   * Specialized cache methods for common use cases
   */

  // Celebrity caching
  async getCelebrityList(organizationId, filters = {}) {
    const key = this.generateKey(
      this.keyPrefixes.CELEBRITIES, 
      `list:${JSON.stringify(filters)}`, 
      organizationId
    );
    return await this.get(key);
  }

  async setCelebrityList(organizationId, filters, data) {
    const key = this.generateKey(
      this.keyPrefixes.CELEBRITIES, 
      `list:${JSON.stringify(filters)}`, 
      organizationId
    );
    return await this.set(key, data, this.cacheTTLs.CELEBRITIES_LIST);
  }

  async getCelebrity(celebrityId, organizationId) {
    const key = this.generateKey(
      this.keyPrefixes.CELEBRITIES, 
      celebrityId, 
      organizationId
    );
    return await this.get(key);
  }

  async setCelebrity(celebrityId, organizationId, data) {
    const key = this.generateKey(
      this.keyPrefixes.CELEBRITIES, 
      celebrityId, 
      organizationId
    );
    return await this.set(key, data, this.cacheTTLs.CELEBRITY_DETAIL);
  }

  async invalidateCelebrity(celebrityId, organizationId) {
    // Invalidate specific celebrity
    const specificKey = this.generateKey(
      this.keyPrefixes.CELEBRITIES, 
      celebrityId, 
      organizationId
    );
    await this.delete(specificKey);

    // Invalidate celebrity lists
    const listPattern = this.generateKey(
      this.keyPrefixes.CELEBRITIES, 
      'list:*', 
      organizationId
    );
    await this.deletePattern(listPattern);
  }

  // Events caching
  async getEventsList(organizationId, filters = {}) {
    const key = this.generateKey(
      this.keyPrefixes.EVENTS, 
      `list:${JSON.stringify(filters)}`, 
      organizationId
    );
    return await this.get(key);
  }

  async setEventsList(organizationId, filters, data) {
    const key = this.generateKey(
      this.keyPrefixes.EVENTS, 
      `list:${JSON.stringify(filters)}`, 
      organizationId
    );
    return await this.set(key, data, this.cacheTTLs.EVENTS_LIST);
  }

  async invalidateEvents(organizationId) {
    const pattern = this.generateKey(this.keyPrefixes.EVENTS, '*', organizationId);
    await this.deletePattern(pattern);
  }

  // Settings caching
  async getSettings(organizationId) {
    const key = this.generateKey(this.keyPrefixes.SETTINGS, 'all', organizationId);
    return await this.get(key);
  }

  async setSettings(organizationId, data) {
    const key = this.generateKey(this.keyPrefixes.SETTINGS, 'all', organizationId);
    return await this.set(key, data, this.cacheTTLs.SETTINGS);
  }

  async invalidateSettings(organizationId) {
    const pattern = this.generateKey(this.keyPrefixes.SETTINGS, '*', organizationId);
    await this.deletePattern(pattern);
  }

  // Analytics caching
  async getAnalytics(type, organizationId, params = {}) {
    const key = this.generateKey(
      this.keyPrefixes.ANALYTICS, 
      `${type}:${JSON.stringify(params)}`, 
      organizationId
    );
    return await this.get(key);
  }

  async setAnalytics(type, organizationId, params, data) {
    const key = this.generateKey(
      this.keyPrefixes.ANALYTICS, 
      `${type}:${JSON.stringify(params)}`, 
      organizationId
    );
    return await this.set(key, data, this.cacheTTLs.ANALYTICS_DASHBOARD);
  }

  async invalidateAnalytics(organizationId) {
    const pattern = this.generateKey(this.keyPrefixes.ANALYTICS, '*', organizationId);
    await this.deletePattern(pattern);
  }

  // Search results caching
  async getSearchResults(query, filters, organizationId) {
    const key = this.generateKey(
      this.keyPrefixes.SEARCH, 
      `${query}:${JSON.stringify(filters)}`, 
      organizationId
    );
    return await this.get(key);
  }

  async setSearchResults(query, filters, organizationId, data) {
    const key = this.generateKey(
      this.keyPrefixes.SEARCH, 
      `${query}:${JSON.stringify(filters)}`, 
      organizationId
    );
    return await this.set(key, data, this.cacheTTLs.SEARCH_RESULTS);
  }

  /**
   * Cache invalidation helpers
   */
  async invalidateUserRelatedData(userId) {
    await this.deletePattern(`*:user:${userId}:*`);
  }

  async invalidateOrganizationData(organizationId) {
    await this.deletePattern(`*:org:${organizationId}`);
  }

  async clearAllCache() {
    try {
      if (this.isRedisConnected && this.redisClient) {
        await this.redisClient.flushAll();
      }
      this.memoryCache.clear();
      logger.info('All cache cleared');
    } catch (error) {
      logger.error('Clear all cache error:', error);
    }
  }

  /**
   * Cache statistics and monitoring
   */
  async getStats() {
    const stats = {
      redis: {
        connected: this.isRedisConnected,
        keyCount: 0
      },
      memory: {
        keyCount: this.memoryCache.size,
        maxSize: this.maxMemoryCacheSize
      },
      hitRate: 0 // Would need to implement hit/miss tracking
    };

    try {
      if (this.isRedisConnected && this.redisClient) {
        const info = await this.redisClient.info('keyspace');
        const keyMatch = info.match(/keys=(\d+)/);
        stats.redis.keyCount = keyMatch ? parseInt(keyMatch[1]) : 0;
      }
    } catch (error) {
      logger.error('Cache stats error:', error);
    }

    return stats;
  }

  /**
   * Cleanup expired entries from memory cache
   */
  cleanupMemoryCache() {
    const now = Date.now();
    for (const [key, value] of this.memoryCache.entries()) {
      if (value.expiry <= now) {
        this.memoryCache.delete(key);
      }
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    try {
      if (this.redisClient) {
        await this.redisClient.disconnect();
        logger.info('Redis cache disconnected');
      }
      this.memoryCache.clear();
    } catch (error) {
      logger.error('Cache shutdown error:', error);
    }
  }
}

// Create singleton instance
const cacheManager = new CacheManager();

// Cleanup memory cache every 5 minutes
setInterval(() => {
  cacheManager.cleanupMemoryCache();
}, 5 * 60 * 1000);

module.exports = {
  CacheManager,
  cacheManager
};