const cron = require('node-cron');
const authService = require('../services/authService');
const { logger } = require('./logger');

class CleanupService {
  constructor() {
    this.isRunning = false;
  }

  // Start automated cleanup tasks
  start() {
    if (this.isRunning) {
      logger.warn('Cleanup service is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting cleanup service');

    // Clean up expired tokens every hour
    cron.schedule('0 * * * *', async () => {
      try {
        await authService.cleanupExpiredTokens();
        logger.info('Automated token cleanup completed');
      } catch (error) {
        logger.error('Automated token cleanup failed:', error);
      }
    });

    // Clean up old audit logs every day at 2 AM (keep 90 days)
    cron.schedule('0 2 * * *', async () => {
      try {
        await this.cleanupOldAuditLogs();
        logger.info('Automated audit log cleanup completed');
      } catch (error) {
        logger.error('Automated audit log cleanup failed:', error);
      }
    });

    logger.info('Cleanup service started successfully');
  }

  // Stop cleanup service
  stop() {
    this.isRunning = false;
    logger.info('Cleanup service stopped');
  }

  // Clean up old audit logs
  async cleanupOldAuditLogs() {
    try {
      const { supabaseAdmin } = require('../config/supabase');
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90); // 90 days ago

      const { error } = await supabaseAdmin
        .from('audit_logs')
        .delete()
        .lt('created_at', cutoffDate.toISOString());

      if (error) {
        throw error;
      }

      logger.info('Old audit logs cleaned up successfully');
    } catch (error) {
      logger.error('Failed to clean up audit logs:', error);
      throw error;
    }
  }

  // Manual cleanup of all expired tokens
  async cleanupExpiredTokensManual() {
    try {
      await authService.cleanupExpiredTokens();
      logger.info('Manual token cleanup completed');
    } catch (error) {
      logger.error('Manual token cleanup failed:', error);
      throw error;
    }
  }

  // Manual cleanup of old audit logs
  async cleanupOldAuditLogsManual(days = 90) {
    try {
      const { supabaseAdmin } = require('../config/supabase');
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const { data, error } = await supabaseAdmin
        .from('audit_logs')
        .delete()
        .lt('created_at', cutoffDate.toISOString())
        .select('count');

      if (error) {
        throw error;
      }

      logger.info(`Manual audit log cleanup completed. Removed logs older than ${days} days`);
      return data;
    } catch (error) {
      logger.error('Manual audit log cleanup failed:', error);
      throw error;
    }
  }

  // Get cleanup statistics
  async getCleanupStats() {
    try {
      const { supabaseAdmin } = require('../config/supabase');

      // Count expired tokens
      const { count: expiredTokens } = await supabaseAdmin
        .from('refresh_tokens')
        .select('*', { count: 'exact', head: true })
        .lt('expires_at', new Date().toISOString());

      // Count total tokens
      const { count: totalTokens } = await supabaseAdmin
        .from('refresh_tokens')
        .select('*', { count: 'exact', head: true });

      // Count old audit logs (older than 90 days)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);
      
      const { count: oldAuditLogs } = await supabaseAdmin
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .lt('created_at', cutoffDate.toISOString());

      // Count total audit logs
      const { count: totalAuditLogs } = await supabaseAdmin
        .from('audit_logs')
        .select('*', { count: 'exact', head: true });

      return {
        tokens: {
          expired: expiredTokens || 0,
          total: totalTokens || 0,
          active: (totalTokens || 0) - (expiredTokens || 0)
        },
        auditLogs: {
          old: oldAuditLogs || 0,
          total: totalAuditLogs || 0,
          recent: (totalAuditLogs || 0) - (oldAuditLogs || 0)
        }
      };
    } catch (error) {
      logger.error('Failed to get cleanup stats:', error);
      throw error;
    }
  }
}

module.exports = new CleanupService();