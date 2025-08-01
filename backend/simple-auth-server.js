const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors({
  origin: true, // Allow all origins for testing
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Access-Control-Allow-Origin'],
  optionsSuccessStatus: 200
}));

app.use(express.json());

// Import crypto routes
const cryptoRoutes = require('./routes/crypto');

// In-memory user store for testing
const users = [
  {
    id: 1,
    email: 'management@bookmyreservation.org',
    password: 'process.env.ADMIN_PASSWORD || 'changeme123'',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin'
  }
];

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.post('/api/auth/register', (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    
    console.log('Registration attempt:', { email, firstName, lastName });
    
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }
    
    // Check if user already exists
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }
    
    // Create new user
    const newUser = {
      id: users.length + 1,
      email,
      password,
      firstName,
      lastName,
      role: 'customer'
    };
    
    users.push(newUser);
    
    console.log('Registration successful:', newUser.id);
    
    // Generate simple token (user ID for testing)
    const token = `user-${newUser.id}-token`;
    
    res.json({
      success: true,
      message: 'Registration successful',
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role
      },
      token
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('Login attempt:', { email, timestamp: new Date().toISOString() });
    console.log('Request headers:', req.headers);
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }
    
    // Find user
    const user = users.find(u => u.email === email && u.password === password);
    
    if (!user) {
      console.log('Login failed: Invalid credentials');
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    console.log('Login successful:', user.id);
    
    // Generate simple token
    const token = `user-${user.id}-token`;
    
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          permissions: user.role === 'admin' ? ['manage_users', 'manage_celebrities', 'manage_bookings'] : []
        },
        accessToken: token
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Token verification endpoint
app.get('/api/auth/verify', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  
  // Simple token validation (just check if it starts with "user-")
  if (token.startsWith('user-')) {
    const userId = token.split('-')[1];
    const user = users.find(u => u.id == userId);
    
    if (user) {
      return res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            permissions: user.role === 'admin' ? ['manage_users', 'manage_celebrities', 'manage_bookings'] : []
          }
        }
      });
    }
  }
  
  res.status(401).json({ success: false, message: 'Invalid token' });
});

// Token refresh endpoint
app.post('/api/auth/refresh', (req, res) => {
  res.status(401).json({ success: false, message: 'Token refresh not implemented' });
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

// Celebrities endpoint
app.get('/api/celebrities', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 1,
        name: 'Sample Celebrity',
        category: 'Actor',
        rating: 4.5,
        price: 50000,
        description: 'Famous actor available for events',
        image: '/placeholder-celebrity.jpg',
        isAvailable: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]
  });
});

// Settings endpoint
app.get('/api/settings', (req, res) => {
  res.json({
    success: true,
    data: {
      siteName: 'Celebrity Booking Platform',
      supportEmail: 'support@bookmyreservation.org',
      maintenanceMode: false,
      allowRegistration: true
    }
  });
});

// Public settings endpoint
app.get('/api/settings/public', (req, res) => {
  res.json({
    success: true,
    data: {
      site_name: 'Celebrity Booking Platform',
      supportEmail: 'support@bookmyreservation.org',
      allowRegistration: true,
      footer_company_description: 'Your trusted partner for celebrity bookings and exclusive event entertainment.',
      social_instagram: 'https://instagram.com/bookmyreservation',
      social_twitter: 'https://twitter.com/bookmyreservation',
      social_facebook: 'https://facebook.com/bookmyreservation',
      social_linkedin: 'https://linkedin.com/company/bookmyreservation',
      footer_services_title: 'Services',
      footer_services_links: [
        { name: 'Celebrity Booking', url: '/celebrities' },
        { name: 'Event Planning', url: '/services' },
        { name: 'VIP Experiences', url: '/vip' },
        { name: 'Custom Events', url: '/custom' }
      ],
      footer_support_title: 'Support',
      footer_support_links: [
        { name: 'Help Center', url: '/help' },
        { name: 'Contact Us', url: '/contact' },
        { name: 'FAQ', url: '/faq' },
        { name: 'Live Chat', url: '/chat' }
      ],
      contact_email: 'info@bookmyreservation.org',
      contact_phone: '+1 (555) 123-4567',
      address: '123 Entertainment Blvd, Los Angeles, CA 90210',
      newsletter_enabled: true,
      newsletter_title: 'Stay Updated',
      newsletter_description: 'Get exclusive celebrity booking deals and event updates.',
      footer_copyright: '© 2024 Celebrity Booking Platform. All rights reserved.',
      footer_legal_links: [
        { name: 'Privacy Policy', url: '/privacy' },
        { name: 'Terms of Service', url: '/terms' },
        { name: 'Cookie Policy', url: '/cookies' }
      ]
    }
  });
});

// Bookings endpoint
app.get('/api/bookings', (req, res) => {
  res.json({
    success: true,
    data: []
  });
});

// Email settings endpoint
app.get('/api/email-settings/email', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: '1',
        setting_key: 'primary_email',
        setting_value: 'management@bookmyreservation.org',
        display_name: 'Primary Email Address',
        description: 'Main email address for receiving notifications and communications',
        setting_type: 'email',
        is_required: true,
        is_active: true
      },
      {
        id: '2',
        setting_key: 'notification_email',
        setting_value: 'notifications@bookmyreservation.org',
        display_name: 'Notification Email',
        description: 'Email address for system notifications and alerts',
        setting_type: 'email',
        is_required: false,
        is_active: true
      },
      {
        id: '3',
        setting_key: 'support_email',
        setting_value: 'support@bookmyreservation.org',
        display_name: 'Support Email',
        description: 'Customer support email address displayed to users',
        setting_type: 'email',
        is_required: true,
        is_active: true
      },
      {
        id: '4',
        setting_key: 'email_notifications_enabled',
        setting_value: 'true',
        display_name: 'Enable Email Notifications',
        description: 'Receive email notifications for new bookings and important events',
        setting_type: 'boolean',
        is_required: false,
        is_active: true
      },
      {
        id: '5',
        setting_key: 'booking_notifications',
        setting_value: 'true',
        display_name: 'Booking Notifications',
        description: 'Get notified when new bookings are created or modified',
        setting_type: 'boolean',
        is_required: false,
        is_active: true
      },
      {
        id: '6',
        setting_key: 'user_registration_notifications',
        setting_value: 'true',
        display_name: 'User Registration Notifications',
        description: 'Receive notifications when new users register',
        setting_type: 'boolean',
        is_required: false,
        is_active: true
      },
      {
        id: '7',
        setting_key: 'smtp_host',
        setting_value: 'smtp.hostinger.com',
        display_name: 'SMTP Host',
        description: 'SMTP server hostname for sending emails',
        setting_type: 'text',
        is_required: true,
        is_active: true
      },
      {
        id: '8',
        setting_key: 'smtp_port',
        setting_value: '587',
        display_name: 'SMTP Port',
        description: 'SMTP server port (usually 587 for TLS or 465 for SSL)',
        setting_type: 'text',
        is_required: true,
        is_active: true
      },
      {
        id: '9',
        setting_key: 'email_from_name',
        setting_value: 'Celebrity Booking Platform',
        display_name: 'From Name',
        description: 'Display name that appears in sent emails',
        setting_type: 'text',
        is_required: true,
        is_active: true
      },
      {
        id: '10',
        setting_key: 'email_signature',
        setting_value: 'Best regards,\n\nCelebrity Booking Platform Team\nBookMyReservation.org',
        display_name: 'Email Signature',
        description: 'Default signature to include in all outgoing emails',
        setting_type: 'textarea',
        is_required: false,
        is_active: true
      }
    ]
  });
});

// Analytics automation activities endpoint
app.get('/api/analytics/automation/activities', (req, res) => {
  res.json({
    success: true,
    data: []
  });
});

// Email templates endpoint
app.get('/api/email-settings/templates', (req, res) => {
  res.json({
    success: true,
    data: []
  });
});

// Admin settings update endpoints
app.put('/api/settings', (req, res) => {
  console.log('Settings update request:', req.body);
  res.json({
    success: true,
    data: {
      siteName: 'Celebrity Booking Platform',
      supportEmail: 'support@bookmyreservation.org',
      maintenanceMode: false,
      allowRegistration: true,
      ...req.body
    }
  });
});

// Update admin user password
app.put('/api/auth/change-password', (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token || !token.startsWith('user-')) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  
  const userId = token.split('-')[1];
  const user = users.find(u => u.id == userId);
  
  if (!user || user.password !== currentPassword) {
    return res.status(400).json({ success: false, message: 'Current password is incorrect' });
  }
  
  user.password = newPassword;
  console.log('Password updated for user:', user.email);
  
  res.json({ success: true, message: 'Password updated successfully' });
});

// Email settings endpoints
app.put('/api/email-settings/email/:key', (req, res) => {
  console.log('Email setting update:', req.params.key, req.body);
  res.json({
    success: true,
    data: { key: req.params.key, value: req.body.value }
  });
});

app.post('/api/email-settings/email/test', (req, res) => {
  console.log('Test email request');
  res.json({
    success: true,
    message: 'Test email sent successfully'
  });
});

// Bulk update email settings
app.post('/api/email-settings/email/bulk-update', (req, res) => {
  console.log('Bulk update email settings:', req.body);
  const { settings } = req.body;
  
  // In a real app, update the settings in the database
  Object.entries(settings).forEach(([key, value]) => {
    console.log(`Updating ${key} to:`, value);
  });
  
  res.json({
    success: true,
    message: 'Email settings updated successfully',
    data: settings
  });
});

// Form submissions endpoints
app.post('/api/forms/representation', (req, res) => {
  console.log('Representation form submission:', req.body);
  res.json({
    success: true,
    message: 'Application submitted successfully',
    data: { id: Date.now(), ...req.body, status: 'pending' }
  });
});

app.post('/api/forms/consultation', (req, res) => {
  console.log('Consultation form submission:', req.body);
  res.json({
    success: true,
    message: 'Consultation request submitted successfully',
    data: { id: Date.now(), ...req.body, status: 'pending' }
  });
});

app.post('/api/forms/service-request', (req, res) => {
  console.log('Service request submission:', req.body);
  res.json({
    success: true,
    message: 'Service request submitted successfully',
    data: { id: Date.now(), ...req.body, status: 'pending' }
  });
});

// Get form submissions for admin
app.get('/api/admin/forms/representation', (req, res) => {
  res.json({
    success: true,
    data: []
  });
});

app.get('/api/admin/forms/consultation', (req, res) => {
  res.json({
    success: true,
    data: []
  });
});

app.get('/api/admin/forms/service-requests', (req, res) => {
  res.json({
    success: true,
    data: []
  });
});

// Analytics and automation endpoints
app.get('/api/analytics/automation/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      totalRules: 0,
      activeRules: 0,
      totalExecutions: 0,
      successRate: 0
    }
  });
});

app.get('/api/analytics/automation/activities', (req, res) => {
  res.json({
    success: true,
    data: []
  });
});

// Automation endpoints (direct API paths for useAutomation hook)
app.get('/api/automation/rules', (req, res) => {
  res.json({
    success: true,
    data: []
  });
});

app.get('/api/automation/logs', (req, res) => {
  res.json({
    success: true,
    data: []
  });
});

app.get('/api/automation/metrics', (req, res) => {
  res.json({
    success: true,
    data: {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0
    }
  });
});

// Get all users/customers for admin
app.get('/api/admin/users', (req, res) => {
  const customers = users.filter(user => user.role === 'customer');
  res.json({
    success: true,
    data: customers.map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      registrationDate: new Date().toISOString()
    }))
  });
});

// Create new user (admin only)
app.post('/api/admin/users/create', (req, res) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;
    
    console.log('Creating new user:', { firstName, lastName, email, role });
    
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required'
      });
    }
    
    // Check if user already exists
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
    }
    
    // Create new user
    const newUser = {
      id: users.length + 1,
      email,
      password, // In a real app, this should be hashed
      firstName,
      lastName,
      role: role || 'customer'
    };
    
    users.push(newUser);
    
    // Return user data (without password)
    const { password: _, ...userResponse } = newUser;
    res.json({
      success: true,
      data: {
        ...userResponse,
        registrationDate: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create user'
    });
  }
});

// Event booking endpoints
app.post('/api/bookings/create', (req, res) => {
  console.log('Event booking submission:', req.body);
  
  const bookingId = 'BK-' + Date.now().toString().slice(-8);
  const booking = {
    bookingId,
    ...req.body,
    status: 'confirmed',
    bookingDate: new Date().toISOString(),
    totalAmount: req.body.price.replace('$', '').replace(',', '') * req.body.ticketQuantity
  };

  res.json({
    success: true,
    message: 'Event booking confirmed successfully',
    data: booking
  });
});

app.get('/api/bookings', (req, res) => {
  res.json({
    success: true,
    data: []
  });
});

app.get('/api/bookings/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      totalBookings: 0,
      pendingBookings: 0,
      confirmedBookings: 0,
      totalRevenue: 0
    }
  });
});

// Add crypto payment routes
app.use('/api/crypto', cryptoRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Simple auth server running on port ${PORT}`);
  console.log('Available users:');
  users.forEach(user => {
    console.log(`  ${user.email} (${user.role})`);
  });
});

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));