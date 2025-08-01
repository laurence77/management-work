const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { supabase } = require('../config/supabase');
const router = express.Router();

// GET /api/events/featured (must come before /:id route)
router.get('/featured', async (req, res) => {
  try {
    const { limit = 6 } = req.query;

    const { data: events, error } = await supabase
      .from('events')
      .select(`
        *,
        event_categories(name, slug),
        venues(name, city, country, capacity)
      `)
      .eq('is_featured', true)
      .eq('is_active', true)
      .gte('event_date', new Date().toISOString())
      .order('event_date', { ascending: true })
      .limit(parseInt(limit));

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: events || []
    });

  } catch (error) {
    console.error('Get featured events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch featured events'
    });
  }
});

// GET /api/events
router.get('/', async (req, res) => {
  try {
    const { 
      city,
      category,
      month,
      search,
      page = 1,
      limit = 20,
      sortBy = 'event_date',
      sortOrder = 'asc'
    } = req.query;

    let query = supabase
      .from('events')
      .select(`
        *,
        event_categories(name, slug),
        venues(name, city, country, capacity, address),
        event_tickets(ticket_type, price, available_quantity)
      `)
      .eq('is_active', true)
      .gte('event_date', new Date().toISOString());

    // Apply filters
    if (city) {
      query = query.eq('venues.city', city);
    }

    if (category) {
      query = query.eq('category_id', category);
    }

    if (month) {
      const year = new Date().getFullYear();
      const monthStart = new Date(year, parseInt(month) - 1, 1).toISOString();
      const monthEnd = new Date(year, parseInt(month), 0, 23, 59, 59).toISOString();
      query = query.gte('event_date', monthStart).lte('event_date', monthEnd);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,artists.cs.{${search}}`);
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: events, error } = await query;

    if (error) {
      throw error;
    }

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .gte('event_date', new Date().toISOString());

    res.json({
      success: true,
      data: {
        events: events || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount || 0,
          pages: Math.ceil((totalCount || 0) / parseInt(limit))
        },
        filters: {
          city,
          category,
          month,
          search,
          sortBy,
          sortOrder
        }
      }
    });

  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch events'
    });
  }
});

// GET /api/events/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: event, error } = await supabase
      .from('events')
      .select(`
        *,
        event_categories(name, slug, description),
        venues(name, city, country, capacity, address, amenities),
        event_tickets(id, ticket_type, price, available_quantity, max_per_person, description),
        event_reviews(rating, comment, created_at, profiles(first_name, last_name, avatar_url))
      `)
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error || !event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Get related events
    const { data: relatedEvents } = await supabase
      .from('events')
      .select(`
        id, title, event_date, image_url,
        venues(name, city),
        event_tickets(price)
      `)
      .eq('category_id', event.category_id)
      .neq('id', id)
      .eq('is_active', true)
      .gte('event_date', new Date().toISOString())
      .limit(4);

    // Calculate average rating
    const avgRating = event.event_reviews?.length > 0
      ? event.event_reviews.reduce((sum, review) => sum + review.rating, 0) / event.event_reviews.length
      : 0;

    // Calculate minimum ticket price
    const minPrice = event.event_tickets?.length > 0
      ? Math.min(...event.event_tickets.map(ticket => ticket.price))
      : 0;

    res.json({
      success: true,
      data: {
        ...event,
        averageRating: parseFloat(avgRating.toFixed(1)),
        totalReviews: event.event_reviews?.length || 0,
        minTicketPrice: minPrice,
        relatedEvents: relatedEvents || []
      }
    });

  } catch (error) {
    console.error('Get event by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch event'
    });
  }
});

// POST /api/events/:id/book
router.post('/:id/book', authenticateToken, async (req, res) => {
  try {
    const { id: eventId } = req.params;
    const {
      ticketTypeId,
      quantity,
      totalAmount,
      customerInfo,
      paymentMethod = 'crypto'
    } = req.body;

    // Validation
    if (!ticketTypeId || !quantity || !totalAmount) {
      return res.status(400).json({
        success: false,
        message: 'Ticket type, quantity, and total amount are required'
      });
    }

    // Get event and ticket details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select(`
        *,
        event_tickets(id, ticket_type, price, available_quantity, max_per_person)
      `)
      .eq('id', eventId)
      .eq('is_active', true)
      .single();

    if (eventError || !event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Find the specific ticket type
    const ticketType = event.event_tickets?.find(ticket => ticket.id === ticketTypeId);
    if (!ticketType) {
      return res.status(404).json({
        success: false,
        message: 'Ticket type not found'
      });
    }

    // Check availability
    if (ticketType.available_quantity < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Not enough tickets available'
      });
    }

    // Check max per person limit
    if (quantity > ticketType.max_per_person) {
      return res.status(400).json({
        success: false,
        message: `Maximum ${ticketType.max_per_person} tickets per person`
      });
    }

    // Verify total amount
    const expectedTotal = ticketType.price * quantity;
    if (Math.abs(totalAmount - expectedTotal) > 0.01) {
      return res.status(400).json({
        success: false,
        message: 'Invalid total amount'
      });
    }

    // Create booking
    const bookingId = `EVT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const { data: booking, error: bookingError } = await supabase
      .from('event_bookings')
      .insert([{
        booking_id: bookingId,
        event_id: eventId,
        ticket_type_id: ticketTypeId,
        user_id: req.user.id,
        quantity: quantity,
        unit_price: ticketType.price,
        total_amount: totalAmount,
        customer_info: customerInfo,
        payment_method: paymentMethod,
        payment_status: paymentMethod === 'crypto' ? 'pending' : 'completed',
        booking_status: 'confirmed',
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (bookingError) {
      throw bookingError;
    }

    // Update ticket availability
    await supabase
      .from('event_tickets')
      .update({
        available_quantity: ticketType.available_quantity - quantity
      })
      .eq('id', ticketTypeId);

    // Send confirmation notification
    await supabase
      .from('notifications')
      .insert([{
        user_id: req.user.id,
        title: 'Event Booking Confirmed',
        message: `Your booking for ${event.title} has been confirmed! Booking ID: ${bookingId}`,
        type: 'booking_confirmation',
        data: { bookingId: booking.id, eventId },
        created_at: new Date().toISOString()
      }]);

    res.json({
      success: true,
      message: 'Event booked successfully',
      data: {
        bookingId: booking.id,
        bookingReference: bookingId,
        eventTitle: event.title,
        eventDate: event.event_date,
        quantity: quantity,
        totalAmount: totalAmount,
        paymentStatus: booking.payment_status,
        ticketType: ticketType.ticket_type
      }
    });

  } catch (error) {
    console.error('Event booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to book event'
    });
  }
});

// POST /api/events/vip-signup
router.post('/vip-signup', authenticateToken, async (req, res) => {
  try {
    const {
      membershipTier = 'silver',
      interests,
      preferredEvents,
      annualBudget,
      specialRequests
    } = req.body;

    // Check if user already has VIP membership
    const { data: existingVip, error: checkError } = await supabase
      .from('vip_memberships')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    if (existingVip) {
      return res.status(400).json({
        success: false,
        message: 'You already have a VIP membership'
      });
    }

    // Create VIP membership
    const { data: vipMembership, error } = await supabase
      .from('vip_memberships')
      .insert([{
        user_id: req.user.id,
        membership_tier: membershipTier,
        interests: interests || [],
        preferred_events: preferredEvents || [],
        annual_budget: annualBudget,
        special_requests: specialRequests,
        status: 'active',
        joined_at: new Date().toISOString(),
        benefits: {
          early_access: true,
          exclusive_events: true,
          personal_concierge: membershipTier === 'platinum',
          priority_booking: true,
          member_discounts: true
        }
      }])
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Send welcome notification
    await supabase
      .from('notifications')
      .insert([{
        user_id: req.user.id,
        title: 'Welcome to VIP!',
        message: `Welcome to our ${membershipTier.toUpperCase()} VIP membership! Enjoy exclusive access to premium events.`,
        type: 'vip_welcome',
        data: { membershipId: vipMembership.id, tier: membershipTier },
        created_at: new Date().toISOString()
      }]);

    res.json({
      success: true,
      message: 'VIP membership activated successfully!',
      data: {
        membershipId: vipMembership.id,
        tier: membershipTier,
        benefits: vipMembership.benefits,
        status: 'active'
      }
    });

  } catch (error) {
    console.error('VIP signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process VIP signup'
    });
  }
});

module.exports = router;