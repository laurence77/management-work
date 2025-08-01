const calendarService = require('../services/rapidCalendarService');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class CalendarController {
  // Initiate Google Calendar authorization
  async authorize(req, res) {
    try {
      const { user_id } = req.user;
      
      const authUrl = calendarService.generateAuthUrl(user_id);
      
      res.json({
        success: true,
        authUrl,
        message: 'Visit the authorization URL to connect your Google Calendar'
      });
    } catch (error) {
      console.error('Calendar authorization error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate authorization URL'
      });
    }
  }

  // Handle OAuth callback
  async callback(req, res) {
    try {
      const { code, state: userId } = req.query;
      
      if (!code) {
        return res.status(400).json({
          success: false,
          error: 'Authorization code not provided'
        });
      }

      const tokens = await calendarService.exchangeCodeForTokens(code, userId);
      
      // Auto-sync existing bookings
      const syncResults = await calendarService.syncAllBookingsToCalendar(userId);
      
      res.json({
        success: true,
        message: 'Google Calendar connected successfully',
        syncResults
      });
    } catch (error) {
      console.error('Calendar callback error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to connect Google Calendar'
      });
    }
  }

  // Get calendar connection status
  async getStatus(req, res) {
    try {
      const { user_id } = req.user;
      
      const status = await calendarService.getCalendarStatus(user_id);
      
      res.json({
        success: true,
        status
      });
    } catch (error) {
      console.error('Calendar status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get calendar status'
      });
    }
  }

  // Sync booking to calendar
  async syncBooking(req, res) {
    try {
      const { user_id } = req.user;
      const { bookingId } = req.params;
      
      const { data: booking, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .eq('user_id', user_id)
        .single();

      if (error || !booking) {
        return res.status(404).json({
          success: false,
          error: 'Booking not found'
        });
      }

      const event = await calendarService.createBookingEvent(user_id, booking);
      
      res.json({
        success: true,
        message: 'Booking synced to calendar successfully',
        event: {
          id: event.id,
          htmlLink: event.htmlLink
        }
      });
    } catch (error) {
      console.error('Booking sync error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to sync booking to calendar'
      });
    }
  }

  // Sync all bookings to calendar
  async syncAllBookings(req, res) {
    try {
      const { user_id } = req.user;
      
      const results = await calendarService.syncAllBookingsToCalendar(user_id);
      
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      res.json({
        success: true,
        message: `Sync completed: ${successful} successful, ${failed} failed`,
        results
      });
    } catch (error) {
      console.error('All bookings sync error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to sync all bookings to calendar'
      });
    }
  }

  // Check for booking conflicts
  async checkConflicts(req, res) {
    try {
      const { user_id } = req.user;
      const { eventDate, duration } = req.body;
      
      if (!eventDate) {
        return res.status(400).json({
          success: false,
          error: 'Event date is required'
        });
      }

      const conflicts = await calendarService.checkBookingConflicts(
        user_id, 
        eventDate, 
        duration || 2
      );
      
      res.json({
        success: true,
        conflicts
      });
    } catch (error) {
      console.error('Conflict check error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check for conflicts'
      });
    }
  }

  // Get calendar events
  async getEvents(req, res) {
    try {
      const { user_id } = req.user;
      const { timeMin, timeMax } = req.query;
      
      const events = await calendarService.getUserCalendarEvents(
        user_id,
        timeMin,
        timeMax
      );
      
      res.json({
        success: true,
        events
      });
    } catch (error) {
      console.error('Get events error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch calendar events'
      });
    }
  }

  // Get busy times for availability
  async getBusyTimes(req, res) {
    try {
      const { user_id } = req.user;
      const { timeMin, timeMax } = req.query;
      
      const busyTimes = await calendarService.getBusyTimes(
        user_id,
        timeMin,
        timeMax
      );
      
      res.json({
        success: true,
        busyTimes
      });
    } catch (error) {
      console.error('Busy times error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch busy times'
      });
    }
  }

  // Disconnect Google Calendar
  async disconnect(req, res) {
    try {
      const { user_id } = req.user;
      
      await calendarService.revokeCalendarAccess(user_id);
      
      res.json({
        success: true,
        message: 'Google Calendar disconnected successfully'
      });
    } catch (error) {
      console.error('Calendar disconnect error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to disconnect Google Calendar'
      });
    }
  }

  // Update booking calendar event
  async updateBookingEvent(req, res) {
    try {
      const { user_id } = req.user;
      const { bookingId } = req.params;
      
      const { data: booking, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .eq('user_id', user_id)
        .single();

      if (error || !booking) {
        return res.status(404).json({
          success: false,
          error: 'Booking not found'
        });
      }

      const event = await calendarService.updateBookingEvent(user_id, booking);
      
      res.json({
        success: true,
        message: 'Calendar event updated successfully',
        event: {
          id: event.id,
          htmlLink: event.htmlLink
        }
      });
    } catch (error) {
      console.error('Update event error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update calendar event'
      });
    }
  }

  // Delete booking calendar event
  async deleteBookingEvent(req, res) {
    try {
      const { user_id } = req.user;
      const { bookingId } = req.params;
      
      const { data: booking, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .eq('user_id', user_id)
        .single();

      if (error || !booking) {
        return res.status(404).json({
          success: false,
          error: 'Booking not found'
        });
      }

      await calendarService.deleteBookingEvent(user_id, booking);
      
      res.json({
        success: true,
        message: 'Calendar event deleted successfully'
      });
    } catch (error) {
      console.error('Delete event error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete calendar event'
      });
    }
  }
}

module.exports = new CalendarController();