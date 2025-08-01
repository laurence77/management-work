const express = require('express');
const router = express.Router();
const AnalyticsService = require('../services/AnalyticsService');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { rateLimits } = require('../middleware/security');
const { logger } = require('../services/LoggingService');

// Initialize analytics service
const analyticsService = new AnalyticsService();

// Apply authentication and rate limiting to all analytics routes
router.use(authenticateToken);
router.use(requireRole(['admin', 'manager'])); // Only admin and managers can access analytics
router.use(rateLimits.api);

/**
 * @route GET /api/analytics/dashboard
 * @desc Get analytics dashboard summary
 * @access Admin, Manager
 */
router.get('/dashboard', async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;
    
    const result = await analyticsService.getAnalyticsSummary(timeframe);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to get analytics summary',
        error: result.error
      });
    }
    
    logger.info('Analytics dashboard accessed', {
      userId: req.user.id,
      timeframe,
      timestamp: new Date()
    });
    
    res.json({
      success: true,
      data: result.summary,
      meta: {
        timeframe,
        accessedBy: req.user.id,
        accessedAt: new Date()
      }
    });
    
  } catch (error) {
    logger.error('Failed to get analytics dashboard', error, {
      userId: req.user.id,
      query: req.query
    });
    
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching analytics dashboard'
    });
  }
});

/**
 * @route GET /api/analytics/bookings
 * @desc Get detailed booking analytics
 * @access Admin, Manager
 */
router.get('/bookings', async (req, res) => {
  try {
    const { 
      timeframe = '30d',
      celebrityId,
      status,
      category,
      paymentMethod
    } = req.query;
    
    const filters = {};
    if (celebrityId) filters.celebrityId = celebrityId;
    if (status) filters.status = status;
    if (category) filters.category = category;
    if (paymentMethod) filters.paymentMethod = paymentMethod;
    
    const result = await analyticsService.getBookingAnalytics(timeframe, filters);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to get booking analytics',
        error: result.error
      });
    }
    
    logger.info('Booking analytics accessed', {
      userId: req.user.id,
      timeframe,
      filters,
      timestamp: new Date()
    });
    
    res.json({
      success: true,
      data: result.analytics,
      meta: {
        timeframe,
        filters,
        accessedBy: req.user.id,
        accessedAt: new Date()
      }
    });
    
  } catch (error) {
    logger.error('Failed to get booking analytics', error, {
      userId: req.user.id,
      query: req.query
    });
    
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching booking analytics'
    });
  }
});

/**
 * @route GET /api/analytics/revenue
 * @desc Get detailed revenue analytics
 * @access Admin, Manager
 */
router.get('/revenue', async (req, res) => {
  try {
    const { 
      timeframe = '30d',
      breakdownBy = 'day'
    } = req.query;
    
    const validBreakdowns = ['hour', 'day', 'week', 'month'];
    const breakdown = validBreakdowns.includes(breakdownBy) ? breakdownBy : 'day';
    
    const result = await analyticsService.getRevenueAnalytics(timeframe, breakdown);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to get revenue analytics',
        error: result.error
      });
    }
    
    logger.info('Revenue analytics accessed', {
      userId: req.user.id,
      timeframe,
      breakdown,
      timestamp: new Date()
    });
    
    res.json({
      success: true,
      data: result.analytics,
      meta: {
        timeframe,
        breakdown,
        accessedBy: req.user.id,
        accessedAt: new Date()
      }
    });
    
  } catch (error) {
    logger.error('Failed to get revenue analytics', error, {
      userId: req.user.id,
      query: req.query
    });
    
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching revenue analytics'
    });
  }
});

/**
 * @route GET /api/analytics/users
 * @desc Get user analytics and demographics
 * @access Admin, Manager
 */
router.get('/users', async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;
    
    const result = await analyticsService.getUserAnalytics(timeframe);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to get user analytics',
        error: result.error
      });
    }
    
    logger.info('User analytics accessed', {
      userId: req.user.id,
      timeframe,
      timestamp: new Date()
    });
    
    res.json({
      success: true,
      data: result.analytics,
      meta: {
        timeframe,
        accessedBy: req.user.id,
        accessedAt: new Date()
      }
    });
    
  } catch (error) {
    logger.error('Failed to get user analytics', error, {
      userId: req.user.id,
      query: req.query
    });
    
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching user analytics'
    });
  }
});

/**
 * @route GET /api/analytics/celebrities
 * @desc Get celebrity performance analytics
 * @access Admin, Manager
 */
router.get('/celebrities', async (req, res) => {
  try {
    const { 
      timeframe = '30d',
      celebrityId
    } = req.query;
    
    const result = await analyticsService.getCelebrityAnalytics(timeframe, celebrityId);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to get celebrity analytics',
        error: result.error
      });
    }
    
    logger.info('Celebrity analytics accessed', {
      userId: req.user.id,
      timeframe,
      celebrityId,
      timestamp: new Date()
    });
    
    res.json({
      success: true,
      data: result.analytics,
      meta: {
        timeframe,
        celebrityId,
        accessedBy: req.user.id,
        accessedAt: new Date()
      }
    });
    
  } catch (error) {
    logger.error('Failed to get celebrity analytics', error, {
      userId: req.user.id,
      query: req.query
    });
    
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching celebrity analytics'
    });
  }
});

/**
 * @route GET /api/analytics/realtime
 * @desc Get real-time metrics
 * @access Admin, Manager
 */
router.get('/realtime', async (req, res) => {
  try {
    const result = await analyticsService.getRealtimeMetrics();
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to get real-time metrics',
        error: result.error
      });
    }
    
    res.json({
      success: true,
      data: result.metrics,
      meta: {
        accessedBy: req.user.id,
        accessedAt: new Date()
      }
    });
    
  } catch (error) {
    logger.error('Failed to get real-time metrics', error, {
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching real-time metrics'
    });
  }
});

/**
 * @route GET /api/analytics/export
 * @desc Export analytics data in various formats
 * @access Admin, Manager
 */
router.get('/export', async (req, res) => {
  try {
    const { 
      type = 'bookings',
      timeframe = '30d',
      format = 'json'
    } = req.query;
    
    let result;
    
    switch (type) {
      case 'bookings':
        result = await analyticsService.getBookingAnalytics(timeframe);
        break;
      case 'revenue':
        result = await analyticsService.getRevenueAnalytics(timeframe);
        break;
      case 'users':
        result = await analyticsService.getUserAnalytics(timeframe);
        break;
      case 'celebrities':
        result = await analyticsService.getCelebrityAnalytics(timeframe);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid export type. Supported types: bookings, revenue, users, celebrities'
        });
    }
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: `Failed to export ${type} analytics`,
        error: result.error
      });
    }
    
    logger.info('Analytics exported', {
      userId: req.user.id,
      type,
      timeframe,
      format,
      timestamp: new Date()
    });
    
    // Set appropriate headers for download
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${type}_analytics_${timeframe}_${timestamp}`;
    
    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
      res.json({
        success: true,
        data: result.analytics,
        meta: {
          exportType: type,
          timeframe,
          format,
          exportedBy: req.user.id,
          exportedAt: new Date()
        }
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Unsupported export format. Currently only JSON is supported.'
      });
    }
    
  } catch (error) {
    logger.error('Failed to export analytics', error, {
      userId: req.user.id,
      query: req.query
    });
    
    res.status(500).json({
      success: false,
      message: 'Internal server error while exporting analytics'
    });
  }
});

/**
 * @route GET /api/analytics/health
 * @desc Health check for analytics service
 * @access Admin, Manager
 */
router.get('/health', async (req, res) => {
  try {
    const health = await analyticsService.healthCheck();
    
    res.json({
      success: true,
      data: health
    });
    
  } catch (error) {
    logger.error('Analytics health check failed', error);
    
    res.status(500).json({
      success: false,
      message: 'Analytics service health check failed',
      error: error.message
    });
  }
});

module.exports = router;
