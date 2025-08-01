const validator = require('validator');
const { body, param, query, validationResult } = require('express-validator');

/**
 * Data Validation Middleware
 * Comprehensive validation for all API endpoints
 */

// Custom validation functions
const customValidators = {
  isValidPhone: (phone) => {
    if (!phone) return true; // Optional field
    return /^[\+]?[1-9][\d]{0,15}$/.test(phone);
  },
  
  isValidBookingType: (type) => {
    const validTypes = ['meet_greet', 'performance', 'appearance', 'virtual', 'custom'];
    return validTypes.includes(type);
  },
  
  isValidBookingStatus: (status) => {
    const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed', 'rejected'];
    return validStatuses.includes(status);
  },
  
  isValidCelebrityCategory: (category) => {
    const validCategories = ['actors', 'musicians', 'athletes', 'influencers', 'authors', 'other'];
    return validCategories.includes(category);
  },
  
  isValidUserRole: (role) => {
    const validRoles = ['customer', 'admin', 'moderator'];
    return validRoles.includes(role);
  },
  
  isValidRating: (rating) => {
    const num = parseFloat(rating);
    return !isNaN(num) && num >= 0 && num <= 5;
  },
  
  isValidPriority: (priority) => {
    const num = parseInt(priority);
    return !isNaN(num) && num >= 1 && num <= 10;
  },
  
  isValidId: (id) => {
    const num = parseInt(id);
    return !isNaN(num) && num > 0;
  },
  
  isValidDate: (date) => {
    const parsedDate = new Date(date);
    return parsedDate instanceof Date && !isNaN(parsedDate) && parsedDate > new Date();
  }
};

// Validation middleware
const validationMiddleware = {
  // Handle validation errors
  handleValidationErrors: (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(error => ({
          field: error.path,
          message: error.msg,
          value: error.value
        }))
      });
    }
    next();
  },

  // User validation
  validateUser: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('first_name')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('First name must be 1-100 characters'),
    body('last_name')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Last name must be 1-100 characters'),
    body('phone')
      .optional()
      .custom(customValidators.isValidPhone)
      .withMessage('Invalid phone number format'),
    body('role')
      .optional()
      .custom(customValidators.isValidUserRole)
      .withMessage('Invalid user role')
  ],

  // Celebrity validation
  validateCelebrity: [
    body('name')
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Celebrity name must be 1-255 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 5000 })
      .withMessage('Description must be less than 5000 characters'),
    body('category')
      .custom(customValidators.isValidCelebrityCategory)
      .withMessage('Invalid celebrity category'),
    body('price')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Price must be less than 100 characters'),
    body('rating')
      .optional()
      .custom(customValidators.isValidRating)
      .withMessage('Rating must be between 0 and 5'),
    body('availability')
      .optional()
      .isBoolean()
      .withMessage('Availability must be boolean'),
    body('is_featured')
      .optional()
      .isBoolean()
      .withMessage('Featured status must be boolean')
  ],

  // Booking validation
  validateBooking: [
    body('celebrity_id')
      .custom(customValidators.isValidId)
      .withMessage('Valid celebrity ID is required'),
    body('celebrity_name')
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Celebrity name is required'),
    body('client_name')
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Client name is required'),
    body('client_email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid client email is required'),
    body('client_phone')
      .optional()
      .custom(customValidators.isValidPhone)
      .withMessage('Invalid phone number format'),
    body('event_date')
      .isISO8601()
      .toDate()
      .custom(customValidators.isValidDate)
      .withMessage('Valid future date is required'),
    body('event_type')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Event type must be less than 100 characters'),
    body('event_location')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Event location must be less than 500 characters'),
    body('guest_count')
      .optional()
      .isInt({ min: 1, max: 10000 })
      .withMessage('Guest count must be between 1 and 10000'),
    body('budget')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Budget must be less than 100 characters'),
    body('special_requests')
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('Special requests must be less than 2000 characters')
  ],

  // Booking status update validation
  validateBookingStatus: [
    param('id')
      .custom(customValidators.isValidId)
      .withMessage('Valid booking ID is required'),
    body('status')
      .custom(customValidators.isValidBookingStatus)
      .withMessage('Invalid booking status'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Notes must be less than 1000 characters'),
    body('cancellation_reason')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Cancellation reason must be less than 500 characters')
  ],

  // Email template validation
  validateEmailTemplate: [
    body('template_key')
      .trim()
      .matches(/^[a-z0-9_]+$/)
      .isLength({ min: 1, max: 100 })
      .withMessage('Template key must be lowercase letters, numbers, and underscores only'),
    body('name')
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Template name is required'),
    body('subject')
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage('Subject is required and must be less than 500 characters'),
    body('html_content')
      .trim()
      .isLength({ min: 1 })
      .withMessage('HTML content is required'),
    body('text_content')
      .optional()
      .trim()
      .isLength({ max: 10000 })
      .withMessage('Text content must be less than 10000 characters'),
    body('is_active')
      .optional()
      .isBoolean()
      .withMessage('Active status must be boolean')
  ],

  // Site settings validation
  validateSiteSettings: [
    body('key')
      .trim()
      .matches(/^[a-z0-9_]+$/)
      .isLength({ min: 1, max: 100 })
      .withMessage('Setting key must be lowercase letters, numbers, and underscores only'),
    body('value')
      .optional()
      .trim()
      .isLength({ max: 5000 })
      .withMessage('Value must be less than 5000 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must be less than 500 characters'),
    body('type')
      .optional()
      .isIn(['string', 'number', 'boolean', 'json'])
      .withMessage('Type must be string, number, boolean, or json'),
    body('is_public')
      .optional()
      .isBoolean()
      .withMessage('Public status must be boolean')
  ],

  // File upload validation
  validateFileUpload: [
    body('filename')
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Filename is required'),
    body('entity_type')
      .optional()
      .isIn(['celebrity', 'user', 'booking', 'template'])
      .withMessage('Invalid entity type'),
    body('entity_id')
      .optional()
      .custom(customValidators.isValidId)
      .withMessage('Invalid entity ID'),
    body('is_public')
      .optional()
      .isBoolean()
      .withMessage('Public status must be boolean')
  ],

  // Query parameter validation
  validateQueryParams: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('sort')
      .optional()
      .isIn(['name', 'created_at', 'updated_at', 'rating', 'status'])
      .withMessage('Invalid sort field'),
    query('order')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Order must be asc or desc'),
    query('status')
      .optional()
      .custom(customValidators.isValidBookingStatus)
      .withMessage('Invalid status filter'),
    query('category')
      .optional()
      .custom(customValidators.isValidCelebrityCategory)
      .withMessage('Invalid category filter')
  ],

  // Path parameter validation
  validateIdParam: [
    param('id')
      .custom(customValidators.isValidId)
      .withMessage('Valid ID is required')
  ],

  // Search validation
  validateSearch: [
    query('q')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search query must be 1-100 characters'),
    query('type')
      .optional()
      .isIn(['celebrity', 'booking', 'user'])
      .withMessage('Invalid search type')
  ]
};

// Data sanitization functions
const sanitizers = {
  sanitizeUser: (userData) => {
    return {
      email: validator.normalizeEmail(userData.email || ''),
      first_name: validator.escape(userData.first_name || '').trim(),
      last_name: validator.escape(userData.last_name || '').trim(),
      phone: userData.phone ? userData.phone.replace(/[^\d\+]/g, '') : null,
      role: userData.role || 'customer'
    };
  },

  sanitizeCelebrity: (celebrityData) => {
    return {
      name: validator.escape(celebrityData.name || '').trim(),
      description: celebrityData.description ? validator.escape(celebrityData.description).trim() : null,
      category: celebrityData.category,
      price: celebrityData.price ? validator.escape(celebrityData.price).trim() : null,
      rating: celebrityData.rating ? parseFloat(celebrityData.rating) : 0,
      availability: Boolean(celebrityData.availability),
      is_featured: Boolean(celebrityData.is_featured)
    };
  },

  sanitizeBooking: (bookingData) => {
    return {
      celebrity_id: parseInt(bookingData.celebrity_id),
      celebrity_name: validator.escape(bookingData.celebrity_name || '').trim(),
      client_name: validator.escape(bookingData.client_name || '').trim(),
      client_email: validator.normalizeEmail(bookingData.client_email || ''),
      client_phone: bookingData.client_phone ? bookingData.client_phone.replace(/[^\d\+]/g, '') : null,
      event_date: new Date(bookingData.event_date),
      event_type: bookingData.event_type ? validator.escape(bookingData.event_type).trim() : null,
      event_location: bookingData.event_location ? validator.escape(bookingData.event_location).trim() : null,
      guest_count: parseInt(bookingData.guest_count) || 1,
      budget: bookingData.budget ? validator.escape(bookingData.budget).trim() : null,
      special_requests: bookingData.special_requests ? validator.escape(bookingData.special_requests).trim() : null
    };
  }
};

module.exports = {
  validationMiddleware,
  customValidators,
  sanitizers
};