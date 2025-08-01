const { supabase } = require('../config/supabase');
const { logger } = require('./LoggingService');
const cacheService = require('./CacheService');

/**
 * Advanced Analytics Service
 * Provides comprehensive analytics and reporting for the celebrity booking platform
 */

class AnalyticsService {
  constructor() {
    this.metrics = new Map();
    this.realtimeConnections = new Set();
    
    // Initialize metrics collection
    this.setupMetricsCollection();
    
    logger.info('📊 Analytics service initialized');
  }
  
  // =============================================================================
  // BOOKING ANALYTICS
  // =============================================================================
  
  async getBookingAnalytics(timeframe = '30d', filters = {}) {
    try {
      const { dateRange, groupBy } = this.getTimeframeConfig(timeframe);
      const cacheKey = `analytics:bookings:${timeframe}:${JSON.stringify(filters)}`;
      
      // Check cache first
      let analytics = await cacheService.get(cacheKey);
      if (analytics) {
        return { success: true, analytics };
      }
      
      // Build query with filters
      let query = supabase
        .from('bookings')
        .select(`
          id,
          celebrity_id,
          user_id,
          amount,
          status,
          payment_status,
          payment_method,
          booking_type,
          event_date,
          created_at,
          confirmed_at,
          cancelled_at,
          celebrities:celebrity_id(name, category),
          app_users:user_id(id, created_at)
        `)
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());
      
      // Apply filters
      if (filters.celebrityId) {
        query = query.eq('celebrity_id', filters.celebrityId);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.category) {
        query = query.eq('celebrities.category', filters.category);
      }
      if (filters.paymentMethod) {
        query = query.eq('payment_method', filters.paymentMethod);
      }
      
      const { data: bookings, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Process analytics data
      analytics = this.processBookingAnalytics(bookings, groupBy);
      
      // Cache results
      await cacheService.set(cacheKey, analytics, this.getCacheDuration(timeframe));
      
      return { success: true, analytics };
      
    } catch (error) {
      logger.error('Failed to get booking analytics', error);
      return { success: false, error: error.message };
    }
  }
  
  processBookingAnalytics(bookings, groupBy) {
    const analytics = {
      overview: {
        totalBookings: bookings.length,
        totalRevenue: 0,
        confirmedBookings: 0,
        cancelledBookings: 0,
        pendingBookings: 0,
        averageBookingValue: 0,
        conversionRate: 0
      },
      trends: {
        daily: {},
        weekly: {},
        monthly: {}
      },
      demographics: {
        topCelebrities: {},
        topCategories: {},
        bookingTypes: {},
        paymentMethods: {},
        userAcquisition: {}
      },
      performance: {
        responseTime: {},
        completionRate: {},
        customerSatisfaction: {}
      }
    };
    
    // Process overview metrics
    bookings.forEach(booking => {
      analytics.overview.totalRevenue += booking.amount || 0;
      
      switch (booking.status) {
        case 'confirmed':
          analytics.overview.confirmedBookings++;
          break;
        case 'cancelled':
          analytics.overview.cancelledBookings++;
          break;
        case 'pending':
          analytics.overview.pendingBookings++;
          break;
      }
      
      // Track celebrity popularity
      const celebrityName = booking.celebrities?.name;
      if (celebrityName) {
        analytics.demographics.topCelebrities[celebrityName] = 
          (analytics.demographics.topCelebrities[celebrityName] || 0) + 1;
      }
      
      // Track category popularity
      const category = booking.celebrities?.category;
      if (category) {
        analytics.demographics.topCategories[category] = 
          (analytics.demographics.topCategories[category] || 0) + 1;
      }
      
      // Track booking types
      const bookingType = booking.booking_type || 'standard';
      analytics.demographics.bookingTypes[bookingType] = 
        (analytics.demographics.bookingTypes[bookingType] || 0) + 1;
      
      // Track payment methods
      const paymentMethod = booking.payment_method || 'unknown';
      analytics.demographics.paymentMethods[paymentMethod] = 
        (analytics.demographics.paymentMethods[paymentMethod] || 0) + 1;
      
      // Process time-based trends
      const createdDate = new Date(booking.created_at);
      const dateKey = this.getDateKey(createdDate, groupBy);
      
      if (!analytics.trends[groupBy][dateKey]) {
        analytics.trends[groupBy][dateKey] = {
          bookings: 0,
          revenue: 0,
          confirmed: 0,
          cancelled: 0
        };
      }
      
      analytics.trends[groupBy][dateKey].bookings++;
      analytics.trends[groupBy][dateKey].revenue += booking.amount || 0;
      if (booking.status === 'confirmed') {
        analytics.trends[groupBy][dateKey].confirmed++;
      }
      if (booking.status === 'cancelled') {
        analytics.trends[groupBy][dateKey].cancelled++;
      }
    });
    
    // Calculate derived metrics
    analytics.overview.averageBookingValue = analytics.overview.totalBookings > 0 
      ? analytics.overview.totalRevenue / analytics.overview.totalBookings 
      : 0;
    
    analytics.overview.conversionRate = analytics.overview.totalBookings > 0
      ? (analytics.overview.confirmedBookings / analytics.overview.totalBookings) * 100
      : 0;
    
    // Sort top items
    analytics.demographics.topCelebrities = this.sortObject(analytics.demographics.topCelebrities);
    analytics.demographics.topCategories = this.sortObject(analytics.demographics.topCategories);
    
    return analytics;
  }
  
  // =============================================================================
  // REVENUE ANALYTICS
  // =============================================================================
  
  async getRevenueAnalytics(timeframe = '30d', breakdownBy = 'day') {
    try {
      const { dateRange } = this.getTimeframeConfig(timeframe);
      const cacheKey = `analytics:revenue:${timeframe}:${breakdownBy}`;
      
      let analytics = await cacheService.get(cacheKey);
      if (analytics) {
        return { success: true, analytics };
      }
      
      // Get revenue data
      const { data: payments, error: paymentsError } = await supabase
        .from('bookings')
        .select(`
          amount,
          payment_status,
          payment_method,
          created_at,
          confirmed_at,
          celebrities:celebrity_id(name, category, base_price)
        `)
        .eq('payment_status', 'paid')
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());
      
      if (paymentsError) throw paymentsError;
      
      // Get crypto payments
      const { data: cryptoPayments, error: cryptoError } = await supabase
        .from('crypto_payments')
        .select('fiat_amount, crypto_type, status, created_at, confirmed_at')
        .eq('status', 'confirmed')
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());
      
      if (cryptoError) throw cryptoError;
      
      // Get gift card redemptions
      const { data: giftCardRedemptions, error: giftCardError } = await supabase
        .from('gift_card_redemptions')
        .select('amount_redeemed, redeemed_at')
        .gte('redeemed_at', dateRange.start.toISOString())
        .lte('redeemed_at', dateRange.end.toISOString());
      
      if (giftCardError) throw giftCardError;
      
      analytics = this.processRevenueAnalytics(
        payments, 
        cryptoPayments, 
        giftCardRedemptions, 
        breakdownBy
      );
      
      await cacheService.set(cacheKey, analytics, this.getCacheDuration(timeframe));
      
      return { success: true, analytics };
      
    } catch (error) {
      logger.error('Failed to get revenue analytics', error);
      return { success: false, error: error.message };
    }
  }
  
  processRevenueAnalytics(payments, cryptoPayments, giftCardRedemptions, breakdownBy) {
    const analytics = {
      overview: {
        totalRevenue: 0,
        traditionalpayments: 0,
        cryptoRevenue: 0,
        giftCardRevenue: 0,
        averageTransactionValue: 0,
        transactionCount: 0,
        growth: {
          revenue: 0,
          transactions: 0
        }
      },
      breakdown: {},
      paymentMethods: {
        traditional: { count: 0, revenue: 0 },
        crypto: { count: 0, revenue: 0 },
        giftCards: { count: 0, revenue: 0 }
      },
      categories: {},
      forecast: this.generateRevenueForecast(payments)
    };
    
    // Process traditional payments
    payments.forEach(payment => {
      const amount = payment.amount || 0;
      analytics.overview.totalRevenue += amount;
      analytics.overview.traditionalpayments += amount;
      analytics.overview.transactionCount++;
      
      analytics.paymentMethods.traditional.count++;
      analytics.paymentMethods.traditional.revenue += amount;
      
      // Category breakdown
      const category = payment.celebrities?.category || 'Unknown';
      if (!analytics.categories[category]) {
        analytics.categories[category] = { count: 0, revenue: 0 };
      }
      analytics.categories[category].count++;
      analytics.categories[category].revenue += amount;
      
      // Time breakdown
      const date = new Date(payment.confirmed_at || payment.created_at);
      const dateKey = this.getDateKey(date, breakdownBy);
      
      if (!analytics.breakdown[dateKey]) {
        analytics.breakdown[dateKey] = {
          traditional: 0,
          crypto: 0,
          giftCards: 0,
          total: 0,
          transactions: 0
        };
      }
      
      analytics.breakdown[dateKey].traditional += amount;
      analytics.breakdown[dateKey].total += amount;
      analytics.breakdown[dateKey].transactions++;
    });
    
    // Process crypto payments
    cryptoPayments.forEach(payment => {
      const amount = payment.fiat_amount || 0;
      analytics.overview.totalRevenue += amount;
      analytics.overview.cryptoRevenue += amount;
      analytics.overview.transactionCount++;
      
      analytics.paymentMethods.crypto.count++;
      analytics.paymentMethods.crypto.revenue += amount;
      
      const date = new Date(payment.confirmed_at || payment.created_at);
      const dateKey = this.getDateKey(date, breakdownBy);
      
      if (!analytics.breakdown[dateKey]) {
        analytics.breakdown[dateKey] = {
          traditional: 0,
          crypto: 0,
          giftCards: 0,
          total: 0,
          transactions: 0
        };
      }
      
      analytics.breakdown[dateKey].crypto += amount;
      analytics.breakdown[dateKey].total += amount;
      analytics.breakdown[dateKey].transactions++;
    });
    
    // Process gift card redemptions
    giftCardRedemptions.forEach(redemption => {
      const amount = redemption.amount_redeemed || 0;
      analytics.overview.totalRevenue += amount;
      analytics.overview.giftCardRevenue += amount;
      analytics.overview.transactionCount++;
      
      analytics.paymentMethods.giftCards.count++;
      analytics.paymentMethods.giftCards.revenue += amount;
      
      const date = new Date(redemption.redeemed_at);
      const dateKey = this.getDateKey(date, breakdownBy);
      
      if (!analytics.breakdown[dateKey]) {
        analytics.breakdown[dateKey] = {
          traditional: 0,
          crypto: 0,
          giftCards: 0,
          total: 0,
          transactions: 0
        };
      }
      
      analytics.breakdown[dateKey].giftCards += amount;
      analytics.breakdown[dateKey].total += amount;
      analytics.breakdown[dateKey].transactions++;
    });
    
    // Calculate derived metrics
    analytics.overview.averageTransactionValue = analytics.overview.transactionCount > 0
      ? analytics.overview.totalRevenue / analytics.overview.transactionCount
      : 0;
    
    return analytics;
  }
  
  // =============================================================================
  // USER ANALYTICS
  // =============================================================================
  
  async getUserAnalytics(timeframe = '30d') {
    try {
      const { dateRange } = this.getTimeframeConfig(timeframe);
      const cacheKey = `analytics:users:${timeframe}`;
      
      let analytics = await cacheService.get(cacheKey);
      if (analytics) {
        return { success: true, analytics };
      }
      
      // Get user data
      const { data: users, error: usersError } = await supabase
        .from('app_users')
        .select(`
          id,
          email,
          role,
          created_at,
          last_login,
          email_verified,
          phone_verified,
          is_active
        `)
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());
      
      if (usersError) throw usersError;
      
      // Get user activity data
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('user_id, created_at, status, amount')
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());
      
      if (bookingsError) throw bookingsError;
      
      analytics = this.processUserAnalytics(users, bookings);
      
      await cacheService.set(cacheKey, analytics, this.getCacheDuration(timeframe));
      
      return { success: true, analytics };
      
    } catch (error) {
      logger.error('Failed to get user analytics', error);
      return { success: false, error: error.message };
    }
  }
  
  processUserAnalytics(users, bookings) {
    const analytics = {
      overview: {
        totalUsers: users.length,
        activeUsers: 0,
        verifiedUsers: 0,
        newUsers: users.length,
        retentionRate: 0,
        averageLifetimeValue: 0
      },
      acquisition: {
        daily: {},
        sources: {},
        conversion: {}
      },
      engagement: {
        bookingsPerUser: 0,
        repeatCustomers: 0,
        customerSegments: {
          new: 0,
          returning: 0,
          vip: 0
        }
      },
      demographics: {
        roles: {},
        verificationStatus: {},
        activityLevels: {}
      }
    };
    
    // Process user metrics
    const userBookingCounts = new Map();
    const userRevenue = new Map();
    
    // Count bookings per user
    bookings.forEach(booking => {
      const userId = booking.user_id;
      userBookingCounts.set(userId, (userBookingCounts.get(userId) || 0) + 1);
      userRevenue.set(userId, (userRevenue.get(userId) || 0) + (booking.amount || 0));
    });
    
    // Process user data
    users.forEach(user => {
      // Count verified users
      if (user.email_verified) {
        analytics.overview.verifiedUsers++;
      }
      
      // Count active users (users with bookings)
      if (userBookingCounts.has(user.id)) {
        analytics.overview.activeUsers++;
      }
      
      // Role demographics
      const role = user.role || 'customer';
      analytics.demographics.roles[role] = (analytics.demographics.roles[role] || 0) + 1;
      
      // Verification status
      const verificationStatus = user.email_verified ? 'verified' : 'unverified';
      analytics.demographics.verificationStatus[verificationStatus] = 
        (analytics.demographics.verificationStatus[verificationStatus] || 0) + 1;
      
      // User segmentation
      const bookingCount = userBookingCounts.get(user.id) || 0;
      const userValue = userRevenue.get(user.id) || 0;
      
      if (bookingCount === 0) {
        analytics.engagement.customerSegments.new++;
      } else if (userValue > 1000) { // VIP customers
        analytics.engagement.customerSegments.vip++;
      } else {
        analytics.engagement.customerSegments.returning++;
      }
      
      // Activity level
      let activityLevel = 'inactive';
      if (bookingCount > 5) {
        activityLevel = 'high';
      } else if (bookingCount > 1) {
        activityLevel = 'medium';
      } else if (bookingCount > 0) {
        activityLevel = 'low';
      }
      
      analytics.demographics.activityLevels[activityLevel] = 
        (analytics.demographics.activityLevels[activityLevel] || 0) + 1;
      
      // Daily acquisition
      const createdDate = new Date(user.created_at);
      const dateKey = this.getDateKey(createdDate, 'daily');
      analytics.acquisition.daily[dateKey] = (analytics.acquisition.daily[dateKey] || 0) + 1;
    });
    
    // Calculate derived metrics
    analytics.engagement.bookingsPerUser = analytics.overview.activeUsers > 0
      ? bookings.length / analytics.overview.activeUsers
      : 0;
    
    analytics.engagement.repeatCustomers = Array.from(userBookingCounts.values())
      .filter(count => count > 1).length;
    
    analytics.overview.averageLifetimeValue = analytics.overview.activeUsers > 0
      ? Array.from(userRevenue.values()).reduce((sum, val) => sum + val, 0) / analytics.overview.activeUsers
      : 0;
    
    return analytics;
  }
  
  // =============================================================================
  // CELEBRITY ANALYTICS
  // =============================================================================
  
  async getCelebrityAnalytics(timeframe = '30d', celebrityId = null) {
    try {
      const { dateRange } = this.getTimeframeConfig(timeframe);
      const cacheKey = `analytics:celebrities:${timeframe}:${celebrityId || 'all'}`;
      
      let analytics = await cacheService.get(cacheKey);
      if (analytics) {
        return { success: true, analytics };
      }
      
      // Build query
      let query = supabase
        .from('celebrities')
        .select(`
          *,
          bookings!inner(
            id,
            amount,
            status,
            created_at,
            event_date,
            rating,
            review
          )
        `);
      
      if (celebrityId) {
        query = query.eq('id', celebrityId);
      }
      
      const { data: celebrities, error } = await query;
      
      if (error) throw error;
      
      analytics = this.processCelebrityAnalytics(celebrities, dateRange);
      
      await cacheService.set(cacheKey, analytics, this.getCacheDuration(timeframe));
      
      return { success: true, analytics };
      
    } catch (error) {
      logger.error('Failed to get celebrity analytics', error);
      return { success: false, error: error.message };
    }
  }
  
  processCelebrityAnalytics(celebrities, dateRange) {
    const analytics = {
      overview: {
        totalCelebrities: celebrities.length,
        totalBookings: 0,
        totalRevenue: 0,
        averageRating: 0,
        topPerformers: []
      },
      performance: {},
      categories: {},
      trends: {
        bookingTrends: {},
        revenueTrends: {},
        ratingTrends: {}
      }
    };
    
    const categoryStats = new Map();
    let totalRatings = 0;
    let ratingCount = 0;
    
    celebrities.forEach(celebrity => {
      const celebPerformance = {
        id: celebrity.id,
        name: celebrity.name,
        category: celebrity.category,
        bookings: 0,
        revenue: 0,
        averageRating: 0,
        totalReviews: 0,
        conversionRate: 0
      };
      
      // Filter bookings within date range
      const relevantBookings = celebrity.bookings.filter(booking => {
        const bookingDate = new Date(booking.created_at);
        return bookingDate >= dateRange.start && bookingDate <= dateRange.end;
      });
      
      relevantBookings.forEach(booking => {
        celebPerformance.bookings++;
        celebPerformance.revenue += booking.amount || 0;
        
        if (booking.rating) {
          celebPerformance.totalReviews++;
          celebPerformance.averageRating += booking.rating;
          totalRatings += booking.rating;
          ratingCount++;
        }
        
        analytics.overview.totalBookings++;
        analytics.overview.totalRevenue += booking.amount || 0;
      });
      
      // Calculate average rating for celebrity
      if (celebPerformance.totalReviews > 0) {
        celebPerformance.averageRating /= celebPerformance.totalReviews;
      }
      
      analytics.performance[celebrity.id] = celebPerformance;
      
      // Category statistics
      const category = celebrity.category || 'Unknown';
      if (!categoryStats.has(category)) {
        categoryStats.set(category, {
          celebrities: 0,
          bookings: 0,
          revenue: 0,
          averageRating: 0
        });
      }
      
      const categoryData = categoryStats.get(category);
      categoryData.celebrities++;
      categoryData.bookings += celebPerformance.bookings;
      categoryData.revenue += celebPerformance.revenue;
      if (celebPerformance.averageRating > 0) {
        categoryData.averageRating += celebPerformance.averageRating;
      }
    });
    
    // Calculate overall average rating
    analytics.overview.averageRating = ratingCount > 0 ? totalRatings / ratingCount : 0;
    
    // Process category analytics
    for (const [category, data] of categoryStats) {
      analytics.categories[category] = {
        ...data,
        averageRating: data.celebrities > 0 ? data.averageRating / data.celebrities : 0
      };
    }
    
    // Find top performers
    analytics.overview.topPerformers = Object.values(analytics.performance)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map(performer => ({
        id: performer.id,
        name: performer.name,
        revenue: performer.revenue,
        bookings: performer.bookings,
        rating: performer.averageRating
      }));
    
    return analytics;
  }
  
  // =============================================================================
  // SYSTEM PERFORMANCE ANALYTICS
  // =============================================================================
  
  async getSystemAnalytics() {
    try {
      const cacheKey = 'analytics:system:current';
      
      let analytics = await cacheService.get(cacheKey);
      if (analytics) {
        return { success: true, analytics };
      }
      
      analytics = {
        performance: {
          averageResponseTime: await this.getAverageResponseTime(),
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          errorRate: await this.getErrorRate()
        },
        database: {
          connectionPool: await this.getDatabaseStats(),
          queryPerformance: await this.getQueryPerformance()
        },
        cache: {
          hitRate: await this.getCacheHitRate(),
          memoryUsage: await this.getCacheMemoryUsage()
        },
        realtime: {
          activeConnections: this.realtimeConnections.size,
          messagesPerSecond: await this.getMessagesPerSecond()
        }
      };
      
      await cacheService.set(cacheKey, analytics, 60); // Cache for 1 minute
      
      return { success: true, analytics };
      
    } catch (error) {
      logger.error('Failed to get system analytics', error);
      return { success: false, error: error.message };
    }
  }
  
  // =============================================================================
  // REAL-TIME METRICS
  // =============================================================================
  
  async getRealtimeMetrics() {
    try {
      const metrics = {
        timestamp: new Date(),
        users: {
          online: this.realtimeConnections.size,
          active: await this.getActiveUserCount()
        },
        bookings: {
          pendingCount: await this.getPendingBookingsCount(),
          todayCount: await this.getTodayBookingsCount(),
          recentRevenue: await this.getRecentRevenue()
        },
        system: {
          cpu: process.cpuUsage(),
          memory: process.memoryUsage(),
          uptime: process.uptime()
        },
        alerts: await this.getActiveAlerts()
      };
      
      // Broadcast to real-time connections
      this.broadcastMetrics(metrics);
      
      return { success: true, metrics };
      
    } catch (error) {
      logger.error('Failed to get real-time metrics', error);
      return { success: false, error: error.message };
    }
  }
  
  // =============================================================================
  // UTILITY METHODS
  // =============================================================================
  
  getTimeframeConfig(timeframe) {
    const end = new Date();
    let start = new Date();
    let groupBy = 'daily';
    
    switch (timeframe) {
      case '24h':
        start.setHours(start.getHours() - 24);
        groupBy = 'hourly';
        break;
      case '7d':
        start.setDate(start.getDate() - 7);
        groupBy = 'daily';
        break;
      case '30d':
        start.setDate(start.getDate() - 30);
        groupBy = 'daily';
        break;
      case '90d':
        start.setDate(start.getDate() - 90);
        groupBy = 'weekly';
        break;
      case '1y':
        start.setFullYear(start.getFullYear() - 1);
        groupBy = 'monthly';
        break;
      default:
        start.setDate(start.getDate() - 30);
        groupBy = 'daily';
    }
    
    return { dateRange: { start, end }, groupBy };
  }
  
  getDateKey(date, groupBy) {
    switch (groupBy) {
      case 'hourly':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}`;
      case 'daily':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      case 'weekly':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        return `${weekStart.getFullYear()}-W${String(Math.ceil((weekStart.getDate() + weekStart.getDay()) / 7)).padStart(2, '0')}`;
      case 'monthly':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      default:
        return date.toISOString().split('T')[0];
    }
  }
  
  getCacheDuration(timeframe) {
    switch (timeframe) {
      case '24h':
        return 300; // 5 minutes
      case '7d':
        return 900; // 15 minutes
      case '30d':
        return 1800; // 30 minutes
      case '90d':
        return 3600; // 1 hour
      case '1y':
        return 7200; // 2 hours
      default:
        return 1800; // 30 minutes
    }
  }
  
  sortObject(obj) {
    return Object.entries(obj)
      .sort(([,a], [,b]) => b - a)
      .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});
  }
  
  generateRevenueForecast(historicalData) {
    // Simple linear regression forecast
    if (historicalData.length < 3) {
      return { forecast: [], confidence: 0 };
    }
    
    const dates = historicalData.map(d => new Date(d.created_at).getTime());
    const revenues = historicalData.map(d => d.amount || 0);
    
    // Calculate trend
    const n = dates.length;
    const sumX = dates.reduce((sum, x) => sum + x, 0);
    const sumY = revenues.reduce((sum, y) => sum + y, 0);
    const sumXY = dates.reduce((sum, x, i) => sum + x * revenues[i], 0);
    const sumXX = dates.reduce((sum, x) => sum + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Generate forecast for next 30 days
    const forecast = [];
    const now = Date.now();
    
    for (let i = 1; i <= 30; i++) {
      const futureDate = now + (i * 24 * 60 * 60 * 1000);
      const predictedRevenue = slope * futureDate + intercept;
      
      forecast.push({
        date: new Date(futureDate),
        predicted: Math.max(0, predictedRevenue),
        confidence: Math.max(0, 1 - (i / 30)) // Decreasing confidence over time
      });
    }
    
    return { forecast, confidence: 0.7 };
  }
  
  setupMetricsCollection() {
    // Collect metrics every 30 seconds
    setInterval(async () => {
      try {
        await this.collectMetrics();
      } catch (error) {
        logger.error('Failed to collect metrics', error);
      }
    }, 30000);
  }
  
  async collectMetrics() {
    const timestamp = Date.now();
    
    // Store current metrics
    this.metrics.set(timestamp, {
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      uptime: process.uptime(),
      connections: this.realtimeConnections.size
    });
    
    // Clean up old metrics (keep last hour)
    const oneHourAgo = timestamp - (60 * 60 * 1000);
    for (const [time] of this.metrics) {
      if (time < oneHourAgo) {
        this.metrics.delete(time);
      }
    }
  }
  
  // Placeholder methods for system metrics (implement based on your monitoring setup)
  async getAverageResponseTime() {
    return 150; // milliseconds
  }
  
  async getErrorRate() {
    return 0.02; // 2%
  }
  
  async getDatabaseStats() {
    return { active: 5, idle: 15, total: 20 };
  }
  
  async getQueryPerformance() {
    return { average: 45, p95: 120, p99: 250 };
  }
  
  async getCacheHitRate() {
    return 0.85; // 85%
  }
  
  async getCacheMemoryUsage() {
    return { used: '128MB', total: '512MB' };
  }
  
  async getMessagesPerSecond() {
    return 15;
  }
  
  async getActiveUserCount() {
    const { data, error } = await supabase
      .from('app_users')
      .select('id', { count: 'exact', head: true })
      .gte('last_login', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    
    return error ? 0 : data?.count || 0;
  }
  
  async getPendingBookingsCount() {
    const { data, error } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');
    
    return error ? 0 : data?.count || 0;
  }
  
  async getTodayBookingsCount() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data, error } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());
    
    return error ? 0 : data?.count || 0;
  }
  
  async getRecentRevenue() {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const { data, error } = await supabase
      .from('bookings')
      .select('amount')
      .eq('payment_status', 'paid')
      .gte('created_at', oneDayAgo.toISOString());
    
    if (error) return 0;
    
    return data.reduce((sum, booking) => sum + (booking.amount || 0), 0);
  }
  
  async getActiveAlerts() {
    // Implement based on your alerting system
    return [];
  }
  
  broadcastMetrics(metrics) {
    // Implement real-time broadcasting to connected clients
    logger.debug('Broadcasting metrics to connected clients', {
      connections: this.realtimeConnections.size,
      timestamp: metrics.timestamp
    });
  }
  
  // =============================================================================
  // PUBLIC API METHODS
  // =============================================================================
  
  addRealtimeConnection(connectionId) {
    this.realtimeConnections.add(connectionId);
    logger.debug('Real-time connection added', { connectionId, total: this.realtimeConnections.size });
  }
  
  removeRealtimeConnection(connectionId) {
    this.realtimeConnections.delete(connectionId);
    logger.debug('Real-time connection removed', { connectionId, total: this.realtimeConnections.size });
  }
  
  async getAnalyticsSummary(timeframe = '30d') {
    try {
      const [bookingAnalytics, revenueAnalytics, userAnalytics] = await Promise.all([
        this.getBookingAnalytics(timeframe),
        this.getRevenueAnalytics(timeframe),
        this.getUserAnalytics(timeframe)
      ]);
      
      return {
        success: true,
        summary: {
          bookings: bookingAnalytics.success ? bookingAnalytics.analytics.overview : null,
          revenue: revenueAnalytics.success ? revenueAnalytics.analytics.overview : null,
          users: userAnalytics.success ? userAnalytics.analytics.overview : null,
          timeframe,
          generatedAt: new Date()
        }
      };
      
    } catch (error) {
      logger.error('Failed to get analytics summary', error);
      return { success: false, error: error.message };
    }
  }
  
  async healthCheck() {
    try {
      const systemAnalytics = await this.getSystemAnalytics();
      
      return {
        status: 'healthy',
        features: {
          bookingAnalytics: true,
          revenueAnalytics: true,
          userAnalytics: true,
          celebrityAnalytics: true,
          systemAnalytics: true,
          realtimeMetrics: true
        },
        connections: this.realtimeConnections.size,
        metricsHistory: this.metrics.size,
        lastCollection: Array.from(this.metrics.keys()).pop(),
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

module.exports = AnalyticsService;