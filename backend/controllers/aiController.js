const aiService = require('../services/aiService');
const { auditLogger } = require('../utils/logger');

class AIController {
  async getBookingSuggestions(req, res, next) {
    try {
      const { preferences, includeHistory = true } = req.body;
      const userId = req.user.userId;

      // Gather context data
      const userContext = await this.buildUserContext(userId, includeHistory, preferences);
      
      // Generate AI suggestions
      const result = await aiService.generateBookingSuggestions(userContext);

      // Log AI usage
      auditLogger.info('AI booking suggestions generated', {
        userId,
        success: result.success,
        action: 'ai_booking_suggestions'
      });

      res.json({
        success: true,
        data: result.suggestions || result.fallbackSuggestions,
        aiGenerated: result.success,
        message: result.success ? 'AI suggestions generated' : 'Fallback suggestions provided'
      });

    } catch (error) {
      next(error);
    }
  }

  async getFormSuggestions(req, res, next) {
    try {
      const { celebrityId, eventType, partialData } = req.body;
      const userId = req.user.userId;

      // Build form context
      const formContext = await this.buildFormContext(userId, celebrityId, eventType, partialData);
      
      // Generate AI form suggestions
      const result = await aiService.generateFormSuggestions(formContext);

      res.json({
        success: true,
        data: result.suggestions,
        aiGenerated: result.success,
        confidence: this.calculateOverallConfidence(result.suggestions)
      });

    } catch (error) {
      next(error);
    }
  }

  async getEventPlanningAdvice(req, res, next) {
    try {
      const eventContext = req.body;
      const userId = req.user.userId;

      // Generate event planning advice
      const result = await aiService.generateEventPlanningAdvice(eventContext);

      // Log AI usage
      auditLogger.info('AI event planning advice generated', {
        userId,
        eventType: eventContext.eventType,
        success: result.success,
        action: 'ai_event_advice'
      });

      res.json({
        success: true,
        data: result.advice,
        aiGenerated: result.success
      });

    } catch (error) {
      next(error);
    }
  }

  async analyzeBookingTrends(req, res, next) {
    try {
      // Only admins can access trend analysis
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
      }

      const { timeframe = '30d' } = req.query;
      
      // Gather analytics data
      const analyticsData = await this.buildAnalyticsContext(timeframe);
      
      // Generate AI insights
      const result = await aiService.analyzeBookingTrends(analyticsData);

      // Log AI usage
      auditLogger.info('AI trend analysis generated', {
        userId: req.user.userId,
        timeframe,
        success: result.success,
        action: 'ai_trend_analysis'
      });

      res.json({
        success: true,
        data: result.insights,
        aiGenerated: result.success,
        timeframe
      });

    } catch (error) {
      next(error);
    }
  }

  // Helper method to build user context for AI suggestions
  async buildUserContext(userId, includeHistory, preferences) {
    const { supabaseAdmin } = require('../config/supabase');

    try {
      // Get user booking history
      let userHistory = [];
      if (includeHistory) {
        const { data: bookings } = await supabaseAdmin
          .from('bookings')
          .select('celebrity_id, event_type, event_date, total_amount')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10);
        
        userHistory = bookings || [];
      }

      // Get current celebrities
      const { data: celebrities } = await supabaseAdmin
        .from('celebrities')
        .select('id, name, category, price, availability, rating')
        .eq('availability', true)
        .order('rating', { ascending: false })
        .limit(20);

      // Get seasonal data (mock for now - could be from analytics)
      const seasonalData = {
        currentSeason: this.getCurrentSeason(),
        popularCategories: ['Actor', 'Musician', 'Athlete'],
        trendingEvents: ['Corporate Events', 'Private Parties', 'Charity Galas']
      };

      return {
        userHistory,
        preferences,
        currentCelebrities: celebrities || [],
        seasonalData
      };
    } catch (error) {
      console.error('Error building user context:', error);
      return { userHistory: [], preferences, currentCelebrities: [], seasonalData: {} };
    }
  }

  // Helper method to build form context
  async buildFormContext(userId, celebrityId, eventType, partialData) {
    const { supabaseAdmin } = require('../config/supabase');

    try {
      // Get selected celebrity
      const { data: celebrity } = await supabaseAdmin
        .from('celebrities')
        .select('*')
        .eq('id', celebrityId)
        .single();

      // Get user history
      const { data: userHistory } = await supabaseAdmin
        .from('bookings')
        .select('event_type, event_duration, event_location, special_requests')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      return {
        selectedCelebrity: celebrity,
        userHistory: userHistory || [],
        eventType,
        partialData
      };
    } catch (error) {
      console.error('Error building form context:', error);
      return { selectedCelebrity: null, userHistory: [], eventType, partialData };
    }
  }

  // Helper method to build analytics context
  async buildAnalyticsContext(timeframe) {
    const { supabaseAdmin } = require('../config/supabase');

    try {
      const daysBack = this.timeframeToDays(timeframe);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);

      // Get recent bookings
      const { data: bookings } = await supabaseAdmin
        .from('bookings')
        .select('*')
        .gte('created_at', cutoffDate.toISOString())
        .order('created_at', { ascending: false });

      // Calculate revenue trends
      const revenue = this.calculateRevenueTrends(bookings || []);
      
      // Get seasonality patterns
      const seasonality = this.calculateSeasonality(bookings || []);
      
      // Analyze user behavior
      const userBehavior = this.analyzeUserBehavior(bookings || []);

      return {
        bookings: bookings || [],
        revenue,
        seasonality,
        userBehavior
      };
    } catch (error) {
      console.error('Error building analytics context:', error);
      return { bookings: [], revenue: {}, seasonality: {}, userBehavior: {} };
    }
  }

  // Helper methods
  getCurrentSeason() {
    const month = new Date().getMonth() + 1;
    if (month >= 3 && month <= 5) return 'Spring';
    if (month >= 6 && month <= 8) return 'Summer';
    if (month >= 9 && month <= 11) return 'Fall';
    return 'Winter';
  }

  timeframeToDays(timeframe) {
    const mapping = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '365d': 365
    };
    return mapping[timeframe] || 30;
  }

  calculateOverallConfidence(suggestions) {
    if (!suggestions || typeof suggestions !== 'object') return 0;
    
    const confidenceValues = Object.values(suggestions)
      .filter(s => s && typeof s.confidence === 'number')
      .map(s => s.confidence);
    
    if (confidenceValues.length === 0) return 0;
    
    return confidenceValues.reduce((sum, conf) => sum + conf, 0) / confidenceValues.length;
  }

  calculateRevenueTrends(bookings) {
    // Simple revenue calculation - could be more sophisticated
    return {
      total: bookings.reduce((sum, b) => sum + (parseFloat(b.total_amount) || 0), 0),
      average: bookings.length > 0 ? bookings.reduce((sum, b) => sum + (parseFloat(b.total_amount) || 0), 0) / bookings.length : 0,
      count: bookings.length
    };
  }

  calculateSeasonality(bookings) {
    const months = {};
    bookings.forEach(booking => {
      const month = new Date(booking.event_date).getMonth();
      months[month] = (months[month] || 0) + 1;
    });
    return months;
  }

  analyzeUserBehavior(bookings) {
    const behavior = {
      averageLeadTime: 0,
      popularEventTypes: {},
      preferredTimes: {}
    };

    bookings.forEach(booking => {
      // Count event types
      behavior.popularEventTypes[booking.event_type] = 
        (behavior.popularEventTypes[booking.event_type] || 0) + 1;
      
      // Analyze booking times
      const hour = new Date(booking.created_at).getHours();
      const timeSlot = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
      behavior.preferredTimes[timeSlot] = (behavior.preferredTimes[timeSlot] || 0) + 1;
    });

    return behavior;
  }
}

module.exports = new AIController();