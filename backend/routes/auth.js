const express = require('express');
const authController = require('../controllers/authController');
const { authenticateToken, requireAdmin, optionalAuth } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { errorHandler } = require('../utils/standard-error-handler');
const { authAuditMiddleware, securityAuditMiddleware } = require('../middleware/audit-middleware');
const router = express.Router();

// Apply security audit middleware to all auth routes
router.use(securityAuditMiddleware());

// Public routes
router.post('/login', 
  validate(schemas.auth.login),
  authAuditMiddleware(),
  errorHandler.asyncRouteWrapper(authController.login)
);

router.post('/register', 
  optionalAuth, // Optional auth to check if admin is creating admin user
  validate(schemas.auth.register),
  authAuditMiddleware(),
  errorHandler.asyncRouteWrapper(authController.register)
);

router.post('/refresh', 
  errorHandler.asyncRouteWrapper(authController.refreshToken)
);

// Protected routes
router.post('/logout', 
  authenticateToken,
  authAuditMiddleware(),
  errorHandler.asyncRouteWrapper(authController.logout)
);

router.get('/verify', 
  authenticateToken,
  errorHandler.asyncRouteWrapper(authController.verify)
);

router.get('/profile', 
  authenticateToken,
  errorHandler.asyncRouteWrapper(authController.getProfile)
);

router.put('/profile', 
  authenticateToken,
  validate(schemas.auth.updateProfile),
  errorHandler.asyncRouteWrapper(authController.updateProfile)
);

router.post('/change-password', 
  authenticateToken,
  validate(schemas.auth.changePassword),
  authAuditMiddleware(),
  errorHandler.asyncRouteWrapper(authController.changePassword)
);

router.post('/revoke-all', 
  authenticateToken,
  authController.revokeAllTokens
);

// Admin routes
router.post('/admin/register', 
  authenticateToken,
  requireAdmin,
  validate(schemas.auth.register),
  authController.register
);

module.exports = router;