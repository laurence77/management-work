const { supabaseAdmin } = require('../config/supabase');
const { logger } = require('../utils/logger');

/**
 * Comprehensive Analytics Service
 * Handles booking, revenue, celebrity, and business intelligence analytics
 */

class AnalyticsService {
  constructor() {
    this.metricTypes = {
      BOOKING: {
        TOTAL_BOOKINGS: 'total_bookings',
        PENDING_BOOKINGS: 'pending_bookings',
        CONFIRMED_BOOKINGS: 'confirmed_bookings',
        CANCELLED_BOOKINGS: 'cancelled_bookings',
        COMPLETED_BOOKINGS: 'completed_bookings',
        BOOKING_CONVERSION_RATE: 'booking_conversion_rate',
        AVERAGE_BOOKING_VALUE: 'average_booking_value'
      },
      REVENUE: {
        TOTAL_REVENUE: 'total_revenue',
        DAILY_REVENUE: 'daily_revenue',
        MONTHLY_REVENUE: 'monthly_revenue',
        PROJECTED_REVENUE: 'projected_revenue',
        REVENUE_PER_CELEBRITY: 'revenue_per_celebrity',
        REVENUE_GROWTH_RATE: 'revenue_growth_rate'
      },
      CELEBRITY: {
        TOTAL_VIEWS: 'total_views',
        BOOKING_REQUESTS: 'booking_requests',
        BOOKING_COMPLETION_RATE: 'booking_completion_rate',
        AVERAGE_RATING: 'average_rating',
        POPULARITY_SCORE: 'popularity_score',
        EARNINGS_YTD: 'earnings_ytd'
      },
      USER: {
        TOTAL_USERS: 'total_users',
        ACTIVE_USERS: 'active_users',
        NEW_REGISTRATIONS: 'new_registrations',
        USER_RETENTION_RATE: 'user_retention_rate',
        SESSION_DURATION: 'session_duration'
      }
    };
  }

  /**
   * Get comprehensive dashboard analytics
   */
  async getDashboardAnalytics(organizationId = null, dateRange = '30d') {
    try {
      const [
        bookingMetrics,
        revenueMetrics,
        celebrityMetrics,
        userMetrics,
        trendData,
        topCelebrities,
        recentBookings
      ] = await Promise.all([
        this.getBookingMetrics(organizationId, dateRange),
        this.getRevenueMetrics(organizationId, dateRange),
        this.getCelebrityMetrics(organizationId),
        this.getUserMetrics(organizationId, dateRange),
        this.getTrendData(organizationId, dateRange),
        this.getTopCelebrities(organizationId, 10),
        this.getRecentBookings(organizationId, 10)
      ]);

      return {
        success: true,
        data: {
          bookings: bookingMetrics,
          revenue: revenueMetrics,
          celebrities: celebrityMetrics,
          users: userMetrics,
          trends: trendData,
          topCelebrities,
          recentBookings,
          lastUpdated: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('Error getting dashboard analytics:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get booking analytics and metrics
   */
  async getBookingMetrics(organizationId = null, dateRange = '30d') {
    try {
      const days = this.parseDateRange(dateRange);
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // Base query with optional organization filter
      const orgFilter = organizationId ? `AND b.organization_id = '${organizationId}'` : '';

      // Total bookings by status
      const { data: bookingsByStatus } = await supabaseAdmin.rpc('exec_sql', {
        sql_query: `
          SELECT 
            status,
            COUNT(*) as count,
            SUM(total_amount) as total_value,
            AVG(total_amount) as average_value
          FROM bookings b
          WHERE created_at >= '${startDate.toISOString()}'
          ${orgFilter}
          GROUP BY status
        `
      });

      // Daily booking trends
      const { data: dailyTrends } = await supabaseAdmin.rpc('exec_sql', {
        sql_query: `
          SELECT 
            DATE(created_at) as date,
            COUNT(*) as bookings,
            SUM(total_amount) as revenue,
            COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed,
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending
          FROM bookings b
          WHERE created_at >= '${startDate.toISOString()}'
          ${orgFilter}
          GROUP BY DATE(created_at)
          ORDER BY date DESC
          LIMIT 30
        `
      });

      // Conversion rates
      const { data: conversionData } = await supabaseAdmin.rpc('exec_sql', {
        sql_query: `
          SELECT 
            COUNT(*) as total_requests,
            COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_bookings,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_bookings,
            ROUND(
              COUNT(CASE WHEN status = 'confirmed' THEN 1 END) * 100.0 / 
              NULLIF(COUNT(*), 0), 2
            ) as confirmation_rate,
            ROUND(
              COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / 
              NULLIF(COUNT(CASE WHEN status = 'confirmed' THEN 1 END), 0), 2
            ) as completion_rate
          FROM bookings b
          WHERE created_at >= '${startDate.toISOString()}'
          ${orgFilter}
        `
      });

      // Calculate summary metrics
      const totalBookings = bookingsByStatus?.reduce((sum, item) => sum + parseInt(item.count), 0) || 0;
      const totalRevenue = bookingsByStatus?.reduce((sum, item) => sum + parseFloat(item.total_value || 0), 0) || 0;
      const averageBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

      return {
        summary: {
          totalBookings,
          totalRevenue,
          averageBookingValue,
          confirmationRate: conversionData?.[0]?.confirmation_rate || 0,
          completionRate: conversionData?.[0]?.completion_rate || 0
        },
        byStatus: bookingsByStatus || [],
        dailyTrends: dailyTrends || [],
        conversion: conversionData?.[0] || {}
      };
    } catch (error) {
      logger.error('Error getting booking metrics:', error);
      throw error;
    }
  }

  /**
   * Get revenue analytics and forecasting
   */
  async getRevenueMetrics(organizationId = null, dateRange = '30d') {
    try {
      const days = this.parseDateRange(dateRange);
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const orgFilter = organizationId ? `AND organization_id = '${organizationId}'` : '';

      // Revenue by month
      const { data: monthlyRevenue } = await supabaseAdmin.rpc('exec_sql', {
        sql_query: `
          SELECT 
            TO_CHAR(created_at, 'YYYY-MM') as month,
            SUM(total_amount) as revenue,
            COUNT(*) as booking_count,
            AVG(total_amount) as average_booking_value,
            SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END) as completed_revenue
          FROM bookings
          WHERE created_at >= '${startDate.toISOString()}'
          ${orgFilter}
          GROUP BY TO_CHAR(created_at, 'YYYY-MM')
          ORDER BY month DESC
        `
      });

      // Revenue by celebrity category
      const { data: revenueByCelebrity } = await supabaseAdmin.rpc('exec_sql', {
        sql_query: `
          SELECT 
            c.name as celebrity_name,
            c.category,
            SUM(b.total_amount) as total_revenue,
            COUNT(b.id) as booking_count,
            AVG(b.total_amount) as average_booking_value
          FROM bookings b
          JOIN celebrities c ON c.id = b.celebrity_id
          WHERE b.created_at >= '${startDate.toISOString()}'
          ${orgFilter}
          GROUP BY c.id, c.name, c.category
          ORDER BY total_revenue DESC
          LIMIT 10
        `
      });

      // Revenue growth calculation
      const currentMonth = new Date().toISOString().slice(0, 7);
      const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 7);

      const currentMonthRevenue = monthlyRevenue?.find(m => m.month === currentMonth)?.revenue || 0;
      const lastMonthRevenue = monthlyRevenue?.find(m => m.month === lastMonth)?.revenue || 0;
      
      const growthRate = lastMonthRevenue > 0 
        ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(2)
        : 0;

      // Revenue forecasting based on trends
      const forecast = await this.generateRevenueForecast(organizationId, monthlyRevenue);

      return {
        summary: {
          totalRevenue: monthlyRevenue?.reduce((sum, m) => sum + parseFloat(m.revenue || 0), 0) || 0,
          currentMonthRevenue: parseFloat(currentMonthRevenue),
          lastMonthRevenue: parseFloat(lastMonthRevenue),
          growthRate: parseFloat(growthRate),
          averageMonthlyRevenue: monthlyRevenue?.length > 0 
            ? monthlyRevenue.reduce((sum, m) => sum + parseFloat(m.revenue || 0), 0) / monthlyRevenue.length 
            : 0
        },
        monthly: monthlyRevenue || [],
        byCelebrity: revenueByCelebrity || [],
        forecast: forecast
      };
    } catch (error) {
      logger.error('Error getting revenue metrics:', error);
      throw error;
    }
  }

  /**
   * Get celebrity performance analytics
   */
  async getCelebrityMetrics(organizationId = null, limit = 20) {
    try {
      const orgFilter = organizationId ? `AND b.organization_id = '${organizationId}'` : '';

      // Celebrity performance metrics
      const { data: celebrityStats } = await supabaseAdmin.rpc('exec_sql', {
        sql_query: `
          SELECT 
            c.id,
            c.name,
            c.category,
            c.pricing_tier,
            COUNT(b.id) as total_bookings,
            COUNT(CASE WHEN b.status = 'confirmed' THEN 1 END) as confirmed_bookings,
            COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as completed_bookings,
            SUM(b.total_amount) as total_revenue,
            AVG(b.total_amount) as average_booking_value,
            ROUND(
              COUNT(CASE WHEN b.status = 'confirmed' THEN 1 END) * 100.0 / 
              NULLIF(COUNT(b.id), 0), 2
            ) as conversion_rate,
            cm.value as popularity_score
          FROM celebrities c
          LEFT JOIN bookings b ON b.celebrity_id = c.id
          LEFT JOIN celebrity_metrics cm ON cm.celebrity_id = c.id 
            AND cm.metric_type = 'popularity_score'
          WHERE c.is_active = true
          ${orgFilter}
          GROUP BY c.id, c.name, c.category, c.pricing_tier, cm.value
          ORDER BY total_revenue DESC NULLS LAST
          LIMIT ${limit}
        `
      });

      // Category performance
      const { data: categoryStats } = await supabaseAdmin.rpc('exec_sql', {
        sql_query: `
          SELECT 
            c.category,
            COUNT(DISTINCT c.id) as celebrity_count,
            COUNT(b.id) as total_bookings,
            SUM(b.total_amount) as total_revenue,
            AVG(b.total_amount) as average_booking_value,
            COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as completed_bookings
          FROM celebrities c
          LEFT JOIN bookings b ON b.celebrity_id = c.id
          WHERE c.is_active = true
          ${orgFilter}
          GROUP BY c.category
          ORDER BY total_revenue DESC NULLS LAST
        `
      });

      // Update celebrity metrics in database
      await this.updateCelebrityMetrics(celebrityStats);

      return {
        individual: celebrityStats || [],
        byCategory: categoryStats || [],
        summary: {
          totalCelebrities: celebrityStats?.length || 0,
          averageBookingsPerCelebrity: celebrityStats?.length > 0 
            ? celebrityStats.reduce((sum, c) => sum + parseInt(c.total_bookings || 0), 0) / celebrityStats.length 
            : 0,
          topCategory: categoryStats?.[0]?.category || 'N/A',
          totalCategories: categoryStats?.length || 0
        }
      };
    } catch (error) {
      logger.error('Error getting celebrity metrics:', error);
      throw error;
    }
  }

  /**
   * Get user analytics and engagement metrics
   */
  async getUserMetrics(organizationId = null, dateRange = '30d') {
    try {
      const days = this.parseDateRange(dateRange);
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const orgFilter = organizationId ? `AND organization_id = '${organizationId}'` : '';

      // User registration trends
      const { data: registrationTrends } = await supabaseAdmin.rpc('exec_sql', {
        sql_query: `
          SELECT 
            DATE(created_at) as date,
            COUNT(*) as new_users,
            COUNT(CASE WHEN role = 'user' THEN 1 END) as regular_users,
            COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_users
          FROM app_users
          WHERE created_at >= '${startDate.toISOString()}'
          ${orgFilter}
          GROUP BY DATE(created_at)
          ORDER BY date DESC
          LIMIT 30
        `
      });

      // User activity metrics
      const { data: activityMetrics } = await supabaseAdmin.rpc('exec_sql', {
        sql_query: `
          SELECT 
            COUNT(DISTINCT u.id) as total_users,
            COUNT(DISTINCT CASE WHEN u.last_login >= '${startDate.toISOString()}' THEN u.id END) as active_users,
            COUNT(DISTINCT CASE WHEN u.created_at >= '${startDate.toISOString()}' THEN u.id END) as new_users,
            COUNT(DISTINCT CASE WHEN b.user_id IS NOT NULL THEN u.id END) as users_with_bookings
          FROM app_users u
          LEFT JOIN bookings b ON b.user_id = u.id
          WHERE u.is_active = true
          ${orgFilter}
        `
      });

      // User engagement by role
      const { data: engagementByRole } = await supabaseAdmin.rpc('exec_sql', {
        sql_query: `
          SELECT 
            role,
            COUNT(*) as user_count,
            COUNT(CASE WHEN last_login >= '${startDate.toISOString()}' THEN 1 END) as active_count,
            AVG(EXTRACT(EPOCH FROM (COALESCE(last_login, created_at) - created_at)) / 86400) as avg_days_since_signup
          FROM app_users
          WHERE is_active = true
          ${orgFilter}
          GROUP BY role
          ORDER BY user_count DESC
        `
      });

      const metrics = activityMetrics?.[0] || {};
      const retentionRate = metrics.total_users > 0 
        ? (metrics.active_users / metrics.total_users * 100).toFixed(2)
        : 0;

      return {
        summary: {
          totalUsers: parseInt(metrics.total_users || 0),
          activeUsers: parseInt(metrics.active_users || 0),
          newUsers: parseInt(metrics.new_users || 0),
          usersWithBookings: parseInt(metrics.users_with_bookings || 0),
          retentionRate: parseFloat(retentionRate)
        },
        registrationTrends: registrationTrends || [],
        engagementByRole: engagementByRole || []
      };
    } catch (error) {
      logger.error('Error getting user metrics:', error);
      throw error;
    }
  }

  /**
   * Get trend data for charts and graphs
   */
  async getTrendData(organizationId = null, dateRange = '30d') {
    try {
      const days = this.parseDateRange(dateRange);
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const orgFilter = organizationId ? `AND organization_id = '${organizationId}'` : '';

      // Daily metrics for trending
      const { data: dailyMetrics } = await supabaseAdmin.rpc('exec_sql', {
        sql_query: `
          SELECT 
            date,
            metric_type,
            value
          FROM daily_metrics
          WHERE date >= '${startDate.toISOString().split('T')[0]}'
          ${orgFilter}
          ORDER BY date DESC, metric_type
        `
      });

      // Process data for charting
      const trendData = this.processTrendData(dailyMetrics);

      return trendData;
    } catch (error) {
      logger.error('Error getting trend data:', error);
      throw error;
    }
  }

  /**
   * Get top performing celebrities
   */
  async getTopCelebrities(organizationId = null, limit = 10) {
    try {
      const orgFilter = organizationId ? `AND b.organization_id = '${organizationId}'` : '';

      const { data: topCelebrities } = await supabaseAdmin.rpc('exec_sql', {
        sql_query: `
          SELECT 
            c.id,
            c.name,
            c.category,
            c.image_url,
            COUNT(b.id) as booking_count,
            SUM(b.total_amount) as total_revenue,
            AVG(b.total_amount) as average_booking_value,
            cm.value as popularity_score
          FROM celebrities c
          LEFT JOIN bookings b ON b.celebrity_id = c.id 
            AND b.created_at >= NOW() - INTERVAL '30 days'
          LEFT JOIN celebrity_metrics cm ON cm.celebrity_id = c.id 
            AND cm.metric_type = 'popularity_score'
          WHERE c.is_active = true
          ${orgFilter}
          GROUP BY c.id, c.name, c.category, c.image_url, cm.value
          ORDER BY total_revenue DESC NULLS LAST, booking_count DESC
          LIMIT ${limit}
        `
      });

      return topCelebrities || [];
    } catch (error) {
      logger.error('Error getting top celebrities:', error);
      throw error;
    }
  }

  /**
   * Get recent bookings for dashboard
   */
  async getRecentBookings(organizationId = null, limit = 10) {
    try {
      const orgFilter = organizationId ? `AND b.organization_id = '${organizationId}'` : '';

      const { data: recentBookings } = await supabaseAdmin.rpc('exec_sql', {
        sql_query: `
          SELECT 
            b.id,
            b.status,
            b.total_amount,
            b.event_type,
            b.event_date,
            b.created_at,
            c.name as celebrity_name,
            c.category as celebrity_category,
            u.first_name || ' ' || u.last_name as client_name
          FROM bookings b
          LEFT JOIN celebrities c ON c.id = b.celebrity_id
          LEFT JOIN app_users u ON u.id = b.user_id
          WHERE b.created_at >= NOW() - INTERVAL '7 days'
          ${orgFilter}
          ORDER BY b.created_at DESC
          LIMIT ${limit}
        `
      });

      return recentBookings || [];
    } catch (error) {
      logger.error('Error getting recent bookings:', error);
      throw error;
    }
  }

  /**
   * Update daily metrics (should be called by cron job)
   */
  async updateDailyMetrics(date = null, organizationId = null) {
    try {
      const targetDate = date ? new Date(date) : new Date();
      const dateStr = targetDate.toISOString().split('T')[0];

      // Calculate metrics for the day
      const metrics = await this.calculateDailyMetrics(targetDate, organizationId);

      // Insert or update metrics
      for (const [metricType, value] of Object.entries(metrics)) {
        await supabaseAdmin
          .from('daily_metrics')
          .upsert({
            date: dateStr,
            metric_type: metricType,
            organization_id: organizationId,
            value: value,
            metadata: { calculated_at: new Date().toISOString() }
          }, {
            onConflict: 'date,metric_type,organization_id'
          });
      }

      logger.info(`Daily metrics updated for ${dateStr}`, { organizationId });
      return { success: true, date: dateStr, metricsCount: Object.keys(metrics).length };
    } catch (error) {
      logger.error('Error updating daily metrics:', error);
      throw error;
    }
  }

  /**
   * Generate revenue forecast
   */
  async generateRevenueForecast(organizationId = null, historicalData = null) {
    try {
      if (!historicalData) {
        // Get last 12 months of revenue data
        const { data } = await supabaseAdmin.rpc('exec_sql', {
          sql_query: `
            SELECT 
              TO_CHAR(created_at, 'YYYY-MM') as month,
              SUM(total_amount) as revenue
            FROM bookings
            WHERE created_at >= NOW() - INTERVAL '12 months'
            ${organizationId ? `AND organization_id = '${organizationId}'` : ''}
            GROUP BY TO_CHAR(created_at, 'YYYY-MM')
            ORDER BY month ASC
          `
        });
        historicalData = data || [];
      }

      if (historicalData.length < 3) {
        return { error: 'Insufficient data for forecasting' };
      }

      // Simple linear regression for forecasting
      const revenues = historicalData.map(d => parseFloat(d.revenue));
      const xValues = revenues.map((_, index) => index);
      
      const n = revenues.length;
      const sumX = xValues.reduce((a, b) => a + b, 0);
      const sumY = revenues.reduce((a, b) => a + b, 0);
      const sumXY = xValues.reduce((sum, x, i) => sum + x * revenues[i], 0);
      const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);

      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;

      // Generate next 6 months forecast
      const forecast = [];
      for (let i = 1; i <= 6; i++) {
        const nextIndex = n + i - 1;
        const predictedRevenue = slope * nextIndex + intercept;
        
        const futureDate = new Date();
        futureDate.setMonth(futureDate.getMonth() + i);
        
        forecast.push({
          month: futureDate.toISOString().slice(0, 7),
          projected_revenue: Math.max(0, predictedRevenue),
          confidence: Math.max(0.3, 1 - (i * 0.1)) // Decreasing confidence over time
        });
      }

      return forecast;
    } catch (error) {
      logger.error('Error generating revenue forecast:', error);
      return { error: error.message };
    }
  }

  /**
   * Helper methods
   */
  parseDateRange(dateRange) {
    const match = dateRange.match(/(\d+)([dDwWmMyY])/);
    if (!match) return 30; // Default to 30 days

    const [, number, unit] = match;
    const multipliers = { d: 1, w: 7, m: 30, y: 365 };
    return parseInt(number) * (multipliers[unit.toLowerCase()] || 1);
  }

  async calculateDailyMetrics(date, organizationId) {
    const dateStr = date.toISOString().split('T')[0];
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    const nextDateStr = nextDate.toISOString().split('T')[0];
    
    const orgFilter = organizationId ? `AND organization_id = '${organizationId}'` : '';

    // Calculate various metrics for the day
    const { data: bookingMetrics } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: `
        SELECT 
          COUNT(*) as total_bookings,
          COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_bookings,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_bookings,
          SUM(total_amount) as total_revenue,
          AVG(total_amount) as average_booking_value
        FROM bookings
        WHERE DATE(created_at) = '${dateStr}'
        ${orgFilter}
      `
    });

    const metrics = bookingMetrics?.[0] || {};
    return {
      [this.metricTypes.BOOKING.TOTAL_BOOKINGS]: parseInt(metrics.total_bookings || 0),
      [this.metricTypes.BOOKING.CONFIRMED_BOOKINGS]: parseInt(metrics.confirmed_bookings || 0),
      [this.metricTypes.BOOKING.PENDING_BOOKINGS]: parseInt(metrics.pending_bookings || 0),
      [this.metricTypes.REVENUE.DAILY_REVENUE]: parseFloat(metrics.total_revenue || 0),
      [this.metricTypes.BOOKING.AVERAGE_BOOKING_VALUE]: parseFloat(metrics.average_booking_value || 0)
    };
  }

  async updateCelebrityMetrics(celebrityStats) {
    for (const celebrity of celebrityStats) {
      try {
        // Update multiple metrics for each celebrity
        const metrics = [
          { type: this.metricTypes.CELEBRITY.BOOKING_REQUESTS, value: celebrity.total_bookings },
          { type: this.metricTypes.CELEBRITY.EARNINGS_YTD, value: celebrity.total_revenue },
          { type: this.metricTypes.CELEBRITY.BOOKING_COMPLETION_RATE, value: celebrity.conversion_rate }
        ];

        for (const metric of metrics) {
          await supabaseAdmin
            .from('celebrity_metrics')
            .upsert({
              celebrity_id: celebrity.id,
              metric_type: metric.type,
              value: metric.value || 0
            }, {
              onConflict: 'celebrity_id,metric_type'
            });
        }
      } catch (error) {
        logger.error(`Error updating metrics for celebrity ${celebrity.id}:`, error);
      }
    }
  }

  processTrendData(dailyMetrics) {
    const trends = {};
    
    for (const metric of dailyMetrics || []) {
      if (!trends[metric.metric_type]) {
        trends[metric.metric_type] = [];
      }
      trends[metric.metric_type].push({
        date: metric.date,
        value: parseFloat(metric.value)
      });
    }

    return trends;
  }
}

module.exports = new AnalyticsService();