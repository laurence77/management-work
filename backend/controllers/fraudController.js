const fraudDetectionService = require('../services/fraudDetectionService');
const { createClient } = require('@supabase/supabase-js');
const { logger } = require('../utils/logger');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class FraudController {
  // Analyze a specific booking for fraud
  async analyzeBooking(req, res) {
    try {
      const { bookingId } = req.params;
      const { user_id } = req.user;

      // Get booking data
      const { data: booking, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (error || !booking) {
        return res.status(404).json({
          success: false,
          error: 'Booking not found'
        });
      }

      // Check if user has permission to analyze this booking
      if (booking.user_id !== user_id && !req.user.is_admin) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
      }

      // Get user context for analysis
      const userContext = {
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      };

      const assessment = await fraudDetectionService.analyzeBooking(booking, userContext);

      res.json({
        success: true,
        assessment,
        booking: {
          id: booking.id,
          client_email: booking.client_email,
          status: booking.status,
          budget: booking.budget
        }
      });
    } catch (error) {
      logger.error('Fraud analysis error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to analyze booking for fraud'
      });
    }
  }

  // Get fraud assessments with filtering
  async getAssessments(req, res) {
    try {
      const { 
        risk_level, 
        limit = 50, 
        offset = 0,
        start_date,
        end_date 
      } = req.query;

      let query = supabase
        .from('fraud_assessments')
        .select(`
          *,
          bookings (
            id,
            client_email,
            client_name,
            celebrity_name,
            budget,
            status,
            event_date
          )
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (risk_level) {
        query = query.eq('risk_level', risk_level);
      }

      if (start_date) {
        query = query.gte('created_at', start_date);
      }

      if (end_date) {
        query = query.lte('created_at', end_date);
      }

      const { data: assessments, error } = await query;

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        assessments,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: assessments?.length || 0
        }
      });
    } catch (error) {
      logger.error('Get assessments error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch fraud assessments'
      });
    }
  }

  // Get fraud statistics
  async getStatistics(req, res) {
    try {
      const { days = 30 } = req.query;
      
      const statistics = await fraudDetectionService.getFraudStatistics(parseInt(days));
      
      // Get recent alerts
      const { data: recentAlerts } = await supabase
        .from('alerts')
        .select('*')
        .eq('type', 'fraud_detection')
        .order('created_at', { ascending: false })
        .limit(10);

      res.json({
        success: true,
        statistics,
        recent_alerts: recentAlerts || []
      });
    } catch (error) {
      logger.error('Get fraud statistics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch fraud statistics'
      });
    }
  }

  // Batch analyze bookings
  async batchAnalyze(req, res) {
    try {
      if (!req.user.is_admin) {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }

      const { limit = 100 } = req.body;
      
      const results = await fraudDetectionService.analyzeExistingBookings(limit);
      
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      res.json({
        success: true,
        message: `Batch analysis completed: ${successful} successful, ${failed} failed`,
        results
      });
    } catch (error) {
      logger.error('Batch analysis error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to perform batch fraud analysis'
      });
    }
  }

  // Update assessment status
  async updateAssessment(req, res) {
    try {
      const { assessmentId } = req.params;
      const { status, reviewer_notes } = req.body;
      const { user_id } = req.user;

      if (!req.user.is_admin && !req.user.permissions?.includes('review_fraud')) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions to review fraud assessments'
        });
      }

      const { data: assessment, error } = await supabase
        .from('fraud_assessments')
        .update({
          review_status: status,
          reviewer_id: user_id,
          reviewer_notes,
          reviewed_at: new Date()
        })
        .eq('id', assessmentId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        message: 'Assessment updated successfully',
        assessment
      });
    } catch (error) {
      logger.error('Update assessment error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update assessment'
      });
    }
  }

  // Add email to blacklist
  async addEmailToBlacklist(req, res) {
    try {
      const { email, reason } = req.body;
      const { user_id } = req.user;

      if (!req.user.is_admin) {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }

      const { error } = await supabase
        .from('email_blacklist')
        .insert({
          email: email.toLowerCase(),
          reason,
          added_by: user_id,
          created_at: new Date()
        });

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          return res.status(409).json({
            success: false,
            error: 'Email is already blacklisted'
          });
        }
        throw error;
      }

      res.json({
        success: true,
        message: 'Email added to blacklist successfully'
      });
    } catch (error) {
      logger.error('Add blacklist email error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add email to blacklist'
      });
    }
  }

  // Remove email from blacklist
  async removeEmailFromBlacklist(req, res) {
    try {
      const { email } = req.params;

      if (!req.user.is_admin) {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }

      const { error } = await supabase
        .from('email_blacklist')
        .delete()
        .eq('email', email.toLowerCase());

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        message: 'Email removed from blacklist successfully'
      });
    } catch (error) {
      logger.error('Remove blacklist email error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to remove email from blacklist'
      });
    }
  }

  // Get blacklisted emails
  async getBlacklistedEmails(req, res) {
    try {
      if (!req.user.is_admin) {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }

      const { data: blacklistedEmails, error } = await supabase
        .from('email_blacklist')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        blacklisted_emails: blacklistedEmails || []
      });
    } catch (error) {
      logger.error('Get blacklisted emails error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch blacklisted emails'
      });
    }
  }

  // Get fraud alerts
  async getAlerts(req, res) {
    try {
      const { limit = 20, offset = 0, severity } = req.query;

      let query = supabase
        .from('alerts')
        .select(`
          *,
          bookings (
            id,
            client_email,
            client_name,
            celebrity_name,
            budget,
            status
          )
        `)
        .eq('type', 'fraud_detection')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (severity) {
        query = query.eq('severity', severity);
      }

      const { data: alerts, error } = await query;

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        alerts: alerts || [],
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      });
    } catch (error) {
      logger.error('Get fraud alerts error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch fraud alerts'
      });
    }
  }

  // Mark alert as read
  async markAlertAsRead(req, res) {
    try {
      const { alertId } = req.params;
      const { user_id } = req.user;

      const { error } = await supabase
        .from('alerts')
        .update({
          is_read: true,
          read_by: user_id,
          read_at: new Date()
        })
        .eq('id', alertId);

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        message: 'Alert marked as read'
      });
    } catch (error) {
      logger.error('Mark alert as read error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to mark alert as read'
      });
    }
  }

  // Get fraud trends
  async getTrends(req, res) {
    try {
      const { days = 30 } = req.query;
      const since = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));

      // Get daily fraud statistics
      const { data: dailyStats } = await supabase
        .from('fraud_assessments')
        .select('risk_level, created_at')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: true });

      // Group by date
      const trendData = {};
      dailyStats?.forEach(stat => {
        const date = stat.created_at.split('T')[0];
        if (!trendData[date]) {
          trendData[date] = { high: 0, medium: 0, low: 0, total: 0 };
        }
        trendData[date][stat.risk_level.toLowerCase()]++;
        trendData[date].total++;
      });

      // Convert to array format
      const trends = Object.entries(trendData).map(([date, stats]) => ({
        date,
        ...stats
      }));

      res.json({
        success: true,
        trends
      });
    } catch (error) {
      logger.error('Get fraud trends error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch fraud trends'
      });
    }
  }
}

module.exports = new FraudController();