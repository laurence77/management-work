const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const validator = require('validator');
const multer = require('multer');
const { Server: SocketIOServer } = require('socket.io');
const http = require('http');
require('dotenv').config();

// Supabase configuration
const { supabase, supabaseAdmin } = require('./config/supabase');

// Email service
const emailService = require('./services/EmailTemplateService');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Initialize Socket.IO
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://bookmyreservation.org', 'https://admin.bookmyreservation.org']
      : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: { error: 'Too many requests, please try again later' }
});
app.use('/api/', limiter);

// Enhanced CORS for all interfaces
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? [
      'https://bookmyreservation.org',
      'https://www.bookmyreservation.org',
      'https://admin.bookmyreservation.org',
      'https://api.bookmyreservation.org'
    ]
  : [
      'http://localhost:8080', // Main frontend
      'http://localhost:3001', // Admin dashboard (primary)
      'http://127.0.0.1:3001', // Admin dashboard (127.0.0.1)
      'http://localhost:3002', // Admin dashboard (fallback)
      'http://localhost:3000', // Self
      'http://localhost:5173'  // Vite dev server
    ];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests, or local files)
    if (!origin || origin === 'null') return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      console.log('CORS allowed origin:', origin);
      return callback(null, true);
    }
    
    console.log('CORS blocked origin:', origin);
    console.log('Allowed origins:', allowedOrigins);
    
    const msg = 'The CORS policy for this site does not allow access from the specified origin.';
    return callback(new Error(msg), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

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

// Serve static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// In-memory data stores (replace with database in production)
const users = [
  {
    id: 1,
    email: process.env.MANAGEMENT_EMAIL || 'management@bookmyreservation.org',
    password: process.env.MANAGEMENT_PASSWORD || 'changeme123',
    firstName: 'Management',
    lastName: 'Team',
    role: 'admin',
    permissions: ['admin', 'manage_celebrities', 'manage_bookings', 'manage_users']
  },
  {
    id: 2,
    email: process.env.ADMIN_EMAIL || 'admin@eliteconnect.com',
    password: process.env.ADMIN_PASSWORD || 'changeme123',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    permissions: ['admin', 'manage_celebrities', 'manage_bookings', 'manage_users']
  }
];

const celebrities = [
  {
    id: 1,
    name: "Emma Watson",
    image: "https://images.unsplash.com/photo-1494790108755-2616b612b743?w=400",
    price: "$50,000 - $100,000",
    rating: 4.9,
    category: "actors",
    description: "Award-winning actress and activist",
    availability: true
  },
  {
    id: 2,
    name: "Ryan Reynolds",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
    price: "$75,000 - $150,000",
    rating: 4.8,
    category: "actors",
    description: "Comedian and Hollywood star",
    availability: true
  },
  {
    id: 3,
    name: "Taylor Swift",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400",
    price: "$200,000 - $500,000",
    rating: 5.0,
    category: "musicians",
    description: "Global music superstar",
    availability: true
  }
];

const bookings = [];

// Booking status constants
const BOOKING_STATUSES = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed', 
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  REJECTED: 'rejected'
};

// Database service functions for bookings
async function getBookingsFromDB(filters = {}) {
  try {
    let query = supabase.from('bookings').select('*');
    
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.celebrityId) {
      query = query.eq('celebrity_id', filters.celebrityId);
    }
    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Database error:', error);
    return bookings.filter(b => {
      if (filters.status && b.status !== filters.status) return false;
      if (filters.celebrityId && b.celebrityId !== parseInt(filters.celebrityId)) return false;
      if (filters.userId && b.userId !== parseInt(filters.userId)) return false;
      return true;
    });
  }
}

async function createBookingInDB(bookingData) {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .insert([{...bookingData, status: BOOKING_STATUSES.PENDING}])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Database error:', error);
    const newBooking = {
      id: bookings.length + 1,
      ...bookingData,
      status: BOOKING_STATUSES.PENDING,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    bookings.push(newBooking);
    return newBooking;
  }
}

async function updateBookingStatusInDB(id, status, updateData = {}) {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .update({ status, ...updateData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Database error:', error);
    const index = bookings.findIndex(b => b.id === parseInt(id));
    if (index !== -1) {
      bookings[index] = { 
        ...bookings[index], 
        status, 
        ...updateData, 
        updated_at: new Date().toISOString() 
      };
      return bookings[index];
    }
    return null;
  }
}

// JWT Authentication middleware
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

// Image upload configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/celebrities/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, 'celebrity-' + uniqueSuffix + path.extname(file.originalname))
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Database service functions
async function getCelebritiesFromDB() {
  try {
    const { data, error } = await supabase
      .from('celebrities')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Database error:', error);
    return celebrities; // Fallback to in-memory data
  }
}

async function getCelebrityFromDB(id) {
  try {
    const { data, error } = await supabase
      .from('celebrities')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Database error:', error);
    return celebrities.find(c => c.id === parseInt(id));
  }
}

async function createCelebrityInDB(celebrityData) {
  try {
    const { data, error } = await supabase
      .from('celebrities')
      .insert([celebrityData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Database error:', error);
    // Fallback to in-memory
    const newCelebrity = {
      id: celebrities.length + 1,
      ...celebrityData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    celebrities.push(newCelebrity);
    return newCelebrity;
  }
}

async function updateCelebrityInDB(id, updateData) {
  try {
    const { data, error } = await supabase
      .from('celebrities')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Database error:', error);
    // Fallback to in-memory
    const index = celebrities.findIndex(c => c.id === parseInt(id));
    if (index !== -1) {
      celebrities[index] = { ...celebrities[index], ...updateData, updated_at: new Date().toISOString() };
      return celebrities[index];
    }
    return null;
  }
}

async function deleteCelebrityFromDB(id) {
  try {
    const { data, error } = await supabase
      .from('celebrities')
      .delete()
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Database error:', error);
    // Fallback to in-memory
    const index = celebrities.findIndex(c => c.id === parseInt(id));
    if (index !== -1) {
      return celebrities.splice(index, 1)[0];
    }
    return null;
  }
}

// Real-time notification system
class NotificationManager {
  constructor(io) {
    this.io = io;
    this.connectedUsers = new Map();
  }

  addUser(socketId, userId, userRole) {
    this.connectedUsers.set(socketId, { userId, userRole });
    console.log(`🔌 User ${userId} connected (${userRole})`);
  }

  removeUser(socketId) {
    const user = this.connectedUsers.get(socketId);
    if (user) {
      console.log(`🔌 User ${user.userId} disconnected`);
      this.connectedUsers.delete(socketId);
    }
  }

  // Send notification to specific user
  notifyUser(userId, event, data) {
    for (const [socketId, user] of this.connectedUsers) {
      if (user.userId === userId) {
        this.io.to(socketId).emit(event, data);
      }
    }
  }

  // Send to all admin users
  notifyAdmins(event, data) {
    for (const [socketId, user] of this.connectedUsers) {
      if (user.userRole === 'admin') {
        this.io.to(socketId).emit(event, data);
      }
    }
  }

  // Broadcast to all connected users
  broadcast(event, data) {
    this.io.emit(event, data);
  }

  // Send booking updates
  notifyBookingUpdate(booking, action) {
    const notification = {
      id: Date.now(),
      type: 'booking_update',
      action: action, // 'created', 'confirmed', 'cancelled', etc.
      booking: booking,
      timestamp: new Date().toISOString()
    };

    // Notify admins about all booking changes
    this.notifyAdmins('booking_update', notification);

    // Notify specific user if available
    if (booking.user_id) {
      this.notifyUser(booking.user_id, 'booking_update', notification);
    }
  }

  // Send celebrity updates
  notifyCelebrityUpdate(celebrity, action) {
    const notification = {
      id: Date.now(),
      type: 'celebrity_update',
      action: action,
      celebrity: celebrity,
      timestamp: new Date().toISOString()
    };

    this.broadcast('celebrity_update', notification);
  }

  // Send system alerts
  sendSystemAlert(message, level = 'info') {
    const alert = {
      id: Date.now(),
      type: 'system_alert',
      level: level, // 'info', 'warning', 'error', 'success'
      message: message,
      timestamp: new Date().toISOString()
    };

    this.notifyAdmins('system_alert', alert);
  }
}

const notificationManager = new NotificationManager(io);

// WebSocket authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    socket.userRole = decoded.role;
    next();
  } catch (error) {
    next(new Error('Invalid authentication token'));
  }
});

// WebSocket connection handling
io.on('connection', (socket) => {
  // Add user to notification manager
  notificationManager.addUser(socket.id, socket.userId, socket.userRole);

  // Handle admin dashboard requests
  socket.on('join_admin_room', () => {
    if (socket.userRole === 'admin') {
      socket.join('admin_room');
      console.log(`Admin user ${socket.userId} joined admin room`);
    }
  });

  // Handle real-time dashboard data requests
  socket.on('request_dashboard_data', async () => {
    if (socket.userRole === 'admin') {
      try {
        const dashboardData = {
          bookings: await getBookingsFromDB({ limit: 10 }),
          celebrities: await getCelebritiesFromDB(),
          timestamp: new Date().toISOString()
        };
        socket.emit('dashboard_data', dashboardData);
      } catch (error) {
        socket.emit('error', { message: 'Failed to fetch dashboard data' });
      }
    }
  });

  // Handle ping/pong for connection health
  socket.on('ping', () => {
    socket.emit('pong');
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    notificationManager.removeUser(socket.id);
  });
});

// Helper functions
function findUserByCredentials(email, password) {
  return users.find(u => u.email === email && u.password === password);
}

// ============= HEALTH & STATUS =============
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Celebrity Booking Platform API is running!',
    timestamp: new Date().toISOString(),
    version: '2.0.0-unified',
    services: {
      auth: 'active',
      celebrities: 'active',
      bookings: 'active',
      admin: 'active'
    }
  });
});

app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Unified server working perfectly!',
    data: {
      platform: 'Celebrity Booking Platform',
      version: '2.0.0-unified',
      features: [
        'Admin Dashboard Integration',
        'Celebrity Management',
        'Booking System',
        'User Authentication',
        'API Unified Architecture'
      ]
    }
  });
});

// ============= AUTHENTICATION =============
app.post('/api/auth/login', async (req, res) => {
  try {
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

    const user = findUserByCredentials(email, password);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

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
        userId: user.id,
        email: user.email,
        role: user.role,
        permissions: user.permissions
      },
      jwtSecret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );

    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      data: {
        user: userWithoutPassword,
        accessToken,
        token: accessToken // Backward compatibility
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

// User registration endpoint
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, company } = req.body;
    
    // Validate input
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, first name, and last name are required'
      });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check if user already exists
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create new user
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: Date.now(),
      email,
      password: hashedPassword,
      firstName,
      lastName,
      phone: phone || '',
      company: company || '',
      role: 'user',
      permissions: ['read'],
      createdAt: new Date().toISOString()
    };

    users.push(newUser);

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
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role,
        permissions: newUser.permissions
      },
      jwtSecret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );

    const { password: _, ...userWithoutPassword } = newUser;

    res.status(201).json({
      success: true,
      data: {
        user: userWithoutPassword,
        accessToken,
        token: accessToken // Backward compatibility
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Handle both GET and POST for verify endpoint
app.get('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: req.user,
    valid: true
  });
});

app.post('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: req.user,
    valid: true
  });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.userId,
      email: req.user.email,
      role: req.user.role,
      permissions: req.user.permissions
    }
  });
});

app.post('/api/auth/refresh', (req, res) => {
  const oldToken = req.headers.authorization?.replace('Bearer ', '');
  
  if (!oldToken || !tokens.has(oldToken)) {
    return res.status(401).json({
      success: false,
      error: 'Invalid refresh token'
    });
  }
  
  // Remove old token and create new one
  tokens.delete(oldToken);
  const newToken = generateToken();
  tokens.add(newToken);
  
  const user = users.find(u => u.role === 'admin');
  const { password: _, ...userWithoutPassword } = user;
  
  res.json({
    success: true,
    data: {
      user: userWithoutPassword,
      token: newToken,
      accessToken: newToken
    }
  });
});

app.post('/api/auth/logout', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (token) {
    tokens.delete(token);
  }
  
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// ============= ADMIN DASHBOARD =============
app.get('/api/admin/dashboard', (req, res) => {
  res.json({
    success: true,
    data: {
      totalBookings: bookings.length,
      totalCelebrities: celebrities.length,
      totalUsers: users.length,
      totalRevenue: '$' + (bookings.length * 75000).toLocaleString(),
      pendingApprovals: bookings.filter(b => b.status === 'pending').length,
      recentBookings: bookings.slice(-5),
      topCelebrities: celebrities.slice(0, 3),
      stats: {
        bookingsThisMonth: bookings.filter(b => {
          const bookingDate = new Date(b.createdAt);
          const now = new Date();
          return bookingDate.getMonth() === now.getMonth() && 
                 bookingDate.getFullYear() === now.getFullYear();
        }).length,
        avgBookingValue: bookings.length > 0 ? 75000 : 0,
        customerSatisfaction: 4.8
      }
    }
  });
});

// ============= CELEBRITY MANAGEMENT =============
app.get('/api/celebrities', async (req, res) => {
  try {
    const { category, search, availability } = req.query;
    
    let filteredCelebrities = await getCelebritiesFromDB();
    
    if (category && category !== 'all') {
      filteredCelebrities = filteredCelebrities.filter(c => c.category === category);
    }
    
    if (search) {
      filteredCelebrities = filteredCelebrities.filter(c => 
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.description.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    if (availability) {
      const isAvailable = availability === 'true';
      filteredCelebrities = filteredCelebrities.filter(c => c.availability === isAvailable);
    }
    
    res.json({
      success: true,
      data: filteredCelebrities,
      total: filteredCelebrities.length
    });
  } catch (error) {
    console.error('Get celebrities error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch celebrities'
    });
  }
});

app.get('/api/celebrities/:id', async (req, res) => {
  try {
    const celebrity = await getCelebrityFromDB(req.params.id);
    
    if (!celebrity) {
      return res.status(404).json({
        success: false,
        error: 'Celebrity not found'
      });
    }
    
    res.json({
      success: true,
      data: celebrity
    });
  } catch (error) {
    console.error('Get celebrity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch celebrity'
    });
  }
});

// Admin-only endpoints (bypassed auth for admin dashboard)
app.post('/api/admin/celebrities', upload.single('image'), async (req, res) => {
  try {
    const celebrityData = {
      ...req.body,
      image: req.file ? `/uploads/celebrities/${req.file.filename}` : req.body.image,
      availability: req.body.availability !== false
    };
    
    const newCelebrity = await createCelebrityInDB(celebrityData);
    
    res.json({
      success: true,
      data: newCelebrity,
      message: 'Celebrity added successfully'
    });
  } catch (error) {
    console.error('Add celebrity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add celebrity'
    });
  }
});

// Admin user management endpoint
app.post('/api/admin/users', async (req, res) => {
  try {
    const { name, email, role = 'user', phone, status = 'active' } = req.body;
    
    // Simulate user creation (replace with actual database logic)
    const newUser = {
      id: Date.now(),
      name,
      email,
      role,
      phone,
      status,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: newUser,
      message: 'User created successfully'
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user'
    });
  }
});

// Admin settings management endpoints
app.put('/api/admin/settings', async (req, res) => {
  try {
    const settings = req.body;
    
    // Simulate settings update (replace with actual database logic)
    const updatedSettings = {
      ...settings,
      updated_at: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: updatedSettings,
      message: 'Settings updated successfully'
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update settings'
    });
  }
});

app.get('/api/admin/settings', async (req, res) => {
  try {
    // Simulate settings fetch (replace with actual database logic)
    const settings = {
      site_name: 'Celebrity Booking Platform',
      site_description: 'Book your favorite celebrities for events',
      contact_email: 'management@bookmyreservation.org',
      support_phone: '+1-555-0123',
      booking_fee: 5.0,
      currency: 'USD',
      timezone: 'UTC',
      updated_at: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Fetch settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings'
    });
  }
});

app.post('/api/celebrities', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const celebrityData = {
      ...req.body,
      image: req.file ? `/uploads/celebrities/${req.file.filename}` : req.body.image,
      availability: req.body.availability !== false
    };
    
    const newCelebrity = await createCelebrityInDB(celebrityData);
    
    res.json({
      success: true,
      data: newCelebrity,
      message: 'Celebrity added successfully'
    });
  } catch (error) {
    console.error('Add celebrity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add celebrity'
    });
  }
});

app.put('/api/celebrities/:id', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const updateData = { ...req.body };
    if (req.file) {
      updateData.image = `/uploads/celebrities/${req.file.filename}`;
    }
    
    const updatedCelebrity = await updateCelebrityInDB(id, updateData);
    
    if (!updatedCelebrity) {
      return res.status(404).json({
        success: false,
        error: 'Celebrity not found'
      });
    }
    
    res.json({
      success: true,
      data: updatedCelebrity,
      message: 'Celebrity updated successfully'
    });
  } catch (error) {
    console.error('Update celebrity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update celebrity'
    });
  }
});

app.delete('/api/celebrities/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const deleted = await deleteCelebrityFromDB(id);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Celebrity not found'
      });
    }
    
    res.json({
      success: true,
      data: deleted,
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

// ============= BOOKING MANAGEMENT =============
app.get('/api/bookings', authenticateToken, async (req, res) => {
  try {
    const { status, celebrityId, userId, limit } = req.query;
    
    const filters = {};
    if (status && Object.values(BOOKING_STATUSES).includes(status)) {
      filters.status = status;
    }
    if (celebrityId) filters.celebrityId = celebrityId;
    if (userId) filters.userId = userId;
    
    let filteredBookings = await getBookingsFromDB(filters);
    
    if (limit) {
      filteredBookings = filteredBookings.slice(0, parseInt(limit));
    }
    
    res.json({
      success: true,
      data: filteredBookings,
      total: filteredBookings.length,
      statuses: BOOKING_STATUSES
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings'
    });
  }
});

app.get('/api/bookings/:id', authenticateToken, async (req, res) => {
  try {
    const bookings = await getBookingsFromDB();
    const booking = bookings.find(b => b.id === parseInt(req.params.id));
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
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

app.post('/api/bookings', async (req, res) => {
  try {
    const { celebrityId, eventDate, clientName, clientEmail, clientPhone, eventType, budget, message } = req.body;
    
    // Validate required fields
    if (!celebrityId || !eventDate || !clientName || !clientEmail) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: celebrityId, eventDate, clientName, clientEmail'
      });
    }

    // Validate email format
    if (!validator.isEmail(clientEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Check if celebrity exists
    const celebrity = await getCelebrityFromDB(celebrityId);
    if (!celebrity) {
      return res.status(404).json({
        success: false,
        message: 'Celebrity not found'
      });
    }

    const bookingData = {
      celebrity_id: celebrityId,
      celebrity_name: celebrity.name,
      event_date: eventDate,
      client_name: clientName,
      client_email: clientEmail,
      client_phone: clientPhone,
      event_type: eventType,
      budget: budget,
      message: message
    };

    const newBooking = await createBookingInDB(bookingData);
    
    res.json({
      success: true,
      data: newBooking,
      message: 'Booking request submitted successfully'
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create booking'
    });
  }
});

app.put('/api/bookings/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, ...updateData } = req.body;
    
    // Validate status if provided
    if (status && !Object.values(BOOKING_STATUSES).includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${Object.values(BOOKING_STATUSES).join(', ')}`
      });
    }

    const updatedBooking = await updateBookingStatusInDB(id, status, updateData);
    
    if (!updatedBooking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }
    
    res.json({
      success: true,
      data: updatedBooking,
      message: 'Booking updated successfully'
    });
  } catch (error) {
    console.error('Update booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update booking'
    });
  }
});

// Specific status update endpoints
app.patch('/api/bookings/:id/confirm', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updatedBooking = await updateBookingStatusInDB(id, BOOKING_STATUSES.CONFIRMED, {
      confirmed_at: new Date().toISOString(),
      confirmed_by: req.user.userId
    });
    
    if (!updatedBooking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }
    
    res.json({
      success: true,
      data: updatedBooking,
      message: 'Booking confirmed successfully'
    });
  } catch (error) {
    console.error('Confirm booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm booking'
    });
  }
});

app.patch('/api/bookings/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { reason } = req.body;
    
    const updatedBooking = await updateBookingStatusInDB(id, BOOKING_STATUSES.CANCELLED, {
      cancelled_at: new Date().toISOString(),
      cancelled_by: req.user.userId,
      cancellation_reason: reason
    });
    
    if (!updatedBooking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }
    
    res.json({
      success: true,
      data: updatedBooking,
      message: 'Booking cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel booking'
    });
  }
});

app.patch('/api/bookings/:id/complete', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const updatedBooking = await updateBookingStatusInDB(id, BOOKING_STATUSES.COMPLETED, {
      completed_at: new Date().toISOString(),
      completed_by: req.user.userId
    });
    
    if (!updatedBooking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }
    
    res.json({
      success: true,
      data: updatedBooking,
      message: 'Booking marked as completed'
    });
  } catch (error) {
    console.error('Complete booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete booking'
    });
  }
});

// ============= USER MANAGEMENT =============
app.get('/api/admin/users', (req, res) => {
  res.json({
    success: true,
    data: users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }),
    total: users.length
  });
});

app.post('/api/admin/users', (req, res) => {
  const { firstName, lastName, email, password, role, permissions } = req.body;
  
  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({
      success: false,
      error: 'First name, last name, email, and password are required'
    });
  }
  
  // Check if user already exists
  if (users.find(u => u.email === email)) {
    return res.status(400).json({
      success: false,
      error: 'User with this email already exists'
    });
  }
  
  const newUser = {
    id: users.length + 1,
    firstName,
    lastName,
    email,
    password, // In production, hash this password
    role: role || 'user',
    permissions: permissions || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  users.push(newUser);
  
  const { password: _, ...userWithoutPassword } = newUser;
  
  res.json({
    success: true,
    data: userWithoutPassword,
    message: 'User created successfully'
  });
});

app.put('/api/admin/users/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const userIndex = users.findIndex(u => u.id === id);
  
  if (userIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }
  
  const updates = req.body;
  delete updates.id; // Don't allow ID changes
  
  users[userIndex] = {
    ...users[userIndex],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  
  const { password: _, ...userWithoutPassword } = users[userIndex];
  
  res.json({
    success: true,
    data: userWithoutPassword,
    message: 'User updated successfully'
  });
});

app.delete('/api/admin/users/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const userIndex = users.findIndex(u => u.id === id);
  
  if (userIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }
  
  const deletedUser = users.splice(userIndex, 1)[0];
  const { password: _, ...userWithoutPassword } = deletedUser;
  
  res.json({
    success: true,
    data: userWithoutPassword,
    message: 'User deleted successfully'
  });
});

// ============= FORMS & SUBMISSIONS =============
const formSubmissions = {
  contact: [],
  representation: [],
  consultation: [],
  'service-requests': []
};

app.get('/api/admin/forms/:type', (req, res) => {
  const { type } = req.params;
  const submissions = formSubmissions[type] || [];
  
  res.json({
    success: true,
    data: submissions,
    total: submissions.length,
    message: submissions.length === 0 ? `No ${type} submissions yet` : `Found ${submissions.length} ${type} submissions`
  });
});

// Contact form submission
app.post('/api/contact', (req, res) => {
  const { name, email, phone, subject, message } = req.body;
  
  if (!name || !email || !message) {
    return res.status(400).json({
      success: false,
      error: 'Name, email, and message are required'
    });
  }
  
  const submission = {
    id: Date.now(),
    name,
    email,
    phone,
    subject,
    message,
    type: 'contact',
    status: 'new',
    createdAt: new Date().toISOString()
  };
  
  formSubmissions.contact.push(submission);
  
  res.json({
    success: true,
    data: submission,
    message: 'Contact form submitted successfully'
  });
});

// Representation request
app.post('/api/representation', (req, res) => {
  const submissionData = {
    id: Date.now(),
    ...req.body,
    type: 'representation',
    status: 'new',
    createdAt: new Date().toISOString()
  };
  
  formSubmissions.representation.push(submissionData);
  
  res.json({
    success: true,
    data: submissionData,
    message: 'Representation request submitted successfully'
  });
});

// Consultation request
app.post('/api/consultation', (req, res) => {
  const submissionData = {
    id: Date.now(),
    ...req.body,
    type: 'consultation',
    status: 'new',
    createdAt: new Date().toISOString()
  };
  
  formSubmissions.consultation.push(submissionData);
  
  res.json({
    success: true,
    data: submissionData,
    message: 'Consultation request submitted successfully'
  });
});

// Service request
app.post('/api/service-request', (req, res) => {
  const submissionData = {
    id: Date.now(),
    ...req.body,
    type: 'service-request',
    status: 'new',
    createdAt: new Date().toISOString()
  };
  
  formSubmissions['service-requests'].push(submissionData);
  
  res.json({
    success: true,
    data: submissionData,
    message: 'Service request submitted successfully'
  });
});

// ============= EMAIL SETTINGS =============
app.get('/api/email-settings/email', (req, res) => {
  res.json({
    success: true,
    data: {
      enabled: true,
      smtpHost: 'smtp.gmail.com',
      smtpPort: 587,
      fromEmail: 'management@bookmyreservation.org',
      templates: {
        welcome: 'Welcome to Celebrity Booking Platform',
        booking_confirmation: 'Your booking has been confirmed',
        booking_update: 'Your booking has been updated'
      }
    }
  });
});

// ============= AUTOMATION =============
let automationRules = [
  {
    id: 1,
    name: 'Auto-confirm bookings under $10k',
    active: true,
    condition: 'booking_amount < 10000',
    action: 'auto_confirm',
    description: 'Automatically confirm bookings with budget under $10,000',
    createdAt: new Date().toISOString(),
    lastExecuted: null,
    executionCount: 0
  },
  {
    id: 2,
    name: 'VIP customer priority',
    active: true,
    condition: 'customer_tier == "VIP"',
    action: 'priority_queue',
    description: 'Move VIP customers to priority queue',
    createdAt: new Date().toISOString(),
    lastExecuted: null,
    executionCount: 0
  },
  {
    id: 3,
    name: 'Weekend booking notification',
    active: false,
    condition: 'booking_day in ["Saturday", "Sunday"]',
    action: 'send_notification',
    description: 'Send special notifications for weekend bookings',
    createdAt: new Date().toISOString(),
    lastExecuted: null,
    executionCount: 0
  }
];

let automationLogs = [
  {
    id: 1,
    timestamp: new Date().toISOString(),
    ruleId: 1,
    rule: 'Auto-confirm bookings under $10k',
    status: 'executed',
    details: 'No matching bookings found',
    executionTime: '45ms'
  },
  {
    id: 2,
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    ruleId: 2,
    rule: 'VIP customer priority',
    status: 'executed',
    details: '2 customers moved to priority queue',
    executionTime: '23ms'
  }
];

// Handle both /api/automation/* and /api/api/automation/* (admin dashboard uses double /api)
app.get('/api/api/automation/rules', (req, res) => {
  res.json({
    success: true,
    data: automationRules,
    total: automationRules.length
  });
});

app.get('/api/automation/rules', (req, res) => {
  res.json({
    success: true,
    data: automationRules,
    total: automationRules.length
  });
});

app.post('/api/automation/rules', (req, res) => {
  const { name, condition, action, description, active } = req.body;
  
  if (!name || !condition || !action) {
    return res.status(400).json({
      success: false,
      error: 'Name, condition, and action are required'
    });
  }
  
  const newRule = {
    id: automationRules.length + 1,
    name,
    condition,
    action,
    description: description || '',
    active: active !== false,
    createdAt: new Date().toISOString(),
    lastExecuted: null,
    executionCount: 0
  };
  
  automationRules.push(newRule);
  
  res.json({
    success: true,
    data: newRule,
    message: 'Automation rule created successfully'
  });
});

app.put('/api/automation/rules/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const ruleIndex = automationRules.findIndex(r => r.id === id);
  
  if (ruleIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Automation rule not found'
    });
  }
  
  automationRules[ruleIndex] = {
    ...automationRules[ruleIndex],
    ...req.body,
    id: id,
    updatedAt: new Date().toISOString()
  };
  
  res.json({
    success: true,
    data: automationRules[ruleIndex],
    message: 'Automation rule updated successfully'
  });
});

app.delete('/api/automation/rules/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const ruleIndex = automationRules.findIndex(r => r.id === id);
  
  if (ruleIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Automation rule not found'
    });
  }
  
  const deletedRule = automationRules.splice(ruleIndex, 1)[0];
  
  res.json({
    success: true,
    data: deletedRule,
    message: 'Automation rule deleted successfully'
  });
});

app.get('/api/api/automation/logs', (req, res) => {
  res.json({
    success: true,
    data: automationLogs,
    total: automationLogs.length
  });
});

app.get('/api/automation/logs', (req, res) => {
  res.json({
    success: true,
    data: automationLogs,
    total: automationLogs.length
  });
});

app.get('/api/api/automation/metrics', (req, res) => {
  const totalRules = automationRules.length;
  const activeRules = automationRules.filter(r => r.active).length;
  const executionsToday = automationLogs.filter(log => {
    const today = new Date().toDateString();
    const logDate = new Date(log.timestamp).toDateString();
    return today === logDate;
  }).length;
  const successRate = automationLogs.length > 0 ? 
    (automationLogs.filter(log => log.status === 'executed').length / automationLogs.length) * 100 : 100;
  
  res.json({
    success: true,
    data: {
      totalRules,
      activeRules,
      executionsToday,
      successRate: Math.round(successRate)
    }
  });
});

app.get('/api/automation/metrics', (req, res) => {
  const totalRules = automationRules.length;
  const activeRules = automationRules.filter(r => r.active).length;
  const executionsToday = automationLogs.filter(log => {
    const today = new Date().toDateString();
    const logDate = new Date(log.timestamp).toDateString();
    return today === logDate;
  }).length;
  const successRate = automationLogs.length > 0 ? 
    (automationLogs.filter(log => log.status === 'executed').length / automationLogs.length) * 100 : 100;
  
  res.json({
    success: true,
    data: {
      totalRules,
      activeRules,
      executionsToday,
      successRate: Math.round(successRate)
    }
  });
});

// ============= SETTINGS & CONFIGURATION =============
let siteSettings = {
  siteName: 'Celebrity Booking Platform',
  siteDescription: 'Book the world\'s top celebrities for your events',
  contactEmail: 'management@bookmyreservation.org',
  contactPhone: '+1 (555) 123-4567',
  socialMedia: {
    twitter: 'https://twitter.com/celebritybooking',
    facebook: 'https://facebook.com/celebritybooking',
    instagram: 'https://instagram.com/celebritybooking',
    linkedin: 'https://linkedin.com/company/celebritybooking'
  },
  features: {
    cryptoPayments: true,
    liveChat: true,
    realTimeBooking: true
  },
  branding: {
    primaryColor: '#3B82F6',
    secondaryColor: '#10B981',
    logo: '/logo.png'
  }
};

app.get('/api/settings', (req, res) => {
  res.json({
    success: true,
    data: siteSettings
  });
});

app.put('/api/settings', (req, res) => {
  const updates = req.body;
  
  // Merge updates with existing settings
  siteSettings = {
    ...siteSettings,
    ...updates,
    updatedAt: new Date().toISOString()
  };
  
  res.json({
    success: true,
    data: siteSettings,
    message: 'Site settings updated successfully'
  });
});

app.post('/api/settings', (req, res) => {
  const updates = req.body;
  
  // Merge updates with existing settings
  siteSettings = {
    ...siteSettings,
    ...updates,
    updatedAt: new Date().toISOString()
  };
  
  res.json({
    success: true,
    data: siteSettings,
    message: 'Site settings saved successfully'
  });
});

app.get('/api/settings/public', (req, res) => {
  res.json({
    success: true,
    data: {
      siteName: 'Celebrity Booking Platform',
      siteDescription: 'Book the world\'s top celebrities for your events',
      contactEmail: 'management@bookmyreservation.org',
      contactPhone: '+1 (555) 123-4567',
      socialMedia: {
        twitter: 'https://twitter.com/celebritybooking',
        facebook: 'https://facebook.com/celebritybooking',
        instagram: 'https://instagram.com/celebritybooking'
      },
      features: {
        cryptoPayments: true,
        liveChat: true,
        realTimeBooking: true
      }
    }
  });
});

// Email settings endpoint for admin dashboard
app.get('/api/settings/email', (req, res) => {
  res.json({
    success: true,
    data: {
      enabled: true,
      smtpHost: 'smtp.hostinger.com',
      smtpPort: 465,
      smtpSecure: true,
      smtpUser: 'management@bookmyreservation.org',
      smtpPass: '***CONFIGURED***',
      fromEmail: 'management@bookmyreservation.org',
      templates: {
        welcome: 'Welcome to Celebrity Booking Platform',
        booking_confirmation: 'Your booking has been confirmed',
        booking_update: 'Your booking has been updated',
        password_reset: 'Password reset request'
      }
    }
  });
});

// Email settings update endpoint
app.post('/api/settings/email/update', (req, res) => {
  const { settings } = req.body;
  
  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ 
      success: false, 
      error: 'Settings object is required' 
    });
  }
  
  // Simulate successful update
  res.json({ 
    success: true, 
    message: 'Email settings updated successfully',
    updated: Object.keys(settings).length,
    note: 'Settings updated in admin interface'
  });
});

// Email test endpoint
app.post('/api/settings/email/test', (req, res) => {
  const { to, subject, message } = req.body;
  
  // Simulate email test
  setTimeout(() => {
    res.json({
      success: true,
      message: 'Test email would be sent successfully',
      to: to || 'management@bookmyreservation.org',
      note: 'This is a simulated response - actual SMTP configuration needed for real emails'
    });
  }, 1000);
});

// ============= PAYMENT METHODS MANAGEMENT =============
let paymentMethods = [
  {
    id: 1,
    name: 'Credit Card',
    type: 'card',
    enabled: true,
    icon: 'credit-card',
    description: 'Accept Visa, MasterCard, American Express',
    fees: '2.9% + $0.30 per transaction'
  },
  {
    id: 2,
    name: 'PayPal',
    type: 'paypal',
    enabled: true,
    icon: 'paypal',
    description: 'Accept PayPal payments',
    fees: '2.9% + $0.30 per transaction'
  },
  {
    id: 3,
    name: 'Bank Transfer',
    type: 'bank',
    enabled: true,
    icon: 'bank',
    description: 'Direct bank transfers',
    fees: 'No fees'
  },
  {
    id: 4,
    name: 'Cryptocurrency',
    type: 'crypto',
    enabled: true,
    icon: 'bitcoin',
    description: 'Accept Bitcoin, Ethereum, and other cryptocurrencies',
    fees: '1% network fee'
  }
];

app.get('/api/admin/payment-methods', (req, res) => {
  res.json({
    success: true,
    data: paymentMethods,
    total: paymentMethods.length
  });
});

app.post('/api/admin/payment-methods', (req, res) => {
  const { name, type, enabled, icon, description, fees } = req.body;
  
  if (!name || !type) {
    return res.status(400).json({
      success: false,
      error: 'Name and type are required'
    });
  }
  
  const newPaymentMethod = {
    id: paymentMethods.length + 1,
    name,
    type,
    enabled: enabled !== false,
    icon: icon || 'payment',
    description: description || '',
    fees: fees || 'Contact for pricing',
    createdAt: new Date().toISOString()
  };
  
  paymentMethods.push(newPaymentMethod);
  
  res.json({
    success: true,
    data: newPaymentMethod,
    message: 'Payment method added successfully'
  });
});

app.put('/api/admin/payment-methods/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const methodIndex = paymentMethods.findIndex(m => m.id === id);
  
  if (methodIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Payment method not found'
    });
  }
  
  paymentMethods[methodIndex] = {
    ...paymentMethods[methodIndex],
    ...req.body,
    id: id,
    updatedAt: new Date().toISOString()
  };
  
  res.json({
    success: true,
    data: paymentMethods[methodIndex],
    message: 'Payment method updated successfully'
  });
});

app.delete('/api/admin/payment-methods/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const methodIndex = paymentMethods.findIndex(m => m.id === id);
  
  if (methodIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Payment method not found'
    });
  }
  
  const deletedMethod = paymentMethods.splice(methodIndex, 1)[0];
  
  res.json({
    success: true,
    data: deletedMethod,
    message: 'Payment method deleted successfully'
  });
});

// ============= SERVICES MANAGEMENT =============
let services = [
  {
    id: 1,
    name: 'Celebrity Booking',
    type: 'booking',
    enabled: true,
    icon: 'star',
    description: 'Book top celebrities for your events',
    pricing: 'Starting from $10,000',
    features: ['Personal appearance', 'Meet & greet', 'Photo opportunities']
  },
  {
    id: 2,
    name: 'Event Management',
    type: 'events',
    enabled: true,
    icon: 'calendar',
    description: 'Full-service event planning and management',
    pricing: 'Custom pricing',
    features: ['Venue booking', 'Catering coordination', 'Technical support']
  },
  {
    id: 3,
    name: 'Artist Management',
    type: 'management',
    enabled: true,
    icon: 'users',
    description: 'Professional artist representation and management',
    pricing: '15% commission',
    features: ['Career guidance', 'Contract negotiation', 'PR support']
  }
];

app.get('/api/admin/services', (req, res) => {
  res.json({
    success: true,
    data: services,
    total: services.length
  });
});

app.post('/api/admin/services', (req, res) => {
  const { name, type, enabled, icon, description, pricing, features } = req.body;
  
  if (!name || !type) {
    return res.status(400).json({
      success: false,
      error: 'Name and type are required'
    });
  }
  
  const newService = {
    id: services.length + 1,
    name,
    type,
    enabled: enabled !== false,
    icon: icon || 'service',
    description: description || '',
    pricing: pricing || 'Contact for pricing',
    features: features || [],
    createdAt: new Date().toISOString()
  };
  
  services.push(newService);
  
  res.json({
    success: true,
    data: newService,
    message: 'Service added successfully'
  });
});

app.put('/api/admin/services/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const serviceIndex = services.findIndex(s => s.id === id);
  
  if (serviceIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Service not found'
    });
  }
  
  services[serviceIndex] = {
    ...services[serviceIndex],
    ...req.body,
    id: id,
    updatedAt: new Date().toISOString()
  };
  
  res.json({
    success: true,
    data: services[serviceIndex],
    message: 'Service updated successfully'
  });
});

app.delete('/api/admin/services/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const serviceIndex = services.findIndex(s => s.id === id);
  
  if (serviceIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Service not found'
    });
  }
  
  const deletedService = services.splice(serviceIndex, 1)[0];
  
  res.json({
    success: true,
    data: deletedService,
    message: 'Service deleted successfully'
  });
});

// ============= PAYMENT PROCESSING =============
app.post('/api/payments/crypto', (req, res) => {
  const { amount, currency, walletAddress } = req.body;
  
  // Simulate payment processing
  setTimeout(() => {
    res.json({
      success: true,
      data: {
        transactionId: 'tx-' + Date.now() + '-' + Math.random().toString(36).substr(2, 8),
        amount: amount,
        currency: currency || 'BTC',
        status: 'confirmed',
        blockHash: '0x' + Math.random().toString(16).substr(2, 64),
        confirmations: 3,
        timestamp: new Date().toISOString()
      },
      message: 'Payment processed successfully'
    });
  }, 1500);
});

// Crypto payment verification endpoint
app.post('/api/payments/crypto/verify', (req, res) => {
  const { transactionHash, cryptoType, amount, walletAddress } = req.body;
  
  if (!transactionHash) {
    return res.status(400).json({
      success: false,
      error: 'Transaction hash is required'
    });
  }
  
  // Simulate verification process
  setTimeout(() => {
    res.json({
      success: true,
      data: {
        transactionId: transactionHash,
        cryptoType: cryptoType,
        amount: amount,
        walletAddress: walletAddress,
        status: 'pending_verification',
        verificationTime: new Date().toISOString(),
        estimatedConfirmation: '15-30 minutes'
      },
      message: 'Payment verification initiated'
    });
  }, 1000);
});

// Admin crypto wallet management
app.get('/api/admin/crypto/wallets', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 1,
        name: "Bitcoin",
        symbol: "BTC",
        address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
        network: "Bitcoin Mainnet",
        icon: "₿",
        active: true
      },
      {
        id: 2,
        name: "Ethereum",
        symbol: "ETH",
        address: "0x742d35Cc6634C0532925a3b8D8432F7b8434331",
        network: "Ethereum Mainnet", 
        icon: "Ξ",
        active: true
      }
    ],
    total: 2
  });
});

app.post('/api/admin/crypto/wallets', (req, res) => {
  const { name, symbol, address, network, icon } = req.body;
  
  const newWallet = {
    id: Date.now(),
    name,
    symbol,
    address,
    network,
    icon,
    active: true,
    createdAt: new Date().toISOString()
  };
  
  res.json({
    success: true,
    data: newWallet,
    message: 'Crypto wallet added successfully'
  });
});

// QR code endpoints
app.get('/api/crypto/qr/:currency', (req, res) => {
  const { currency } = req.params;
  
  // In production, return actual QR code images
  res.json({
    success: true,
    data: {
      currency: currency.toUpperCase(),
      qrCodeUrl: `/images/qr/${currency}.png`,
      message: 'QR code would be generated here'
    }
  });
});

// ============= ERROR HANDLING =============
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl,
    availableEndpoints: [
      'GET /api/health',
      'GET /api/test',
      'POST /api/auth/login',
      'POST /api/auth/verify',
      'GET /api/admin/dashboard',
      'GET /api/celebrities',
      'POST /api/celebrities',
      'GET /api/bookings',
      'POST /api/bookings'
    ]
  });
});

// ============= SERVER STARTUP =============
server.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Celebrity Booking Platform - Unified Server + WebSocket');
  console.log('========================================================');
  console.log(`🌐 Server: http://localhost:${PORT}`);
  console.log(`📱 Health: http://localhost:${PORT}/api/health`);
  console.log(`🧪 Test: http://localhost:${PORT}/api/test`);
  console.log(`👤 Admin: http://localhost:${PORT}/api/admin/dashboard`);
  console.log(`🎭 Celebs: http://localhost:${PORT}/api/celebrities`);
  console.log(`📋 Bookings: http://localhost:${PORT}/api/bookings`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
  console.log(`📧 Email: ${emailService.transporter ? 'SMTP Configured' : 'Simulation Mode'}`);
  console.log(`⏰ Started: ${new Date().toISOString()}`);
  console.log('========================================================');
  console.log('✅ Ready for Admin Dashboard (port 3001) with real-time updates');
  console.log('✅ Ready for Main Frontend (port 8080) with notifications');
  console.log('✅ All endpoints unified with WebSocket support');
});