const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { supabase } = require('../config/supabase');
const router = express.Router();

// GET /api/services
router.get('/', async (req, res) => {
  try {
    const { 
      category,
      location,
      priceMin,
      priceMax,
      search,
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    let query = supabase
      .from('services')
      .select(`
        *,
        service_categories(name, slug),
        profiles(first_name, last_name, avatar_url)
      `)
      .eq('is_active', true);

    // Apply filters
    if (category) {
      query = query.eq('category_id', category);
    }

    if (location) {
      query = query.ilike('location', `%${location}%`);
    }

    if (priceMin) {
      query = query.gte('price_from', parseInt(priceMin));
    }

    if (priceMax) {
      query = query.lte('price_to', parseInt(priceMax));
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,tags.cs.{${search}}`);
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: services, error } = await query;

    if (error) {
      throw error;
    }

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('services')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    res.json({
      success: true,
      data: {
        services: services || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount || 0,
          pages: Math.ceil((totalCount || 0) / parseInt(limit))
        },
        filters: {
          category,
          location,
          priceRange: { min: priceMin, max: priceMax },
          search,
          sortBy,
          sortOrder
        }
      }
    });

  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch services'
    });
  }
});

// GET /api/services/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: service, error } = await supabase
      .from('services')
      .select(`
        *,
        service_categories(name, slug, description),
        profiles(first_name, last_name, avatar_url, bio),
        service_reviews(rating, comment, created_at, profiles(first_name, last_name, avatar_url))
      `)
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error || !service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Get related services
    const { data: relatedServices } = await supabase
      .from('services')
      .select(`
        id, title, price_from, price_to, image_url,
        service_categories(name)
      `)
      .eq('category_id', service.category_id)
      .neq('id', id)
      .eq('is_active', true)
      .limit(4);

    // Calculate average rating
    const avgRating = service.service_reviews?.length > 0
      ? service.service_reviews.reduce((sum, review) => sum + review.rating, 0) / service.service_reviews.length
      : 0;

    res.json({
      success: true,
      data: {
        ...service,
        averageRating: parseFloat(avgRating.toFixed(1)),
        totalReviews: service.service_reviews?.length || 0,
        relatedServices: relatedServices || []
      }
    });

  } catch (error) {
    console.error('Get service by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service'
    });
  }
});

// POST /api/services/request
router.post('/request', authenticateToken, async (req, res) => {
  try {
    const {
      serviceId,
      serviceType,
      eventDate,
      eventTime,
      location,
      guestCount,
      duration,
      specialRequests,
      budget,
      contactPreference
    } = req.body;

    // Validation
    if (!serviceType || !eventDate || !location) {
      return res.status(400).json({
        success: false,
        message: 'Service type, event date, and location are required'
      });
    }

    // Create service request
    const { data: request, error } = await supabase
      .from('service_requests')
      .insert([{
        user_id: req.user.id,
        service_id: serviceId,
        service_type: serviceType,
        event_date: eventDate,
        event_time: eventTime,
        location,
        guest_count: guestCount,
        duration,
        special_requests: specialRequests,
        budget,
        contact_preference: contactPreference || 'email',
        status: 'pending',
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Send notification to admin
    await supabase
      .from('notifications')
      .insert([{
        user_id: null, // Admin notification
        title: 'New Service Request',
        message: `New ${serviceType} request from ${req.user.firstName} ${req.user.lastName}`,
        type: 'service_request',
        data: { requestId: request.id, serviceType },
        created_at: new Date().toISOString()
      }]);

    res.json({
      success: true,
      message: 'Service request submitted successfully',
      data: {
        requestId: request.id,
        status: 'pending',
        estimatedResponse: '24 hours'
      }
    });

  } catch (error) {
    console.error('Service request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit service request'
    });
  }
});

// GET /api/services/categories
router.get('/categories', async (req, res) => {
  try {
    const { data: categories, error } = await supabase
      .from('service_categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      throw error;
    }

    // Get service count for each category
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        const { count } = await supabase
          .from('services')
          .select('*', { count: 'exact', head: true })
          .eq('category_id', category.id)
          .eq('is_active', true);

        return {
          ...category,
          serviceCount: count || 0
        };
      })
    );

    res.json({
      success: true,
      data: categoriesWithCounts
    });

  } catch (error) {
    console.error('Get service categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service categories'
    });
  }
});

module.exports = router;