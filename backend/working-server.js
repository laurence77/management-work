const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com', 'https://admin.yourdomain.com']
    : ['http://localhost:8080', 'http://localhost:3001', 'http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Try to load auth routes
try {
  console.log('Loading auth routes...');
  app.use('/api/auth', require('./routes/auth'));
  console.log('✅ Auth routes loaded');
} catch (error) {
  console.error('❌ Error loading auth routes:', error.message);
  
  // Fallback auth endpoints
  app.post('/api/auth/register', (req, res) => {
    res.status(500).json({ success: false, message: 'Auth system unavailable' });
  });
  
  app.post('/api/auth/login', (req, res) => {
    res.status(500).json({ success: false, message: 'Auth system unavailable' });
  });
}

// Try to load other essential routes
try {
  app.use('/api/password-reset', require('./routes/password-reset'));
  console.log('✅ Password reset routes loaded');
} catch (error) {
  console.error('❌ Error loading password reset routes:', error.message);
}

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Basic error handler
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`🚀 Working server running on http://127.0.0.1:${PORT}`);
  console.log(`📱 Frontend: http://localhost:5173`);
  console.log(`🔧 Admin: http://localhost:3001`);
});

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));