const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { supabase } = require('../config/supabase');
const { rateLimits } = require('../middleware/security');
const { errorHandler } = require('../utils/standard-error-handler');
const { bookingAuditMiddleware, storeOldValuesMiddleware } = require('../middleware/audit-middleware');
const router = express.Router();

// GET /api/bookings - Get user's bookings with filtering and pagination
router.get('/', rateLimits.api, authenticateToken, errorHandler.asyncRouteWrapper(async (req, res) => {
  try {
    const {
      status,
      celebrityId,
      eventId,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    let query = supabase
      .from('bookings')
      .select(`
        *,
        celebrities(name, image_url),
        events(title, event_date, venues(name, city)),
        payments(status, amount, payment_method)
      `)
      .eq('user_id', req.user.id);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (celebrityId) {
      query = query.eq('celebrity_id', celebrityId);
    }

    if (eventId) {
      query = query.eq('event_id', eventId);
    }

    if (dateFrom) {
      query = query.gte('booking_date', dateFrom);
    }

    if (dateTo) {
      query = query.lte('booking_date', dateTo);
    }

    // Apply sorting and pagination
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: bookings, error } = await query;

    if (error) {
      throw errorHandler.handleDatabaseError(error, 'fetch bookings');
    }

    // Get total count
    const { count: totalCount, error: countError } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id);

    if (countError) {
      throw errorHandler.handleDatabaseError(countError, 'count bookings');
    }

    res.json({
      success: true,
      data: {
        bookings: bookings || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount || 0,
          pages: Math.ceil((totalCount || 0) / parseInt(limit))
        },
        filters: {
          status,
          celebrityId,
          eventId,
          dateRange: { from: dateFrom, to: dateTo },
          sortBy,
          sortOrder
        }
      }
    });
  }));

// POST /api/bookings - Create new booking
router.post('/', rateLimits.api, authenticateToken, errorHandler.asyncRouteWrapper(async (req, res) => {
  try {
    const {
      celebrityId,
      eventId,
      bookingType,
      bookingDate,
      bookingTime,
      duration,
      location,
      guestCount,
      specialRequests,
      services,
      totalAmount,
      paymentMethod = 'crypto'
    } = req.body;

    // Validation
    if (!bookingType || !bookingDate || !totalAmount) {
      throw errorHandler.handleValidationError({
        errors: [{ field: 'booking', message: 'Booking type, date, and total amount are required' }]
      });
    }

    if (!celebrityId && !eventId) {
      throw errorHandler.handleValidationError({
        errors: [{ field: 'booking', message: 'Either celebrity ID or event ID is required' }]
      });
    }

    // Check celebrity availability if booking celebrity
    if (celebrityId) {
      const { data: celebrity, error: celebError } = await supabase
        .from('celebrities')
        .select('*, celebrity_availability(*)')
        .eq('id', celebrityId)
        .eq('is_available', true)
        .single();

      if (celebError) {
        throw errorHandler.handleDatabaseError(celebError, 'fetch celebrity');
      }
      
      if (!celebrity) {
        throw errorHandler.handleNotFoundError('Celebrity');
      }

      // Check availability for the requested date
      const bookingDay = new Date(bookingDate).getDay();
      const availability = celebrity.celebrity_availability?.find(a => a.day_of_week === bookingDay);
      
      if (!availability || !availability.is_available) {
        return res.status(400).json({
          success: false,
          message: 'Celebrity is not available on the requested date'
        });
      }
    }

    // Check for conflicting bookings
    const { data: conflictingBookings } = await supabase
      .from('bookings')
      .select('id')
      .eq(celebrityId ? 'celebrity_id' : 'event_id', celebrityId || eventId)
      .eq('booking_date', bookingDate)
      .in('status', ['confirmed', 'pending']);

    if (conflictingBookings && conflictingBookings.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Time slot is already booked'
      });
    }

    // Create booking
    const bookingId = `BKG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert([{
        booking_id: bookingId,
        user_id: req.user.id,
        celebrity_id: celebrityId || null,
        event_id: eventId || null,
        booking_type: bookingType,
        booking_date: bookingDate,
        booking_time: bookingTime,
        duration,
        location,
        guest_count: guestCount,
        special_requests: specialRequests,
        services: services || [],
        total_amount: totalAmount,
        payment_method: paymentMethod,
        payment_status: 'pending',
        status: 'pending',
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (bookingError) {
      throw bookingError;
    }

    // Send confirmation notification
    await supabase
      .from('notifications')
      .insert([{
        user_id: req.user.id,
        title: 'Booking Created',
        message: `Your booking has been created successfully! Booking ID: ${bookingId}`,
        type: 'booking_created',
        data: { bookingId: booking.id },
        created_at: new Date().toISOString()
      }]);

    // Send admin notification
    await supabase
      .from('notifications')
      .insert([{
        user_id: null,
        title: 'New Booking',
        message: `New ${bookingType} booking from ${req.user.firstName} ${req.user.lastName}`,
        type: 'admin_booking',
        data: { bookingId: booking.id, bookingType },
        created_at: new Date().toISOString()
      }]);

    res.json({
      success: true,
      message: 'Booking created successfully',
      data: {
        bookingId: booking.id,
        bookingReference: bookingId,
        status: 'pending',
        totalAmount: totalAmount,
        paymentRequired: true,
        nextSteps: [
          'Complete payment to confirm your booking',
          'You will receive confirmation within 24 hours',
          'Check your email for booking details'
        ]
      }
    });

  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create booking'
    });
  }
});

// GET /api/bookings/:id - Get booking details
router.get('/:id', rateLimits.general, authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        *,
        celebrities(name, image_url, contact_info),
        events(title, event_date, venues(name, address, city)),
        payments(id, status, amount, payment_method, transaction_id, created_at)
      `)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (error || !booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    res.json({
      success: true,
      data: booking
    });

  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking'
    });
  }
});

// PUT /api/bookings/:id - Update booking (before confirmation)
router.put('/:id', rateLimits.api, authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      bookingDate,
      bookingTime,
      duration,
      location,
      guestCount,
      specialRequests,
      services
    } = req.body;

    // Check if booking exists and belongs to user
    const { data: existingBooking, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (fetchError || !existingBooking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if booking can be modified
    if (existingBooking.status === 'confirmed' || existingBooking.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify confirmed or completed bookings'
      });
    }

    // Update booking
    const updateData = {
      ...(bookingDate && { booking_date: bookingDate }),
      ...(bookingTime && { booking_time: bookingTime }),
      ...(duration && { duration }),
      ...(location && { location }),
      ...(guestCount && { guest_count: guestCount }),
      ...(specialRequests && { special_requests: specialRequests }),
      ...(services && { services }),
      updated_at: new Date().toISOString()
    };

    const { data: booking, error } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'Booking updated successfully',
      data: booking
    });

  } catch (error) {
    console.error('Update booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update booking'
    });
  }
});

// POST /api/bookings/:id/cancel - Cancel booking
router.post('/:id/cancel', rateLimits.api, authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Get booking details
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (fetchError || !booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.status === 'cancelled' || booking.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel this booking'
      });
    }

    // Check cancellation policy (24 hours notice required)
    const bookingDateTime = new Date(`${booking.booking_date}T${booking.booking_time || '00:00'}`);
    const now = new Date();
    const hoursUntilBooking = (bookingDateTime - now) / (1000 * 60 * 60);

    let refundAmount = 0;
    let refundPolicy = 'no-refund';

    if (hoursUntilBooking > 72) {
      refundAmount = booking.total_amount; // Full refund
      refundPolicy = 'full-refund';
    } else if (hoursUntilBooking > 24) {
      refundAmount = booking.total_amount * 0.5; // 50% refund
      refundPolicy = 'partial-refund';
    }

    // Update booking status
    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancellation_reason: reason,
        cancelled_at: new Date().toISOString(),
        refund_amount: refundAmount,
        refund_policy: refundPolicy
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Create refund record if applicable
    if (refundAmount > 0 && booking.payment_status === 'paid') {
      await supabase
        .from('refunds')
        .insert([{
          booking_id: id,
          user_id: req.user.id,
          amount: refundAmount,
          reason: reason || 'Customer cancellation',
          status: 'pending',
          created_at: new Date().toISOString()
        }]);
    }

    // Send notifications
    await supabase
      .from('notifications')
      .insert([
        {
          user_id: req.user.id,
          title: 'Booking Cancelled',
          message: `Your booking has been cancelled. ${refundAmount > 0 ? `Refund of $${refundAmount} will be processed.` : 'No refund applicable.'}`,
          type: 'booking_cancelled',
          data: { bookingId: id, refundAmount },
          created_at: new Date().toISOString()
        },
        {
          user_id: null,
          title: 'Booking Cancelled',
          message: `Booking ${booking.booking_id} has been cancelled by customer`,
          type: 'admin_cancellation',
          data: { bookingId: id, reason },
          created_at: new Date().toISOString()
        }
      ]);

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      data: {
        bookingId: id,
        status: 'cancelled',
        refundAmount,
        refundPolicy,
        processingTime: refundAmount > 0 ? '3-5 business days' : null
      }
    });

  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel booking'
    });
  }
});

// GET /api/bookings/admin/all - Admin: Get all bookings
router.get('/admin/all', rateLimits.api, authenticateToken, requirePermission('manage_bookings'), async (req, res) => {
  try {
    const {
      status,
      paymentStatus,
      dateFrom,
      dateTo,
      search,
      page = 1,
      limit = 50,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    let query = supabase
      .from('bookings')
      .select(`
        *,
        profiles(first_name, last_name, email),
        celebrities(name, image_url),
        events(title, event_date),
        payments(status, amount, payment_method)
      `);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (paymentStatus) {
      query = query.eq('payment_status', paymentStatus);
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    if (search) {
      query = query.or(`booking_id.ilike.%${search}%,profiles.email.ilike.%${search}%`);
    }

    // Apply sorting and pagination
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: bookings, error } = await query;

    if (error) {
      throw error;
    }

    // Get total count and stats
    const { count: totalCount } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true });

    const { data: stats } = await supabase
      .from('bookings')
      .select('status, payment_status, total_amount');

    const bookingStats = {
      total: totalCount || 0,
      pending: stats?.filter(b => b.status === 'pending').length || 0,
      confirmed: stats?.filter(b => b.status === 'confirmed').length || 0,
      completed: stats?.filter(b => b.status === 'completed').length || 0,
      cancelled: stats?.filter(b => b.status === 'cancelled').length || 0,
      totalRevenue: stats?.reduce((sum, b) => sum + (b.payment_status === 'paid' ? b.total_amount : 0), 0) || 0
    };

    res.json({
      success: true,
      data: {
        bookings: bookings || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount || 0,
          pages: Math.ceil((totalCount || 0) / parseInt(limit))
        },
        stats: bookingStats,
        filters: {
          status,
          paymentStatus,
          dateRange: { from: dateFrom, to: dateTo },
          search,
          sortBy,
          sortOrder
        }
      }
    });

  } catch (error) {
    console.error('Admin get bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings'
    });
  }
});

// PUT /api/bookings/:id/status - Admin: Update booking status
router.put('/:id/status', rateLimits.api, authenticateToken, requirePermission('manage_bookings'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const { data: booking, error } = await supabase
      .from('bookings')
      .update({
        status,
        admin_notes: notes,
        updated_at: new Date().toISOString(),
        updated_by: req.user.id
      })
      .eq('id', id)
      .select(`
        *,
        profiles(first_name, last_name, email)
      `)
      .single();

    if (error) {
      throw error;
    }

    // Send notification to customer
    const statusMessages = {
      confirmed: 'Your booking has been confirmed! We look forward to serving you.',
      completed: 'Your booking has been completed. Thank you for choosing us!',
      cancelled: 'Your booking has been cancelled. If you have questions, please contact support.'
    };

    if (statusMessages[status]) {
      await supabase
        .from('notifications')
        .insert([{
          user_id: booking.user_id,
          title: `Booking ${status.charAt(0).toUpperCase() + status.slice(1)}`,
          message: statusMessages[status],
          type: `booking_${status}`,
          data: { bookingId: id },
          created_at: new Date().toISOString()
        }]);
    }

    res.json({
      success: true,
      message: 'Booking status updated successfully',
      data: booking
    });

  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update booking status'
    });
  }
});

// POST /api/bookings/:id/payment - Process payment for booking
router.post('/:id/payment', rateLimits.api, authenticateToken, async (req, res) => {
  try {
    const { id: bookingId } = req.params;
    const { paymentMethod, cryptoType, transactionHash, walletAddress } = req.body;

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .eq('user_id', req.user.id)
      .single();

    if (bookingError || !booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.payment_status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Booking is already paid'
      });
    }

    let paymentResult;
    
    if (paymentMethod === 'crypto') {
      // Handle crypto payment
      if (!cryptoType || !transactionHash) {
        return res.status(400).json({
          success: false,
          message: 'Crypto type and transaction hash are required'
        });
      }

      // Check if transaction hash already exists
      const { data: existingTx } = await supabase
        .from('crypto_transactions')
        .select('id')
        .eq('transaction_hash', transactionHash)
        .single();

      if (existingTx) {
        return res.status(400).json({
          success: false,
          message: 'Transaction hash has already been used'
        });
      }

      // Get crypto wallet address for the specified type
      const { data: wallet } = await supabase
        .from('crypto_wallets')
        .select('*')
        .eq('symbol', cryptoType.toUpperCase())
        .eq('is_active', true)
        .single();

      // Create crypto transaction record
      const { data: transaction, error: txError } = await supabase
        .from('crypto_transactions')
        .insert([{
          transaction_hash: transactionHash,
          crypto_type: cryptoType.toLowerCase(),
          amount: booking.total_amount,
          usd_amount: booking.total_amount,
          wallet_address: wallet?.address || walletAddress,
          status: 'pending',
          customer_email: req.user.email,
          customer_id: req.user.id,
          booking_id: bookingId,
          verification_notes: 'Awaiting blockchain confirmation',
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (txError) {
        throw txError;
      }

      paymentResult = {
        transactionId: transaction.id,
        status: 'pending_verification',
        message: 'Crypto payment submitted for verification'
      };

      // Update booking payment status
      await supabase
        .from('bookings')
        .update({ 
          payment_status: 'pending',
          payment_method: 'crypto',
          payment_transaction_id: transaction.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId);

    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment method. Only crypto payments are supported.'
      });
    }

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert([{
        booking_id: bookingId,
        user_id: req.user.id,
        amount: booking.total_amount,
        currency: 'usd',
        payment_method: paymentMethod,
        status: paymentResult.status,
        transaction_id: paymentResult.transactionId,
        metadata: {
          cryptoType: cryptoType,
          transactionHash: transactionHash,
          walletAddress: walletAddress
        },
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (paymentError) {
      throw paymentError;
    }

    // Send payment confirmation notification
    await supabase
      .from('notifications')
      .insert([
        {
          user_id: req.user.id,
          title: 'Payment Submitted',
          message: `Your ${cryptoType.toUpperCase()} payment has been submitted for verification. You'll be notified once confirmed.`,
          type: 'payment_submitted',
          data: { bookingId, paymentId: payment.id, cryptoType },
          created_at: new Date().toISOString()
        },
        {
          user_id: null,
          title: 'Payment Verification Required',
          message: `New ${cryptoType.toUpperCase()} payment requires verification - Booking ${booking.booking_id}`,
          type: 'admin_payment_verification',
          data: { bookingId, paymentId: payment.id, transactionHash },
          created_at: new Date().toISOString()
        }
      ]);

    res.json({
      success: true,
      message: paymentResult.message,
      data: {
        paymentId: payment.id,
        bookingId: bookingId,
        status: paymentResult.status,
        transactionId: paymentResult.transactionId,
        estimatedConfirmation: '15-30 minutes',
        nextSteps: [
          'Your payment is being verified on the blockchain',
          'You will receive a confirmation email once verified',
          'Booking will be automatically confirmed upon payment verification'
        ]
      }
    });

  } catch (error) {
    console.error('Payment processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process payment'
    });
  }
});

// GET /api/bookings/stats - Get booking statistics
router.get('/stats', rateLimits.general, authenticateToken, async (req, res) => {
  try {
    const { data: userBookings } = await supabase
      .from('bookings')
      .select('status, payment_status, total_amount, created_at')
      .eq('user_id', req.user.id);

    const stats = {
      total: userBookings?.length || 0,
      pending: userBookings?.filter(b => b.status === 'pending').length || 0,
      confirmed: userBookings?.filter(b => b.status === 'confirmed').length || 0,
      completed: userBookings?.filter(b => b.status === 'completed').length || 0,
      cancelled: userBookings?.filter(b => b.status === 'cancelled').length || 0,
      totalSpent: userBookings?.reduce((sum, b) => sum + (b.payment_status === 'paid' ? b.total_amount : 0), 0) || 0,
      thisMonth: userBookings?.filter(b => {
        const bookingDate = new Date(b.created_at);
        const now = new Date();
        return bookingDate.getMonth() === now.getMonth() && bookingDate.getFullYear() === now.getFullYear();
      }).length || 0
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get booking stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking statistics'
    });
  }
});

// GET /api/bookings/:id/timeline - Get booking timeline/history
router.get('/:id/timeline', rateLimits.general, authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify booking belongs to user
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, booking_id, user_id')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (bookingError || !booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Get booking timeline events
    const timeline = [];

    // Get payment records
    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('booking_id', id)
      .order('created_at', { ascending: true });

    payments?.forEach(payment => {
      timeline.push({
        type: 'payment',
        status: payment.status,
        timestamp: payment.created_at,
        title: 'Payment Processed',
        description: `${payment.payment_method.toUpperCase()} payment of $${payment.amount}`,
        metadata: payment.metadata
      });
    });

    // Get notifications related to this booking
    const { data: notifications } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', req.user.id)
      .contains('data', { bookingId: id })
      .order('created_at', { ascending: true });

    notifications?.forEach(notification => {
      timeline.push({
        type: 'notification',
        status: 'sent',
        timestamp: notification.created_at,
        title: notification.title,
        description: notification.message,
        metadata: notification.data
      });
    });

    // Sort timeline by timestamp
    timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    res.json({
      success: true,
      data: {
        bookingId: booking.booking_id,
        timeline
      }
    });

  } catch (error) {
    console.error('Get booking timeline error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking timeline'
    });
  }
});

// POST /api/bookings/:id/review - Add review for completed booking
router.post('/:id/review', rateLimits.api, authenticateToken, async (req, res) => {
  try {
    const { id: bookingId } = req.params;
    const { rating, comment } = req.body;

    // Validation
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    // Check if booking exists and is completed
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .eq('user_id', req.user.id)
      .eq('status', 'completed')
      .single();

    if (bookingError || !booking) {
      return res.status(404).json({
        success: false,
        message: 'Completed booking not found'
      });
    }

    // Check if review already exists
    const reviewTable = booking.celebrity_id ? 'celebrity_reviews' : 'event_reviews';
    const targetId = booking.celebrity_id ? 'celebrity_id' : 'event_id';
    const targetValue = booking.celebrity_id || booking.event_id;

    const { data: existingReview } = await supabase
      .from(reviewTable)
      .select('id')
      .eq(targetId, targetValue)
      .eq('user_id', req.user.id)
      .eq('booking_id', bookingId)
      .single();

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this booking'
      });
    }

    // Create review
    const { data: review, error: reviewError } = await supabase
      .from(reviewTable)
      .insert([{
        [targetId]: targetValue,
        user_id: req.user.id,
        booking_id: bookingId,
        rating: parseInt(rating),
        comment: comment || null,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (reviewError) {
      throw reviewError;
    }

    // Update average rating for celebrity/event
    const { data: allReviews } = await supabase
      .from(reviewTable)
      .select('rating')
      .eq(targetId, targetValue);

    const avgRating = allReviews?.length > 0
      ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
      : 0;

    const updateTable = booking.celebrity_id ? 'celebrities' : 'events';
    await supabase
      .from(updateTable)
      .update({ average_rating: parseFloat(avgRating.toFixed(1)) })
      .eq('id', targetValue);

    res.json({
      success: true,
      message: 'Review added successfully',
      data: review
    });

  } catch (error) {
    console.error('Add booking review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add review'
    });
  }
});

module.exports = router;