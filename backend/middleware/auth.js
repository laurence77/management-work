const authService = require('../services/authService');
const { supabase } = require('../config/supabase');
const { securityLogger } = require('../utils/logger');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'Access token required' 
      });
    }

    // Verify token and get user data
    const decoded = await authService.verifyToken(token);
    
    // Create Supabase client with user context
    const userSupabase = supabase.auth.setAuth(token);
    
    req.user = decoded;
    req.supabase = userSupabase;
    next();
  } catch (error) {
    securityLogger.warn('Token verification failed', {
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    return res.status(403).json({ 
      success: false, 
      error: 'Invalid or expired token' 
    });
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    if (!roles.includes(req.user.role)) {
      securityLogger.warn('Unauthorized access attempt', {
        userId: req.user.userId,
        userRole: req.user.role,
        requiredRoles: roles,
        endpoint: req.path,
        ip: req.ip
      });
      
      return res.status(403).json({ 
        success: false, 
        error: `Access denied. Required roles: ${roles.join(', ')}` 
      });
    }
    
    next();
  };
};

const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          success: false, 
          error: 'Authentication required' 
        });
      }

      // Check if user has the required permission
      const hasPermission = req.user.permissions && 
        req.user.permissions.includes(permission);

      if (!hasPermission) {
        securityLogger.warn('Permission denied', {
          userId: req.user.userId,
          userRole: req.user.role,
          requiredPermission: permission,
          userPermissions: req.user.permissions,
          endpoint: req.path,
          ip: req.ip
        });
        
        return res.status(403).json({ 
          success: false, 
          error: `Permission denied. Required: ${permission}` 
        });
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      try {
        const decoded = await authService.verifyToken(token);
        const userSupabase = supabase.auth.setAuth(token);
        
        req.user = decoded;
        req.supabase = userSupabase;
      } catch (error) {
        // Token is invalid but we continue without user context
        req.user = null;
        req.supabase = supabase;
      }
    } else {
      req.user = null;
      req.supabase = supabase;
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

// Convenience middleware combinations
const requireAdmin = requireRole('admin');
const requireModerator = requireRole('admin', 'moderator');
const requireUser = requireRole('admin', 'moderator', 'user');

// Rate limiting for sensitive operations
const rateLimitSensitive = (req, res, next) => {
  // This would integrate with express-rate-limit or similar
  // For now, just pass through
  next();
};

module.exports = {
  authenticateToken,
  requireRole,
  requirePermission,
  optionalAuth,
  requireAdmin,
  requireModerator,
  requireUser,
  rateLimitSensitive
};