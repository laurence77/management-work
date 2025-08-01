const { supabaseAdmin } = require('../config/supabase');
const { logger, securityLogger } = require('../utils/logger');
const { cacheManager } = require('./cache-manager');

/**
 * Session Security Manager
 * Handles session invalidation on security events and suspicious activity
 */

class SessionSecurity {
  constructor() {
    this.securityEvents = {
      MULTIPLE_FAILED_LOGINS: 'multiple_failed_logins',
      SUSPICIOUS_LOCATION: 'suspicious_location',
      PASSWORD_CHANGED: 'password_changed',
      ROLE_CHANGED: 'role_changed',
      ACCOUNT_LOCKED: 'account_locked',
      FRAUD_DETECTED: 'fraud_detected',
      UNUSUAL_ACTIVITY: 'unusual_activity',
      ADMIN_OVERRIDE: 'admin_override',
      DATA_BREACH_RESPONSE: 'data_breach_response',
      MULTIPLE_CONCURRENT_SESSIONS: 'multiple_concurrent_sessions'
    };

    this.invalidationRules = {
      [this.securityEvents.MULTIPLE_FAILED_LOGINS]: {
        scope: 'user',
        immediate: false,
        threshold: 5,
        timeWindow: 300000, // 5 minutes
        action: 'invalidate_user_sessions'
      },
      [this.securityEvents.SUSPICIOUS_LOCATION]: {
        scope: 'user',
        immediate: true,
        action: 'invalidate_user_sessions',
        requireReauth: true
      },
      [this.securityEvents.PASSWORD_CHANGED]: {
        scope: 'user',
        immediate: true,
        action: 'invalidate_all_except_current',
        requireReauth: false
      },
      [this.securityEvents.ROLE_CHANGED]: {
        scope: 'user',
        immediate: true,
        action: 'invalidate_user_sessions',
        requireReauth: true
      },
      [this.securityEvents.ACCOUNT_LOCKED]: {
        scope: 'user',
        immediate: true,
        action: 'invalidate_user_sessions',
        requireReauth: true
      },
      [this.securityEvents.FRAUD_DETECTED]: {
        scope: 'user',
        immediate: true,
        action: 'invalidate_user_sessions',
        requireReauth: true,
        alertSecurity: true
      },
      [this.securityEvents.UNUSUAL_ACTIVITY]: {
        scope: 'session',
        immediate: true,
        action: 'invalidate_specific_session'
      },
      [this.securityEvents.ADMIN_OVERRIDE]: {
        scope: 'user',
        immediate: true,
        action: 'invalidate_user_sessions',
        requireReauth: true
      },
      [this.securityEvents.DATA_BREACH_RESPONSE]: {
        scope: 'global',
        immediate: true,
        action: 'invalidate_all_sessions'
      },
      [this.securityEvents.MULTIPLE_CONCURRENT_SESSIONS]: {
        scope: 'user',
        immediate: false,
        threshold: 5,
        action: 'invalidate_oldest_sessions'
      }
    };

    // Track failed login attempts
    this.failedAttempts = new Map();
  }

  /**
   * Handle security event and determine if session invalidation is needed
   */
  async handleSecurityEvent(eventType, context = {}) {
    try {
      const rule = this.invalidationRules[eventType];
      if (!rule) {
        logger.warn('Unknown security event type:', eventType);
        return false;
      }

      const {
        userId,
        sessionId,
        ipAddress,
        userAgent,
        organizationId,
        metadata = {}
      } = context;

      // Log security event
      securityLogger.warn('Security event detected', {
        eventType,
        userId,
        sessionId,
        ipAddress,
        userAgent,
        organizationId,
        rule: rule.action,
        metadata
      });

      // Check if immediate action is required
      if (rule.immediate) {
        await this.executeInvalidation(eventType, rule, context);
      } else if (rule.threshold) {
        // Check threshold-based events
        const shouldInvalidate = await this.checkThreshold(eventType, rule, context);
        if (shouldInvalidate) {
          await this.executeInvalidation(eventType, rule, context);
        }
      }

      // Alert security team if required
      if (rule.alertSecurity) {
        await this.alertSecurityTeam(eventType, context);
      }

      return true;

    } catch (error) {
      logger.error('Error handling security event:', error);
      return false;
    }
  }

  /**
   * Execute session invalidation based on rule
   */
  async executeInvalidation(eventType, rule, context) {
    const { userId, sessionId, organizationId } = context;

    try {
      switch (rule.action) {
        case 'invalidate_user_sessions':
          await this.invalidateUserSessions(userId, sessionId);
          break;
          
        case 'invalidate_all_except_current':
          await this.invalidateUserSessionsExceptCurrent(userId, sessionId);
          break;
          
        case 'invalidate_specific_session':
          await this.invalidateSpecificSession(sessionId);
          break;
          
        case 'invalidate_oldest_sessions':
          await this.invalidateOldestUserSessions(userId, 2); // Keep 2 newest
          break;
          
        case 'invalidate_all_sessions':
          await this.invalidateAllSessions(organizationId);
          break;
          
        default:
          logger.warn('Unknown invalidation action:', rule.action);
      }

      // Log successful invalidation
      securityLogger.info('Session invalidation executed', {
        eventType,
        action: rule.action,
        userId,
        sessionId,
        organizationId
      });

    } catch (error) {
      logger.error('Error executing session invalidation:', error);
      throw error;
    }
  }

  /**
   * Check if threshold-based event should trigger invalidation
   */
  async checkThreshold(eventType, rule, context) {
    const { userId, ipAddress } = context;
    const key = `${eventType}:${userId || ipAddress}`;
    const now = Date.now();

    // Get current attempts
    let attempts = this.failedAttempts.get(key) || [];
    
    // Remove old attempts outside time window
    attempts = attempts.filter(timestamp => 
      now - timestamp < rule.timeWindow
    );

    // Add current attempt
    attempts.push(now);
    this.failedAttempts.set(key, attempts);

    // Check if threshold exceeded
    if (attempts.length >= rule.threshold) {
      // Clear attempts after triggering
      this.failedAttempts.delete(key);
      
      securityLogger.warn('Security threshold exceeded', {
        eventType,
        attempts: attempts.length,
        threshold: rule.threshold,
        timeWindow: rule.timeWindow,
        userId,
        ipAddress
      });
      
      return true;
    }

    return false;
  }

  /**
   * Invalidate all sessions for a specific user
   */
  async invalidateUserSessions(userId, excludeSessionId = null) {
    try {
      const query = supabaseAdmin
        .from('user_sessions')
        .update({ 
          is_active: false,
          invalidated_at: new Date().toISOString(),
          invalidation_reason: 'security_event'
        })
        .eq('user_id', userId)
        .eq('is_active', true);

      if (excludeSessionId) {
        query.neq('id', excludeSessionId);
      }

      const { error } = await query;
      
      if (error) throw error;

      // Clear user session cache
      await cacheManager.deletePattern(`sessions:${userId}:*`);
      
      logger.info('User sessions invalidated', { 
        userId, 
        excludeSessionId 
      });

    } catch (error) {
      logger.error('Error invalidating user sessions:', error);
      throw error;
    }
  }

  /**
   * Invalidate all user sessions except current one
   */
  async invalidateUserSessionsExceptCurrent(userId, currentSessionId) {
    return await this.invalidateUserSessions(userId, currentSessionId);
  }

  /**
   * Invalidate a specific session
   */
  async invalidateSpecificSession(sessionId) {
    try {
      const { error } = await supabaseAdmin
        .from('user_sessions')
        .update({ 
          is_active: false,
          invalidated_at: new Date().toISOString(),
          invalidation_reason: 'security_event'
        })
        .eq('id', sessionId)
        .eq('is_active', true);

      if (error) throw error;

      // Clear specific session cache
      await cacheManager.delete(`session:${sessionId}`);
      
      logger.info('Specific session invalidated', { sessionId });

    } catch (error) {
      logger.error('Error invalidating specific session:', error);
      throw error;
    }
  }

  /**
   * Invalidate oldest sessions for a user, keeping newest ones
   */
  async invalidateOldestUserSessions(userId, keepNewest = 2) {
    try {
      // Get user's sessions ordered by creation date
      const { data: sessions, error: fetchError } = await supabaseAdmin
        .from('user_sessions')
        .select('id, created_at')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      if (sessions && sessions.length > keepNewest) {
        const sessionsToInvalidate = sessions.slice(keepNewest);
        const sessionIds = sessionsToInvalidate.map(s => s.id);

        const { error } = await supabaseAdmin
          .from('user_sessions')
          .update({ 
            is_active: false,
            invalidated_at: new Date().toISOString(),
            invalidation_reason: 'too_many_sessions'
          })
          .in('id', sessionIds);

        if (error) throw error;

        // Clear invalidated session caches
        for (const sessionId of sessionIds) {
          await cacheManager.delete(`session:${sessionId}`);
        }

        logger.info('Oldest sessions invalidated', { 
          userId, 
          invalidatedCount: sessionIds.length,
          keptNewest: keepNewest
        });
      }

    } catch (error) {
      logger.error('Error invalidating oldest sessions:', error);
      throw error;
    }
  }

  /**
   * Invalidate all sessions (emergency measure)
   */
  async invalidateAllSessions(organizationId = null) {
    try {
      let query = supabaseAdmin
        .from('user_sessions')
        .update({ 
          is_active: false,
          invalidated_at: new Date().toISOString(),
          invalidation_reason: 'global_security_event'
        })
        .eq('is_active', true);

      if (organizationId) {
        // If organization specified, only invalidate sessions for that org
        const { data: orgUsers } = await supabaseAdmin
          .from('app_users')
          .select('id')
          .eq('organization_id', organizationId);
        
        if (orgUsers && orgUsers.length > 0) {
          const userIds = orgUsers.map(u => u.id);
          query = query.in('user_id', userIds);
        }
      }

      const { error } = await query;
      
      if (error) throw error;

      // Clear all session caches
      await cacheManager.deletePattern('sessions:*');
      await cacheManager.deletePattern('session:*');
      
      securityLogger.critical('All sessions invalidated', { 
        organizationId,
        reason: 'global_security_event'
      });

    } catch (error) {
      logger.error('Error invalidating all sessions:', error);
      throw error;
    }
  }

  /**
   * Check session validity and security
   */
  async validateSession(sessionToken, request) {
    try {
      // Get session from database
      const { data: session, error } = await supabaseAdmin
        .from('user_sessions')
        .select(`
          *,
          app_users(id, email, role, is_active, last_login)
        `)
        .eq('session_token', sessionToken)
        .eq('is_active', true)
        .single();

      if (error || !session) {
        return { valid: false, reason: 'session_not_found' };
      }

      // Check expiration
      if (new Date() > new Date(session.expires_at)) {
        await this.invalidateSpecificSession(session.id);
        return { valid: false, reason: 'session_expired' };
      }

      // Check if user is still active
      if (!session.app_users.is_active) {
        await this.invalidateUserSessions(session.user_id);
        return { valid: false, reason: 'user_inactive' };
      }

      // Security checks
      const securityIssues = await this.performSecurityChecks(session, request);
      if (securityIssues.length > 0) {
        // Handle security issues
        for (const issue of securityIssues) {
          await this.handleSecurityEvent(issue.eventType, {
            userId: session.user_id,
            sessionId: session.id,
            ...issue.context
          });
        }
        
        return { 
          valid: false, 
          reason: 'security_check_failed',
          issues: securityIssues
        };
      }

      return { 
        valid: true, 
        session,
        user: session.app_users
      };

    } catch (error) {
      logger.error('Session validation error:', error);
      return { valid: false, reason: 'validation_error' };
    }
  }

  /**
   * Perform security checks on session
   */
  async performSecurityChecks(session, request) {
    const issues = [];
    const { ip_address, user_agent } = session;
    const currentIp = request.ip;
    const currentUserAgent = request.get('User-Agent');

    // Check for IP address changes
    if (ip_address && currentIp && ip_address !== currentIp) {
      // Allow for reasonable IP changes (same ISP, etc.)
      if (!this.isReasonableIpChange(ip_address, currentIp)) {
        issues.push({
          eventType: this.securityEvents.SUSPICIOUS_LOCATION,
          context: {
            originalIp: ip_address,
            currentIp,
            ipAddress: currentIp
          }
        });
      }
    }

    // Check for user agent changes
    if (user_agent && currentUserAgent && user_agent !== currentUserAgent) {
      // Significant user agent changes might indicate session hijacking
      if (!this.isReasonableUserAgentChange(user_agent, currentUserAgent)) {
        issues.push({
          eventType: this.securityEvents.UNUSUAL_ACTIVITY,
          context: {
            originalUserAgent: user_agent,
            currentUserAgent,
            userAgent: currentUserAgent
          }
        });
      }
    }

    // Check for too many concurrent sessions
    const concurrentSessions = await this.countConcurrentSessions(session.user_id);
    if (concurrentSessions > 10) { // Configurable threshold
      issues.push({
        eventType: this.securityEvents.MULTIPLE_CONCURRENT_SESSIONS,
        context: {
          concurrentSessions,
          maxAllowed: 10
        }
      });
    }

    return issues;
  }

  /**
   * Check if IP change is reasonable (same subnet, etc.)
   */
  isReasonableIpChange(originalIp, currentIp) {
    // Basic subnet check for IPv4
    if (originalIp.includes('.') && currentIp.includes('.')) {
      const originalParts = originalIp.split('.');
      const currentParts = currentIp.split('.');
      
      // Same first 3 octets (same /24 subnet)
      return originalParts.slice(0, 3).join('.') === currentParts.slice(0, 3).join('.');
    }
    
    return false;
  }

  /**
   * Check if user agent change is reasonable
   */
  isReasonableUserAgentChange(originalUA, currentUA) {
    // Allow minor version changes in browsers
    const extractBrowser = (ua) => {
      const match = ua.match(/(Chrome|Firefox|Safari|Edge)\/(\d+)/);
      return match ? `${match[1]}/${Math.floor(match[2] / 10) * 10}` : ua;
    };
    
    return extractBrowser(originalUA) === extractBrowser(currentUA);
  }

  /**
   * Count concurrent active sessions for user
   */
  async countConcurrentSessions(userId) {
    try {
      const { count, error } = await supabaseAdmin
        .from('user_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) throw error;
      return count || 0;

    } catch (error) {
      logger.error('Error counting concurrent sessions:', error);
      return 0;
    }
  }

  /**
   * Alert security team about critical events
   */
  async alertSecurityTeam(eventType, context) {
    try {
      // This would integrate with your alerting system
      securityLogger.critical('Security team alert', {
        eventType,
        context,
        timestamp: new Date().toISOString()
      });

      // Could send to Slack, email, PagerDuty, etc.
      // await notificationService.sendSecurityAlert(eventType, context);

    } catch (error) {
      logger.error('Error alerting security team:', error);
    }
  }

  /**
   * Middleware for automatic session validation
   */
  securityValidationMiddleware() {
    return async (req, res, next) => {
      if (!req.user || !req.sessionId) {
        return next();
      }

      try {
        const validation = await this.validateSession(req.sessionToken, req);
        
        if (!validation.valid) {
          logger.warn('Session validation failed', {
            sessionId: req.sessionId,
            reason: validation.reason,
            userId: req.user.id
          });

          return res.status(401).json({
            success: false,
            error: 'Session invalid',
            reason: validation.reason,
            requireReauth: true
          });
        }

        next();
      } catch (error) {
        logger.error('Session validation middleware error:', error);
        next();
      }
    };
  }

  /**
   * Clean up expired failed attempt records
   */
  cleanupExpiredAttempts() {
    const now = Date.now();
    const expireTime = 24 * 60 * 60 * 1000; // 24 hours
    
    for (const [key, attempts] of this.failedAttempts.entries()) {
      const validAttempts = attempts.filter(timestamp => 
        now - timestamp < expireTime
      );
      
      if (validAttempts.length === 0) {
        this.failedAttempts.delete(key);
      } else {
        this.failedAttempts.set(key, validAttempts);
      }
    }
  }
}

// Create singleton instance
const sessionSecurity = new SessionSecurity();

// Clean up expired attempts every hour
setInterval(() => {
  sessionSecurity.cleanupExpiredAttempts();
}, 60 * 60 * 1000);

module.exports = {
  SessionSecurity,
  sessionSecurity
};