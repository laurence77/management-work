const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Basic middleware
app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:3001', 'http://localhost:5173'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mock data for testing
const mockCelebrities = [
  {
    id: 1,
    name: "Emma Watson",
    image: "https://images.unsplash.com/photo-1494790108755-2616b612b743?w=400",
    price: "$50,000 - $100,000",
    rating: 4.9,
    category: "actors",
    description: "Award-winning actress and activist"
  },
  {
    id: 2,
    name: "Ryan Reynolds",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
    price: "$75,000 - $150,000",
    rating: 4.8,
    category: "actors",
    description: "Comedian and Hollywood star"
  },
  {
    id: 3,
    name: "Taylor Swift",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400",
    price: "$200,000 - $500,000",
    rating: 5.0,
    category: "musicians",
    description: "Global music superstar"
  }
];

const mockBookings = [];
let bookingIdCounter = 1;

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Celebrity Booking Platform API is running!',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API is working perfectly!',
    data: {
      platform: 'Celebrity Booking Platform',
      features: [
        'Celebrity Browsing',
        'Booking System', 
        'Payment Processing',
        'Admin Dashboard',
        'Mobile Responsive'
      ]
    }
  });
});

// Celebrity endpoints
app.get('/api/celebrities', (req, res) => {
  const { category, search } = req.query;
  
  let celebrities = [...mockCelebrities];
  
  if (category && category !== 'all') {
    celebrities = celebrities.filter(c => c.category === category);
  }
  
  if (search) {
    celebrities = celebrities.filter(c => 
      c.name.toLowerCase().includes(search.toLowerCase())
    );
  }
  
  res.json({
    success: true,
    data: celebrities
  });
});

app.get('/api/celebrities/:id', (req, res) => {
  const celebrity = mockCelebrities.find(c => c.id === parseInt(req.params.id));
  
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
});

// Authentication endpoints
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Mock authentication
  if (email && password) {
    const userData = {
      id: 1,
      email: email,
      firstName: 'John',
      lastName: 'Doe',
      role: email.includes('admin') ? 'admin' : 'user'
    };
    
    res.json({
      success: true,
      data: {
        user: userData,
        token: 'mock-jwt-token'
      }
    });
  } else {
    res.status(400).json({
      success: false,
      error: 'Email and password required'
    });
  }
});

app.post('/api/auth/register', (req, res) => {
  const { email, password, firstName, lastName } = req.body;
  
  if (email && password && firstName && lastName) {
    const userData = {
      id: Date.now(),
      email,
      firstName,
      lastName,
      role: 'user'
    };
    
    res.json({
      success: true,
      data: {
        user: userData,
        token: 'mock-jwt-token'
      }
    });
  } else {
    res.status(400).json({
      success: false,
      error: 'All fields required'
    });
  }
});

// Booking endpoints
app.post('/api/bookings', (req, res) => {
  const bookingData = {
    id: bookingIdCounter++,
    ...req.body,
    status: 'pending_approval',
    createdAt: new Date().toISOString()
  };
  
  mockBookings.push(bookingData);
  
  res.json({
    success: true,
    data: bookingData,
    message: 'Booking request submitted successfully'
  });
});

app.get('/api/bookings', (req, res) => {
  res.json({
    success: true,
    data: mockBookings
  });
});

// Payment endpoint
app.post('/api/payments/crypto', (req, res) => {
  const { amount, currency, walletAddress } = req.body;
  
  // Mock payment processing
  setTimeout(() => {
    res.json({
      success: true,
      data: {
        transactionId: 'mock-tx-' + Date.now(),
        amount,
        currency: currency || 'BTC',
        status: 'confirmed',
        blockHash: '0x' + Math.random().toString(16).substr(2, 64)
      }
    });
  }, 2000);
});

// Admin endpoints
app.get('/api/admin/dashboard', (req, res) => {
  res.json({
    success: true,
    data: {
      totalBookings: mockBookings.length,
      totalCelebrities: mockCelebrities.length,
      totalRevenue: '$250,000',
      pendingApprovals: mockBookings.filter(b => b.status === 'pending_approval').length
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Celebrity Booking Platform Backend');
  console.log('=====================================');
  console.log(`🌐 Server running on: http://localhost:${PORT}`);
  console.log(`📱 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🧪 Test endpoint: http://localhost:${PORT}/api/test`);
  console.log(`🎭 Celebrities: http://localhost:${PORT}/api/celebrities`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log('=====================================');
});