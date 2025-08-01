const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { cacheManager } = require('../middleware/cache-manager');
const { responseCache } = require('../middleware/response-cache');
const { errorHandler } = require('../utils/standard-error-handler');
const { logger } = require('../utils/logger');
const router = express.Router();

/**
 * Cache Administration API
 * Provides admin endpoints for cache management and monitoring
 */

// GET /api/admin/cache/stats - Get cache statistics
router.get('/stats', 
  authenticateToken,
  requirePermission('admin.full_access'),
  errorHandler.asyncRouteWrapper(async (req, res) => {
    const stats = await responseCache.getStats();
    
    res.json({
      success: true,
      data: {
        ...stats,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
      }
    });
  })
);

// DELETE /api/admin/cache/clear - Clear all cache
router.delete('/clear',
  authenticateToken,
  requirePermission('admin.full_access'),
  errorHandler.asyncRouteWrapper(async (req, res) => {
    await responseCache.adminClearCache();
    
    logger.info('Cache cleared by admin', { 
      adminId: req.user.id, 
      adminEmail: req.user.email 
    });
    
    res.json({
      success: true,
      message: 'All cache cleared successfully'
    });
  })
);

// DELETE /api/admin/cache/pattern/:pattern - Clear cache by pattern
router.delete('/pattern/:pattern',
  authenticateToken,
  requirePermission('admin.full_access'),
  errorHandler.asyncRouteWrapper(async (req, res) => {
    const { pattern } = req.params;
    
    await responseCache.adminClearCache(pattern);
    
    logger.info('Cache pattern cleared by admin', { 
      pattern,
      adminId: req.user.id, 
      adminEmail: req.user.email 
    });
    
    res.json({
      success: true,
      message: `Cache pattern '${pattern}' cleared successfully`
    });
  })
);

// POST /api/admin/cache/warm - Warm cache for organization
router.post('/warm',
  authenticateToken,
  requirePermission('admin.full_access'),
  errorHandler.asyncRouteWrapper(async (req, res) => {
    const { organizationId } = req.body;
    const targetOrgId = organizationId || req.user.organization_id;
    
    await responseCache.warmCache(targetOrgId);
    
    logger.info('Cache warmed by admin', { 
      organizationId: targetOrgId,
      adminId: req.user.id, 
      adminEmail: req.user.email 
    });
    
    res.json({
      success: true,
      message: `Cache warming initiated for organization ${targetOrgId}`
    });
  })
);

// GET /api/admin/cache/keys - Get cache keys (limited for security)
router.get('/keys',
  authenticateToken,
  requirePermission('admin.full_access'),
  errorHandler.asyncRouteWrapper(async (req, res) => {
    const { pattern = '*', limit = 100 } = req.query;
    
    // This would need to be implemented in cache manager
    // For security, only show key patterns, not actual data
    
    res.json({
      success: true,
      data: {
        message: 'Cache key inspection not implemented for security reasons',
        suggestion: 'Use cache stats and pattern clearing instead'
      }
    });
  })
);

// POST /api/admin/cache/invalidate/celebrities - Invalidate celebrity caches
router.post('/invalidate/celebrities',
  authenticateToken,
  requirePermission('admin.full_access'),
  errorHandler.asyncRouteWrapper(async (req, res) => {
    const { celebrityId } = req.body;
    const organizationId = req.user.organization_id;
    
    if (celebrityId) {
      await cacheManager.invalidateCelebrity(celebrityId, organizationId);
    } else {
      await cacheManager.deletePattern(`celebrities:*:org:${organizationId}`);
      await cacheManager.deletePattern(`celebrity:*:org:${organizationId}`);
    }
    
    logger.info('Celebrity cache invalidated by admin', { 
      celebrityId,
      organizationId,
      adminId: req.user.id 
    });
    
    res.json({
      success: true,
      message: celebrityId ? 
        `Celebrity ${celebrityId} cache invalidated` : 
        'All celebrity caches invalidated'
    });
  })
);

// POST /api/admin/cache/invalidate/analytics - Invalidate analytics caches
router.post('/invalidate/analytics',
  authenticateToken,
  requirePermission('admin.full_access'),
  errorHandler.asyncRouteWrapper(async (req, res) => {
    const organizationId = req.user.organization_id;
    
    await cacheManager.invalidateAnalytics(organizationId);
    
    logger.info('Analytics cache invalidated by admin', { 
      organizationId,
      adminId: req.user.id 
    });
    
    res.json({
      success: true,
      message: 'Analytics caches invalidated'
    });
  })
);

// GET /api/admin/cache/config - Get cache configuration
router.get('/config',
  authenticateToken,
  requirePermission('admin.full_access'),
  errorHandler.asyncRouteWrapper(async (req, res) => {
    res.json({
      success: true,
      data: {
        redisEnabled: !!process.env.REDIS_URL,
        redisConnected: cacheManager.isRedisConnected,
        memoryCache: {
          maxSize: cacheManager.maxMemoryCacheSize,
          currentSize: cacheManager.memoryCache.size
        },
        defaultTTL: cacheManager.defaultTTL,
        cacheTTLs: cacheManager.cacheTTLs,
        cacheConfigurations: Object.keys(responseCache.cacheConfigs).length
      }
    });
  })
);

module.exports = router;