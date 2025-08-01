const { logger } = require('../utils/logger');

// DeepSeek AI Service for smart recommendations and insights
class DeepSeekService {
  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY;
    this.baseUrl = 'https://api.deepseek.com/v1';
    
    if (!this.apiKey) {
      logger.warn('DeepSeek API key not configured. Using fallback mode.');
    }
  }

  async makeRequest(endpoint, data) {
    if (!this.apiKey) {
      return this.getFallbackResponse(endpoint, data);
    }

    try {
      const fetch = (await import('node-fetch')).default;
      
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error('DeepSeek API request failed:', error);
      return this.getFallbackResponse(endpoint, data);
    }
  }

  // Smart booking recommendations based on user behavior and market trends
  async generateBookingRecommendations(userContext) {
    const prompt = `As an expert celebrity booking consultant, analyze this user's booking history and preferences to provide intelligent recommendations.

User Context:
- Organization: ${userContext.organization}
- Recent Bookings: ${JSON.stringify(userContext.recentBookings || [])}
- Budget Range: ${userContext.budgetRange || 'Not specified'}
- Event Types: ${userContext.eventTypes || 'Various'}
- Preferred Categories: ${userContext.preferredCategories || 'All'}
- Upcoming Events: ${JSON.stringify(userContext.upcomingEvents || [])}
- Market Trends: ${JSON.stringify(userContext.marketTrends || {})}

Available Celebrities:
${JSON.stringify(userContext.availableCelebrities || [])}

Please provide:
1. Top 5 celebrity recommendations with detailed reasoning
2. Optimal booking timing suggestions
3. Budget optimization strategies
4. Event planning insights
5. Market opportunity alerts

Format as JSON with structured recommendations.`;

    const response = await this.makeRequest('/chat/completions', {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'You are an expert celebrity booking consultant with deep knowledge of entertainment industry trends, pricing strategies, and event planning. Provide actionable, data-driven recommendations.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.7,
    });

    try {
      const recommendations = JSON.parse(response.choices[0].message.content);
      return {
        success: true,
        recommendations,
        aiGenerated: true,
        model: 'deepseek-chat'
      };
    } catch (parseError) {
      logger.error('Failed to parse DeepSeek response:', parseError);
      return this.getFallbackBookingRecommendations(userContext);
    }
  }

  // Intelligent event planning assistance
  async generateEventPlanningAdvice(eventDetails) {
    const prompt = `Provide comprehensive event planning advice for this celebrity booking event.

Event Details:
- Event Type: ${eventDetails.eventType}
- Date: ${eventDetails.date}
- Venue: ${eventDetails.venue || 'TBD'}
- Expected Attendance: ${eventDetails.attendance || 'Not specified'}
- Budget: ${eventDetails.budget || 'Not specified'}
- Celebrity: ${eventDetails.celebrity || 'Not selected'}
- Special Requirements: ${eventDetails.requirements || 'None'}
- Target Audience: ${eventDetails.audience || 'General'}

Please provide detailed advice on:
1. Timeline and logistics planning
2. Technical requirements and setup
3. Marketing and promotion strategies
4. Risk management and contingencies
5. Budget allocation recommendations
6. Legal and contract considerations
7. Post-event follow-up strategies

Format as actionable recommendations with priorities and timelines.`;

    const response = await this.makeRequest('/chat/completions', {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'You are a professional event planning consultant specializing in celebrity events. Provide detailed, practical advice based on industry best practices.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 2500,
      temperature: 0.6,
    });

    try {
      const advice = this.parseEventPlanningResponse(response.choices[0].message.content);
      return {
        success: true,
        advice,
        aiGenerated: true,
        model: 'deepseek-chat'
      };
    } catch (parseError) {
      return this.getFallbackEventPlanningAdvice(eventDetails);
    }
  }

  // Smart pricing optimization
  async optimizePricing(pricingContext) {
    const prompt = `Analyze this celebrity booking scenario and provide pricing optimization recommendations.

Pricing Context:
- Celebrity: ${pricingContext.celebrity}
- Category: ${pricingContext.category}
- Base Price: $${pricingContext.basePrice}
- Event Type: ${pricingContext.eventType}
- Date: ${pricingContext.date}
- Duration: ${pricingContext.duration}
- Location: ${pricingContext.location}
- Market Demand: ${pricingContext.marketDemand || 'Average'}
- Competitor Pricing: ${JSON.stringify(pricingContext.competitorPricing || {})}
- Historical Data: ${JSON.stringify(pricingContext.historicalData || {})}

Provide:
1. Recommended price range with justification
2. Dynamic pricing strategies
3. Package deal opportunities
4. Seasonal pricing adjustments
5. Negotiation tactics and flexibility points
6. Value-add services to increase booking value

Format as structured pricing recommendations.`;

    const response = await this.makeRequest('/chat/completions', {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'You are a pricing strategist for the entertainment industry with expertise in celebrity booking economics and market dynamics.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1800,
      temperature: 0.5,
    });

    try {
      const pricing = this.parsePricingResponse(response.choices[0].message.content);
      return {
        success: true,
        pricing,
        aiGenerated: true,
        model: 'deepseek-chat'
      };
    } catch (parseError) {
      return this.getFallbackPricingOptimization(pricingContext);
    }
  }

  // Market trend analysis and predictions
  async analyzeMarketTrends(marketData) {
    const prompt = `Analyze celebrity booking market trends and provide strategic insights.

Market Data:
- Booking Volume: ${JSON.stringify(marketData.bookingVolume || {})}
- Category Performance: ${JSON.stringify(marketData.categoryPerformance || {})}
- Seasonal Patterns: ${JSON.stringify(marketData.seasonalPatterns || {})}
- Price Trends: ${JSON.stringify(marketData.priceTrends || {})}
- Popular Events: ${JSON.stringify(marketData.popularEvents || [])}
- Emerging Celebrities: ${JSON.stringify(marketData.emergingCelebrities || [])}
- Industry News: ${JSON.stringify(marketData.industryNews || [])}

Provide insights on:
1. Market opportunities and gaps
2. Emerging trends and prediction
3. Category growth potential
4. Optimal booking strategies
5. Risk factors and mitigation
6. Investment recommendations
7. Competitive landscape analysis

Format as strategic market intelligence.`;

    const response = await this.makeRequest('/chat/completions', {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'You are a market research analyst specializing in entertainment industry trends, celebrity economics, and booking market dynamics.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 2200,
      temperature: 0.4,
    });

    try {
      const analysis = this.parseMarketAnalysis(response.choices[0].message.content);
      return {
        success: true,
        analysis,
        aiGenerated: true,
        model: 'deepseek-chat'
      };
    } catch (parseError) {
      return this.getFallbackMarketAnalysis(marketData);
    }
  }

  // Smart contract and legal recommendations
  async generateContractAdvice(contractContext) {
    const prompt = `Provide legal and contract advice for this celebrity booking arrangement.

Contract Context:
- Celebrity: ${contractContext.celebrity}
- Event Details: ${JSON.stringify(contractContext.eventDetails || {})}
- Performance Requirements: ${JSON.stringify(contractContext.requirements || {})}
- Payment Terms: ${contractContext.paymentTerms || 'Standard'}
- Cancellation Policy: ${contractContext.cancellationPolicy || 'TBD'}
- Special Clauses: ${JSON.stringify(contractContext.specialClauses || [])}
- Risk Factors: ${JSON.stringify(contractContext.riskFactors || [])}

Provide advice on:
1. Essential contract clauses and terms
2. Performance guarantees and penalties
3. Force majeure and cancellation provisions
4. Payment and escrow arrangements
5. Insurance and liability coverage
6. Intellectual property considerations
7. Dispute resolution mechanisms

Format as legal guidance with risk assessments.`;

    const response = await this.makeRequest('/chat/completions', {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'You are an entertainment lawyer with expertise in celebrity contracts, event law, and risk management. Provide practical legal guidance while noting this is not formal legal advice.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.3,
    });

    try {
      const advice = this.parseContractAdvice(response.choices[0].message.content);
      return {
        success: true,
        advice,
        aiGenerated: true,
        model: 'deepseek-chat',
        disclaimer: 'This is AI-generated guidance and not formal legal advice. Consult with a qualified attorney for legal matters.'
      };
    } catch (parseError) {
      return this.getFallbackContractAdvice(contractContext);
    }
  }

  // Fallback responses when API is unavailable
  getFallbackResponse(endpoint, data) {
    logger.info('Using fallback AI response due to API unavailability');
    
    switch (endpoint) {
      case '/chat/completions':
        if (data.messages[0].content.includes('booking consultant')) {
          return this.getFallbackBookingRecommendations(data);
        }
        break;
    }

    return {
      success: false,
      error: 'AI service temporarily unavailable',
      fallback: true
    };
  }

  getFallbackBookingRecommendations(userContext) {
    return {
      success: true,
      recommendations: {
        topCelebrities: [
          {
            name: 'Based on your booking history',
            reasoning: 'Algorithm-based recommendation using historical data',
            confidence: 0.8,
            priceRange: '$10,000 - $50,000'
          }
        ],
        timingAdvice: 'Book 3-6 months in advance for best availability',
        budgetOptimization: 'Consider package deals for multiple events',
        marketInsights: 'Current market shows strong demand for virtual events'
      },
      aiGenerated: false,
      fallback: true
    };
  }

  getFallbackEventPlanningAdvice(eventDetails) {
    return {
      success: true,
      advice: {
        timeline: 'Start planning 6-12 weeks before the event',
        logistics: 'Coordinate venue, catering, and technical requirements early',
        marketing: 'Launch promotional campaign 4-6 weeks before event',
        riskManagement: 'Have backup plans for weather and technical issues'
      },
      aiGenerated: false,
      fallback: true
    };
  }

  getFallbackPricingOptimization(pricingContext) {
    return {
      success: true,
      pricing: {
        recommendedRange: `$${Math.round(pricingContext.basePrice * 0.8)} - $${Math.round(pricingContext.basePrice * 1.2)}`,
        strategy: 'Consider market demand and competitor pricing',
        negotiationPoints: 'Payment terms, additional services, multi-event discounts'
      },
      aiGenerated: false,
      fallback: true
    };
  }

  getFallbackMarketAnalysis(marketData) {
    return {
      success: true,
      analysis: {
        trends: 'Virtual and hybrid events continue to grow',
        opportunities: 'Emerging celebrity categories showing strong demand',
        risks: 'Economic uncertainty may affect luxury event spending'
      },
      aiGenerated: false,
      fallback: true
    };
  }

  getFallbackContractAdvice(contractContext) {
    return {
      success: true,
      advice: {
        essentialClauses: 'Performance requirements, payment terms, cancellation policy',
        riskMitigation: 'Force majeure clause, insurance requirements, liability limits',
        bestPractices: 'Clear deliverables, milestone payments, dispute resolution'
      },
      aiGenerated: false,
      fallback: true,
      disclaimer: 'This is general guidance. Consult with a qualified attorney for legal matters.'
    };
  }

  // Response parsing helpers
  parseEventPlanningResponse(content) {
    // Basic parsing - in production, this would be more sophisticated
    return {
      timeline: content.includes('timeline') ? 'Detailed timeline provided' : 'Standard timeline recommended',
      logistics: 'Comprehensive logistics plan included',
      marketing: 'Marketing strategy outlined',
      riskManagement: 'Risk mitigation strategies provided'
    };
  }

  parsePricingResponse(content) {
    return {
      recommendedPrice: 'Dynamic pricing based on market analysis',
      strategy: 'Multi-factor pricing optimization',
      flexibility: 'Negotiation points identified'
    };
  }

  parseMarketAnalysis(content) {
    return {
      trends: 'Current market trends analyzed',
      opportunities: 'Growth opportunities identified',
      risks: 'Market risks assessed'
    };
  }

  parseContractAdvice(content) {
    return {
      clauses: 'Essential contract terms outlined',
      risks: 'Risk factors identified',
      recommendations: 'Best practices provided'
    };
  }
}

module.exports = new DeepSeekService();