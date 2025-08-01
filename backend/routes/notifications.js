const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { supabase } = require('../config/supabase');
const { rateLimits } = require('../middleware/security');
const emailService = require('../services/emailService');
const router = express.Router();

// GET /api/notifications - Get user notifications
router.get('/', rateLimits.general, authenticateToken, async (req, res) => {
  try {
    const {
      type,
      read,
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', req.user.id);

    // Apply filters
    if (type) {
      query = query.eq('type', type);
    }

    if (read !== undefined) {
      query = query.eq('is_read', read === 'true');
    }

    // Apply sorting and pagination
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: notifications, error } = await query;

    if (error) {
      throw error;
    }

    // Get total count and unread count
    const { count: totalCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id);

    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .eq('is_read', false);

    res.json({
      success: true,
      data: {
        notifications: notifications || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount || 0,
          pages: Math.ceil((totalCount || 0) / parseInt(limit))
        },
        stats: {
          total: totalCount || 0,
          unread: unreadCount || 0,
          types: await this.getNotificationTypeStats(req.user.id)
        },
        filters: {
          type,
          read,
          sortBy,
          sortOrder
        }
      }
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications'
    });
  }
});

// GET /api/notifications/unread-count - Get unread notification count
router.get('/unread-count', rateLimits.general, authenticateToken, async (req, res) => {
  try {
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .eq('is_read', false);

    res.json({
      success: true,
      data: {
        unreadCount: unreadCount || 0
      }
    });

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unread count'
    });
  }
});

// PUT /api/notifications/:id/read - Mark notification as read
router.put('/:id/read', rateLimits.api, authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: notification, error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error || !notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      data: notification
    });

  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read'
    });
  }
});

// PUT /api/notifications/mark-all-read - Mark all notifications as read
router.put('/mark-all-read', rateLimits.api, authenticateToken, async (req, res) => {
  try {
    const { data: notifications, error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('user_id', req.user.id)
      .eq('is_read', false)
      .select();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'All notifications marked as read',
      data: {
        updatedCount: notifications?.length || 0
      }
    });

  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notifications as read'
    });
  }
});

// DELETE /api/notifications/:id - Delete notification
router.delete('/:id', rateLimits.api, authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: notification, error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error || !notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification'
    });
  }
});

// POST /api/notifications/preferences - Update notification preferences
router.post('/preferences', rateLimits.api, authenticateToken, async (req, res) => {
  try {
    const {
      emailNotifications = true,
      bookingUpdates = true,
      paymentAlerts = true,
      promotionalEmails = false,
      eventReminders = true,
      securityAlerts = true
    } = req.body;

    const preferences = {
      email_notifications: emailNotifications,
      booking_updates: bookingUpdates,
      payment_alerts: paymentAlerts,
      promotional_emails: promotionalEmails,
      event_reminders: eventReminders,
      security_alerts: securityAlerts
    };

    // Update or insert notification preferences
    const { data: existingPrefs } = await supabase
      .from('notification_preferences')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    let result;
    if (existingPrefs) {
      // Update existing preferences
      const { data, error } = await supabase
        .from('notification_preferences')
        .update({
          ...preferences,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', req.user.id)
        .select()
        .single();
      
      result = { data, error };
    } else {
      // Create new preferences
      const { data, error } = await supabase
        .from('notification_preferences')
        .insert([{
          user_id: req.user.id,
          ...preferences,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();
      
      result = { data, error };
    }

    if (result.error) {
      throw result.error;
    }

    res.json({
      success: true,
      message: 'Notification preferences updated successfully',
      data: result.data
    });

  } catch (error) {
    console.error('Update notification preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notification preferences'
    });
  }
});

// GET /api/notifications/preferences - Get notification preferences
router.get('/preferences', rateLimits.general, authenticateToken, async (req, res) => {
  try {
    const { data: preferences, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // Not found error
      throw error;
    }

    // Return default preferences if none exist
    const defaultPreferences = {
      email_notifications: true,
      booking_updates: true,
      payment_alerts: true,
      promotional_emails: false,
      event_reminders: true,
      security_alerts: true
    };

    res.json({
      success: true,
      data: preferences || defaultPreferences
    });

  } catch (error) {
    console.error('Get notification preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification preferences'
    });
  }
});

// POST /api/notifications/send-test - Send test notification (development only)
router.post('/send-test', rateLimits.api, authenticateToken, async (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({
      success: false,
      message: 'Endpoint not available in production'
    });
  }

  try {
    const { type = 'test', title = 'Test Notification', message = 'This is a test notification' } = req.body;

    // Create test notification
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert([{
        user_id: req.user.id,
        title,
        message,
        type,
        data: { test: true, timestamp: new Date().toISOString() },
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Send test email if requested
    if (req.body.sendEmail) {
      await emailService.sendEmail({
        to: req.user.email,
        subject: title,
        html: `
          <h2>${title}</h2>
          <p>${message}</p>
          <p><em>This is a test email sent from the notification system.</em></p>
        `
      });
    }

    res.json({
      success: true,
      message: 'Test notification sent successfully',
      data: notification
    });

  } catch (error) {
    console.error('Send test notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test notification'
    });
  }
});

// Admin Routes

// GET /api/notifications/admin/all - Get all notifications (admin)
router.get('/admin/all', rateLimits.api, authenticateToken, requirePermission('manage_notifications'), async (req, res) => {
  try {
    const {
      userId,
      type,
      read,
      dateFrom,
      dateTo,
      page = 1,
      limit = 50,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    let query = supabase
      .from('notifications')
      .select(`
        *,
        profiles(first_name, last_name, email)
      `);

    // Apply filters
    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (type) {
      query = query.eq('type', type);
    }

    if (read !== undefined) {
      query = query.eq('is_read', read === 'true');
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    // Apply sorting and pagination
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: notifications, error } = await query;

    if (error) {
      throw error;
    }

    // Get total count and stats
    const { count: totalCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true });

    const { data: stats } = await supabase
      .from('notifications')
      .select('type, is_read');

    const notificationStats = {
      total: totalCount || 0,
      read: stats?.filter(n => n.is_read).length || 0,
      unread: stats?.filter(n => !n.is_read).length || 0,
      byType: stats?.reduce((acc, n) => {
        acc[n.type] = (acc[n.type] || 0) + 1;
        return acc;
      }, {}) || {}
    };

    res.json({
      success: true,
      data: {
        notifications: notifications || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount || 0,
          pages: Math.ceil((totalCount || 0) / parseInt(limit))
        },
        stats: notificationStats,
        filters: {
          userId,
          type,
          read,
          dateRange: { from: dateFrom, to: dateTo },
          sortBy,
          sortOrder
        }
      }
    });

  } catch (error) {
    console.error('Admin get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications'
    });
  }
});

// POST /api/notifications/admin/broadcast - Send broadcast notification (admin)
router.post('/admin/broadcast', rateLimits.api, authenticateToken, requirePermission('manage_notifications'), async (req, res) => {
  try {
    const {
      title,
      message,
      type = 'announcement',
      targetUsers = 'all', // 'all', 'vip', 'active', or array of user IDs
      sendEmail = false,
      scheduledFor = null
    } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Title and message are required'
      });
    }

    let userIds = [];

    // Determine target users
    if (targetUsers === 'all') {
      const { data: users } = await supabase
        .from('profiles')
        .select('id');
      userIds = users?.map(u => u.id) || [];
    } else if (targetUsers === 'vip') {
      const { data: vipUsers } = await supabase
        .from('vip_memberships')
        .select('user_id')
        .eq('status', 'active');
      userIds = vipUsers?.map(u => u.user_id) || [];
    } else if (targetUsers === 'active') {
      // Users with bookings in the last 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const { data: activeUsers } = await supabase
        .from('bookings')
        .select('user_id')
        .gte('created_at', sixMonthsAgo.toISOString());
      
      userIds = [...new Set(activeUsers?.map(u => u.user_id) || [])];
    } else if (Array.isArray(targetUsers)) {
      userIds = targetUsers;
    }

    if (userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No target users found'
      });
    }

    // Create notifications for all target users
    const notifications = userIds.map(userId => ({
      user_id: userId,
      title,
      message,
      type,
      data: {
        broadcast: true,
        sentBy: req.user.id,
        targetGroup: targetUsers
      },
      created_at: scheduledFor || new Date().toISOString()
    }));

    const { data: createdNotifications, error } = await supabase
      .from('notifications')
      .insert(notifications)
      .select();

    if (error) {
      throw error;
    }

    // Send emails if requested
    if (sendEmail) {
      const { data: users } = await supabase
        .from('profiles')
        .select('email, first_name')
        .in('id', userIds);

      const emailPromises = users?.map(user => 
        emailService.sendEmail({
          to: user.email,
          subject: title,
          html: `
            <h2>${title}</h2>
            <p>Hello ${user.first_name},</p>
            <p>${message}</p>
            <hr>
            <p><em>This message was sent to all our valued customers.</em></p>
          `
        })
      ) || [];

      await Promise.allSettled(emailPromises);
    }

    res.json({
      success: true,
      message: 'Broadcast notification sent successfully',
      data: {
        notificationsSent: createdNotifications?.length || 0,
        targetUsers: userIds.length,
        emailsSent: sendEmail ? userIds.length : 0
      }
    });

  } catch (error) {
    console.error('Send broadcast notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send broadcast notification'
    });
  }
});

// Helper function to get notification type statistics
async function getNotificationTypeStats(userId) {
  try {
    const { data: notifications } = await supabase
      .from('notifications')
      .select('type')
      .eq('user_id', userId);

    return notifications?.reduce((acc, n) => {
      acc[n.type] = (acc[n.type] || 0) + 1;
      return acc;
    }, {}) || {};
  } catch (error) {
    console.error('Error getting notification type stats:', error);
    return {};
  }
}

module.exports = router;