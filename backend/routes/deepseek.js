const express = require('express');
const deepseekController = require('../controllers/deepseekController');
const { authenticateToken } = require('../middleware/auth');
const { checkRole } = require('../middleware/rbacMiddleware');
const { validate } = require('../middleware/validation');
const Joi = require('joi');

const router = express.Router();

// Validation schemas
const bookingRecommendationsSchema = Joi.object({
  preferences: Joi.object({
    budgetRange: Joi.string().optional(),
    eventTypes: Joi.array().items(Joi.string()).optional(),
    preferredCategories: Joi.array().items(Joi.string()).optional(),
    timeframe: Joi.string().optional()
  }).optional(),
  includeMarketData: Joi.boolean().default(true)
});

const eventPlanningSchema = Joi.object({
  eventDetails: Joi.object({
    eventType: Joi.string().required(),
    date: Joi.string().optional(),
    venue: Joi.string().optional(),
    attendance: Joi.number().optional(),
    budget: Joi.number().optional(),
    celebrity: Joi.string().optional(),
    requirements: Joi.string().optional(),
    audience: Joi.string().optional()
  }).required()
});

const pricingOptimizationSchema = Joi.object({
  celebrityId: Joi.string().uuid().required(),
  eventDetails: Joi.object({
    eventType: Joi.string().optional(),
    date: Joi.string().optional(),
    duration: Joi.string().optional(),
    location: Joi.string().optional(),
    attendance: Joi.number().optional()
  }).optional()
});

const contractAdviceSchema = Joi.object({
  contractDetails: Joi.object({
    celebrity: Joi.string().required(),
    eventDetails: Joi.object().optional(),
    requirements: Joi.object().optional(),
    paymentTerms: Joi.string().optional(),
    cancellationPolicy: Joi.string().optional(),
    specialClauses: Joi.array().items(Joi.string()).optional(),
    riskFactors: Joi.array().items(Joi.string()).optional()
  }).required()
});

const chatSchema = Joi.object({
  message: Joi.string().required().min(1).max(1000),
  context: Joi.object().optional()
});

// Apply authentication to all DeepSeek routes
router.use(authMiddleware);

// Get smart booking recommendations
router.post('/recommendations/booking',
  RBACMiddleware.requirePermission('bookings.read'),
  validate(bookingRecommendationsSchema),
  deepseekController.getBookingRecommendations
);

// Get event planning advice
router.post('/advice/event-planning',
  RBACMiddleware.requirePermission('bookings.create'),
  validate(eventPlanningSchema),
  deepseekController.getEventPlanningAdvice
);

// Get pricing optimization
router.post('/optimization/pricing',
  RBACMiddleware.requirePermission('bookings.read'),
  validate(pricingOptimizationSchema),
  deepseekController.getPricingOptimization
);

// Get market trend analysis
router.get('/analysis/market',
  RBACMiddleware.requirePermission('analytics.read'),
  deepseekController.getMarketAnalysis
);

// Get contract and legal advice
router.post('/advice/contract',
  RBACMiddleware.requirePermission('bookings.create'),
  validate(contractAdviceSchema),
  deepseekController.getContractAdvice
);

// Smart assistant chat interface
router.post('/chat',
  RBACMiddleware.requirePermission('bookings.read'),
  validate(chatSchema),
  deepseekController.chatWithAssistant
);

// Get assistant capabilities and features
router.get('/capabilities', (req, res) => {
  res.json({
    success: true,
    data: {
      features: [
        {
          name: 'Booking Recommendations',
          description: 'AI-powered celebrity booking suggestions based on your history and preferences',
          endpoint: '/recommendations/booking',
          permissions: ['bookings.read']
        },
        {
          name: 'Event Planning Advice',
          description: 'Comprehensive event planning guidance with timelines and best practices',
          endpoint: '/advice/event-planning',
          permissions: ['bookings.create']
        },
        {
          name: 'Pricing Optimization',
          description: 'Smart pricing strategies based on market data and historical trends',
          endpoint: '/optimization/pricing',
          permissions: ['bookings.read']
        },
        {
          name: 'Market Analysis',
          description: 'Industry trends, opportunities, and competitive intelligence',
          endpoint: '/analysis/market',
          permissions: ['analytics.read']
        },
        {
          name: 'Contract Guidance',
          description: 'Legal advice and contract recommendations for celebrity bookings',
          endpoint: '/advice/contract',
          permissions: ['bookings.create']
        },
        {
          name: 'Smart Chat Assistant',
          description: 'Interactive AI assistant for all your booking needs',
          endpoint: '/chat',
          permissions: ['bookings.read']
        }
      ],
      models: {
        primary: 'deepseek-chat',
        fallback: 'rule-based-recommendations'
      },
      capabilities: {
        languages: ['English'],
        domains: ['Celebrity Booking', 'Event Planning', 'Entertainment Industry'],
        specialties: ['Pricing Strategy', 'Market Analysis', 'Legal Guidance', 'Risk Assessment']
      }
    }
  });
});

// Get assistant usage statistics (admin only)
router.get('/stats',
  RBACMiddleware.requirePermission('analytics.advanced'),
  async (req, res) => {
    try {
      // In a real implementation, you'd track usage in a database
      res.json({
        success: true,
        data: {
          totalQueries: 1250,
          popularFeatures: [
            { feature: 'Booking Recommendations', usage: 45 },
            { feature: 'Pricing Optimization', usage: 25 },
            { feature: 'Event Planning', usage: 20 },
            { feature: 'Market Analysis', usage: 10 }
          ],
          userSatisfaction: 4.7,
          responseTime: '2.3s',
          accuracy: 92.5,
          fallbackRate: 5.2
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get assistant statistics'
      });
    }
  }
);

module.exports = router;