const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const validator = require('validator');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: { error: 'Too many requests, please try again later' }
});
app.use('/api/', limiter);

// Log all incoming requests (sanitized)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url} from ${req.get('origin') || 'unknown'}`);
  next();
});

// Secure CORS configuration
const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',') 
  : ['http://localhost:3000', 'http://localhost:5173'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// Input sanitization middleware
function sanitizeInput(req, res, next) {
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = validator.escape(req.body[key].trim());
      }
    });
  }
  next();
}
app.use(sanitizeInput);

// JWT validation middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

app.get('/api/health', (req, res) => {
  console.log('Health check requested');
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.post('/api/auth/register', (req, res) => {
  console.log('Register request:', req.body);
  res.json({ success: false, message: 'Test endpoint - registration not implemented' });
});

app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('Login request received from:', req.get('origin'));
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email format' 
      });
    }

    // Check environment variables for admin credentials
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const managementEmail = process.env.MANAGEMENT_EMAIL;
    const managementPassword = process.env.MANAGEMENT_PASSWORD;

    if (!adminEmail || !adminPassword || !managementEmail || !managementPassword) {
      console.error('Admin credentials not configured in environment');
      return res.status(500).json({ 
        success: false, 
        message: 'Server configuration error' 
      });
    }

    let isValidUser = false;
    let userDetails = null;

    // Check admin credentials (in production, use bcrypt.compare)
    if (email === adminEmail && password === adminPassword) {
      isValidUser = true;
      userDetails = {
        id: 1,
        email: email,
        name: 'Admin User',
        role: 'admin'
      };
    } else if (email === managementEmail && password === managementPassword) {
      isValidUser = true;
      userDetails = {
        id: 2,
        email: email,
        name: 'Management User',
        role: 'admin'
      };
    }

    if (isValidUser) {
      // Generate JWT token
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        return res.status(500).json({ 
          success: false, 
          message: 'JWT configuration error' 
        });
      }

      const accessToken = jwt.sign(
        { 
          userId: userDetails.id,
          email: userDetails.email,
          role: userDetails.role 
        },
        jwtSecret,
        { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
      );

      res.json({ 
        success: true, 
        message: 'Login successful',
        data: {
          accessToken,
          user: userDetails
        }
      });
    } else {
      res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

app.get('/api/settings/public', (req, res) => {
  console.log('Public settings requested');
  res.json({
    siteName: 'EliteConnect Platform',
    siteDescription: 'Premium Celebrity Booking Platform',
    contactEmail: 'info@eliteconnect.com',
    phone: '+1 (555) 123-4567',
    address: '123 Hollywood Blvd, Los Angeles, CA 90028'
  });
});

// Admin-only endpoints (mock data for development)
app.get('/api/admin/dashboard', authenticateToken, (req, res) => {
  console.log('Admin dashboard data requested');
  res.json({
    stats: {
      totalUsers: 150,
      totalBookings: 45,
      totalRevenue: 125000,
      totalCelebrities: 12
    },
    recentBookings: [
      { id: 1, celebrity: 'John Doe', client: 'ABC Corp', amount: 5000, date: '2025-01-15' },
      { id: 2, celebrity: 'Jane Smith', client: 'XYZ Ltd', amount: 3000, date: '2025-01-14' }
    ]
  });
});

app.get('/api/celebrities', (req, res) => {
  console.log('Celebrities list requested');
  res.json([
    { id: 1, name: 'John Doe', category: 'Actor', rate: 5000, available: true },
    { id: 2, name: 'Jane Smith', category: 'Singer', rate: 3000, available: true },
    { id: 3, name: 'Mike Johnson', category: 'Athlete', rate: 7000, available: false }
  ]);
});

app.get('/api/settings', authenticateToken, (req, res) => {
  console.log('Admin settings requested');
  res.json({
    success: true,
    data: {
      siteName: 'EliteConnect Platform',
      siteDescription: 'Premium Celebrity Booking Platform',
      contactEmail: 'admin@eliteconnect.com',
      phone: '+1 (555) 123-4567',
      address: '123 Hollywood Blvd, Los Angeles, CA 90028',
      maintenanceMode: false,
      allowRegistration: true
    }
  });
});

// Payment Options endpoints
app.get('/api/payment-options', (req, res) => {
  console.log('Payment options requested');
  res.json({
    success: true,
    data: [
      {
        id: 1,
        name: 'Credit Card',
        type: 'stripe',
        description: 'Accept credit card payments via Stripe',
        isActive: true,
        processingFee: 2.9,
        minAmount: 1,
        maxAmount: 999999
      },
      {
        id: 2,
        name: 'Bank Transfer',
        type: 'wire',
        description: 'Direct bank transfers for large bookings',
        isActive: true,
        processingFee: 0.5,
        minAmount: 10000,
        maxAmount: 9999999
      },
      {
        id: 3,
        name: 'PayPal',
        type: 'paypal',
        description: 'PayPal payments',
        isActive: false,
        processingFee: 3.4,
        minAmount: 1,
        maxAmount: 50000
      }
    ]
  });
});

app.post('/api/payment-options', (req, res) => {
  console.log('Add payment option request:', req.body);
  const newOption = {
    id: Date.now(),
    ...req.body,
    isActive: true
  };
  res.json({
    success: true,
    data: newOption,
    message: 'Payment option added successfully'
  });
});

app.put('/api/payment-options/:id', (req, res) => {
  console.log('Update payment option request:', req.params.id, req.body);
  res.json({
    success: true,
    data: { id: parseInt(req.params.id), ...req.body },
    message: 'Payment option updated successfully'
  });
});

app.delete('/api/payment-options/:id', (req, res) => {
  console.log('Delete payment option request:', req.params.id);
  res.json({
    success: true,
    message: 'Payment option deleted successfully'
  });
});

// Automation endpoints
app.get('/api/analytics/automation/activities', (req, res) => {
  console.log('Automation activities requested');
  res.json({
    success: true,
    data: {
      rules: [
        {
          id: 1,
          name: 'Welcome Email',
          trigger: 'new_booking',
          action: 'send_email',
          isActive: true,
          lastTriggered: '2025-01-20T10:30:00Z'
        }
      ]
    }
  });
});

app.get('/api/analytics/automation/stats', (req, res) => {
  console.log('Automation stats requested');
  res.json({
    success: true,
    data: {
      metrics: {
        totalRules: 5,
        activeRules: 3,
        triggersToday: 12,
        successRate: 98.5
      }
    }
  });
});

// Admin dashboard data endpoint
app.get('/api/admin/dashboard', (req, res) => {
  console.log('Admin dashboard data requested');
  res.json({
    success: true,
    data: {
      stats: {
        totalUsers: 150,
        totalBookings: 45,
        totalRevenue: 125000,
        totalCelebrities: 12
      },
      recentBookings: [
        { id: 1, celebrity: 'John Doe', client: 'ABC Corp', amount: 5000, date: '2025-01-15' },
        { id: 2, celebrity: 'Jane Smith', client: 'XYZ Ltd', amount: 3000, date: '2025-01-14' }
      ]
    }
  });
});

// Add missing API endpoints that admin dashboard might call
app.get('/api/auth/verify', authenticateToken, (req, res) => {
  console.log('Token verify request');
  res.json({ success: true, user: req.user });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  console.log('Auth me request');
  res.json({ 
    success: true, 
    user: {
      id: req.user.userId,
      email: req.user.email,
      role: req.user.role
    }
  });
});

app.post('/api/auth/refresh', (req, res) => {
  console.log('Token refresh request');
  // For this simplified version, just return error
  // In production, implement proper refresh token logic
  res.status(401).json({ success: false, error: 'Refresh tokens not implemented in simple server' });
});

app.post('/api/auth/logout', (req, res) => {
  console.log('Logout request');
  res.json({ success: true, message: 'Logged out successfully' });
});

// Automation API endpoints
app.get('/api/automation/rules', (req, res) => {
  console.log('Automation rules requested');
  res.json({
    success: true,
    data: {
      rules: [
        {
          id: '1',
          name: 'Welcome Email Automation',
          description: 'Send welcome email to new clients',
          trigger_type: 'new_booking',
          is_active: true,
          priority: 1
        },
        {
          id: '2',
          name: 'Booking Confirmation',
          description: 'Send confirmation email when booking is approved',
          trigger_type: 'booking_approved',
          is_active: true,
          priority: 2
        },
        {
          id: '3',
          name: 'Payment Reminder',
          description: 'Send payment reminder 3 days before event',
          trigger_type: 'payment_due',
          is_active: false,
          priority: 3
        }
      ]
    }
  });
});

app.get('/api/automation/logs', (req, res) => {
  console.log('Automation logs requested');
  const limit = req.query.limit || 50;
  res.json({
    success: true,
    data: {
      logs: [
        {
          id: '1',
          workflow_id: '1',
          workflow_name: 'Welcome Email Automation',
          trigger_event: 'new_booking',
          success: true,
          executed_at: '2025-07-29T10:30:00Z',
          execution_time_ms: 245
        },
        {
          id: '2',
          workflow_id: '2',
          workflow_name: 'Booking Confirmation',
          trigger_event: 'booking_approved',
          success: true,
          executed_at: '2025-07-29T09:15:00Z',
          execution_time_ms: 156
        },
        {
          id: '3',
          workflow_id: '1',
          workflow_name: 'Welcome Email Automation',
          trigger_event: 'new_booking',
          success: false,
          executed_at: '2025-07-29T08:45:00Z',
          execution_time_ms: 89
        }
      ].slice(0, parseInt(limit))
    }
  });
});

app.get('/api/automation/metrics', (req, res) => {
  console.log('Automation metrics requested');
  res.json({
    success: true,
    data: {
      metrics: {
        total_executions: 147,
        success_rate: 94.2,
        average_execution_time: 198,
        active_workflows: 2
      }
    }
  });
});

app.patch('/api/automation/rules/:id', (req, res) => {
  console.log('Update automation rule:', req.params.id, req.body);
  res.json({
    success: true,
    data: {
      id: req.params.id,
      ...req.body
    },
    message: 'Automation rule updated successfully'
  });
});

app.post('/api/automation/trigger', (req, res) => {
  console.log('Manual automation trigger:', req.body);
  res.json({
    success: true,
    data: {
      execution_id: Date.now().toString(),
      status: 'triggered',
      message: 'Automation workflow triggered successfully'
    }
  });
});

app.get('/api/automation/status', (req, res) => {
  console.log('Automation status requested');
  res.json({
    success: true,
    data: {
      status: {
        system_active: true,
        workflows_running: 2,
        last_execution: '2025-07-29T10:30:00Z',
        queue_size: 0
      }
    }
  });
});

// Webhook endpoints for N8N integration
app.post('/api/webhooks/n8n/booking-created', (req, res) => {
  console.log('N8N booking webhook:', req.body);
  res.json({
    success: true,
    data: {
      webhook_id: Date.now().toString(),
      status: 'processed',
      message: 'Booking automation triggered'
    }
  });
});

app.post('/api/webhooks/n8n/recommendation-engine', (req, res) => {
  console.log('N8N recommendation webhook:', req.body);
  res.json({
    success: true,
    data: {
      recommendations: [
        {
          celebrity_id: '1',
          name: 'John Doe',
          match_score: 95,
          reasons: ['Similar past bookings', 'Price range match', 'Location preference']
        },
        {
          celebrity_id: '2',
          name: 'Jane Smith',
          match_score: 87,
          reasons: ['Category match', 'Availability match']
        }
      ]
    }
  });
});

app.post('/api/webhooks/n8n/celebrity-updated', (req, res) => {
  console.log('N8N celebrity analysis webhook:', req.body);
  res.json({
    success: true,
    data: {
      analysis_id: Date.now().toString(),
      celebrity_id: req.body.celebrity_id,
      status: 'completed',
      insights: {
        booking_trend: 'increasing',
        performance_score: 8.5,
        recommendations: ['Increase rate by 10%', 'Add weekend availability']
      }
    }
  });
});

// Missing API endpoints for admin dashboard
app.get('/api/bookings', (req, res) => {
  console.log('Bookings requested');
  res.json({
    success: true,
    data: [
      {
        id: 1,
        celebrityName: 'John Doe',
        clientName: 'ABC Corp',
        amount: 5000,
        status: 'confirmed',
        eventDate: '2025-02-15',
        createdAt: '2025-01-20'
      }
    ]
  });
});

app.get('/api/admin/users', (req, res) => {
  console.log('Admin users requested');
  res.json({
    success: true,
    data: [
      {
        id: 1,
        name: 'Admin User',
        email: 'admin@eliteconnect.com',
        role: 'admin',
        isActive: true,
        createdAt: '2025-01-01'
      },
      {
        id: 2,
        name: 'Management User',
        email: 'management@bookmyreservation.org',
        role: 'admin',
        isActive: true,
        createdAt: '2025-01-01'
      }
    ]
  });
});

app.post('/api/admin/users/create', (req, res) => {
  console.log('Create user request:', req.body);
  const newUser = {
    id: Date.now(),
    ...req.body,
    isActive: true,
    createdAt: new Date().toISOString()
  };
  res.json({
    success: true,
    data: newUser,
    message: 'User created successfully'
  });
});

// Form submission endpoints 
app.get('/api/admin/forms/representation', (req, res) => {
  console.log('Representation forms requested');
  res.json({
    success: true,
    data: [
      {
        id: 1,
        name: 'John Smith',
        email: 'john@example.com',
        phone: '+1-555-0123',
        celebrityInterest: 'Musicians',
        message: 'Looking for representation for my music career',
        submittedAt: '2025-07-25T10:30:00Z',
        status: 'pending'
      }
    ]
  });
});

app.get('/api/admin/forms/consultation', (req, res) => {
  console.log('Consultation forms requested');
  res.json({
    success: true,
    data: [
      {
        id: 1,
        name: 'Sarah Johnson',
        email: 'sarah@company.com',
        phone: '+1-555-0456',
        serviceType: 'Event Planning',
        message: 'Need consultation for corporate event',
        submittedAt: '2025-07-26T14:15:00Z',
        status: 'pending'
      }
    ]
  });
});

app.get('/api/admin/forms/service-requests', (req, res) => {
  console.log('Service request forms requested');
  res.json({
    success: true,
    data: [
      {
        id: 1,
        name: 'Mike Wilson',
        email: 'mike@events.com',
        phone: '+1-555-0789',
        serviceType: 'Celebrity Booking',
        eventDate: '2025-08-15',
        budget: '$50000',
        message: 'Need A-list celebrity for product launch',
        submittedAt: '2025-07-27T09:45:00Z',
        status: 'pending'
      }
    ]
  });
});

// Email settings endpoint
app.get('/api/settings/email', (req, res) => {
  console.log('Email settings requested');
  res.json({
    success: true,
    data: {
      smtpHost: 'smtp.hostinger.com',
      smtpPort: 465,
      smtpUser: 'management@bookmyreservation.org',
      smtpPass: '***CONFIGURED***',
      fromEmail: 'management@bookmyreservation.org',
      enabled: true
    }
  });
});

app.post('/api/settings/email/test', (req, res) => {
  console.log('Email test requested:', req.body);
  res.json({
    success: true,
    data: {
      success: true,
      message: 'Test email sent successfully to ' + req.body.to
    }
  });
});

// Handle undefined routes
app.use('/api/*', (req, res) => {
  console.log('Unhandled API route:', req.method, req.url);
  res.status(404).json({ 
    success: false, 
    message: `API endpoint ${req.method} ${req.url} not found` 
  });
});

// Handle non-API routes
app.use('*', (req, res) => {
  console.log('Non-API request:', req.method, req.url);
  res.status(404).json({ 
    success: false, 
    message: 'This is an API server. Please use /api/ endpoints.' 
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Simple server running on http://127.0.0.1:${PORT}`);
  console.log(`Also available on http://localhost:${PORT}`);
});

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));