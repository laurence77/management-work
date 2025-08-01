const { createClient } = require('@supabase/supabase-js');
const { logger } = require('../utils/logger');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class RapidCalendarService {
  constructor() {
    this.rapidApiKey = process.env.RAPIDAPI_KEY;
    this.rapidApiHost = 'google-calendar-mcp.p.rapidapi.com';
    this.baseUrl = `https://${this.rapidApiHost}/mcp`;
    
    if (!this.rapidApiKey) {
      logger.warn('RapidAPI key not configured. Calendar features will be limited.');
    }
  }

  async makeRequest(method, params = {}, accessToken = null) {
    if (!this.rapidApiKey) {
      throw new Error('RapidAPI key not configured');
    }

    try {
      const fetch = (await import('node-fetch')).default;
      
      const headers = {
        'x-rapidapi-key': this.rapidApiKey,
        'x-rapidapi-host': this.rapidApiHost,
        'Content-Type': 'application/json'
      };

      if (accessToken) {
        headers['X-Google-Calendar-Token'] = accessToken;
      }

      const data = JSON.stringify({
        jsonrpc: '2.0',
        method: method,
        params: params,
        id: Date.now().toString()
      });

      const config = {
        method: 'POST',
        headers,
        body: data
      };

      const response = await fetch(this.baseUrl, config);

      if (!response.ok) {
        throw new Error(`RapidAPI Calendar error: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(`API Error: ${result.error.message || result.error}`);
      }

      return result.result;
    } catch (error) {
      logger.error('RapidAPI Calendar request failed:', error);
      throw error;
    }
  }

  // Generate OAuth URL for calendar authorization
  generateAuthUrl(userId, scopes = ['https://www.googleapis.com/auth/calendar']) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${encodeURIComponent(scopes.join(' '))}&` +
      `response_type=code&` +
      `access_type=offline&` +
      `state=${userId}&` +
      `prompt=consent`;
    
    return authUrl;
  }

  // Exchange authorization code for tokens (still use Google's token endpoint directly)
  async exchangeCodeForTokens(code, userId) {
    try {
      const fetch = (await import('node-fetch')).default;
      
      const tokenData = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.GOOGLE_REDIRECT_URI
      });

      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: tokenData
      });

      if (!response.ok) {
        throw new Error(`Token exchange failed: ${response.statusText}`);
      }

      const tokens = await response.json();
      
      // Store tokens in database
      await this.storeUserTokens(userId, tokens);
      
      return tokens;
    } catch (error) {
      logger.error('Error exchanging code for tokens:', error);
      throw new Error('Failed to authorize calendar access');
    }
  }

  // Store user calendar tokens
  async storeUserTokens(userId, tokens) {
    const { error } = await supabase
      .from('user_calendar_tokens')
      .upsert({
        user_id: userId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_type: tokens.token_type || 'Bearer',
        expires_at: new Date(Date.now() + ((tokens.expires_in || 3600) * 1000)),
        scope: tokens.scope,
        updated_at: new Date()
      });

    if (error) {
      logger.error('Error storing calendar tokens:', error);
      throw new Error('Failed to store calendar credentials');
    }
  }

  // Get user calendar tokens
  async getUserTokens(userId) {
    const { data, error } = await supabase
      .from('user_calendar_tokens')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      logger.error('Error fetching user tokens:', error);
      return null;
    }

    return data;
  }

  // Refresh expired tokens
  async refreshUserTokens(userId) {
    const tokens = await this.getUserTokens(userId);
    if (!tokens || !tokens.refresh_token) {
      throw new Error('No refresh token available');
    }

    try {
      const fetch = (await import('node-fetch')).default;
      
      const refreshData = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: tokens.refresh_token,
        grant_type: 'refresh_token'
      });

      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: refreshData
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }

      const newTokens = await response.json();
      
      // Merge with existing tokens (keep refresh token if not provided)
      const updatedTokens = {
        access_token: newTokens.access_token,
        refresh_token: newTokens.refresh_token || tokens.refresh_token,
        token_type: newTokens.token_type || 'Bearer',
        expires_in: newTokens.expires_in || 3600,
        scope: newTokens.scope || tokens.scope
      };

      await this.storeUserTokens(userId, updatedTokens);
      return updatedTokens;
    } catch (error) {
      logger.error('Error refreshing tokens:', error);
      throw new Error('Failed to refresh calendar access');
    }
  }

  // Get valid access token for user
  async getValidAccessToken(userId) {
    let tokens = await this.getUserTokens(userId);
    
    if (!tokens) {
      throw new Error('User has not authorized calendar access');
    }

    // Check if token is expired
    if (new Date() >= new Date(tokens.expires_at)) {
      tokens = await this.refreshUserTokens(userId);
    }

    return tokens.access_token;
  }

  // List available tools from the MCP API
  async listTools() {
    try {
      return await this.makeRequest('tools/list');
    } catch (error) {
      logger.error('Error listing tools:', error);
      throw new Error('Failed to list available tools');
    }
  }

  // Create calendar event for booking using MCP API
  async createBookingEvent(userId, bookingData) {
    try {
      const accessToken = await this.getValidAccessToken(userId);

      const eventData = {
        summary: `Booking: ${bookingData.celebrity_name}`,
        description: `
Celebrity Booking Event

Celebrity: ${bookingData.celebrity_name}
Event Type: ${bookingData.event_type}
Venue: ${bookingData.venue || 'TBD'}
Status: ${bookingData.status}
Budget: $${bookingData.budget?.toLocaleString() || 'TBD'}

Contact: ${bookingData.client_email}
Booking ID: ${bookingData.id}

Generated by Celebrity Booking Admin
        `.trim(),
        start: {
          dateTime: new Date(bookingData.event_date).toISOString(),
          timeZone: bookingData.timezone || 'America/New_York'
        },
        end: {
          dateTime: new Date(new Date(bookingData.event_date).getTime() + (2 * 60 * 60 * 1000)).toISOString(),
          timeZone: bookingData.timezone || 'America/New_York'
        },
        location: bookingData.venue,
        attendees: [
          { email: bookingData.client_email, displayName: bookingData.client_name },
          ...(bookingData.celebrity_contact_email ? [{ email: bookingData.celebrity_contact_email }] : [])
        ],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 60 },
            { method: 'email', minutes: 60 }
          ]
        },
        colorId: '11',
        extendedProperties: {
          private: {
            bookingId: bookingData.id.toString(),
            source: 'celebrity-booking-admin'
          }
        }
      };

      const result = await this.makeRequest('create_event', {
        calendarId: 'primary',
        event: eventData
      }, accessToken);

      // Store calendar event ID in booking record
      if (result && result.id) {
        await supabase
          .from('bookings')
          .update({ calendar_event_id: result.id })
          .eq('id', bookingData.id);
      }

      return result;
    } catch (error) {
      logger.error('Error creating calendar event:', error);
      throw new Error('Failed to create calendar event');
    }
  }

  // Update calendar event when booking changes
  async updateBookingEvent(userId, bookingData) {
    try {
      if (!bookingData.calendar_event_id) {
        return await this.createBookingEvent(userId, bookingData);
      }

      const accessToken = await this.getValidAccessToken(userId);

      const eventData = {
        summary: `Booking: ${bookingData.celebrity_name} - ${bookingData.status}`,
        description: `
Celebrity Booking Event (Updated)

Celebrity: ${bookingData.celebrity_name}
Event Type: ${bookingData.event_type}
Venue: ${bookingData.venue || 'TBD'}
Status: ${bookingData.status}
Budget: $${bookingData.budget?.toLocaleString() || 'TBD'}

Contact: ${bookingData.client_email}
Booking ID: ${bookingData.id}

Last Updated: ${new Date().toLocaleString()}
Generated by Celebrity Booking Admin
        `.trim(),
        start: {
          dateTime: new Date(bookingData.event_date).toISOString(),
          timeZone: bookingData.timezone || 'America/New_York'
        },
        end: {
          dateTime: new Date(new Date(bookingData.event_date).getTime() + (2 * 60 * 60 * 1000)).toISOString(),
          timeZone: bookingData.timezone || 'America/New_York'
        },
        location: bookingData.venue,
        attendees: [
          { email: bookingData.client_email, displayName: bookingData.client_name },
          ...(bookingData.celebrity_contact_email ? [{ email: bookingData.celebrity_contact_email }] : [])
        ]
      };

      const result = await this.makeRequest('update_event', {
        calendarId: 'primary',
        eventId: bookingData.calendar_event_id,
        event: eventData
      }, accessToken);

      return result;
    } catch (error) {
      logger.error('Error updating calendar event:', error);
      throw new Error('Failed to update calendar event');
    }
  }

  // Delete calendar event when booking is cancelled
  async deleteBookingEvent(userId, bookingData) {
    try {
      if (!bookingData.calendar_event_id) {
        return;
      }

      const accessToken = await this.getValidAccessToken(userId);

      await this.makeRequest('delete_event', {
        calendarId: 'primary',
        eventId: bookingData.calendar_event_id
      }, accessToken);

      // Remove calendar event ID from booking record
      await supabase
        .from('bookings')
        .update({ calendar_event_id: null })
        .eq('id', bookingData.id);

    } catch (error) {
      logger.error('Error deleting calendar event:', error);
      throw new Error('Failed to delete calendar event');
    }
  }

  // Get user's calendar events using MCP API
  async getUserCalendarEvents(userId, timeMin, timeMax) {
    try {
      const accessToken = await this.getValidAccessToken(userId);

      const result = await this.makeRequest('list_events', {
        calendarId: 'primary',
        timeMin: timeMin || new Date().toISOString(),
        timeMax: timeMax || new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)).toISOString(),
        maxResults: 100,
        singleEvents: true,
        orderBy: 'startTime'
      }, accessToken);

      return result.items || [];
    } catch (error) {
      logger.error('Error fetching calendar events:', error);
      throw new Error('Failed to fetch calendar events');
    }
  }

  // Check for booking conflicts with existing calendar events
  async checkBookingConflicts(userId, eventDate, duration = 2) {
    try {
      const startTime = new Date(eventDate);
      const endTime = new Date(startTime.getTime() + (duration * 60 * 60 * 1000));

      const events = await this.getUserCalendarEvents(
        userId,
        startTime.toISOString(),
        endTime.toISOString()
      );

      const conflicts = events.filter(event => {
        if (!event.start || !event.end) return false;
        
        const eventStart = new Date(event.start.dateTime || event.start.date);
        const eventEnd = new Date(event.end.dateTime || event.end.date);
        
        return (startTime < eventEnd && endTime > eventStart);
      });

      return {
        hasConflicts: conflicts.length > 0,
        conflicts: conflicts.map(event => ({
          id: event.id,
          summary: event.summary,
          start: event.start.dateTime || event.start.date,
          end: event.end.dateTime || event.end.date
        }))
      };
    } catch (error) {
      logger.error('Error checking booking conflicts:', error);
      return { hasConflicts: false, conflicts: [] };
    }
  }

  // Get busy times for availability checking using MCP API
  async getBusyTimes(userId, timeMin, timeMax) {
    try {
      const accessToken = await this.getValidAccessToken(userId);

      const result = await this.makeRequest('get_freebusy', {
        timeMin: timeMin || new Date().toISOString(),
        timeMax: timeMax || new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)).toISOString(),
        items: [{ id: 'primary' }]
      }, accessToken);

      return result.calendars?.primary?.busy || [];
    } catch (error) {
      logger.error('Error fetching busy times:', error);
      return [];
    }
  }

  // Sync all user bookings to calendar
  async syncAllBookingsToCalendar(userId) {
    try {
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['confirmed', 'pending'])
        .is('calendar_event_id', null);

      if (error) {
        throw new Error('Failed to fetch bookings for sync');
      }

      const results = [];
      for (const booking of bookings) {
        try {
          const event = await this.createBookingEvent(userId, booking);
          results.push({ bookingId: booking.id, success: true, eventId: event.id });
        } catch (error) {
          logger.error(`Failed to sync booking ${booking.id}:`, error);
          results.push({ bookingId: booking.id, success: false, error: error.message });
        }
      }

      return results;
    } catch (error) {
      logger.error('Error syncing bookings to calendar:', error);
      throw new Error('Failed to sync bookings to calendar');
    }
  }

  // Remove calendar authorization
  async revokeCalendarAccess(userId) {
    try {
      const tokens = await this.getUserTokens(userId);
      if (tokens && tokens.access_token) {
        try {
          const fetch = (await import('node-fetch')).default;
          await fetch(`https://oauth2.googleapis.com/revoke?token=${tokens.access_token}`, {
            method: 'POST'
          });
        } catch (error) {
          logger.warn('Error revoking token via Google API:', error);
        }
      }

      // Remove tokens from database
      await supabase
        .from('user_calendar_tokens')
        .delete()
        .eq('user_id', userId);

      return true;
    } catch (error) {
      logger.error('Error revoking calendar access:', error);
      throw new Error('Failed to revoke calendar access');
    }
  }

  // Get calendar integration status
  async getCalendarStatus(userId) {
    try {
      const tokens = await this.getUserTokens(userId);
      
      if (!tokens) {
        return { connected: false, lastSync: null };
      }

      // Check if tokens are still valid by making a test call
      try {
        const accessToken = await this.getValidAccessToken(userId);
        
        // Test API call using MCP
        await this.makeRequest('get_calendar', {
          calendarId: 'primary'
        }, accessToken);
        
        return {
          connected: true,
          lastSync: tokens.updated_at,
          email: tokens.email || null
        };
      } catch (error) {
        return { connected: false, error: 'Invalid credentials' };
      }
    } catch (error) {
      logger.error('Error checking calendar status:', error);
      return { connected: false, error: error.message };
    }
  }
}

module.exports = new RapidCalendarService();