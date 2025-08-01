const express = require('express');
const router = express.Router();
const fraudController = require('../controllers/fraudController');
const authMiddleware = require('../middleware/auth');
const { body, param, query } = require('express-validator');
const { handleValidation } = require('../middleware/validation');

// Apply authentication to all fraud routes
router.use(authMiddleware);

/**
 * @route   POST /api/fraud/analyze/:bookingId
 * @desc    Analyze specific booking for fraud
 * @access  Private
 */
router.post('/analyze/:bookingId',
  [
    param('bookingId').isInt({ min: 1 }).withMessage('Invalid booking ID')
  ],
  handleValidation,
  fraudController.analyzeBooking
);

/**
 * @route   GET /api/fraud/assessments
 * @desc    Get fraud assessments with filtering
 * @access  Private
 */
router.get('/assessments',
  [
    query('risk_level')
      .optional()
      .isIn(['HIGH', 'MEDIUM', 'LOW'])
      .withMessage('Risk level must be HIGH, MEDIUM, or LOW'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be a non-negative integer'),
    query('start_date')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    query('end_date')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date')
  ],
  handleValidation,
  fraudController.getAssessments
);

/**
 * @route   GET /api/fraud/statistics
 * @desc    Get fraud detection statistics
 * @access  Private
 */
router.get('/statistics',
  [
    query('days')
      .optional()
      .isInt({ min: 1, max: 365 })
      .withMessage('Days must be between 1 and 365')
  ],
  handleValidation,
  fraudController.getStatistics
);

/**
 * @route   POST /api/fraud/batch-analyze
 * @desc    Batch analyze existing bookings for fraud (Admin only)
 * @access  Private (Admin)
 */
router.post('/batch-analyze',
  [
    body('limit')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Limit must be between 1 and 1000')
  ],
  handleValidation,
  fraudController.batchAnalyze
);

/**
 * @route   PUT /api/fraud/assessments/:assessmentId
 * @desc    Update fraud assessment status
 * @access  Private (Admin/Reviewer)
 */
router.put('/assessments/:assessmentId',
  [
    param('assessmentId').isInt({ min: 1 }).withMessage('Invalid assessment ID'),
    body('status')
      .isIn(['approved', 'rejected', 'under_review', 'escalated'])
      .withMessage('Status must be approved, rejected, under_review, or escalated'),
    body('reviewer_notes')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Reviewer notes must be less than 1000 characters')
  ],
  handleValidation,
  fraudController.updateAssessment
);

/**
 * @route   POST /api/fraud/blacklist/email
 * @desc    Add email to blacklist (Admin only)
 * @access  Private (Admin)
 */
router.post('/blacklist/email',
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email address is required'),
    body('reason')
      .isLength({ min: 3, max: 500 })
      .withMessage('Reason must be between 3 and 500 characters')
  ],
  handleValidation,
  fraudController.addEmailToBlacklist
);

/**
 * @route   DELETE /api/fraud/blacklist/email/:email
 * @desc    Remove email from blacklist (Admin only)
 * @access  Private (Admin)
 */
router.delete('/blacklist/email/:email',
  [
    param('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email address is required')
  ],
  handleValidation,
  fraudController.removeEmailFromBlacklist
);

/**
 * @route   GET /api/fraud/blacklist/emails
 * @desc    Get blacklisted emails (Admin only)
 * @access  Private (Admin)
 */
router.get('/blacklist/emails', fraudController.getBlacklistedEmails);

/**
 * @route   GET /api/fraud/alerts
 * @desc    Get fraud alerts
 * @access  Private
 */
router.get('/alerts',
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be a non-negative integer'),
    query('severity')
      .optional()
      .isIn(['HIGH', 'MEDIUM', 'LOW'])
      .withMessage('Severity must be HIGH, MEDIUM, or LOW')
  ],
  handleValidation,
  fraudController.getAlerts
);

/**
 * @route   PUT /api/fraud/alerts/:alertId/read
 * @desc    Mark fraud alert as read
 * @access  Private
 */
router.put('/alerts/:alertId/read',
  [
    param('alertId').isInt({ min: 1 }).withMessage('Invalid alert ID')
  ],
  handleValidation,
  fraudController.markAlertAsRead
);

/**
 * @route   GET /api/fraud/trends
 * @desc    Get fraud detection trends
 * @access  Private
 */
router.get('/trends',
  [
    query('days')
      .optional()
      .isInt({ min: 1, max: 365 })
      .withMessage('Days must be between 1 and 365')
  ],
  handleValidation,
  fraudController.getTrends
);

module.exports = router;