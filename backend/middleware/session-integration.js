const { sessionSecurity } = require('./session-security');
const { supabaseAdmin } = require('../config/supabase');
const { logger } = require('../utils/logger');

/**
 * Session Integration Middleware
 * Integrates session security with authentication and request handling
 */

/**
 * Enhanced authentication middleware with session security
 */
function enhancedAuthMiddleware() {
  return async (req, res, next) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next();
      }

      // Validate session with security checks
      const validation = await sessionSecurity.validateSession(token, req);
      
      if (!validation.valid) {
        return res.status(401).json({
          success: false,
          error: 'Session invalid',
          reason: validation.reason,
          requireReauth: true
        });
      }

      // Attach user and session data to request
      req.user = validation.user;
      req.sessionId = validation.session.id;
      req.sessionToken = token;

      next();
    } catch (error) {
      logger.error('Enhanced auth middleware error:', error);
      next();
    }
  };
}

/**
 * Security event tracking middleware
 */
function securityEventMiddleware() {
  return async (req, res, next) => {
    // Track failed login attempts
    const originalSend = res.json;
    res.json = function(data) {
      if (req.path.includes('/auth/login') && req.method === 'POST') {
        if (!data.success) {
          sessionSecurity.handleSecurityEvent(
            sessionSecurity.securityEvents.MULTIPLE_FAILED_LOGINS,
            {
              userId: req.body.email,
              ipAddress: req.ip,
              userAgent: req.get('User-Agent'),
              metadata: { endpoint: req.path }
            }
          ).catch(error => {
            logger.error('Failed to handle security event:', error);
          });
        }
      }
      
      return originalSend.call(this, data);
    };

    next();
  };
}

/**
 * Password change security handler
 */
async function handlePasswordChange(userId, req) {
  try {
    await sessionSecurity.handleSecurityEvent(
      sessionSecurity.securityEvents.PASSWORD_CHANGED,
      {
        userId,
        sessionId: req.sessionId,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        metadata: { triggeredBy: 'password_change' }
      }
    );
  } catch (error) {
    logger.error('Error handling password change security event:', error);
  }
}

/**
 * Role change security handler
 */
async function handleRoleChange(userId, oldRole, newRole, req) {
  try {
    await sessionSecurity.handleSecurityEvent(
      sessionSecurity.securityEvents.ROLE_CHANGED,
      {
        userId,
        sessionId: req.sessionId,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        metadata: { 
          oldRole, 
          newRole,
          triggeredBy: 'role_change' 
        }
      }
    );
  } catch (error) {
    logger.error('Error handling role change security event:', error);
  }
}

/**
 * Account lock security handler
 */
async function handleAccountLock(userId, reason, req) {
  try {
    await sessionSecurity.handleSecurityEvent(
      sessionSecurity.securityEvents.ACCOUNT_LOCKED,
      {
        userId,
        sessionId: req?.sessionId,
        ipAddress: req?.ip,
        userAgent: req?.get('User-Agent'),
        metadata: { 
          reason,
          triggeredBy: 'account_lock' 
        }
      }
    );
  } catch (error) {
    logger.error('Error handling account lock security event:', error);
  }
}

/**
 * Fraud detection security handler
 */
async function handleFraudDetected(userId, fraudType, req) {
  try {
    await sessionSecurity.handleSecurityEvent(
      sessionSecurity.securityEvents.FRAUD_DETECTED,
      {
        userId,
        sessionId: req?.sessionId,
        ipAddress: req?.ip,
        userAgent: req?.get('User-Agent'),
        metadata: { 
          fraudType,
          triggeredBy: 'fraud_detection' 
        }
      }
    );
  } catch (error) {
    logger.error('Error handling fraud detection security event:', error);
  }
}

/**
 * Admin override security handler
 */
async function handleAdminOverride(targetUserId, adminUserId, action, req) {
  try {
    await sessionSecurity.handleSecurityEvent(
      sessionSecurity.securityEvents.ADMIN_OVERRIDE,
      {
        userId: targetUserId,
        sessionId: req.sessionId,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        metadata: { 
          adminUserId,
          action,
          triggeredBy: 'admin_override' 
        }
      }
    );
  } catch (error) {
    logger.error('Error handling admin override security event:', error);
  }
}

/**
 * Data breach response handler
 */
async function handleDataBreachResponse(organizationId, breachType, req) {
  try {
    await sessionSecurity.handleSecurityEvent(
      sessionSecurity.securityEvents.DATA_BREACH_RESPONSE,
      {
        userId: null, // Global event
        sessionId: req?.sessionId,
        ipAddress: req?.ip,
        userAgent: req?.get('User-Agent'),
        organizationId,
        metadata: { 
          breachType,
          triggeredBy: 'data_breach_response' 
        }
      }
    );
  } catch (error) {
    logger.error('Error handling data breach response security event:', error);
  }
}

/**
 * Suspicious location detector
 */
async function checkSuspiciousLocation(req) {
  if (!req.user || !req.sessionId) return;

  try {
    // Get user's last known location from session
    const { data: lastSession } = await supabaseAdmin
      .from('user_sessions')
      .select('ip_address, location_data')
      .eq('user_id', req.user.id)
      .eq('is_active', true)
      .neq('id', req.sessionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (lastSession && lastSession.ip_address !== req.ip) {
      // Simple check for different IP addresses
      // In production, you'd want more sophisticated geolocation checking
      const isReasonableChange = sessionSecurity.isReasonableIpChange(
        lastSession.ip_address, 
        req.ip
      );

      if (!isReasonableChange) {
        await sessionSecurity.handleSecurityEvent(
          sessionSecurity.securityEvents.SUSPICIOUS_LOCATION,
          {
            userId: req.user.id,
            sessionId: req.sessionId,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            metadata: { 
              previousIp: lastSession.ip_address,
              currentIp: req.ip
            }
          }
        );
      }
    }
  } catch (error) {
    logger.error('Error checking suspicious location:', error);
  }
}

/**
 * Unusual activity detector
 */
async function checkUnusualActivity(req) {
  if (!req.user || !req.sessionId) return;

  try {
    // Check for rapid consecutive requests (potential bot activity)
    const recentRequests = req.rateLimit?.remaining;
    if (recentRequests !== undefined && recentRequests < 5) {
      await sessionSecurity.handleSecurityEvent(
        sessionSecurity.securityEvents.UNUSUAL_ACTIVITY,
        {
          userId: req.user.id,
          sessionId: req.sessionId,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          metadata: { 
            activityType: 'rapid_requests',
            remainingRequests: recentRequests
          }
        }
      );
    }

    // Check for unusual user agent patterns
    const userAgent = req.get('User-Agent');
    if (userAgent && (
      userAgent.includes('bot') || 
      userAgent.includes('crawler') ||
      userAgent.includes('spider') ||
      !userAgent.includes('Mozilla') // Very basic check
    )) {
      await sessionSecurity.handleSecurityEvent(
        sessionSecurity.securityEvents.UNUSUAL_ACTIVITY,
        {
          userId: req.user.id,
          sessionId: req.sessionId,
          ipAddress: req.ip,
          userAgent,
          metadata: { 
            activityType: 'suspicious_user_agent',
            userAgent
          }
        }
      );
    }
  } catch (error) {
    logger.error('Error checking unusual activity:', error);
  }
}

/**
 * Activity monitoring middleware
 */
function activityMonitoringMiddleware() {
  return async (req, res, next) => {
    // Only monitor authenticated requests
    if (!req.user) {
      return next();
    }

    try {
      // Check for suspicious location changes
      await checkSuspiciousLocation(req);

      // Check for unusual activity patterns
      await checkUnusualActivity(req);

      next();
    } catch (error) {
      logger.error('Activity monitoring middleware error:', error);
      next();
    }
  };
}

/**
 * Session cleanup on logout
 */
async function handleLogout(sessionToken, req) {
  try {
    const { error } = await supabaseAdmin
      .from('user_sessions')
      .update({ 
        is_active: false,
        invalidated_at: new Date().toISOString(),
        invalidation_reason: 'user_logout'
      })
      .eq('session_token', sessionToken);

    if (error) {
      logger.error('Error updating session on logout:', error);
    }

    // Clear from cache
    const { cacheManager } = require('./cache-manager');
    await cacheManager.delete(`session:${sessionToken}`);

  } catch (error) {
    logger.error('Error handling logout:', error);
  }
}

module.exports = {
  enhancedAuthMiddleware,
  securityEventMiddleware,
  activityMonitoringMiddleware,
  handlePasswordChange,
  handleRoleChange,
  handleAccountLock,
  handleFraudDetected,
  handleAdminOverride,
  handleDataBreachResponse,
  handleLogout
};