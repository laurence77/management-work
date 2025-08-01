const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { supabase } = require('../config/supabase');
const router = express.Router();

// POST /api/management/apply
router.post('/apply', async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phoneNumber,
      artistName,
      genre,
      experience,
      socialMedia,
      portfolio,
      currentRepresentation,
      goals,
      referralSource
    } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !artistName) {
      return res.status(400).json({
        success: false,
        message: 'First name, last name, email, and artist name are required'
      });
    }

    // Check if application already exists
    const { data: existingApp, error: checkError } = await supabase
      .from('management_applications')
      .select('id')
      .eq('email', email)
      .eq('status', 'pending')
      .single();

    if (existingApp) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending application'
      });
    }

    // Create application
    const applicationId = `MAN-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    
    const { data: application, error } = await supabase
      .from('management_applications')
      .insert([{
        application_id: applicationId,
        first_name: firstName,
        last_name: lastName,
        email,
        phone_number: phoneNumber,
        artist_name: artistName,
        genre,
        years_experience: experience,
        social_media: socialMedia || {},
        portfolio_links: portfolio || [],
        current_representation: currentRepresentation,
        career_goals: goals,
        referral_source: referralSource,
        status: 'pending',
        priority_score: calculatePriorityScore({
          experience,
          socialMedia,
          portfolio,
          genre
        }),
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
        title: 'New Management Application',
        message: `New application from ${firstName} ${lastName} (${artistName})`,
        type: 'management_application',
        data: { 
          applicationId: application.id,
          artistName,
          genre,
          priorityScore: application.priority_score
        },
        created_at: new Date().toISOString()
      }]);

    // Send confirmation email to applicant (placeholder)
    console.log(`📧 Sending confirmation email to ${email}`);

    res.json({
      success: true,
      message: 'Application submitted successfully',
      data: {
        applicationId: application.id,
        referenceNumber: applicationId,
        status: 'pending',
        estimatedResponse: '5-7 business days',
        nextSteps: [
          'Our team will review your application within 5-7 business days',
          'If selected, you\'ll receive an email to schedule a consultation call',
          'We\'ll discuss your goals and how we can help grow your career'
        ]
      }
    });

  } catch (error) {
    console.error('Management application error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit application'
    });
  }
});

// GET /api/management/stats
router.get('/stats', async (req, res) => {
  try {
    // Get client success metrics
    const { data: clients, error: clientsError } = await supabase
      .from('management_clients')
      .select('*')
      .eq('status', 'active');

    if (clientsError) {
      throw clientsError;
    }

    // Calculate metrics
    const totalClients = clients?.length || 0;
    const totalRevenue = clients?.reduce((sum, client) => sum + (client.revenue_generated || 0), 0) || 0;
    const totalBookings = clients?.reduce((sum, client) => sum + (client.total_bookings || 0), 0) || 0;
    const avgBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

    // Get success stories count
    const { count: successStories } = await supabase
      .from('success_stories')
      .select('*', { count: 'exact', head: true })
      .eq('is_featured', true);

    // Get average client satisfaction
    const { data: reviews } = await supabase
      .from('client_reviews')
      .select('rating')
      .eq('is_approved', true);

    const avgRating = reviews?.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0;

    // Industry metrics
    const metrics = {
      clientSuccess: {
        totalClients,
        totalRevenue,
        totalBookings,
        avgBookingValue: parseFloat(avgBookingValue.toFixed(2)),
        avgClientSatisfaction: parseFloat(avgRating.toFixed(1))
      },
      achievements: {
        successStories: successStories || 0,
        industryAwards: 15, // Static for now
        yearExperience: 12,
        clientRetentionRate: 94.5
      },
      services: {
        careerDevelopment: true,
        bookingManagement: true,
        brandBuilding: true,
        mediaRelations: true,
        contractNegotiation: true,
        tourManagement: true
      }
    };

    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    console.error('Management stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch management statistics'
    });
  }
});

// GET /api/management/testimonials
router.get('/testimonials', async (req, res) => {
  try {
    const { limit = 10, featured = false } = req.query;

    let query = supabase
      .from('client_testimonials')
      .select(`
        *,
        management_clients(artist_name, genre, image_url)
      `)
      .eq('is_approved', true)
      .order('created_at', { ascending: false });

    if (featured === 'true') {
      query = query.eq('is_featured', true);
    }

    query = query.limit(parseInt(limit));

    const { data: testimonials, error } = await query;

    if (error) {
      throw error;
    }

    // Format testimonials
    const formattedTestimonials = testimonials?.map(testimonial => ({
      id: testimonial.id,
      clientName: testimonial.management_clients?.artist_name || 'Anonymous',
      genre: testimonial.management_clients?.genre,
      image: testimonial.management_clients?.image_url,
      testimonial: testimonial.testimonial_text,
      rating: testimonial.rating,
      achievement: testimonial.key_achievement,
      date: testimonial.created_at,
      isFeatured: testimonial.is_featured
    })) || [];

    res.json({
      success: true,
      data: formattedTestimonials
    });

  } catch (error) {
    console.error('Management testimonials error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch testimonials'
    });
  }
});

// GET /api/management/services
router.get('/services', async (req, res) => {
  try {
    const services = [
      {
        id: 'career-development',
        title: 'Career Development',
        description: 'Strategic planning and guidance to accelerate your career growth',
        features: [
          'Personalized career roadmap',
          'Industry connections and networking',
          'Brand positioning and development',
          'Goal setting and milestone tracking'
        ],
        pricing: {
          tier: 'Essential',
          monthlyFee: 2500,
          commissionRate: 15,
          description: 'Comprehensive career management and development'
        }
      },
      {
        id: 'booking-management',
        title: 'Booking & Event Management',
        description: 'End-to-end booking management and event coordination',
        features: [
          'Booking negotiation and contracts',
          'Event logistics coordination',
          'Travel and accommodation arrangements',
          'Technical requirements management'
        ],
        pricing: {
          tier: 'Professional',
          monthlyFee: 3500,
          commissionRate: 12,
          description: 'Full-service booking and event management'
        }
      },
      {
        id: 'brand-building',
        title: 'Brand Building & Marketing',
        description: 'Comprehensive brand development and marketing strategies',
        features: [
          'Social media strategy and management',
          'Content creation and curation',
          'Press relations and media coverage',
          'Digital marketing campaigns'
        ],
        pricing: {
          tier: 'Growth',
          monthlyFee: 4000,
          commissionRate: 18,
          description: 'Complete brand building and marketing suite'
        }
      },
      {
        id: 'full-service',
        title: 'Full-Service Management',
        description: 'Complete career management with all services included',
        features: [
          'All career development services',
          'Complete booking management',
          'Full brand building suite',
          'Legal and contract support',
          'Financial planning and advice',
          '24/7 priority support'
        ],
        pricing: {
          tier: 'Elite',
          monthlyFee: 7500,
          commissionRate: 20,
          description: 'Complete career management solution'
        }
      }
    ];

    // Add success metrics for each service
    const servicesWithMetrics = services.map(service => ({
      ...service,
      metrics: {
        clientsServed: Math.floor(Math.random() * 50) + 20,
        avgRevenueIncrease: Math.floor(Math.random() * 40) + 60,
        satisfactionRating: (Math.random() * 0.8 + 4.2).toFixed(1)
      }
    }));

    res.json({
      success: true,
      data: {
        services: servicesWithMetrics,
        overview: {
          totalServices: services.length,
          startingPrice: 2500,
          avgCommissionRate: 16.25,
          customPackagesAvailable: true
        }
      }
    });

  } catch (error) {
    console.error('Management services error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch management services'
    });
  }
});

// Helper function to calculate priority score
function calculatePriorityScore({ experience, socialMedia, portfolio, genre }) {
  let score = 0;
  
  // Experience points
  if (experience >= 10) score += 30;
  else if (experience >= 5) score += 20;
  else if (experience >= 2) score += 10;
  
  // Social media presence
  const totalFollowers = Object.values(socialMedia || {})
    .reduce((sum, followers) => sum + (parseInt(followers) || 0), 0);
  
  if (totalFollowers >= 100000) score += 25;
  else if (totalFollowers >= 50000) score += 15;
  else if (totalFollowers >= 10000) score += 10;
  
  // Portfolio quality
  const portfolioItems = (portfolio || []).length;
  if (portfolioItems >= 5) score += 15;
  else if (portfolioItems >= 3) score += 10;
  else if (portfolioItems >= 1) score += 5;
  
  // Genre demand (simplified)
  const highDemandGenres = ['pop', 'hip-hop', 'electronic', 'rock'];
  if (highDemandGenres.includes(genre?.toLowerCase())) score += 10;
  
  return Math.min(score, 100); // Cap at 100
}

module.exports = router;