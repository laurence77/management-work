const { logger } = require('../utils/logger');

class AIService {
  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY;
    this.baseUrl = 'https://api.deepseek.com/v1';
    
    if (!this.apiKey) {
      logger.warn('DeepSeek API key not configured. Using fallback mode.');
    }
  }

  async makeRequest(messages, maxTokens = 2000, temperature = 0.7) {
    if (!this.apiKey) {
      throw new Error('DeepSeek API key not configured');
    }

    try {
      const fetch = (await import('node-fetch')).default;
      
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages,
          max_tokens: maxTokens,
          temperature,
        }),
      });

      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error('DeepSeek API request failed:', error);
      throw error;
    }
  }

  // Generate booking suggestions based on user preferences and historical data
  async generateBookingSuggestions(userContext) {
    try {
      const { userHistory, preferences, currentCelebrities, seasonalData } = userContext;

      const systemPrompt = `You are an expert celebrity booking consultant for a luxury entertainment platform. Your responses will be displayed in a modern web interface, so provide clear, actionable, and visually appealing recommendations.

CRITICAL: Return ONLY valid JSON - no markdown, no explanations, no text outside the JSON structure.

Context:
- Available celebrities: ${JSON.stringify(currentCelebrities?.slice(0, 10) || [])}
- User booking history: ${JSON.stringify(userHistory || [])}
- User preferences: ${JSON.stringify(preferences || {})}
- Current season/trends: ${JSON.stringify(seasonalData || {})}

Generate exactly 4 celebrity booking suggestions optimized for frontend display. Each suggestion must include:

Required JSON structure:
[
  {
    "celebrity": "Celebrity Name",
    "category": "Music/Sports/Entertainment/Business",
    "timeframe": "Specific timeframe (e.g., 'Next 30-45 days', 'Q4 2024')",
    "eventType": "Specific event type",
    "reasoning": "2-3 sentence explanation why this is perfect for the user",
    "estimatedCost": "Price range (e.g., '$25,000 - $50,000')",
    "popularity": "High/Medium/Trending",
    "availability": "High/Medium/Limited",
    "matchScore": 85,
    "benefits": ["Benefit 1", "Benefit 2", "Benefit 3"],
    "riskLevel": "Low/Medium/High",
    "bookingUrgency": "High/Medium/Low"
  }
]

Focus on practical, profitable recommendations that match user patterns and current market demand.`;

      const completion = await this.makeRequest([
        { role: "system", content: systemPrompt },
        { role: "user", content: "Generate booking suggestions for this user." }
      ], 2000, 0.7);

      const suggestions = JSON.parse(completion.choices[0].message.content);
      return { success: true, suggestions };

    } catch (error) {
      logger.error('AI suggestion generation failed:', error);
      return { 
        success: false, 
        error: 'Failed to generate suggestions',
        fallbackSuggestions: this.getFallbackSuggestions()
      };
    }
  }

  // Auto-fill booking form based on user behavior and preferences
  async generateFormSuggestions(formContext) {
    try {
      const { selectedCelebrity, userHistory, eventType, partialData } = formContext;

      const systemPrompt = `You are an intelligent form assistant for a celebrity booking platform. Generate smart auto-fill suggestions optimized for user experience and frontend display.

CRITICAL: Return ONLY valid JSON - no markdown, no explanations, no text outside the JSON structure.

Context:
- Selected celebrity: ${JSON.stringify(selectedCelebrity || {})}
- User's previous bookings: ${JSON.stringify(userHistory || [])}
- Event type: ${eventType || 'not specified'}
- Partial form data: ${JSON.stringify(partialData || {})}

Generate form field suggestions with the exact JSON structure:
{
  "duration": {
    "value": 2,
    "unit": "hours",
    "confidence": 0.9,
    "reasoning": "Standard duration for this event type",
    "alternatives": [1, 3, 4],
    "displayText": "2 hours (recommended)"
  },
  "location": {
    "value": "Los Angeles, CA",
    "confidence": 0.8,
    "reasoning": "Popular venue location for celebrity events",
    "alternatives": ["New York, NY", "Miami, FL", "Las Vegas, NV"],
    "displayText": "Los Angeles, CA (celebrity hub)"
  },
  "timeSlot": {
    "value": "Evening (7:00 PM - 11:00 PM)",
    "confidence": 0.85,
    "reasoning": "Optimal time for celebrity availability",
    "alternatives": ["Afternoon (2:00 PM - 6:00 PM)", "Late Evening (8:00 PM - 12:00 AM)"],
    "displayText": "Evening slot (prime time)"
  },
  "specialRequests": {
    "value": ["Professional photography", "Security team", "VIP catering"],
    "confidence": 0.75,
    "reasoning": "Common add-ons for this celebrity type",
    "displayText": "Recommended packages"
  },
  "budget": {
    "value": "50000-75000",
    "confidence": 0.7,
    "reasoning": "Typical range for this celebrity and event type",
    "displayText": "$50,000 - $75,000 (estimated range)"
  }
}

Focus on practical, user-friendly suggestions that improve booking success rates.`;

      const completion = await this.makeRequest([
        { role: "system", content: systemPrompt },
        { role: "user", content: "Generate form suggestions based on this context." }
      ], 1000, 0.5);

      const suggestions = JSON.parse(completion.choices[0].message.content);
      return { success: true, suggestions };

    } catch (error) {
      logger.error('AI form suggestion failed:', error);
      return { 
        success: false, 
        error: 'Failed to generate form suggestions',
        suggestions: this.getBasicFormSuggestions(formContext)
      };
    }
  }

  // Generate event planning suggestions
  async generateEventPlanningAdvice(eventContext) {
    try {
      const { celebrity, eventType, date, location, budget, guestCount } = eventContext;

      const systemPrompt = `You are a premium event planning consultant specializing in celebrity events. Generate comprehensive planning advice formatted for a professional dashboard interface.

CRITICAL: Return ONLY valid JSON - no markdown, no explanations, no text outside the JSON structure.

Event Details:
- Celebrity: ${JSON.stringify(celebrity || {})}
- Event type: ${eventType}
- Date: ${date}
- Location: ${location}
- Budget: ${budget}
- Guest count: ${guestCount}

Generate event planning advice with this exact JSON structure:
{
  "timeline": {
    "phases": [
      {
        "phase": "Planning Phase",
        "duration": "8-12 weeks before",
        "tasks": ["Task 1", "Task 2", "Task 3"],
        "priority": "High",
        "status": "pending"
      }
    ],
    "criticalMilestones": ["Milestone 1", "Milestone 2"]
  },
  "venue": {
    "requirements": ["Requirement 1", "Requirement 2"],
    "recommendations": ["Venue type 1", "Venue type 2"],
    "considerations": ["Security needs", "Accessibility", "Capacity"],
    "alternatives": ["Backup option 1", "Backup option 2"]
  },
  "services": {
    "essential": [
      {"service": "Security", "cost": "$5000-8000", "priority": "High"},
      {"service": "Photography", "cost": "$2000-4000", "priority": "Medium"}
    ],
    "optional": [
      {"service": "Live streaming", "cost": "$3000-5000", "priority": "Low"}
    ]
  },
  "budget": {
    "allocation": {
      "celebrity": 60,
      "venue": 15,
      "services": 20,
      "contingency": 5
    },
    "breakdown": [
      {"category": "Celebrity fee", "amount": "60%", "estimated": "$${Math.round(budget * 0.6)}"},
      {"category": "Venue & catering", "amount": "15%", "estimated": "$${Math.round(budget * 0.15)}"}
    ]
  },
  "challenges": [
    {
      "challenge": "Challenge description",
      "impact": "High/Medium/Low",
      "solution": "Mitigation strategy",
      "prevention": "Prevention steps"
    }
  ],
  "successFactors": [
    {"factor": "Success factor", "importance": "Critical/Important/Nice-to-have"}
  ],
  "riskAssessment": {
    "overall": "Low/Medium/High",
    "factors": ["Risk 1", "Risk 2"],
    "mitigation": ["Strategy 1", "Strategy 2"]
  }
}

Focus on actionable, professional advice that ensures event success.`;

      const completion = await this.makeRequest([
        { role: "system", content: systemPrompt },
        { role: "user", content: "Provide event planning advice for this celebrity booking." }
      ], 1500, 0.6);

      const advice = JSON.parse(completion.choices[0].message.content);
      return { success: true, advice };

    } catch (error) {
      logger.error('AI event planning advice failed:', error);
      return { 
        success: false, 
        error: 'Failed to generate event advice',
        advice: this.getBasicEventAdvice(eventContext)
      };
    }
  }

  // Analyze booking trends and generate insights
  async analyzeBookingTrends(analyticsData) {
    try {
      const { bookings, revenue, seasonality, userBehavior } = analyticsData;

      const systemPrompt = `You are a senior business intelligence analyst specializing in luxury entertainment and celebrity booking markets. Generate executive-level insights formatted for dashboard visualization.

CRITICAL: Return ONLY valid JSON - no markdown, no explanations, no text outside the JSON structure.

Data Context:
- Recent bookings: ${JSON.stringify(bookings?.slice(0, 50) || [])}
- Revenue trends: ${JSON.stringify(revenue || {})}
- Seasonal patterns: ${JSON.stringify(seasonality || {})}
- User behavior: ${JSON.stringify(userBehavior || {})}

Generate comprehensive business insights with this exact JSON structure:
{
  "trends": [
    {
      "trend": "Trend description",
      "direction": "up/down/stable",
      "impact": "High/Medium/Low",
      "timeframe": "Short-term/Long-term",
      "confidence": 85,
      "metrics": {
        "change": "+15%",
        "period": "vs last quarter"
      }
    }
  ],
  "opportunities": [
    {
      "opportunity": "Opportunity description",
      "potential": "High/Medium/Low",
      "investment": "$10,000 - $25,000",
      "timeline": "3-6 months",
      "roi": "200-300%",
      "actions": ["Action 1", "Action 2"]
    }
  ],
  "predictions": [
    {
      "prediction": "Market prediction",
      "timeframe": "Q4 2024",
      "probability": 75,
      "impact": "Positive/Negative/Neutral",
      "factors": ["Factor 1", "Factor 2"]
    }
  ],
  "recommendations": [
    {
      "action": "Recommended action",
      "priority": "High/Medium/Low",
      "urgency": "Immediate/Week/Month",
      "effort": "Low/Medium/High",
      "expectedImpact": "Increase bookings by 25%",
      "resources": ["Resource 1", "Resource 2"]
    }
  ],
  "risks": [
    {
      "risk": "Risk description",
      "severity": "High/Medium/Low",
      "probability": 30,
      "impact": "Revenue/Operations/Reputation",
      "mitigation": ["Strategy 1", "Strategy 2"],
      "monitoring": "Weekly KPI review"
    }
  ],
  "kpis": {
    "bookingRate": {
      "current": "75%",
      "target": "85%",
      "trend": "up"
    },
    "averageValue": {
      "current": "$45,000",
      "target": "$55,000",
      "trend": "stable"
    },
    "customerSatisfaction": {
      "current": "4.2/5",
      "target": "4.5/5",
      "trend": "up"
    }
  },
  "marketHealth": {
    "overall": "Strong/Moderate/Weak",
    "demand": "High/Medium/Low",
    "competition": "Increasing/Stable/Decreasing",
    "priceStability": "Stable/Volatile"
  }
}

Focus on actionable insights that drive revenue growth and operational efficiency.`;

      const completion = await this.makeRequest([
        { role: "system", content: systemPrompt },
        { role: "user", content: "Analyze this booking platform data and provide business insights." }
      ], 2000, 0.4);

      const insights = JSON.parse(completion.choices[0].message.content);
      return { success: true, insights };

    } catch (error) {
      logger.error('AI trend analysis failed:', error);
      return { 
        success: false, 
        error: 'Failed to analyze trends',
        insights: this.getBasicTrendAnalysis(analyticsData)
      };
    }
  }

  // Fallback suggestions when AI fails
  getFallbackSuggestions() {
    return [
      {
        celebrity: 'Featured Celebrity',
        timeframe: 'Next 30 days',
        eventType: 'Corporate Event',
        reasoning: 'Popular choice for business events',
        estimatedCost: 'Contact for pricing'
      },
      {
        celebrity: 'Available Celebrity',
        timeframe: 'Weekend dates',
        eventType: 'Private Party',
        reasoning: 'High availability on weekends',
        estimatedCost: 'Starting from advertised rate'
      }
    ];
  }

  getBasicFormSuggestions(context) {
    return {
      duration: { value: 2, confidence: 0.7, reasoning: 'Standard event duration' },
      location: { value: 'Los Angeles, CA', confidence: 0.5, reasoning: 'Popular event location' },
      specialRequests: { value: 'Professional photography', confidence: 0.6, reasoning: 'Common add-on service' }
    };
  }

  getBasicEventAdvice(context) {
    return {
      timeline: ['Book 30-60 days in advance', 'Confirm details 1 week prior'],
      venue: ['Consider celebrity preferences', 'Ensure adequate security'],
      services: ['Professional photography', 'Security team', 'Transportation'],
      budget: ['Allocate 60% for celebrity fee', '40% for additional services'],
      challenges: ['Scheduling conflicts', 'Privacy requirements'],
      success: ['Clear communication', 'Detailed planning', 'Backup plans']
    };
  }

  getBasicTrendAnalysis(data) {
    return {
      trends: ['Increasing demand for virtual events', 'Corporate bookings growing'],
      opportunities: ['Weekend premium pricing', 'Package deals'],
      predictions: ['Q4 will see increased bookings', 'Virtual events will continue growing'],
      recommendations: ['Focus on corporate clients', 'Develop virtual event packages'],
      risks: ['Economic uncertainty', 'Celebrity availability']
    };
  }
}

module.exports = new AIService();