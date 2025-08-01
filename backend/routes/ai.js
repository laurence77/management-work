const express = require('express');
const aiController = require('../controllers/aiController');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const router = express.Router();

// AI booking suggestions - authenticated users
router.post('/suggestions/booking', 
  authenticateToken,
  validate(schemas.ai.bookingSuggestions),
  aiController.getBookingSuggestions
);

// AI form auto-fill suggestions - authenticated users
router.post('/suggestions/form', 
  authenticateToken,
  validate(schemas.ai.formSuggestions),
  aiController.getFormSuggestions
);

// AI event planning advice - authenticated users
router.post('/advice/event-planning', 
  authenticateToken,
  validate(schemas.ai.eventAdvice),
  aiController.getEventPlanningAdvice
);

// AI trend analysis - admin only
router.get('/analytics/trends', 
  requirePermission('analytics.read'),
  aiController.analyzeBookingTrends
);

module.exports = router;