# Celebrity Booking Platform

A premium React-based celebrity booking platform with a secure admin dashboard.

## 🌟 Features

### Public Website
- 🎭 Celebrity browsing and profiles
- 🔍 Advanced search and filtering
- 💎 Luxury glassmorphism UI design
- 📱 Fully responsive design
- ⚡ Optimized performance

### Admin Dashboard (Secure)
- 🔐 Secure authentication
- 👥 Celebrity management
- ⚙️ Site settings control
- 📊 Analytics dashboard
- 🛡️ Completely separate from public site

## 🚀 Quick Start

### ⚠️ **IMPORTANT: Security Setup Required**

**Before starting the application, you MUST configure environment variables:**

```bash
# 1. Run automated setup (recommended)
npm run setup

# 2. OR manually copy environment templates
cp .env.example .env
cp backend/.env.example backend/.env  
cp admin-dashboard/.env.example admin-dashboard/.env

# 3. Edit each .env file with your actual values
# REQUIRED: Set strong passwords for ADMIN_PASSWORD and MANAGEMENT_PASSWORD
```

### Option 1: Start All Services (Recommended)

```bash
# Install all dependencies and start services
npm run fullstack:install
npm run start:all
```

This will start:
- **Frontend**: http://localhost:8080
- **Admin Dashboard**: http://localhost:3001

### Option 2: Start Individually

#### Frontend Only
```bash
npm install
npm run dev
# Available at: http://localhost:8080
```

#### Admin Dashboard Only
```bash
cd admin-dashboard
npm install
npm run dev
# Available at: http://localhost:3001
```

## 🔑 Admin Access

**Demo Credentials:**
- **URL**: http://localhost:3001
- **Email**: `admin@platform.com`
- **Password**: `admin123`

⚠️ **Change these credentials in production!**

## 📋 Available Scripts

### Main Project
```bash
npm run dev          # Start frontend development server
npm run build        # Build frontend for production
npm run preview      # Preview production build
npm run lint         # Run ESLint

# Combined scripts
npm run start:all    # Start both frontend and admin
npm run stop:all     # Stop both applications

# Admin scripts
npm run admin:install # Install admin dependencies
npm run admin:dev     # Start admin dashboard only
npm run admin:build   # Build admin for production
```

### Manual Control
```bash
# Start both services
./start-all.sh

# Stop both services
./stop-all.sh
```

## 🏗️ Project Structure

```
liquid-glow-booking-verse/
├── src/                    # Frontend source code
│   ├── components/         # React components
│   ├── pages/             # Page components
│   ├── lib/               # Utilities
│   └── hooks/             # Custom hooks
├── admin-dashboard/        # Secure admin application
│   ├── src/
│   │   ├── components/    # Admin components
│   │   ├── pages/         # Admin pages
│   │   ├── lib/           # Admin utilities
│   │   └── types/         # TypeScript types
│   └── README.md          # Admin-specific docs
├── backend/               # API server
│   ├── routes/            # API route handlers
│   ├── middleware/        # Custom middleware
│   ├── models/            # Database models
│   ├── controllers/       # Business logic
│   ├── config/            # Configuration files
│   ├── utils/             # Helper utilities
│   ├── server.js          # Main server file
│   └── package.json       # Backend dependencies
├── public/                # Static assets
├── start-all.sh           # Start both applications
├── stop-all.sh            # Stop both applications
└── README.md              # This file
```

## 🛡️ Security Architecture

### 🔒 Security Features
- **Environment Security**: All credentials in environment variables (no hardcoded secrets)
- **Input Sanitization**: DOMPurify, XSS prevention, SQL injection protection
- **Authentication**: JWT tokens with refresh, role-based access control (RBAC)
- **File Upload Security**: Type validation, size limits, virus scanning
- **CORS Protection**: Whitelist-based origin validation
- **Security Headers**: CSP, HSTS, X-Frame-Options, XSS protection
- **Rate Limiting**: Comprehensive API rate limiting
- **Secure Communications**: HTTPS enforcement, secure cookie handling

### Frontend (Public Site)
- **Port**: 8080
- **Access**: Public
- **Features**: Celebrity browsing, search, profiles
- **Security**: No admin code exposed, client-side validation

### Admin Dashboard
- **Port**: 3001
- **Access**: Admin only
- **Features**: Celebrity management, site settings
- **Security**: Separate application, JWT authentication, RBAC

### Backend API
- **Port**: 3000
- **Access**: API endpoints with authentication
- **Security**: Comprehensive middleware stack, input validation
- **Database**: Supabase with Row Level Security (RLS)

## 🎨 Tech Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + Custom glassmorphism
- **UI Components**: shadcn/ui
- **Routing**: React Router
- **State Management**: TanStack Query

### Admin Dashboard
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (minimal set)
- **Authentication**: Token-based
- **API Client**: Custom fetch wrapper

### Backend API
- **Framework**: Express.js + Node.js
- **Authentication**: JWT tokens
- **Security**: Helmet, CORS, Rate limiting
- **File Upload**: Multer + Cloudinary
- **Payment**: Stripe integration
- **Email**: Nodemailer
- **Database**: Configurable (MongoDB/PostgreSQL/MySQL)

## 📱 Responsive Design

The platform is fully responsive with breakpoints:
- **Mobile**: 320px - 767px
- **Tablet**: 768px - 1023px
- **Desktop**: 1024px - 1439px
- **Large Desktop**: 1440px+

## 🌐 Deployment

### Frontend Deployment
```bash
npm run build
# Deploy 'dist' folder to your hosting provider
```

### Admin Dashboard Deployment
```bash
npm run admin:build
# Deploy 'admin-dashboard/dist' folder to secure server
```

### Production Recommendations
1. **Separate Domains**: Deploy admin on different domain/subdomain
2. **IP Restrictions**: Limit admin access to specific IPs
3. **SSL/TLS**: Use HTTPS for both applications
4. **Environment Variables**: Set up proper env vars for production
5. **Database**: Connect to real database instead of localStorage
6. **Authentication**: Implement proper backend authentication

## 🔧 Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Environment Setup
1. Clone the repository
2. Install frontend dependencies: `npm install`
3. Install admin dependencies: `npm run admin:install`
4. Start development: `npm run start:all`

### Adding Features

#### Frontend
- Add components in `src/components/`
- Add pages in `src/pages/`
- Update routing in `src/App.tsx`

#### Admin Dashboard
- Add components in `admin-dashboard/src/components/`
- Add pages in `admin-dashboard/src/pages/`
- Update API methods in `admin-dashboard/src/lib/api.ts`

## 🚨 Troubleshooting

### Ports Already in Use
```bash
# Stop all services first
npm run stop:all

# Or manually kill processes
kill $(lsof -ti:8080)  # Frontend
kill $(lsof -ti:3001)  # Admin
```

### Admin Dashboard Not Loading
1. Ensure admin dependencies are installed: `npm run admin:install`
2. Check if port 3001 is free
3. Verify admin dashboard builds: `npm run admin:build`

### Navigation Issues
- Frontend uses React Router with `Link` components
- Ensure you're using proper navigation (`Link` not `href`)

## 📄 License

Private - Internal use only

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open pull request

---

## 🔌 Backend API Endpoints

### **Authentication** (`/api/auth`)
```bash
POST /api/auth/login          # Admin login
POST /api/auth/logout         # Admin logout  
GET  /api/auth/verify         # Verify JWT token
```

### **Celebrities** (`/api/celebrities`)
```bash
GET    /api/celebrities                    # Get all celebrities (with filtering/pagination)
GET    /api/celebrities/:id               # Get single celebrity by ID
POST   /api/celebrities                   # Create new celebrity (Admin only)
PUT    /api/celebrities/:id               # Update celebrity (Admin only)
DELETE /api/celebrities/:id               # Delete celebrity (Admin only)
POST   /api/celebrities/:id/upload-image  # Upload celebrity image (Admin only)
```

### **Services** (`/api/services`)
```bash
GET  /api/services            # Get all services with filtering
GET  /api/services/:id        # Get single service by ID
POST /api/services/request    # Request service booking
GET  /api/services/categories # Get service categories
```

### **Events** (`/api/events`)
```bash
GET  /api/events              # Get all events (with city, category, month, search filters)
GET  /api/events/:id          # Get single event by ID
POST /api/events/:id/book     # Book event tickets
POST /api/events/vip-signup   # VIP list signup
GET  /api/events/featured     # Get featured events
```

### **Management** (`/api/management`)
```bash
POST /api/management/apply        # Submit representation application
GET  /api/management/stats        # Get success metrics/statistics
GET  /api/management/testimonials # Get client testimonials
GET  /api/management/services     # Get management services offered
```

### **Bookings** (`/api/bookings`)
```bash
POST /api/bookings              # Create new booking
GET  /api/bookings              # Get bookings (Admin only)
GET  /api/bookings/:id          # Get single booking by ID
PUT  /api/bookings/:id/status   # Update booking status (Admin only)
POST /api/bookings/:id/payment  # Process payment for booking
```

### **Settings** (`/api/settings`)
```bash
GET /api/settings        # Get site settings (Admin only)
PUT /api/settings        # Update site settings (Admin only)
GET /api/settings/public # Get public site settings (non-sensitive)
```

### **Analytics** (`/api/analytics`)
```bash
GET /api/analytics/dashboard           # Get dashboard analytics data (Admin only)
GET /api/analytics/bookings            # Get booking analytics (Admin only)
GET /api/analytics/revenue             # Get revenue analytics (Admin only)
GET /api/analytics/popular-celebrities # Get popular celebrities analytics (Admin only)
```

### **System**
```bash
GET /api/health # Health check endpoint
```

---

## 🛠️ Backend Setup

### **1. Install Backend Dependencies**
```bash
cd backend
npm install
```

### **2. Environment Configuration**
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your actual values
# - Database connection strings
# - JWT secret key
# - Cloudinary credentials
# - Stripe keys
# - Email service credentials
```

### **3. Choose Your Database**

#### **Option A: MongoDB**
```bash
npm install mongoose
# Update backend/config/database.js to use MongoDB
```

#### **Option B: PostgreSQL**
```bash
npm install pg
# Update backend/config/database.js to use PostgreSQL
```

#### **Option C: MySQL**
```bash
npm install mysql2
# Update backend/config/database.js to use MySQL
```

### **4. Start Backend Server**
```bash
# Development
npm run dev

# Production
npm start
```

The backend will be available at: **http://localhost:3000**

---

## 🚀 Full Stack Development

### **Start All Services**
```bash
# Install all dependencies
npm install                # Frontend dependencies
npm run admin:install      # Admin dependencies
cd backend && npm install  # Backend dependencies

# Start everything
npm run dev          # Frontend (port 8080)
npm run admin:dev    # Admin (port 3001)
cd backend && npm run dev # Backend (port 3000)
```

### **API Integration Status**
- ✅ **Frontend**: Ready for API integration
- ✅ **Admin Dashboard**: API client configured
- ✅ **Backend Structure**: Complete with all endpoints
- ⏳ **Database Models**: Need implementation
- ⏳ **Authentication**: Need JWT implementation
- ⏳ **Payment Processing**: Need Stripe integration
- ⏳ **File Upload**: Need Cloudinary setup
- ⏳ **Email Service**: Need Nodemailer configuration

---

## 📞 Support

For support and questions:
- Check the troubleshooting section
- Review the admin dashboard README: `admin-dashboard/README.md`
- Check application logs: `tail -f frontend.log` or `tail -f admin.log`
- Backend logs: `cd backend && npm run dev`