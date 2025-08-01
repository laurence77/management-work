const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { supabase } = require('../config/supabase');
const { rateLimits } = require('../middleware/security');
const { responseCache } = require('../middleware/response-cache');
const { errorHandler } = require('../utils/standard-error-handler');
const { celebrityAuditMiddleware, fileAuditMiddleware, storeOldValuesMiddleware } = require('../middleware/audit-middleware');
const { createSecureUploadMiddleware } = require('../middleware/secure-upload-middleware');
const router = express.Router();

// Create secure upload middleware for celebrity images
const celebrityImageUpload = createSecureUploadMiddleware({
  fileCategory: 'images',
  maxFiles: 1,
  folder: 'celebrities',
  processImages: true,
  requireAuth: true,
  allowedRoles: ['admin', 'super_admin']
});

// Configure multer for celebrity image uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/celebrities');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `celebrity-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// GET /api/celebrities - Get all celebrities with advanced filtering
router.get('/', rateLimits.general, responseCache.middleware(), errorHandler.asyncRouteWrapper(async (req, res) => {
  try {
    const {
      category,
      location,
      priceMin,
      priceMax,
      availability,
      rating,
      search,
      featured,
      page = 1,
      limit = 20,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    let query = supabase
      .from('celebrities')
      .select(`
        *,
        celebrity_categories(name, slug),
        celebrity_reviews(rating),
        bookings(id)
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
      query = query.gte('base_price', parseInt(priceMin));
    }

    if (priceMax) {
      query = query.lte('base_price', parseInt(priceMax));
    }

    if (availability === 'available') {
      query = query.eq('is_available', true);
    }

    if (rating) {
      // This would need a computed column or subquery in real implementation
      query = query.gte('average_rating', parseFloat(rating));
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,bio.ilike.%${search}%,specialties.cs.{${search}}`);
    }

    if (featured === 'true') {
      query = query.eq('is_featured', true);
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: celebrities, error } = await query;

    if (error) {
      throw error;
    }

    // Calculate additional metrics for each celebrity
    const enrichedCelebrities = celebrities?.map(celebrity => {
      const reviews = celebrity.celebrity_reviews || [];
      const averageRating = reviews.length > 0
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
        : 0;

      return {
        ...celebrity,
        averageRating: parseFloat(averageRating.toFixed(1)),
        totalReviews: reviews.length,
        totalBookings: celebrity.bookings?.length || 0,
        celebrity_reviews: undefined, // Remove from response
        bookings: undefined // Remove from response
      };
    }) || [];

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('celebrities')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    res.json({
      success: true,
      data: {
        celebrities: enrichedCelebrities,
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
          availability,
          rating,
          search,
          featured,
          sortBy,
          sortOrder
        }
      }
    });

  } catch (error) {
    console.error('Get celebrities error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch celebrities'
    });
  }
});

// GET /api/celebrities/:id - Get single celebrity with full details
router.get('/:id', rateLimits.general, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: celebrity, error } = await supabase
      .from('celebrities')
      .select(`
        *,
        celebrity_categories(name, slug, description),
        celebrity_reviews(
          id, rating, comment, created_at,
          profiles(first_name, last_name, avatar_url)
        ),
        celebrity_availability(*),
        celebrity_media(media_type, media_url, caption)
      `)
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error || !celebrity) {
      return res.status(404).json({
        success: false,
        message: 'Celebrity not found'
      });
    }

    // Get related celebrities
    const { data: relatedCelebrities } = await supabase
      .from('celebrities')
      .select(`
        id, name, base_price, image_url, average_rating,
        celebrity_categories(name)
      `)
      .eq('category_id', celebrity.category_id)
      .neq('id', id)
      .eq('is_active', true)
      .limit(4);

    // Get booking statistics
    const { data: bookingStats } = await supabase
      .from('bookings')
      .select('status, created_at')
      .eq('celebrity_id', id);

    const stats = {
      totalBookings: bookingStats?.length || 0,
      completedBookings: bookingStats?.filter(b => b.status === 'completed').length || 0,
      thisMonthBookings: bookingStats?.filter(b => {
        const bookingDate = new Date(b.created_at);
        const now = new Date();
        return bookingDate.getMonth() === now.getMonth() && 
               bookingDate.getFullYear() === now.getFullYear();
      }).length || 0
    };

    // Calculate average rating
    const reviews = celebrity.celebrity_reviews || [];
    const averageRating = reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0;

    res.json({
      success: true,
      data: {
        ...celebrity,
        averageRating: parseFloat(averageRating.toFixed(1)),
        totalReviews: reviews.length,
        bookingStats: stats,
        relatedCelebrities: relatedCelebrities || []
      }
    });

  } catch (error) {
    console.error('Get celebrity by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch celebrity'
    });
  }
});

// POST /api/celebrities - Create new celebrity (Admin only)
router.post('/', rateLimits.api, authenticateToken, requirePermission('manage_celebrities'), ...celebrityImageUpload.single('image'), fileAuditMiddleware(), celebrityAuditMiddleware(), async (req, res) => {
  try {
    const {
      name,
      bio,
      categoryId,
      basePrice,
      location,
      specialties,
      socialMedia,
      contactInfo,
      isAvailable = true,
      isFeatured = false
    } = req.body;

    // Validation
    if (!name || !bio || !categoryId || !basePrice) {
      return res.status(400).json({
        success: false,
        message: 'Name, bio, category, and base price are required'
      });
    }

    // Check if celebrity name already exists
    const { data: existingCelebrity } = await supabase
      .from('celebrities')
      .select('id')
      .eq('name', name)
      .single();

    if (existingCelebrity) {
      return res.status(400).json({
        success: false,
        message: 'Celebrity with this name already exists'
      });
    }

    // Prepare celebrity data
    const celebrityData = {
      name,
      bio,
      category_id: categoryId,
      base_price: parseFloat(basePrice),
      location,
      specialties: specialties ? specialties.split(',').map(s => s.trim()) : [],
      social_media: socialMedia ? JSON.parse(socialMedia) : {},
      contact_info: contactInfo ? JSON.parse(contactInfo) : {},
      is_available: isAvailable === 'true',
      is_featured: isFeatured === 'true',
      image_url: req.secureFile ? req.secureFile.url : null,
      image_file_id: req.secureFile ? req.secureFile.id : null,
      average_rating: 0,
      total_bookings: 0,
      is_active: true,
      created_at: new Date().toISOString(),
      created_by: req.user.id
    };

    const { data: celebrity, error } = await supabase
      .from('celebrities')
      .insert([celebrityData])
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Create initial availability (default to weekdays, 9-5)
    const defaultAvailability = [
      { day_of_week: 1, start_time: '09:00', end_time: '17:00', is_available: true },
      { day_of_week: 2, start_time: '09:00', end_time: '17:00', is_available: true },
      { day_of_week: 3, start_time: '09:00', end_time: '17:00', is_available: true },
      { day_of_week: 4, start_time: '09:00', end_time: '17:00', is_available: true },
      { day_of_week: 5, start_time: '09:00', end_time: '17:00', is_available: true },
      { day_of_week: 6, start_time: '10:00', end_time: '15:00', is_available: false },
      { day_of_week: 0, start_time: '10:00', end_time: '15:00', is_available: false }
    ].map(avail => ({ ...avail, celebrity_id: celebrity.id }));

    await supabase
      .from('celebrity_availability')
      .insert(defaultAvailability);

    res.json({
      success: true,
      message: 'Celebrity created successfully',
      data: celebrity
    });

  } catch (error) {
    console.error('Create celebrity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create celebrity'
    });
  }
});

// PUT /api/celebrities/:id - Update celebrity (Admin only)
router.put('/:id', rateLimits.api, authenticateToken, requirePermission('manage_celebrities'), storeOldValuesMiddleware('celebrity'), ...celebrityImageUpload.single('image'), fileAuditMiddleware(), celebrityAuditMiddleware(), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      bio,
      categoryId,
      basePrice,
      location,
      specialties,
      socialMedia,
      contactInfo,
      isAvailable,
      isFeatured
    } = req.body;

    // Get existing celebrity
    const { data: existingCelebrity, error: fetchError } = await supabase
      .from('celebrities')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingCelebrity) {
      return res.status(404).json({
        success: false,
        message: 'Celebrity not found'
      });
    }

    // Prepare update data
    const updateData = {
      ...(name && { name }),
      ...(bio && { bio }),
      ...(categoryId && { category_id: categoryId }),
      ...(basePrice && { base_price: parseFloat(basePrice) }),
      ...(location && { location }),
      ...(specialties && { specialties: specialties.split(',').map(s => s.trim()) }),
      ...(socialMedia && { social_media: JSON.parse(socialMedia) }),
      ...(contactInfo && { contact_info: JSON.parse(contactInfo) }),
      ...(isAvailable !== undefined && { is_available: isAvailable === 'true' }),
      ...(isFeatured !== undefined && { is_featured: isFeatured === 'true' }),
      ...(req.secureFile && { 
        image_url: req.secureFile.url,
        image_file_id: req.secureFile.id
      }),
      updated_at: new Date().toISOString(),
      updated_by: req.user.id
    };

    const { data: celebrity, error } = await supabase
      .from('celebrities')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'Celebrity updated successfully',
      data: celebrity
    });

  } catch (error) {
    console.error('Update celebrity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update celebrity'
    });
  }
});

// DELETE /api/celebrities/:id - Soft delete celebrity (Admin only)
router.delete('/:id', rateLimits.api, authenticateToken, requirePermission('manage_celebrities'), storeOldValuesMiddleware('celebrity'), celebrityAuditMiddleware(), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if celebrity has active bookings
    const { count: activeBookings } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('celebrity_id', id)
      .in('status', ['pending', 'confirmed']);

    if (activeBookings > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete celebrity with active bookings'
      });
    }

    // Soft delete (set is_active to false)
    const { data: celebrity, error } = await supabase
      .from('celebrities')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
        updated_by: req.user.id
      })
      .eq('id', id)
      .select()
      .single();

    if (error || !celebrity) {
      return res.status(404).json({
        success: false,
        message: 'Celebrity not found'
      });
    }

    res.json({
      success: true,
      message: 'Celebrity deleted successfully'
    });

  } catch (error) {
    console.error('Delete celebrity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete celebrity'
    });
  }
});

// GET /api/celebrities/:id/availability - Get celebrity availability
router.get('/:id/availability', rateLimits.general, async (req, res) => {
  try {
    const { id } = req.params;
    const { date, month } = req.query;

    let query = supabase
      .from('celebrity_availability')
      .select('*')
      .eq('celebrity_id', id);

    if (date) {
      query = query.eq('specific_date', date);
    }

    if (month) {
      const year = new Date().getFullYear();
      const monthStart = new Date(year, parseInt(month) - 1, 1).toISOString();
      const monthEnd = new Date(year, parseInt(month), 0, 23, 59, 59).toISOString();
      query = query.gte('specific_date', monthStart).lte('specific_date', monthEnd);
    }

    const { data: availability, error } = await query;

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: availability || []
    });

  } catch (error) {
    console.error('Get celebrity availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch availability'
    });
  }
});

// POST /api/celebrities/:id/reviews - Add celebrity review
router.post('/:id/reviews', rateLimits.api, authenticateToken, celebrityAuditMiddleware(), async (req, res) => {
  try {
    const { id: celebrityId } = req.params;
    const { rating, comment, bookingId } = req.body;

    // Validation
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    // Check if user has a completed booking with this celebrity
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .eq('celebrity_id', celebrityId)
      .eq('user_id', req.user.id)
      .eq('status', 'completed')
      .single();

    if (bookingError || !booking) {
      return res.status(403).json({
        success: false,
        message: 'You can only review celebrities after a completed booking'
      });
    }

    // Check if review already exists
    const { data: existingReview } = await supabase
      .from('celebrity_reviews')
      .select('id')
      .eq('celebrity_id', celebrityId)
      .eq('user_id', req.user.id)
      .eq('booking_id', bookingId)
      .single();

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this celebrity for this booking'
      });
    }

    // Create review
    const { data: review, error } = await supabase
      .from('celebrity_reviews')
      .insert([{
        celebrity_id: celebrityId,
        user_id: req.user.id,
        booking_id: bookingId,
        rating: parseInt(rating),
        comment: comment || null,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Update celebrity average rating
    const { data: allReviews } = await supabase
      .from('celebrity_reviews')
      .select('rating')
      .eq('celebrity_id', celebrityId);

    const avgRating = allReviews?.length > 0
      ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
      : 0;

    await supabase
      .from('celebrities')
      .update({ average_rating: parseFloat(avgRating.toFixed(1)) })
      .eq('id', celebrityId);

    res.json({
      success: true,
      message: 'Review added successfully',
      data: review
    });

  } catch (error) {
    console.error('Add celebrity review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add review'
    });
  }
});

// GET /api/celebrities/categories - Get celebrity categories
router.get('/categories', rateLimits.general, async (req, res) => {
  try {
    const { data: categories, error } = await supabase
      .from('celebrity_categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      throw error;
    }

    // Get celebrity count for each category
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        const { count } = await supabase
          .from('celebrities')
          .select('*', { count: 'exact', head: true })
          .eq('category_id', category.id)
          .eq('is_active', true);

        return {
          ...category,
          celebrityCount: count || 0
        };
      })
    );

    res.json({
      success: true,
      data: categoriesWithCounts
    });

  } catch (error) {
    console.error('Get celebrity categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch celebrity categories'
    });
  }
});

module.exports = router;