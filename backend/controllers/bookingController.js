const { auditLogger } = require('../utils/logger');
const supabase = require('../config/supabase');
const invoiceService = require('../services/invoiceService');

class BookingController {
  // New method for frontend booking form with payment
  async createBookingWithPayment(req, res, next) {
    try {
      const {
        celebrityId,
        celebrityName,
        eventType,
        eventDate,
        eventTime,
        duration,
        location,
        attendees,
        budget,
        clientName,
        clientEmail,
        clientPhone,
        company,
        specialRequests,
        preferredContact,
        paymentData,
        depositAmount,
        userId
      } = req.body;

      // Create booking in database
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          user_id: userId,
          celebrity_id: celebrityId,
          celebrity_name: celebrityName,
          event_type: eventType,
          event_date: eventDate,
          event_time: eventTime,
          duration,
          event_location: location,
          attendees,
          budget_range: budget,
          contact_name: clientName,
          contact_email: clientEmail,
          contact_phone: clientPhone,
          company,
          special_requests: specialRequests,
          preferred_contact: preferredContact,
          deposit_amount: depositAmount,
          payment_intent_id: paymentData.paymentIntent.id,
          status: 'pending_approval',
          payment_status: 'deposit_paid',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (bookingError) {
        throw new Error(`Booking creation failed: ${bookingError.message}`);
      }

      // Generate deposit invoice
      const invoiceResult = await invoiceService.createDepositInvoice({
        ...req.body,
        bookingId: booking.id
      }, paymentData);

      // Log booking creation
      auditLogger.info('Booking created with payment', {
        userId,
        bookingId: booking.id,
        celebrityId,
        depositAmount,
        paymentIntentId: paymentData.paymentIntent.id,
        action: 'booking_create_with_payment'
      });

      res.status(201).json({
        success: true,
        message: 'Booking created successfully with payment',
        data: { 
          booking,
          invoice: invoiceResult.invoice
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async createBooking(req, res, next) {
    try {
      const {
        celebrity_id,
        event_date,
        event_duration,
        event_type,
        event_location,
        special_requests,
        contact_name,
        contact_email,
        contact_phone
      } = req.body;

      // Get celebrity to calculate total amount
      const { data: celebrity, error: celebError } = await req.supabase
        .from('celebrities')
        .select('price, availability')
        .eq('id', celebrity_id)
        .single();

      if (celebError || !celebrity) {
        return res.status(404).json({
          success: false,
          message: 'Celebrity not found'
        });
      }

      if (!celebrity.availability) {
        return res.status(400).json({
          success: false,
          message: 'Celebrity is not available for booking'
        });
      }

      // Calculate total amount (price per hour * duration)
      const total_amount = celebrity.price * event_duration;
      const deposit_amount = total_amount * 0.3; // 30% deposit

      // Create booking
      const { data: booking, error: bookingError } = await req.supabase
        .from('bookings')
        .insert({
          user_id: req.user.userId,
          celebrity_id,
          event_date,
          event_duration,
          event_type,
          event_location,
          special_requests,
          contact_name,
          contact_email,
          contact_phone,
          total_amount,
          deposit_amount,
          status: 'pending',
          payment_status: 'pending'
        })
        .select()
        .single();

      if (bookingError) {
        throw new Error(`Booking creation failed: ${bookingError.message}`);
      }

      // Log booking creation
      auditLogger.info('Booking created', {
        userId: req.user.userId,
        bookingId: booking.id,
        celebrityId: celebrity_id,
        totalAmount: total_amount,
        action: 'booking_create'
      });

      res.status(201).json({
        success: true,
        message: 'Booking created successfully',
        data: { booking }
      });
    } catch (error) {
      next(error);
    }
  }

  async getBookings(req, res, next) {
    try {
      const { status, celebrity_id, limit = 10, offset = 0 } = req.query;
      
      let query = req.supabase
        .from('bookings')
        .select(`
          *,
          celebrity:celebrities(name, category, image),
          user:app_users(first_name, last_name, email)
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // Apply filters
      if (status) {
        query = query.eq('status', status);
      }
      
      if (celebrity_id) {
        query = query.eq('celebrity_id', celebrity_id);
      }

      // For non-admin users, only show their own bookings
      if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
        query = query.eq('user_id', req.user.userId);
      }

      const { data: bookings, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch bookings: ${error.message}`);
      }

      res.json({
        success: true,
        data: { bookings }
      });
    } catch (error) {
      next(error);
    }
  }

  async getBookingById(req, res, next) {
    try {
      const { id } = req.params;

      let query = req.supabase
        .from('bookings')
        .select(`
          *,
          celebrity:celebrities(name, category, image, price),
          user:app_users(first_name, last_name, email)
        `)
        .eq('id', id);

      // For non-admin users, only show their own bookings
      if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
        query = query.eq('user_id', req.user.userId);
      }

      const { data: booking, error } = await query.single();

      if (error || !booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      res.json({
        success: true,
        data: { booking }
      });
    } catch (error) {
      next(error);
    }
  }

  async updateBookingStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      // Get current booking
      const { data: currentBooking, error: fetchError } = await req.supabase
        .from('bookings')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !currentBooking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      // Update booking
      const updateData = { status };
      if (notes) {
        updateData.admin_notes = notes;
      }

      const { data: booking, error } = await req.supabase
        .from('bookings')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update booking: ${error.message}`);
      }

      // Log status change
      auditLogger.info('Booking status updated', {
        userId: req.user.userId,
        bookingId: id,
        oldStatus: currentBooking.status,
        newStatus: status,
        action: 'booking_status_update'
      });

      res.json({
        success: true,
        message: 'Booking status updated successfully',
        data: { booking }
      });
    } catch (error) {
      next(error);
    }
  }

  async cancelBooking(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      // Get current booking
      const { data: currentBooking, error: fetchError } = await req.supabase
        .from('bookings')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !currentBooking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      // Check if user can cancel (only their own bookings and only if pending)
      if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
        if (currentBooking.user_id !== req.user.userId) {
          return res.status(403).json({
            success: false,
            message: 'You can only cancel your own bookings'
          });
        }

        if (currentBooking.status !== 'pending') {
          return res.status(400).json({
            success: false,
            message: 'Can only cancel pending bookings'
          });
        }
      }

      // Update booking to cancelled
      const { data: booking, error } = await req.supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          admin_notes: reason || 'Cancelled by user'
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to cancel booking: ${error.message}`);
      }

      // Log cancellation
      auditLogger.info('Booking cancelled', {
        userId: req.user.userId,
        bookingId: id,
        reason: reason || 'No reason provided',
        action: 'booking_cancel'
      });

      res.json({
        success: true,
        message: 'Booking cancelled successfully',
        data: { booking }
      });
    } catch (error) {
      next(error);
    }
  }

  async getBookingStats(req, res, next) {
    try {
      // Only admins and moderators can view stats
      if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      const { data: stats, error } = await req.supabase
        .from('bookings')
        .select('status, total_amount, payment_status');

      if (error) {
        throw new Error(`Failed to fetch stats: ${error.message}`);
      }

      // Calculate statistics
      const totalBookings = stats.length;
      const totalRevenue = stats.reduce((sum, booking) => sum + (parseFloat(booking.total_amount) || 0), 0);
      
      const statusCounts = stats.reduce((acc, booking) => {
        acc[booking.status] = (acc[booking.status] || 0) + 1;
        return acc;
      }, {});

      const paymentStatusCounts = stats.reduce((acc, booking) => {
        acc[booking.payment_status] = (acc[booking.payment_status] || 0) + 1;
        return acc;
      }, {});

      res.json({
        success: true,
        data: {
          totalBookings,
          totalRevenue,
          statusCounts,
          paymentStatusCounts
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new BookingController();