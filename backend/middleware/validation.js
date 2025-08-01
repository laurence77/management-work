const Joi = require('joi');

const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errorMessage
      });
    }
    next();
  };
};

const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.query, { abortEarly: false });
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      return res.status(400).json({
        success: false,
        message: 'Query validation error',
        errors: errorMessage
      });
    }
    next();
  };
};

const validateParams = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.params, { abortEarly: false });
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      return res.status(400).json({
        success: false,
        message: 'Parameter validation error',
        errors: errorMessage
      });
    }
    next();
  };
};

// Validation schemas
const schemas = {
  celebrity: {
    create: Joi.object({
      name: Joi.string().required().min(1).max(255),
      category: Joi.string().required().min(1).max(100),
      price: Joi.number().required().min(0),
      image: Joi.string().uri().optional().allow(''),
      description: Joi.string().optional().max(2000),
      availability: Joi.boolean().optional(),
      rating: Joi.number().min(0).max(5).optional()
    }),
    
    update: Joi.object({
      name: Joi.string().min(1).max(255).optional(),
      category: Joi.string().min(1).max(100).optional(),
      price: Joi.number().min(0).optional(),
      image: Joi.string().uri().optional().allow(''),
      description: Joi.string().max(2000).optional(),
      availability: Joi.boolean().optional(),
      rating: Joi.number().min(0).max(5).optional()
    }),

    query: Joi.object({
      search: Joi.string().optional(),
      category: Joi.string().optional(),
      availability: Joi.string().valid('true', 'false').optional(),
      minPrice: Joi.number().min(0).optional(),
      maxPrice: Joi.number().min(0).optional(),
      sortBy: Joi.string().valid('name', 'price', 'rating', 'created_at').optional(),
      sortOrder: Joi.string().valid('asc', 'desc').optional()
    })
  },

  booking: {
    create: Joi.object({
      celebrity_id: Joi.string().required(),
      event_date: Joi.date().greater('now').required(),
      event_duration: Joi.number().min(1).max(24).required(),
      event_type: Joi.string().required().max(100),
      event_location: Joi.string().required().max(500),
      special_requests: Joi.string().optional().max(1000),
      contact_name: Joi.string().required().max(255),
      contact_email: Joi.string().email().required(),
      contact_phone: Joi.string().required().max(20)
    }),

    updateStatus: Joi.object({
      status: Joi.string().valid('pending', 'confirmed', 'cancelled', 'completed').required(),
      notes: Joi.string().optional().max(1000)
    })
  },

  auth: {
    login: Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().min(6).required()
    }),

    register: Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().min(6).required(),
      firstName: Joi.string().required().min(1).max(100),
      lastName: Joi.string().required().min(1).max(100),
      role: Joi.string().valid('admin', 'moderator', 'user').optional()
    }),

    updateProfile: Joi.object({
      firstName: Joi.string().min(1).max(100).optional(),
      lastName: Joi.string().min(1).max(100).optional(),
      phone: Joi.string().max(20).optional(),
      avatarUrl: Joi.string().uri().optional()
    }),

    changePassword: Joi.object({
      currentPassword: Joi.string().min(6).required(),
      newPassword: Joi.string().min(6).required()
    })
  },

  settings: {
    update: Joi.object({
      site_name: Joi.string().optional().max(255),
      site_description: Joi.string().optional().max(1000),
      contact_email: Joi.string().email().optional(),
      contact_phone: Joi.string().optional().max(20),
      social_media: Joi.object().optional(),
      booking_settings: Joi.object().optional(),
      payment_settings: Joi.object().optional()
    })
  },

  id: Joi.object({
    id: Joi.string().required()
  }),

  ai: {
    bookingSuggestions: Joi.object({
      preferences: Joi.object().optional(),
      includeHistory: Joi.boolean().optional()
    }),

    formSuggestions: Joi.object({
      celebrityId: Joi.string().required(),
      eventType: Joi.string().optional(),
      partialData: Joi.object().optional()
    }),

    eventAdvice: Joi.object({
      celebrity: Joi.object().optional(),
      eventType: Joi.string().required(),
      date: Joi.string().optional(),
      location: Joi.string().optional(),
      budget: Joi.number().optional(),
      guestCount: Joi.number().optional()
    })
  }
};

module.exports = {
  validate,
  validateQuery,
  validateParams,
  schemas
};