const deepseekService = require('../services/deepseekService');
const { logger } = require('../utils/logger');
const { supabase } = require('../config/supabase');

const deepseekController = {
  // Get smart booking recommendations
  async getBookingRecommendations(req, res) {
    try {
      const userId = req.user.id;
      const { preferences, includeMarketData = true } = req.body;

      // Gather user context for personalized recommendations
      const userContext = await this.buildUserContext(userId, preferences, includeMarketData);

      const result = await deepseekService.generateBookingRecommendations(userContext);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.recommendations,
        meta: {
          aiGenerated: result.aiGenerated,
          model: result.model,
          fallback: result.fallback || false
        }
      });
    } catch (error) {
      logger.error('Get booking recommendations error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate booking recommendations'
      });
    }
  },

  // Get event planning advice
  async getEventPlanningAdvice(req, res) {
    try {
      const { eventDetails } = req.body;

      if (!eventDetails || !eventDetails.eventType) {
        return res.status(400).json({
          success: false,
          error: 'Event details and type are required'
        });
      }

      const result = await deepseekService.generateEventPlanningAdvice(eventDetails);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.advice,
        meta: {
          aiGenerated: result.aiGenerated,
          model: result.model,
          fallback: result.fallback || false
        }
      });
    } catch (error) {
      logger.error('Get event planning advice error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate event planning advice'
      });
    }
  },

  // Get pricing optimization recommendations
  async getPricingOptimization(req, res) {
    try {
      const { celebrityId, eventDetails } = req.body;

      if (!celebrityId) {
        return res.status(400).json({
          success: false,
          error: 'Celebrity ID is required'
        });
      }

      // Get celebrity details and build pricing context
      const pricingContext = await this.buildPricingContext(celebrityId, eventDetails);

      const result = await deepseekService.optimizePricing(pricingContext);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.pricing,
        meta: {
          aiGenerated: result.aiGenerated,
          model: result.model,
          fallback: result.fallback || false
        }
      });
    } catch (error) {
      logger.error('Get pricing optimization error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate pricing optimization'
      });
    }
  },

  // Get market trend analysis
  async getMarketAnalysis(req, res) {
    try {
      const { timeframe = '6months', categories = [] } = req.query;

      // Build market data context
      const marketData = await this.buildMarketDataContext(timeframe, categories);

      const result = await deepseekService.analyzeMarketTrends(marketData);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.analysis,
        meta: {
          aiGenerated: result.aiGenerated,
          model: result.model,
          fallback: result.fallback || false,
          timeframe,
          categories
        }
      });
    } catch (error) {
      logger.error('Get market analysis error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate market analysis'
      });
    }
  },

  // Get contract and legal advice
  async getContractAdvice(req, res) {
    try {
      const { contractDetails } = req.body;

      if (!contractDetails || !contractDetails.celebrity) {
        return res.status(400).json({
          success: false,
          error: 'Contract details with celebrity information are required'
        });
      }

      const result = await deepseekService.generateContractAdvice(contractDetails);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.advice,
        meta: {
          aiGenerated: result.aiGenerated,
          model: result.model,
          fallback: result.fallback || false,
          disclaimer: result.disclaimer
        }
      });
    } catch (error) {
      logger.error('Get contract advice error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate contract advice'
      });
    }
  },

  // Smart assistant chat interface
  async chatWithAssistant(req, res) {
    try {
      const { message, context = {} } = req.body;

      if (!message) {
        return res.status(400).json({
          success: false,
          error: 'Message is required'
        });
      }

      // Determine intent and route to appropriate service
      const intent = this.determineIntent(message);
      let result;

      switch (intent.type) {
        case 'booking_recommendation':
          const userContext = await this.buildUserContext(req.user.id, context);
          result = await deepseekService.generateBookingRecommendations(userContext);
          break;

        case 'event_planning':
          result = await deepseekService.generateEventPlanningAdvice(context);
          break;

        case 'pricing':
          const pricingContext = await this.buildPricingContext(context.celebrityId, context);
          result = await deepseekService.optimizePricing(pricingContext);
          break;

        case 'market_analysis':
          const marketData = await this.buildMarketDataContext('3months', []);
          result = await deepseekService.analyzeMarketTrends(marketData);
          break;

        default:
          // General chat - provide helpful response
          result = {
            success: true,
            response: "I'm your smart booking assistant! I can help you with:\n\n• Celebrity booking recommendations\n• Event planning advice\n• Pricing optimization\n• Market trend analysis\n• Contract guidance\n\nWhat would you like assistance with?",
            suggestions: [
              "Show me booking recommendations",
              "Help plan my upcoming event",
              "Analyze current market trends",
              "Optimize pricing for my booking"
            ]
          };
      }

      res.json({
        success: true,
        data: {
          response: result.response || result.recommendations || result.advice || result.analysis,
          intent: intent.type,
          suggestions: result.suggestions || []
        },
        meta: {
          aiGenerated: result.aiGenerated,
          model: result.model,
          fallback: result.fallback || false
        }
      });
    } catch (error) {
      logger.error('Chat with assistant error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process chat message'
      });
    }
  },

  // Helper methods
  async buildUserContext(userId, preferences = {}, includeMarketData = true) {
    try {
      // Get user's organization
      const { data: user } = await supabase
        .from('app_users')
        .select('organization_id, first_name, last_name')
        .eq('id', userId)
        .single();

      // Get recent bookings
      const { data: recentBookings } = await supabase
        .from('bookings')
        .select(`
          *,
          celebrities(name, category, base_price)
        `)
        .eq('created_by', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      // Get available celebrities
      const { data: availableCelebrities } = await supabase
        .from('celebrities')
        .select('*')
        .eq('is_available', true)
        .eq('organization_id', user.organization_id)
        .limit(20);

      // Get upcoming events
      const { data: upcomingEvents } = await supabase
        .from('bookings')
        .select('*')
        .eq('created_by', userId)
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true })
        .limit(5);

      return {
        organization: `${user.first_name} ${user.last_name}'s Organization`,
        recentBookings,
        availableCelebrities,
        upcomingEvents,
        preferences,
        marketTrends: includeMarketData ? await this.getBasicMarketTrends() : {}
      };
    } catch (error) {
      logger.error('Error building user context:', error);
      return { organization: 'Unknown', recentBookings: [], availableCelebrities: [] };
    }
  },

  async buildPricingContext(celebrityId, eventDetails = {}) {
    try {
      // Get celebrity details
      const { data: celebrity } = await supabase
        .from('celebrities')
        .select('*')
        .eq('id', celebrityId)
        .single();

      if (!celebrity) {
        throw new Error('Celebrity not found');
      }

      // Get historical pricing data for similar bookings
      const { data: historicalData } = await supabase
        .from('bookings')
        .select('total_amount, event_date, status')
        .eq('celebrity_id', celebrityId)
        .eq('status', 'confirmed')
        .order('event_date', { ascending: false })
        .limit(10);

      return {
        celebrity: celebrity.name,
        category: celebrity.category,
        basePrice: celebrity.base_price,
        eventType: eventDetails.eventType || 'General Event',
        date: eventDetails.date || new Date().toISOString(),
        duration: eventDetails.duration || '2-3 hours',
        location: eventDetails.location || 'TBD',
        marketDemand: 'Average', // This could be calculated based on recent booking trends
        historicalData: historicalData || []
      };
    } catch (error) {
      logger.error('Error building pricing context:', error);
      return {
        celebrity: 'Unknown',
        category: 'General',
        basePrice: 10000,
        eventType: 'Event',
        date: new Date().toISOString()
      };
    }
  },

  async buildMarketDataContext(timeframe, categories) {
    try {
      const startDate = this.getStartDateForTimeframe(timeframe);

      // Get booking volume trends
      const { data: bookingVolume } = await supabase
        .from('bookings')
        .select('created_at, status, total_amount')
        .gte('created_at', startDate)
        .order('created_at', { ascending: true });

      // Get category performance
      const { data: categoryData } = await supabase
        .from('bookings')
        .select(`
          total_amount,
          celebrities(category)
        `)
        .gte('created_at', startDate)
        .eq('status', 'confirmed');

      return {
        bookingVolume: this.processBookingVolume(bookingVolume),
        categoryPerformance: this.processCategoryPerformance(categoryData),
        timeframe,
        categories
      };
    } catch (error) {
      logger.error('Error building market data context:', error);
      return { bookingVolume: {}, categoryPerformance: {} };
    }
  },

  getStartDateForTimeframe(timeframe) {
    const now = new Date();
    switch (timeframe) {
      case '1month':
        return new Date(now.setMonth(now.getMonth() - 1)).toISOString();
      case '3months':
        return new Date(now.setMonth(now.getMonth() - 3)).toISOString();
      case '6months':
        return new Date(now.setMonth(now.getMonth() - 6)).toISOString();
      case '1year':
        return new Date(now.setFullYear(now.getFullYear() - 1)).toISOString();
      default:
        return new Date(now.setMonth(now.getMonth() - 6)).toISOString();
    }
  },

  processBookingVolume(bookings) {
    // Process booking data into volume trends
    const monthlyVolume = {};
    bookings.forEach(booking => {
      const month = new Date(booking.created_at).toISOString().substring(0, 7);
      if (!monthlyVolume[month]) {
        monthlyVolume[month] = { count: 0, revenue: 0 };
      }
      monthlyVolume[month].count++;
      monthlyVolume[month].revenue += booking.total_amount || 0;
    });
    return monthlyVolume;
  },

  processCategoryPerformance(bookings) {
    // Process category performance data
    const categoryStats = {};
    bookings.forEach(booking => {
      const category = booking.celebrities?.category || 'Unknown';
      if (!categoryStats[category]) {
        categoryStats[category] = { count: 0, revenue: 0 };
      }
      categoryStats[category].count++;
      categoryStats[category].revenue += booking.total_amount || 0;
    });
    return categoryStats;
  },

  async getBasicMarketTrends() {
    // Simple market trends - in production this would be more sophisticated
    return {
      trending_categories: ['Musicians', 'Influencers', 'Athletes'],
      average_booking_value: 25000,
      peak_seasons: ['Q4', 'Summer'],
      growth_rate: 15.2
    };
  },

  determineIntent(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('recommend') || lowerMessage.includes('suggest') || lowerMessage.includes('celebrity')) {
      return { type: 'booking_recommendation', confidence: 0.8 };
    }
    
    if (lowerMessage.includes('event') || lowerMessage.includes('plan') || lowerMessage.includes('organize')) {
      return { type: 'event_planning', confidence: 0.8 };
    }
    
    if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('budget')) {
      return { type: 'pricing', confidence: 0.8 };
    }
    
    if (lowerMessage.includes('market') || lowerMessage.includes('trend') || lowerMessage.includes('analysis')) {
      return { type: 'market_analysis', confidence: 0.8 };
    }
    
    return { type: 'general', confidence: 0.5 };
  }
};

module.exports = deepseekController;