const redis = require('redis');
require('dotenv').config();

/**
 * Redis Cache Service
 * High-performance caching for frequently accessed data
 */

class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.defaultTTL = 3600; // 1 hour default
    
    this.initializeRedis();
  }
  
  async initializeRedis() {
    try {
      // Redis configuration
      const redisConfig = {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            console.log('Redis server connection refused.');
            return new Error('Redis server connection refused');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            return new Error('Redis retry time exhausted');
          }
          if (options.attempt > 10) {
            return undefined;
          }
          return Math.min(options.attempt * 100, 3000);
        }
      };
      
      this.client = redis.createClient(redisConfig);
      
      this.client.on('connect', () => {
        console.log('🔗 Redis client connected');
        this.isConnected = true;
      });
      
      this.client.on('error', (err) => {
        console.log('❌ Redis client error:', err);
        this.isConnected = false;
      });
      
      this.client.on('end', () => {
        console.log('🔌 Redis client disconnected');
        this.isConnected = false;
      });
      
      await this.client.connect();
    } catch (error) {
      console.log('⚠️ Redis not available, falling back to in-memory cache');
      this.initializeMemoryCache();
    }
  }
  
  // Fallback in-memory cache when Redis is not available
  initializeMemoryCache() {
    this.memoryCache = new Map();
    this.cacheTTL = new Map();
    
    // Clean expired entries every 5 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [key, expiry] of this.cacheTTL.entries()) {
        if (now > expiry) {
          this.memoryCache.delete(key);
          this.cacheTTL.delete(key);
        }
      }
    }, 300000);
  }
  
  // Generate cache key with namespace
  generateKey(namespace, identifier) {
    return `celeb_booking:${namespace}:${identifier}`;
  }
  
  // Set cache value
  async set(key, value, ttl = this.defaultTTL) {
    try {
      const serializedValue = JSON.stringify(value);
      
      if (this.isConnected && this.client) {
        await this.client.setEx(key, ttl, serializedValue);
        return true;
      } else {
        // Fallback to memory cache
        this.memoryCache.set(key, serializedValue);
        this.cacheTTL.set(key, Date.now() + (ttl * 1000));
        return true;
      }
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }
  
  // Get cache value
  async get(key) {
    try {
      let value = null;
      
      if (this.isConnected && this.client) {
        value = await this.client.get(key);
      } else {
        // Fallback to memory cache
        const now = Date.now();
        const expiry = this.cacheTTL.get(key);
        
        if (expiry && now <= expiry) {
          value = this.memoryCache.get(key);
        } else {
          this.memoryCache.delete(key);
          this.cacheTTL.delete(key);
        }
      }
      
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }
  
  // Delete cache entry
  async del(key) {
    try {
      if (this.isConnected && this.client) {
        await this.client.del(key);
      } else {
        this.memoryCache.delete(key);
        this.cacheTTL.delete(key);
      }
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }
  
  // Delete multiple keys by pattern
  async delPattern(pattern) {
    try {
      if (this.isConnected && this.client) {
        const keys = await this.client.keys(pattern);
        if (keys.length > 0) {
          await this.client.del(keys);
        }
      } else {
        // Memory cache pattern deletion
        const regex = new RegExp(pattern.replace('*', '.*'));
        for (const key of this.memoryCache.keys()) {
          if (regex.test(key)) {
            this.memoryCache.delete(key);
            this.cacheTTL.delete(key);
          }
        }
      }
      return true;
    } catch (error) {
      console.error('Cache pattern delete error:', error);
      return false;
    }
  }
  
  // Check if key exists
  async exists(key) {
    try {
      if (this.isConnected && this.client) {
        return await this.client.exists(key);
      } else {
        const now = Date.now();
        const expiry = this.cacheTTL.get(key);
        return expiry && now <= expiry && this.memoryCache.has(key);
      }
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }
  
  // Increment value (useful for counters)
  async incr(key, ttl = this.defaultTTL) {
    try {
      if (this.isConnected && this.client) {
        const result = await this.client.incr(key);
        await this.client.expire(key, ttl);
        return result;
      } else {
        const current = this.memoryCache.get(key) || '0';
        const newValue = (parseInt(current) + 1).toString();
        this.memoryCache.set(key, newValue);
        this.cacheTTL.set(key, Date.now() + (ttl * 1000));
        return parseInt(newValue);
      }
    } catch (error) {
      console.error('Cache increment error:', error);
      return null;
    }
  }
  
  // High-level cache methods for common use cases
  
  // Cache celebrity data
  async setCelebrity(celebrityId, celebrityData, ttl = 1800) { // 30 minutes
    const key = this.generateKey('celebrity', celebrityId);
    return await this.set(key, celebrityData, ttl);
  }
  
  async getCelebrity(celebrityId) {
    const key = this.generateKey('celebrity', celebrityId);
    return await this.get(key);
  }
  
  async invalidateCelebrity(celebrityId) {
    const key = this.generateKey('celebrity', celebrityId);
    await this.del(key);
    // Also invalidate celebrity list caches
    await this.delPattern('celeb_booking:celebrities:*');
  }
  
  // Cache celebrity lists
  async setCelebrityList(category, page, limit, data, ttl = 600) { // 10 minutes
    const key = this.generateKey('celebrities', `${category}_${page}_${limit}`);
    return await this.set(key, data, ttl);
  }
  
  async getCelebrityList(category, page, limit) {
    const key = this.generateKey('celebrities', `${category}_${page}_${limit}`);
    return await this.get(key);
  }
  
  // Cache booking data
  async setBooking(bookingId, bookingData, ttl = 900) { // 15 minutes
    const key = this.generateKey('booking', bookingId);
    return await this.set(key, bookingData, ttl);
  }
  
  async getBooking(bookingId) {
    const key = this.generateKey('booking', bookingId);
    return await this.get(key);
  }
  
  async invalidateBooking(bookingId) {
    const key = this.generateKey('booking', bookingId);
    await this.del(key);
    // Also invalidate booking list caches
    await this.delPattern('celeb_booking:bookings:*');
  }
  
  // Cache user data
  async setUser(userId, userData, ttl = 1800) { // 30 minutes
    const key = this.generateKey('user', userId);
    return await this.set(key, userData, ttl);
  }
  
  async getUser(userId) {
    const key = this.generateKey('user', userId);
    return await this.get(key);
  }
  
  async invalidateUser(userId) {
    const key = this.generateKey('user', userId);
    await this.del(key);
  }
  
  // Cache statistics and analytics
  async setStats(statType, data, ttl = 300) { // 5 minutes for stats
    const key = this.generateKey('stats', statType);
    return await this.set(key, data, ttl);
  }
  
  async getStats(statType) {
    const key = this.generateKey('stats', statType);
    return await this.get(key);
  }
  
  // Session management
  async setSession(sessionId, sessionData, ttl = 86400) { // 24 hours
    const key = this.generateKey('session', sessionId);
    return await this.set(key, sessionData, ttl);
  }
  
  async getSession(sessionId) {
    const key = this.generateKey('session', sessionId);
    return await this.get(key);
  }
  
  async invalidateSession(sessionId) {
    const key = this.generateKey('session', sessionId);
    await this.del(key);
  }
  
  // Rate limiting
  async checkRateLimit(identifier, limit, window) {
    const key = this.generateKey('ratelimit', identifier);
    const current = await this.incr(key, window);
    return {
      current,
      limit,
      remaining: Math.max(0, limit - current),
      exceeded: current > limit
    };
  }
  
  // Cache warming - preload frequently accessed data
  async warmCache() {
    try {
      console.log('🔥 Warming cache with frequently accessed data...');
      
      // This would typically load popular celebrities, recent bookings, etc.
      // Implementation depends on your specific business logic
      
      console.log('✅ Cache warming completed');
    } catch (error) {
      console.error('Cache warming failed:', error);
    }
  }
  
  // Get cache statistics
  async getStats() {
    try {
      if (this.isConnected && this.client) {
        const info = await this.client.info('memory');
        return {
          type: 'redis',
          connected: this.isConnected,
          info: info
        };
      } else {
        return {
          type: 'memory',
          connected: false,
          entries: this.memoryCache?.size || 0,
          ttlEntries: this.cacheTTL?.size || 0
        };
      }
    } catch (error) {
      console.error('Cache stats error:', error);
      return null;
    }
  }
  
  // Clear all cache
  async flushAll() {
    try {
      if (this.isConnected && this.client) {
        await this.client.flushAll();
      } else {
        this.memoryCache?.clear();
        this.cacheTTL?.clear();
      }
      console.log('🧹 Cache cleared');
      return true;
    } catch (error) {
      console.error('Cache flush error:', error);
      return false;
    }
  }
  
  // Graceful shutdown
  async disconnect() {
    try {
      if (this.client) {
        await this.client.quit();
      }
      console.log('👋 Cache service disconnected');
    } catch (error) {
      console.error('Cache disconnect error:', error);
    }
  }
}

// Export singleton instance
const cacheService = new CacheService();
module.exports = cacheService;