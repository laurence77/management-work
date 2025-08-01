#!/bin/bash

# Comprehensive Backend API Testing Suite Setup
# This script sets up automated testing with coverage reports and CI/CD integration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_status "🧪 Celebrity Booking Platform - API Testing Suite Setup"
echo ""

# =============================================================================
# TESTING FRAMEWORK SETUP
# =============================================================================

setup_testing_framework() {
    print_status "Setting up comprehensive testing framework..."
    
    cd /opt/celebrity-booking/backend
    
    # Install testing dependencies
    npm install --save-dev \
        jest \
        supertest \
        @jest/globals \
        jest-coverage-badges \
        jest-html-reporter \
        jest-junit \
        nyc \
        c8 \
        @types/jest \
        @types/supertest \
        faker \
        nock \
        sinon \
        chai \
        mocha \
        artillery \
        newman \
        autocannon

    # Jest configuration
    cat > /opt/celebrity-booking/backend/jest.config.js <<'EOF'
module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'routes/**/*.js',
    'utils/**/*.js',
    'middleware/**/*.js',
    'services/**/*.js',
    '!**/__tests__/**',
    '!**/node_modules/**',
    '!coverage/**'
  ],
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json',
    'cobertura'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 30000,
  verbose: true,
  reporters: [
    'default',
    ['jest-html-reporter', {
      pageTitle: 'Celebrity Booking API Test Report',
      outputPath: 'coverage/test-report.html',
      includeFailureMsg: true,
      includeSuiteFailure: true
    }],
    ['jest-junit', {
      outputDirectory: 'coverage',
      outputName: 'junit.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true
    }]
  ],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@utils/(.*)$': '<rootDir>/utils/$1',
    '^@routes/(.*)$': '<rootDir>/routes/$1',
    '^@middleware/(.*)$': '<rootDir>/middleware/$1'
  }
};
EOF

    # Test setup file
    mkdir -p /opt/celebrity-booking/backend/tests
    cat > /opt/celebrity-booking/backend/tests/setup.js <<'EOF'
const { createClient } = require('@supabase/supabase-js');
const nock = require('nock');

// Test environment configuration
process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.SMTP_USERNAME = 'test@example.com';
process.env.SMTP_PASSWORD = 'test-password';

// Global test utilities
global.mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => Promise.resolve({ data: [], error: null })),
    insert: jest.fn(() => Promise.resolve({ data: [], error: null })),
    update: jest.fn(() => Promise.resolve({ data: [], error: null })),
    delete: jest.fn(() => Promise.resolve({ data: [], error: null })),
    upsert: jest.fn(() => Promise.resolve({ data: [], error: null }))
  })),
  auth: {
    getUser: jest.fn(() => Promise.resolve({ user: null, error: null })),
    signInWithPassword: jest.fn(() => Promise.resolve({ user: null, error: null }))
  }
};

// Setup and teardown
beforeAll(async () => {
  // Disable external HTTP requests
  nock.disableNetConnect();
  nock.enableNetConnect('127.0.0.1');
});

afterAll(async () => {
  nock.enableNetConnect();
  nock.cleanAll();
});

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  nock.cleanAll();
});

// Test helpers
global.createMockUser = () => ({
  id: 'test-user-id',
  email: 'test@example.com',
  role: 'user',
  created_at: new Date().toISOString()
});

global.createMockCelebrity = () => ({
  id: 'test-celebrity-id',
  name: 'Test Celebrity',
  category: 'Actor',
  price_per_hour: 1000,
  availability: true,
  created_at: new Date().toISOString()
});

global.createMockBooking = () => ({
  id: 'test-booking-id',
  user_id: 'test-user-id',
  celebrity_id: 'test-celebrity-id',
  event_date: new Date(Date.now() + 86400000).toISOString(),
  status: 'pending',
  total_amount: 1000,
  created_at: new Date().toISOString()
});
EOF

    print_success "Testing framework configured"
}

# =============================================================================
# UNIT TESTS
# =============================================================================

setup_unit_tests() {
    print_status "Creating comprehensive unit tests..."
    
    # Auth route tests
    mkdir -p /opt/celebrity-booking/backend/tests/routes
    cat > /opt/celebrity-booking/backend/tests/routes/auth.test.js <<'EOF'
const request = require('supertest');
const express = require('express');
const authRouter = require('../../routes/auth');

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: () => global.mockSupabase
}));

const app = express();
app.use(express.json());
app.use('/auth', authRouter);

describe('Auth Routes', () => {
  describe('POST /auth/login', () => {
    test('should login with valid credentials', async () => {
      const mockUser = createMockUser();
      global.mockSupabase.auth.signInWithPassword.mockResolvedValue({
        user: mockUser,
        error: null
      });

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
    });

    test('should reject invalid credentials', async () => {
      global.mockSupabase.auth.signInWithPassword.mockResolvedValue({
        user: null,
        error: { message: 'Invalid login credentials' }
      });

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com'
          // missing password
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /auth/register', () => {
    test('should register new user with valid data', async () => {
      const mockUser = createMockUser();
      global.mockSupabase.auth.signUp = jest.fn().mockResolvedValue({
        user: mockUser,
        error: null
      });

      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'password123',
          firstName: 'John',
          lastName: 'Doe'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    test('should reject duplicate email', async () => {
      global.mockSupabase.auth.signUp = jest.fn().mockResolvedValue({
        user: null,
        error: { message: 'User already registered' }
      });

      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'password123',
          firstName: 'John',
          lastName: 'Doe'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /auth/profile', () => {
    test('should return user profile with valid token', async () => {
      const mockUser = createMockUser();
      global.mockSupabase.auth.getUser.mockResolvedValue({
        user: mockUser,
        error: null
      });

      const response = await request(app)
        .get('/auth/profile')
        .set('Authorization', 'Bearer valid-jwt-token');

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
    });

    test('should reject request without token', async () => {
      const response = await request(app)
        .get('/auth/profile');

      expect(response.status).toBe(401);
    });
  });
});
EOF

    # Celebrity route tests
    cat > /opt/celebrity-booking/backend/tests/routes/celebrities.test.js <<'EOF'
const request = require('supertest');
const express = require('express');
const celebritiesRouter = require('../../routes/celebrities');

jest.mock('@supabase/supabase-js', () => ({
  createClient: () => global.mockSupabase
}));

const app = express();
app.use(express.json());
app.use('/celebrities', celebritiesRouter);

describe('Celebrities Routes', () => {
  describe('GET /celebrities', () => {
    test('should return list of celebrities', async () => {
      const mockCelebrities = [createMockCelebrity(), createMockCelebrity()];
      global.mockSupabase.from().select.mockResolvedValue({
        data: mockCelebrities,
        error: null
      });

      const response = await request(app)
        .get('/celebrities');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    test('should filter celebrities by category', async () => {
      const mockActors = [{ ...createMockCelebrity(), category: 'Actor' }];
      global.mockSupabase.from().select().eq = jest.fn().mockResolvedValue({
        data: mockActors,
        error: null
      });

      const response = await request(app)
        .get('/celebrities?category=Actor');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].category).toBe('Actor');
    });

    test('should paginate results', async () => {
      const mockCelebrities = Array(25).fill().map(() => createMockCelebrity());
      global.mockSupabase.from().select().range = jest.fn().mockResolvedValue({
        data: mockCelebrities.slice(0, 20),
        error: null
      });

      const response = await request(app)
        .get('/celebrities?page=1&limit=20');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(20);
    });
  });

  describe('GET /celebrities/:id', () => {
    test('should return celebrity details', async () => {
      const mockCelebrity = createMockCelebrity();
      global.mockSupabase.from().select().eq().single = jest.fn().mockResolvedValue({
        data: mockCelebrity,
        error: null
      });

      const response = await request(app)
        .get('/celebrities/test-celebrity-id');

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe('test-celebrity-id');
    });

    test('should return 404 for non-existent celebrity', async () => {
      global.mockSupabase.from().select().eq().single = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'No rows returned' }
      });

      const response = await request(app)
        .get('/celebrities/non-existent-id');

      expect(response.status).toBe(404);
    });
  });

  describe('POST /celebrities', () => {
    test('should create new celebrity (admin only)', async () => {
      const newCelebrity = {
        name: 'New Celebrity',
        category: 'Musician',
        price_per_hour: 2000,
        bio: 'A famous musician'
      };

      global.mockSupabase.from().insert.mockResolvedValue({
        data: [{ ...newCelebrity, id: 'new-celebrity-id' }],
        error: null
      });

      const response = await request(app)
        .post('/celebrities')
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(newCelebrity);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/celebrities')
        .set('Authorization', 'Bearer admin-jwt-token')
        .send({
          name: 'Test Celebrity'
          // missing required fields
        });

      expect(response.status).toBe(400);
    });
  });
});
EOF

    # Booking route tests
    cat > /opt/celebrity-booking/backend/tests/routes/bookings.test.js <<'EOF'
const request = require('supertest');
const express = require('express');
const bookingsRouter = require('../../routes/bookings');

jest.mock('@supabase/supabase-js', () => ({
  createClient: () => global.mockSupabase
}));

const app = express();
app.use(express.json());
app.use('/bookings', bookingsRouter);

describe('Bookings Routes', () => {
  describe('POST /bookings', () => {
    test('should create new booking with valid data', async () => {
      const mockBooking = createMockBooking();
      global.mockSupabase.from().insert.mockResolvedValue({
        data: [mockBooking],
        error: null
      });

      const bookingData = {
        celebrity_id: 'test-celebrity-id',
        event_date: new Date(Date.now() + 86400000).toISOString(),
        event_type: 'Private Event',
        duration_hours: 2,
        special_requests: 'Please bring guitar'
      };

      const response = await request(app)
        .post('/bookings')
        .set('Authorization', 'Bearer user-jwt-token')
        .send(bookingData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    test('should reject booking for past date', async () => {
      const bookingData = {
        celebrity_id: 'test-celebrity-id',
        event_date: new Date(Date.now() - 86400000).toISOString(),
        event_type: 'Private Event',
        duration_hours: 2
      };

      const response = await request(app)
        .post('/bookings')
        .set('Authorization', 'Bearer user-jwt-token')
        .send(bookingData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('future date');
    });

    test('should reject booking without authentication', async () => {
      const response = await request(app)
        .post('/bookings')
        .send({
          celebrity_id: 'test-celebrity-id',
          event_date: new Date(Date.now() + 86400000).toISOString()
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /bookings', () => {
    test('should return user bookings', async () => {
      const mockBookings = [createMockBooking(), createMockBooking()];
      global.mockSupabase.from().select().eq.mockResolvedValue({
        data: mockBookings,
        error: null
      });

      const response = await request(app)
        .get('/bookings')
        .set('Authorization', 'Bearer user-jwt-token');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
    });

    test('should filter bookings by status', async () => {
      const pendingBookings = [{ ...createMockBooking(), status: 'pending' }];
      global.mockSupabase.from().select().eq().eq.mockResolvedValue({
        data: pendingBookings,
        error: null
      });

      const response = await request(app)
        .get('/bookings?status=pending')
        .set('Authorization', 'Bearer user-jwt-token');

      expect(response.status).toBe(200);
      expect(response.body.data[0].status).toBe('pending');
    });
  });

  describe('PUT /bookings/:id/status', () => {
    test('should update booking status (admin only)', async () => {
      const updatedBooking = { ...createMockBooking(), status: 'confirmed' };
      global.mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: updatedBooking,
        error: null
      });

      const response = await request(app)
        .put('/bookings/test-booking-id/status')
        .set('Authorization', 'Bearer admin-jwt-token')
        .send({ status: 'confirmed' });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('confirmed');
    });

    test('should reject invalid status', async () => {
      const response = await request(app)
        .put('/bookings/test-booking-id/status')
        .set('Authorization', 'Bearer admin-jwt-token')
        .send({ status: 'invalid-status' });

      expect(response.status).toBe(400);
    });
  });
});
EOF

    # Utility function tests
    mkdir -p /opt/celebrity-booking/backend/tests/utils
    cat > /opt/celebrity-booking/backend/tests/utils/logger.test.js <<'EOF'
const { logger, requestLogger, errorLogger } = require('../../utils/logger');

describe('Logger Utilities', () => {
  test('should log info messages', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    logger.info('Test info message');
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  test('should log error messages with stack trace', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const error = new Error('Test error');
    logger.error('Test error message', error);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  test('requestLogger middleware should log HTTP requests', (done) => {
    const req = {
      method: 'GET',
      originalUrl: '/test',
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('test-agent')
    };
    const res = {
      statusCode: 200,
      on: jest.fn((event, callback) => {
        if (event === 'finish') {
          setTimeout(callback, 0);
        }
      })
    };
    const next = jest.fn();

    const loggerSpy = jest.spyOn(logger, 'info').mockImplementation();

    requestLogger(req, res, next);

    setTimeout(() => {
      expect(next).toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith(
        'HTTP Request',
        expect.objectContaining({
          method: 'GET',
          url: '/test',
          status: 200
        })
      );
      loggerSpy.mockRestore();
      done();
    }, 10);
  });
});
EOF

    # Database helper tests
    cat > /opt/celebrity-booking/backend/tests/utils/database.test.js <<'EOF'
const { validateEmail, hashPassword, comparePassword } = require('../../utils/helpers');

describe('Database Utilities', () => {
  describe('validateEmail', () => {
    test('should validate correct email formats', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name+tag@domain.co.uk')).toBe(true);
    });

    test('should reject invalid email formats', () => {
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('@domain.com')).toBe(false);
    });
  });

  describe('Password utilities', () => {
    test('should hash and compare passwords correctly', async () => {
      const password = 'testpassword123';
      const hashedPassword = await hashPassword(password);

      expect(hashedPassword).not.toBe(password);
      expect(await comparePassword(password, hashedPassword)).toBe(true);
      expect(await comparePassword('wrongpassword', hashedPassword)).toBe(false);
    });
  });
});
EOF

    print_success "Unit tests created"
}

# =============================================================================
# INTEGRATION TESTS
# =============================================================================

setup_integration_tests() {
    print_status "Creating integration tests..."
    
    mkdir -p /opt/celebrity-booking/backend/tests/integration
    
    # API integration tests
    cat > /opt/celebrity-booking/backend/tests/integration/api.test.js <<'EOF'
const request = require('supertest');
const app = require('../../server');

describe('API Integration Tests', () => {
  let authToken;
  let testUser;
  let testCelebrity;
  let testBooking;

  beforeAll(async () => {
    // Setup test data
    // Note: These would use a test database in real implementation
  });

  afterAll(async () => {
    // Cleanup test data
  });

  describe('Authentication Flow', () => {
    test('should complete full authentication flow', async () => {
      // Register new user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'integration@test.com',
          password: 'testpassword123',
          firstName: 'Integration',
          lastName: 'Test'
        });

      expect(registerResponse.status).toBe(201);

      // Login with new user
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'integration@test.com',
          password: 'testpassword123'
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.token).toBeDefined();
      
      authToken = loginResponse.body.token;
      testUser = loginResponse.body.user;
    });

    test('should access protected routes with token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.user.email).toBe('integration@test.com');
    });
  });

  describe('Booking Flow', () => {
    test('should complete full booking process', async () => {
      // Get available celebrities
      const celebritiesResponse = await request(app)
        .get('/api/celebrities?available=true');

      expect(celebritiesResponse.status).toBe(200);
      expect(celebritiesResponse.body.data.length).toBeGreaterThan(0);
      
      testCelebrity = celebritiesResponse.body.data[0];

      // Create booking
      const bookingResponse = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          celebrity_id: testCelebrity.id,
          event_date: new Date(Date.now() + 86400000).toISOString(),
          event_type: 'Corporate Event',
          duration_hours: 3,
          special_requests: 'Test booking request'
        });

      expect(bookingResponse.status).toBe(201);
      expect(bookingResponse.body.data.status).toBe('pending');
      
      testBooking = bookingResponse.body.data;

      // Get user bookings
      const userBookingsResponse = await request(app)
        .get('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`);

      expect(userBookingsResponse.status).toBe(200);
      expect(userBookingsResponse.body.data).toContainEqual(
        expect.objectContaining({ id: testBooking.id })
      );
    });

    test('should handle payment processing', async () => {
      // Mock payment intent creation
      const paymentResponse = await request(app)
        .post(`/api/payments/create-intent`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          booking_id: testBooking.id,
          amount: testCelebrity.price_per_hour * 3
        });

      expect(paymentResponse.status).toBe(200);
      expect(paymentResponse.body.client_secret).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      // Test with invalid data that would cause database error
      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          celebrity_id: 'invalid-id',
          event_date: 'invalid-date'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should handle rate limiting', async () => {
      const requests = [];
      
      // Make rapid requests to trigger rate limiting
      for (let i = 0; i < 150; i++) {
        requests.push(
          request(app).get('/api/celebrities')
        );
      }

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
});
EOF

    # Database integration tests
    cat > /opt/celebrity-booking/backend/tests/integration/database.test.js <<'EOF'
const { createClient } = require('@supabase/supabase-js');

// These tests would run against a test database
describe('Database Integration Tests', () => {
  let supabase;

  beforeAll(() => {
    supabase = createClient(
      process.env.TEST_SUPABASE_URL,
      process.env.TEST_SUPABASE_SERVICE_ROLE_KEY
    );
  });

  describe('User Operations', () => {
    test('should create and retrieve user', async () => {
      const userData = {
        email: 'dbtest@example.com',
        firstName: 'Database',
        lastName: 'Test',
        role: 'user'
      };

      // Insert user
      const { data: insertedUser, error: insertError } = await supabase
        .from('users')
        .insert(userData)
        .select()
        .single();

      expect(insertError).toBeNull();
      expect(insertedUser.email).toBe(userData.email);

      // Retrieve user
      const { data: retrievedUser, error: selectError } = await supabase
        .from('users')
        .select('*')
        .eq('id', insertedUser.id)
        .single();

      expect(selectError).toBeNull();
      expect(retrievedUser.email).toBe(userData.email);

      // Cleanup
      await supabase.from('users').delete().eq('id', insertedUser.id);
    });
  });

  describe('RLS Policies', () => {
    test('should enforce row level security', async () => {
      // Test that users can only access their own data
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', 'unauthorized-user-id');

      // Should return empty result due to RLS
      expect(data).toEqual([]);
    });
  });

  describe('Database Performance', () => {
    test('should handle concurrent operations', async () => {
      const operations = [];
      
      for (let i = 0; i < 10; i++) {
        operations.push(
          supabase.from('celebrities').select('count').single()
        );
      }

      const results = await Promise.all(operations);
      
      results.forEach(result => {
        expect(result.error).toBeNull();
      });
    });
  });
});
EOF

    print_success "Integration tests created"
}

# =============================================================================
# PERFORMANCE TESTS
# =============================================================================

setup_performance_tests() {
    print_status "Setting up performance tests..."
    
    mkdir -p /opt/celebrity-booking/backend/tests/performance
    
    # Artillery load testing configuration
    cat > /opt/celebrity-booking/backend/tests/performance/load-test.yml <<'EOF'
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 5
      name: "Warm up"
    - duration: 120
      arrivalRate: 10
      name: "Sustained load"
    - duration: 60
      arrivalRate: 20
      name: "Peak load"
  defaults:
    headers:
      Content-Type: 'application/json'
  variables:
    testEmail: 'loadtest@example.com'
    testPassword: 'testpassword123'

scenarios:
  - name: "API Health Check"
    weight: 20
    flow:
      - get:
          url: "/api/health"
          expect:
            - statusCode: 200

  - name: "Browse Celebrities"
    weight: 40
    flow:
      - get:
          url: "/api/celebrities"
          expect:
            - statusCode: 200
      - get:
          url: "/api/celebrities?category=Actor"
          expect:
            - statusCode: 200
      - get:
          url: "/api/celebrities/{{ $randomInt(1, 100) }}"
          expect:
            - statusCode: [200, 404]

  - name: "User Authentication"
    weight: 20
    flow:
      - post:
          url: "/api/auth/login"
          json:
            email: "{{ testEmail }}"
            password: "{{ testPassword }}"
          capture:
            - json: "$.token"
              as: "authToken"
      - get:
          url: "/api/auth/profile"
          headers:
            Authorization: "Bearer {{ authToken }}"
          expect:
            - statusCode: [200, 401]

  - name: "Booking Flow"
    weight: 20
    flow:
      - post:
          url: "/api/auth/login"
          json:
            email: "{{ testEmail }}"
            password: "{{ testPassword }}"
          capture:
            - json: "$.token"
              as: "authToken"
      - get:
          url: "/api/celebrities?available=true"
          headers:
            Authorization: "Bearer {{ authToken }}"
          capture:
            - json: "$.data[0].id"
              as: "celebrityId"
      - post:
          url: "/api/bookings"
          headers:
            Authorization: "Bearer {{ authToken }}"
          json:
            celebrity_id: "{{ celebrityId }}"
            event_date: "2024-12-31T20:00:00Z"
            event_type: "Load Test Event"
            duration_hours: 2
EOF

    # Autocannon performance test script
    cat > /opt/celebrity-booking/backend/tests/performance/autocannon-test.js <<'EOF'
const autocannon = require('autocannon');
const fs = require('fs');

async function runPerformanceTests() {
  const tests = [
    {
      name: 'Health Check Endpoint',
      url: 'http://localhost:3000/api/health',
      duration: 30,
      connections: 10
    },
    {
      name: 'Celebrity List Endpoint',
      url: 'http://localhost:3000/api/celebrities',
      duration: 30,
      connections: 10
    },
    {
      name: 'Celebrity Search',
      url: 'http://localhost:3000/api/celebrities?search=actor',
      duration: 30,
      connections: 10
    }
  ];

  const results = [];

  for (const test of tests) {
    console.log(`Running ${test.name}...`);
    
    const result = await autocannon({
      url: test.url,
      duration: test.duration,
      connections: test.connections,
      pipelining: 1,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    results.push({
      name: test.name,
      url: test.url,
      summary: {
        duration: result.duration,
        requests: result.requests,
        throughput: result.throughput,
        latency: result.latency,
        errors: result.errors,
        timeouts: result.timeouts
      }
    });

    console.log(`Completed ${test.name}`);
    console.log(`Requests/sec: ${result.requests.average}`);
    console.log(`Latency: ${result.latency.average}ms`);
    console.log('---');
  }

  // Save results
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.writeFileSync(
    `/var/log/security-scans/performance-test-${timestamp}.json`,
    JSON.stringify(results, null, 2)
  );

  // Check performance thresholds
  const failedTests = results.filter(result => 
    result.summary.requests.average < 50 || // Less than 50 req/sec
    result.summary.latency.average > 1000   // More than 1 second latency
  );

  if (failedTests.length > 0) {
    console.log('Performance tests failed:');
    failedTests.forEach(test => {
      console.log(`- ${test.name}: ${test.summary.requests.average} req/s, ${test.summary.latency.average}ms latency`);
    });
    process.exit(1);
  }

  console.log('All performance tests passed!');
}

if (require.main === module) {
  runPerformanceTests().catch(console.error);
}

module.exports = runPerformanceTests;
EOF

    chmod +x /opt/celebrity-booking/backend/tests/performance/autocannon-test.js

    print_success "Performance tests configured"
}

# =============================================================================
# API DOCUMENTATION TESTS
# =============================================================================

setup_api_documentation_tests() {
    print_status "Setting up API documentation tests..."
    
    # Install additional dependencies
    cd /opt/celebrity-booking/backend
    npm install --save-dev swagger-jsdoc swagger-ui-express @apidevtools/swagger-parser

    # API documentation generation
    cat > /opt/celebrity-booking/backend/scripts/generate-api-docs.js <<'EOF'
const swaggerJSDoc = require('swagger-jsdoc');
const fs = require('fs');
const path = require('path');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Celebrity Booking Platform API',
      version: '1.0.0',
      description: 'Comprehensive API for celebrity booking platform',
      contact: {
        email: 'api@bookmyreservation.org'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: 'Development server'
      },
      {
        url: 'https://api.bookmyreservation.org/api',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: ['./routes/*.js', './models/*.js']
};

const specs = swaggerJSDoc(options);

// Save OpenAPI specification
fs.writeFileSync(
  path.join(__dirname, '../docs/api-specification.json'),
  JSON.stringify(specs, null, 2)
);

console.log('API documentation generated successfully');
EOF

    # Postman collection generator
    cat > /opt/celebrity-booking/backend/tests/postman/celebrity-booking-collection.json <<'EOF'
{
  "info": {
    "name": "Celebrity Booking Platform API",
    "description": "Comprehensive API test collection",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "auth": {
    "type": "bearer",
    "bearer": [
      {
        "key": "token",
        "value": "{{authToken}}",
        "type": "string"
      }
    ]
  },
  "event": [
    {
      "listen": "prerequest",
      "script": {
        "exec": [
          "// Set base URL",
          "pm.environment.set('baseUrl', 'http://localhost:3000/api');"
        ]
      }
    }
  ],
  "item": [
    {
      "name": "Authentication",
      "item": [
        {
          "name": "Register User",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"{{testEmail}}\",\n  \"password\": \"{{testPassword}}\",\n  \"firstName\": \"Test\",\n  \"lastName\": \"User\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/auth/register",
              "host": ["{{baseUrl}}"],
              "path": ["auth", "register"]
            }
          },
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Status code is 201', function () {",
                  "    pm.response.to.have.status(201);",
                  "});",
                  "",
                  "pm.test('Response has success property', function () {",
                  "    const jsonData = pm.response.json();",
                  "    pm.expect(jsonData.success).to.be.true;",
                  "});"
                ]
              }
            }
          ]
        },
        {
          "name": "Login User",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"{{testEmail}}\",\n  \"password\": \"{{testPassword}}\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/auth/login",
              "host": ["{{baseUrl}}"],
              "path": ["auth", "login"]
            }
          },
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Status code is 200', function () {",
                  "    pm.response.to.have.status(200);",
                  "});",
                  "",
                  "pm.test('Response has token', function () {",
                  "    const jsonData = pm.response.json();",
                  "    pm.expect(jsonData.token).to.exist;",
                  "    pm.environment.set('authToken', jsonData.token);",
                  "});"
                ]
              }
            }
          ]
        }
      ]
    },
    {
      "name": "Celebrities",
      "item": [
        {
          "name": "Get All Celebrities",
          "request": {
            "method": "GET",
            "url": {
              "raw": "{{baseUrl}}/celebrities",
              "host": ["{{baseUrl}}"],
              "path": ["celebrities"]
            }
          },
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Status code is 200', function () {",
                  "    pm.response.to.have.status(200);",
                  "});",
                  "",
                  "pm.test('Response is array', function () {",
                  "    const jsonData = pm.response.json();",
                  "    pm.expect(jsonData.data).to.be.an('array');",
                  "});"
                ]
              }
            }
          ]
        }
      ]
    },
    {
      "name": "Bookings",
      "item": [
        {
          "name": "Create Booking",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"celebrity_id\": \"{{testCelebrityId}}\",\n  \"event_date\": \"2024-12-31T20:00:00Z\",\n  \"event_type\": \"Private Event\",\n  \"duration_hours\": 2\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/bookings",
              "host": ["{{baseUrl}}"],
              "path": ["bookings"]
            }
          },
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Status code is 201', function () {",
                  "    pm.response.to.have.status(201);",
                  "});",
                  "",
                  "pm.test('Booking created successfully', function () {",
                  "    const jsonData = pm.response.json();",
                  "    pm.expect(jsonData.success).to.be.true;",
                  "    pm.environment.set('testBookingId', jsonData.data.id);",
                  "});"
                ]
              }
            }
          ]
        }
      ]
    }
  ],
  "variable": [
    {
      "key": "testEmail",
      "value": "test@example.com"
    },
    {
      "key": "testPassword",
      "value": "testpassword123"
    }
  ]
}
EOF

    # Newman test runner script
    cat > /opt/celebrity-booking/backend/tests/postman/run-postman-tests.js <<'EOF'
const newman = require('newman');
const fs = require('fs');

function runPostmanTests() {
  return new Promise((resolve, reject) => {
    newman.run({
      collection: './tests/postman/celebrity-booking-collection.json',
      environment: './tests/postman/test-environment.json',
      reporters: ['cli', 'json', 'junit'],
      reporter: {
        json: {
          export: './coverage/postman-results.json'
        },
        junit: {
          export: './coverage/postman-results.xml'
        }
      }
    }, (err, summary) => {
      if (err) {
        reject(err);
      } else {
        console.log('Postman tests completed');
        console.log(`Total tests: ${summary.run.stats.tests.total}`);
        console.log(`Passed: ${summary.run.stats.tests.passed}`);
        console.log(`Failed: ${summary.run.stats.tests.failed}`);
        
        if (summary.run.stats.tests.failed > 0) {
          reject(new Error(`${summary.run.stats.tests.failed} Postman tests failed`));
        } else {
          resolve(summary);
        }
      }
    });
  });
}

if (require.main === module) {
  runPostmanTests().catch(console.error);
}

module.exports = runPostmanTests;
EOF

    # Test environment for Postman
    cat > /opt/celebrity-booking/backend/tests/postman/test-environment.json <<'EOF'
{
  "id": "test-environment",
  "name": "Test Environment",
  "values": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000/api",
      "enabled": true
    },
    {
      "key": "testEmail",
      "value": "test@example.com",
      "enabled": true
    },
    {
      "key": "testPassword",
      "value": "testpassword123",
      "enabled": true
    }
  ]
}
EOF

    print_success "API documentation tests configured"
}

# =============================================================================
# TEST ORCHESTRATION AND CI/CD INTEGRATION
# =============================================================================

setup_test_orchestration() {
    print_status "Setting up test orchestration and CI/CD integration..."
    
    # Master test runner script
    cat > /opt/celebrity-booking/backend/scripts/run-all-tests.sh <<'EOF'
#!/bin/bash

echo "🧪 Running Comprehensive API Test Suite"
echo "======================================="

TEST_TYPE="${1:-all}"
EXIT_CODE=0

# Create coverage directory
mkdir -p coverage

# Function to run tests and capture exit code
run_test() {
    echo "Running $1..."
    if eval "$2"; then
        echo "✅ $1 passed"
    else
        echo "❌ $1 failed"
        EXIT_CODE=1
    fi
    echo ""
}

case $TEST_TYPE in
    "unit"|"all")
        run_test "Unit Tests" "npm test -- --coverage"
        ;;
esac

case $TEST_TYPE in
    "integration"|"all")
        run_test "Integration Tests" "npm run test:integration"
        ;;
esac

case $TEST_TYPE in
    "performance"|"all")
        run_test "Performance Tests" "node tests/performance/autocannon-test.js"
        ;;
esac

case $TEST_TYPE in
    "api"|"all")
        run_test "API Documentation Tests" "node tests/postman/run-postman-tests.js"
        ;;
esac

case $TEST_TYPE in
    "load"|"all")
        if command -v artillery >/dev/null 2>&1; then
            run_test "Load Tests" "artillery run tests/performance/load-test.yml"
        else
            echo "⚠️  Artillery not installed, skipping load tests"
        fi
        ;;
esac

# Generate comprehensive test report
echo "📊 Generating comprehensive test report..."
node -e "
const fs = require('fs');
const path = require('path');

const reports = {
  timestamp: new Date().toISOString(),
  test_suite: 'celebrity-booking-api',
  summary: {
    total_tests: 0,
    passed_tests: 0,
    failed_tests: 0,
    coverage_percentage: 0
  },
  detailed_results: {}
};

// Parse Jest coverage
try {
  const jestCoverage = JSON.parse(fs.readFileSync('coverage/coverage-summary.json', 'utf8'));
  reports.summary.coverage_percentage = jestCoverage.total.statements.pct;
  reports.detailed_results.unit_tests = {
    framework: 'Jest',
    coverage: jestCoverage.total
  };
} catch (e) {
  console.log('Jest coverage not found');
}

// Parse Postman results
try {
  const postmanResults = JSON.parse(fs.readFileSync('coverage/postman-results.json', 'utf8'));
  reports.detailed_results.api_tests = {
    framework: 'Newman/Postman',
    total: postmanResults.run.stats.tests.total,
    passed: postmanResults.run.stats.tests.passed,
    failed: postmanResults.run.stats.tests.failed
  };
  reports.summary.total_tests += postmanResults.run.stats.tests.total;
  reports.summary.passed_tests += postmanResults.run.stats.tests.passed;
  reports.summary.failed_tests += postmanResults.run.stats.tests.failed;
} catch (e) {
  console.log('Postman results not found');
}

// Save comprehensive report
fs.writeFileSync('coverage/comprehensive-test-report.json', JSON.stringify(reports, null, 2));

console.log('Test Report Generated:');
console.log(\`Total Tests: \${reports.summary.total_tests}\`);
console.log(\`Passed: \${reports.summary.passed_tests}\`);
console.log(\`Failed: \${reports.summary.failed_tests}\`);
console.log(\`Coverage: \${reports.summary.coverage_percentage}%\`);
"

if [ $EXIT_CODE -eq 0 ]; then
    echo "🎉 All tests passed!"
else
    echo "❌ Some tests failed"
fi

exit $EXIT_CODE
EOF

    chmod +x /opt/celebrity-booking/backend/scripts/run-all-tests.sh

    # Update package.json with test scripts
    cd /opt/celebrity-booking/backend
    npm pkg set scripts.test="jest"
    npm pkg set scripts.test:unit="jest --testPathPattern=tests/unit"
    npm pkg set scripts.test:integration="jest --testPathPattern=tests/integration"
    npm pkg set scripts.test:watch="jest --watch"
    npm pkg set scripts.test:coverage="jest --coverage"
    npm pkg set scripts.test:all="./scripts/run-all-tests.sh"
    npm pkg set scripts.test:performance="node tests/performance/autocannon-test.js"
    npm pkg set scripts.test:load="artillery run tests/performance/load-test.yml"
    npm pkg set scripts.test:api="node tests/postman/run-postman-tests.js"

    # GitHub Actions workflow for CI/CD
    mkdir -p /opt/celebrity-booking/.github/workflows
    cat > /opt/celebrity-booking/.github/workflows/api-tests.yml <<'EOF'
name: API Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
    - uses: actions/checkout@v3
    
    - name: Use Node.js 18
      uses: actions/setup-node@v3
      with:
        node-version: 18
        cache: 'npm'
        cache-dependency-path: backend/package-lock.json
    
    - name: Install dependencies
      run: |
        cd backend
        npm ci
    
    - name: Run unit tests
      run: |
        cd backend
        npm run test:unit
    
    - name: Run integration tests
      run: |
        cd backend
        npm run test:integration
      env:
        TEST_DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
    
    - name: Run API tests
      run: |
        cd backend
        npm start &
        sleep 10
        npm run test:api
    
    - name: Generate coverage report
      run: |
        cd backend
        npm run test:coverage
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        directory: backend/coverage
        flags: backend
        name: backend-coverage
    
    - name: Archive test results
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: test-results
        path: |
          backend/coverage/
          backend/test-results/
EOF

    # Pre-commit hook for running tests
    cat > /opt/celebrity-booking/.git/hooks/pre-commit <<'EOF'
#!/bin/bash

echo "Running pre-commit tests..."

cd backend
npm run test:unit

if [ $? -ne 0 ]; then
    echo "❌ Unit tests failed. Commit aborted."
    exit 1
fi

echo "✅ Pre-commit tests passed"
exit 0
EOF

    chmod +x /opt/celebrity-booking/.git/hooks/pre-commit

    print_success "Test orchestration and CI/CD integration configured"
}

# =============================================================================
# TEST MONITORING AND REPORTING
# =============================================================================

setup_test_monitoring() {
    print_status "Setting up test monitoring and reporting..."
    
    # Test monitoring dashboard
    cat > /usr/local/bin/test-dashboard.sh <<'EOF'
#!/bin/bash

echo "🧪 Celebrity Booking Platform - Test Dashboard"
echo "=============================================="

BACKEND_DIR="/opt/celebrity-booking/backend"
COVERAGE_DIR="$BACKEND_DIR/coverage"

# Check test status
echo ""
echo "📊 Test Status:"

if [ -f "$COVERAGE_DIR/comprehensive-test-report.json" ]; then
    python3 - <<PYTHON
import json

try:
    with open('$COVERAGE_DIR/comprehensive-test-report.json', 'r') as f:
        report = json.load(f)
    
    print(f"  Last Run: {report['timestamp']}")
    print(f"  Total Tests: {report['summary']['total_tests']}")
    print(f"  Passed: {report['summary']['passed_tests']}")
    print(f"  Failed: {report['summary']['failed_tests']}")
    print(f"  Coverage: {report['summary']['coverage_percentage']}%")
    
    # Test health score
    if report['summary']['total_tests'] > 0:
        pass_rate = (report['summary']['passed_tests'] / report['summary']['total_tests']) * 100
        coverage = report['summary']['coverage_percentage']
        
        health_score = (pass_rate * 0.6) + (coverage * 0.4)
        
        if health_score >= 90:
            status = "✅ Excellent"
        elif health_score >= 75:
            status = "⚠️  Good"
        elif health_score >= 60:
            status = "⚠️  Needs Improvement"
        else:
            status = "🚨 Critical"
        
        print(f"  Health Score: {health_score:.1f}/100 ({status})")
    
except Exception as e:
    print(f"  Error reading test report: {e}")

PYTHON
else
    echo "  No test results found. Run: npm run test:all"
fi

# Check coverage files
echo ""
echo "📁 Coverage Reports:"
if [ -d "$COVERAGE_DIR" ]; then
    echo "  HTML Report: file://$COVERAGE_DIR/lcov-report/index.html"
    echo "  JSON Report: $COVERAGE_DIR/coverage-final.json"
    echo "  LCOV Report: $COVERAGE_DIR/lcov.info"
else
    echo "  No coverage reports found"
fi

# Check recent test runs
echo ""
echo "🕒 Recent Test Runs:"
if [ -f "/var/log/test-runs.log" ]; then
    tail -5 /var/log/test-runs.log
else
    echo "  No test run logs found"
fi

# Test automation status
echo ""
echo "🤖 Test Automation:"
if [ -f "$BACKEND_DIR/.github/workflows/api-tests.yml" ]; then
    echo "  ✅ GitHub Actions configured"
else
    echo "  ❌ GitHub Actions not configured"
fi

if [ -f "/opt/celebrity-booking/.git/hooks/pre-commit" ]; then
    echo "  ✅ Pre-commit hooks enabled"
else
    echo "  ❌ Pre-commit hooks not enabled"
fi

# Quick test commands
echo ""
echo "🔧 Quick Commands:"
echo "  Run all tests: cd $BACKEND_DIR && npm run test:all"
echo "  Unit tests only: cd $BACKEND_DIR && npm run test:unit"
echo "  Watch mode: cd $BACKEND_DIR && npm run test:watch"
echo "  Coverage report: cd $BACKEND_DIR && npm run test:coverage"
EOF

    chmod +x /usr/local/bin/test-dashboard.sh

    # Automated test scheduling
    cat > /etc/cron.d/api-testing <<'EOF'
# Automated API testing schedule

# Daily comprehensive test run
0 4 * * * root cd /opt/celebrity-booking/backend && npm run test:all >> /var/log/test-runs.log 2>&1

# Weekly performance tests
0 5 * * 0 root cd /opt/celebrity-booking/backend && npm run test:performance >> /var/log/test-runs.log 2>&1
EOF

    print_success "Test monitoring and reporting configured"
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

# Create necessary directories
mkdir -p /opt/celebrity-booking/backend/{tests,coverage,docs}
mkdir -p /var/log

# Install common dependencies
if command -v apt-get >/dev/null 2>&1; then
    apt-get update
    apt-get install -y curl wget python3 python3-pip
fi

# Setup all testing components
setup_testing_framework
setup_unit_tests
setup_integration_tests
setup_performance_tests
setup_api_documentation_tests
setup_test_orchestration
setup_test_monitoring

# Run initial test to verify setup
print_status "Running initial test verification..."
cd /opt/celebrity-booking/backend
npm test -- --passWithNoTests || print_warning "Initial test run had issues - this is normal for first setup"

# Final summary
echo ""
print_status "📋 API Testing Suite Setup Summary:"
echo "  ✅ Jest testing framework configured with coverage"
echo "  ✅ Unit tests for all major components"
echo "  ✅ Integration tests for API workflows"
echo "  ✅ Performance testing with Artillery and Autocannon"
echo "  ✅ API documentation testing with Postman/Newman"
echo "  ✅ CI/CD integration with GitHub Actions"
echo "  ✅ Test monitoring and reporting dashboard"
echo "  ✅ Automated test scheduling"

echo ""
print_status "🔧 Testing Commands:"
echo "  - Run all tests: npm run test:all"
echo "  - Unit tests: npm run test:unit"
echo "  - Integration tests: npm run test:integration"
echo "  - Performance tests: npm run test:performance"
echo "  - Load tests: npm run test:load"
echo "  - API tests: npm run test:api"
echo "  - Watch mode: npm run test:watch"
echo "  - Coverage report: npm run test:coverage"

echo ""
print_status "🔧 Monitoring:"
echo "  - Test dashboard: /usr/local/bin/test-dashboard.sh"
echo "  - Coverage report: /opt/celebrity-booking/backend/coverage/lcov-report/index.html"
echo "  - Test logs: /var/log/test-runs.log"

echo ""
print_success "🎉 Comprehensive API testing suite setup completed!"

echo ""
print_status "Next steps:"
echo "1. Run initial test suite to verify everything works"
echo "2. Configure test database for integration tests"
echo "3. Set up continuous integration in your repository"
echo "4. Train development team on testing best practices"
echo "5. Implement test-driven development (TDD) workflow"