const { body, param, query, validationResult } = require('express-validator');
const { securityInputSanitizer } = require('./security-input-sanitizer');
const { errorHandler } = require('../utils/standard-error-handler');
const { logger } = require('../utils/logger');

/**
 * Advanced Validation Middleware
 * Combines express-validator with custom security validation
 */

class AdvancedValidation {
  constructor() {
    this.customValidators = {
      // Custom password validation
      isStrongPassword: (value) => {
        const minLength = 8;
        const hasUpper = /[A-Z]/.test(value);
        const hasLower = /[a-z]/.test(value);
        const hasNumbers = /\d/.test(value);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(value);
        
        return value.length >= minLength && hasUpper && hasLower && hasNumbers && hasSpecial;
      },
      
      // Custom role validation
      isValidRole: (value) => {
        const validRoles = ['customer', 'admin', 'moderator', 'celebrity'];
        return validRoles.includes(value);
      },
      
      // Custom booking status validation
      isValidBookingStatus: (value) => {
        const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed', 'refunded'];
        return validStatuses.includes(value);
      },
      
      // Custom payment method validation
      isValidPaymentMethod: (value) => {
        const validMethods = ['crypto', 'stripe', 'paypal', 'bank_transfer'];
        return validMethods.includes(value);
      },
      
      // Custom currency validation
      isValidCurrency: (value) => {
        const validCurrencies = ['USD', 'EUR', 'GBP', 'BTC', 'ETH', 'USDC'];
        return validCurrencies.includes(value.toUpperCase());
      },
      
      // Custom timezone validation
      isValidTimezone: (value) => {
        try {
          Intl.DateTimeFormat(undefined, { timeZone: value });
          return true;
        } catch {
          return false;
        }
      },
      
      // Custom slug validation
      isValidSlug: (value) => {
        return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
      }
    };
  }

  /**
   * Authentication validation schemas
   */
  auth = {
    register: [
      body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email required')
        .custom(value => securityInputSanitizer.validateEmail(value)),
      
      body('password')
        .custom(this.customValidators.isStrongPassword)
        .withMessage('Password must be at least 8 characters with uppercase, lowercase, number, and special character'),
      
      body('firstName')
        .isLength({ min: 2, max: 50 })
        .isAlpha('en-US', { ignore: ' -' })
        .withMessage('First name must be 2-50 characters, letters only'),
      
      body('lastName')
        .isLength({ min: 2, max: 50 })
        .isAlpha('en-US', { ignore: ' -' })
        .withMessage('Last name must be 2-50 characters, letters only'),
      
      body('phone')
        .optional()
        .custom(value => !value || securityInputSanitizer.validatePhone(value))
        .withMessage('Valid phone number required'),
      
      body('role')
        .optional()
        .custom(this.customValidators.isValidRole)
        .withMessage('Invalid role specified'),
      
      body('company')
        .optional()
        .isLength({ max: 100 })
        .withMessage('Company name must be under 100 characters')
    ],
    
    login: [
      body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email required'),
      
      body('password')
        .isLength({ min: 1 })
        .withMessage('Password required')
    ],
    
    changePassword: [
      body('currentPassword')
        .isLength({ min: 1 })
        .withMessage('Current password required'),
      
      body('newPassword')
        .custom(this.customValidators.isStrongPassword)
        .withMessage('New password must meet security requirements')
    ],
    
    updateProfile: [
      body('firstName')
        .optional()
        .isLength({ min: 2, max: 50 })
        .isAlpha('en-US', { ignore: ' -' }),
      
      body('lastName')
        .optional()
        .isLength({ min: 2, max: 50 })
        .isAlpha('en-US', { ignore: ' -' }),
      
      body('phone')
        .optional()
        .custom(value => !value || securityInputSanitizer.validatePhone(value)),
      
      body('company')
        .optional()
        .isLength({ max: 100 })
    ]
  };

  /**
   * Booking validation schemas
   */
  booking = {
    create: [
      body('celebrityId')
        .optional()
        .isUUID()
        .withMessage('Valid celebrity ID required'),
      
      body('eventId')
        .optional()
        .isUUID()
        .withMessage('Valid event ID required'),
      
      body('bookingType')
        .isIn(['meet_greet', 'performance', 'appearance', 'virtual', 'custom'])
        .withMessage('Valid booking type required'),
      
      body('bookingDate')
        .isISO8601()
        .toDate()
        .withMessage('Valid booking date required'),
      
      body('bookingTime')
        .optional()
        .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('Valid time format required (HH:MM)'),
      
      body('duration')
        .optional()
        .isInt({ min: 15, max: 480 })
        .withMessage('Duration must be between 15-480 minutes'),
      
      body('location')
        .optional()
        .isLength({ max: 200 })
        .withMessage('Location must be under 200 characters'),
      
      body('guestCount')
        .optional()
        .isInt({ min: 1, max: 10000 })
        .withMessage('Guest count must be between 1-10000'),
      
      body('totalAmount')
        .isFloat({ min: 0 })
        .withMessage('Valid amount required'),
      
      body('paymentMethod')
        .custom(this.customValidators.isValidPaymentMethod)
        .withMessage('Valid payment method required'),
      
      body('specialRequests')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Special requests must be under 1000 characters')
    ],
    
    update: [
      param('id')
        .isUUID()
        .withMessage('Valid booking ID required'),
      
      body('status')
        .optional()
        .custom(this.customValidators.isValidBookingStatus)
        .withMessage('Valid booking status required'),
      
      body('bookingDate')
        .optional()
        .isISO8601()
        .toDate(),
      
      body('totalAmount')
        .optional()
        .isFloat({ min: 0 })
    ]
  };

  /**
   * Celebrity validation schemas
   */
  celebrity = {
    create: [
      body('name')
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be 2-100 characters'),
      
      body('category')
        .isIn(['actor', 'musician', 'athlete', 'influencer', 'author', 'politician', 'other'])
        .withMessage('Valid category required'),
      
      body('bio')
        .optional()
        .isLength({ max: 2000 })
        .withMessage('Bio must be under 2000 characters'),
      
      body('baseRate')
        .isFloat({ min: 0 })
        .withMessage('Valid base rate required'),
      
      body('currency')
        .custom(this.customValidators.isValidCurrency)
        .withMessage('Valid currency required'),
      
      body('socialMedia')
        .optional()
        .isObject()
        .withMessage('Social media must be an object'),
      
      body('socialMedia.*.url')
        .optional()
        .custom(value => !value || securityInputSanitizer.validateURL(value))
        .withMessage('Valid social media URL required'),
      
      body('tags')
        .optional()
        .isArray()
        .withMessage('Tags must be an array'),
      
      body('tags.*')
        .optional()
        .isLength({ min: 2, max: 30 })
        .withMessage('Each tag must be 2-30 characters')
    ],
    
    update: [
      param('id')
        .isUUID()
        .withMessage('Valid celebrity ID required'),
      
      body('name')
        .optional()
        .isLength({ min: 2, max: 100 }),
      
      body('bio')
        .optional()
        .isLength({ max: 2000 }),
      
      body('baseRate')
        .optional()
        .isFloat({ min: 0 }),
      
      body('isAvailable')
        .optional()
        .isBoolean()
    ]
  };

  /**
   * Payment validation schemas
   */
  payment = {
    create: [
      body('bookingId')
        .isUUID()
        .withMessage('Valid booking ID required'),
      
      body('amount')
        .isFloat({ min: 0.01 })
        .withMessage('Valid payment amount required'),
      
      body('currency')
        .custom(this.customValidators.isValidCurrency)
        .withMessage('Valid currency required'),
      
      body('paymentMethod')
        .custom(this.customValidators.isValidPaymentMethod)
        .withMessage('Valid payment method required'),
      
      body('cryptoType')
        .optional()
        .isIn(['BTC', 'ETH', 'USDC', 'USDT'])
        .withMessage('Valid crypto type required'),
      
      body('stripeToken')
        .optional()
        .isLength({ min: 10 })
        .withMessage('Valid Stripe token required')
    ]
  };

  /**
   * Admin validation schemas
   */
  admin = {
    userUpdate: [
      param('id')
        .isUUID()
        .withMessage('Valid user ID required'),
      
      body('role')
        .optional()
        .custom(this.customValidators.isValidRole)
        .withMessage('Valid role required'),
      
      body('isActive')
        .optional()
        .isBoolean()
        .withMessage('isActive must be boolean'),
      
      body('permissions')
        .optional()
        .isArray()
        .withMessage('Permissions must be an array')
    ],
    
    settings: [
      body('key')
        .isLength({ min: 2, max: 100 })
        .matches(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
        .withMessage('Valid setting key required'),
      
      body('value')
        .isLength({ max: 10000 })
        .withMessage('Setting value too long'),
      
      body('type')
        .isIn(['string', 'number', 'boolean', 'json'])
        .withMessage('Valid setting type required')
    ]
  };

  /**
   * File upload validation schemas
   */
  upload = {
    image: [
      body('category')
        .optional()
        .isIn(['avatar', 'celebrity', 'event', 'document'])
        .withMessage('Valid category required'),
      
      body('description')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Description must be under 500 characters')
    ]
  };

  /**
   * Search and filtering validation
   */
  search = {
    celebrities: [
      query('category')
        .optional()
        .isIn(['actor', 'musician', 'athlete', 'influencer', 'author', 'politician', 'other']),
      
      query('minRate')
        .optional()
        .isFloat({ min: 0 }),
      
      query('maxRate')
        .optional()
        .isFloat({ min: 0 }),
      
      query('location')
        .optional()
        .isLength({ max: 100 }),
      
      query('available')
        .optional()
        .isBoolean(),
      
      query('tags')
        .optional()
        .custom(value => {
          if (typeof value === 'string') {
            return value.split(',').every(tag => tag.length >= 2 && tag.length <= 30);
          }
          return Array.isArray(value) && value.every(tag => 
            typeof tag === 'string' && tag.length >= 2 && tag.length <= 30
          );
        })
        .withMessage('Invalid tags format')
    ],
    
    bookings: [
      query('status')
        .optional()
        .custom(this.customValidators.isValidBookingStatus),
      
      query('dateFrom')
        .optional()
        .isISO8601()
        .toDate(),
      
      query('dateTo')
        .optional()
        .isISO8601()
        .toDate(),
      
      query('page')
        .optional()
        .isInt({ min: 1 })
        .toInt(),
      
      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .toInt(),
      
      query('sortBy')
        .optional()
        .isIn(['created_at', 'booking_date', 'total_amount', 'status']),
      
      query('sortOrder')
        .optional()
        .isIn(['asc', 'desc'])
    ]
  };

  /**
   * Calendar validation schemas
   */
  calendar = {
    createEvent: [
      body('bookingId')
        .isUUID()
        .withMessage('Valid booking ID required'),
      
      body('title')
        .isLength({ min: 2, max: 200 })
        .withMessage('Title must be 2-200 characters'),
      
      body('startTime')
        .isISO8601()
        .toDate()
        .withMessage('Valid start time required'),
      
      body('endTime')
        .isISO8601()
        .toDate()
        .withMessage('Valid end time required'),
      
      body('timezone')
        .custom(this.customValidators.isValidTimezone)
        .withMessage('Valid timezone required'),
      
      body('location')
        .optional()
        .isLength({ max: 300 })
        .withMessage('Location must be under 300 characters'),
      
      body('description')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Description must be under 1000 characters')
    ]
  };

  /**
   * Analytics validation schemas
   */
  analytics = {
    query: [
      query('range')
        .optional()
        .isIn(['7d', '30d', '90d', '1y'])
        .withMessage('Valid date range required'),
      
      query('organizationId')
        .optional()
        .isUUID()
        .withMessage('Valid organization ID required'),
      
      query('limit')
        .optional()
        .isInt({ min: 1, max: 1000 })
        .toInt()
    ]
  };

  /**
   * Validation result handler middleware
   */
  handleValidationResult() {
    return (req, res, next) => {
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        const formattedErrors = errors.array().map(error => ({
          field: error.param,
          message: error.msg,
          value: error.value,
          location: error.location
        }));
        
        logger.warn('Validation errors:', {
          url: req.originalUrl,
          method: req.method,
          errors: formattedErrors,
          userAgent: req.get('User-Agent'),
          ip: req.ip
        });
        
        const validationError = errorHandler.handleValidationError({ errors: formattedErrors });
        return next(validationError);
      }
      
      next();
    };
  }

  /**
   * Custom validation middleware factory
   */
  customValidation(validationFn, errorMessage) {
    return (req, res, next) => {
      try {
        const isValid = validationFn(req);
        if (!isValid) {
          const error = errorHandler.createError(
            errorHandler.errorTypes.VALIDATION,
            errorMessage || 'Validation failed'
          );
          return next(error);
        }
        next();
      } catch (error) {
        logger.error('Custom validation error:', error);
        const validationError = errorHandler.createError(
          errorHandler.errorTypes.VALIDATION,
          'Validation error occurred',
          null,
          error
        );
        next(validationError);
      }
    };
  }

  /**
   * Business logic validation
   */
  businessValidation = {
    // Validate booking dates
    validateBookingDates: this.customValidation(
      (req) => {
        const { bookingDate, endDate } = req.body;
        if (bookingDate && endDate) {
          return new Date(bookingDate) < new Date(endDate);
        }
        return true;
      },
      'Booking start date must be before end date'
    ),
    
    // Validate future dates only
    validateFutureDate: this.customValidation(
      (req) => {
        const { bookingDate } = req.body;
        if (bookingDate) {
          return new Date(bookingDate) > new Date();
        }
        return true;
      },
      'Booking date must be in the future'
    ),
    
    // Validate payment amount matches booking
    validatePaymentAmount: this.customValidation(
      (req) => {
        const { amount, currency } = req.body;
        // This would need to check against the actual booking
        return amount > 0 && currency;
      },
      'Payment amount must match booking total'
    )
  };
}

// Create singleton instance
const advancedValidation = new AdvancedValidation();

module.exports = {
  AdvancedValidation,
  validation: advancedValidation,
  handleValidationResult: advancedValidation.handleValidationResult()
};