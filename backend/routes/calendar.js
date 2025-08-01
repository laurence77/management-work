const express = require('express');
const router = express.Router();
const calendarController = require('../controllers/calendarController');
const authMiddleware = require('../middleware/auth');
const { body, param, query } = require('express-validator');
const { handleValidation } = require('../middleware/validation');

// Apply authentication to all calendar routes
router.use(authMiddleware);

/**
 * @route   GET /api/calendar/authorize
 * @desc    Get Google Calendar authorization URL
 * @access  Private
 */
router.get('/authorize', calendarController.authorize);

/**
 * @route   GET /api/calendar/callback
 * @desc    Handle Google Calendar OAuth callback
 * @access  Private
 */
router.get('/callback', calendarController.callback);

/**
 * @route   GET /api/calendar/status
 * @desc    Get calendar connection status
 * @access  Private
 */
router.get('/status', calendarController.getStatus);

/**
 * @route   POST /api/calendar/sync/:bookingId
 * @desc    Sync specific booking to calendar
 * @access  Private
 */
router.post('/sync/:bookingId', 
  [
    param('bookingId').isInt({ min: 1 }).withMessage('Invalid booking ID')
  ],
  handleValidation,
  calendarController.syncBooking
);

/**
 * @route   POST /api/calendar/sync-all
 * @desc    Sync all bookings to calendar
 * @access  Private
 */
router.post('/sync-all', calendarController.syncAllBookings);

/**
 * @route   POST /api/calendar/check-conflicts
 * @desc    Check for booking conflicts with calendar events
 * @access  Private
 */
router.post('/check-conflicts',
  [
    body('eventDate')
      .isISO8601()
      .withMessage('Event date must be a valid ISO 8601 date'),
    body('duration')
      .optional()
      .isFloat({ min: 0.5, max: 24 })
      .withMessage('Duration must be between 0.5 and 24 hours')
  ],
  handleValidation,
  calendarController.checkConflicts
);

/**
 * @route   GET /api/calendar/events
 * @desc    Get user's calendar events
 * @access  Private
 */
router.get('/events',
  [
    query('timeMin')
      .optional()
      .isISO8601()
      .withMessage('timeMin must be a valid ISO 8601 date'),
    query('timeMax')
      .optional()
      .isISO8601()
      .withMessage('timeMax must be a valid ISO 8601 date')
  ],
  handleValidation,
  calendarController.getEvents
);

/**
 * @route   GET /api/calendar/busy-times
 * @desc    Get busy times for availability checking
 * @access  Private
 */
router.get('/busy-times',
  [
    query('timeMin')
      .optional()
      .isISO8601()
      .withMessage('timeMin must be a valid ISO 8601 date'),
    query('timeMax')
      .optional()
      .isISO8601()
      .withMessage('timeMax must be a valid ISO 8601 date')
  ],
  handleValidation,
  calendarController.getBusyTimes
);

/**
 * @route   PUT /api/calendar/events/:bookingId
 * @desc    Update booking calendar event
 * @access  Private
 */
router.put('/events/:bookingId',
  [
    param('bookingId').isInt({ min: 1 }).withMessage('Invalid booking ID')
  ],
  handleValidation,
  calendarController.updateBookingEvent
);

/**
 * @route   DELETE /api/calendar/events/:bookingId
 * @desc    Delete booking calendar event
 * @access  Private
 */
router.delete('/events/:bookingId',
  [
    param('bookingId').isInt({ min: 1 }).withMessage('Invalid booking ID')
  ],
  handleValidation,
  calendarController.deleteBookingEvent
);

/**
 * @route   DELETE /api/calendar/disconnect
 * @desc    Disconnect Google Calendar integration
 * @access  Private
 */
router.delete('/disconnect', calendarController.disconnect);

module.exports = router;