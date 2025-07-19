# EliteConnect Admin Dashboard

Secure admin dashboard for managing the EliteConnect celebrity booking platform.

## Features

- 🔐 Secure authentication
- 👥 Celebrity management (add, edit, delete)
- ⚙️ Site settings management
- 📊 Dashboard overview with statistics
- 📱 Responsive design

## Security

- Separate application from frontend
- Token-based authentication
- Protected routes
- No admin code exposed on public site

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Installation

1. Navigate to admin dashboard directory:
```bash
cd admin-dashboard
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

The admin dashboard will be available at: http://localhost:3001

### Building for Production

```bash
npm run build
```

## Environment Variables

Create a `.env` file in the admin-dashboard directory:

```env
VITE_API_URL=http://localhost:3000/api
```

## Default Credentials

For development, the system uses mock authentication:
- Email: `admin@eliteconnect.com`
- Password: `admin123`

**⚠️ Change these credentials in production!**

## Deployment

The admin dashboard should be deployed separately from the main website:

1. Build the application: `npm run build`
2. Deploy the `dist` folder to a secure server
3. Configure authentication with real backend API
4. Set up proper SSL/TLS encryption
5. Restrict access to admin IP addresses

## API Integration

The admin dashboard expects a REST API with the following endpoints:

### Authentication
- `POST /api/auth/login` - Admin login
- `POST /api/auth/logout` - Admin logout

### Celebrities
- `GET /api/celebrities` - Get all celebrities
- `POST /api/celebrities` - Create new celebrity
- `PUT /api/celebrities/:id` - Update celebrity
- `DELETE /api/celebrities/:id` - Delete celebrity

### Settings
- `GET /api/settings` - Get site settings
- `PUT /api/settings` - Update site settings

## Development

### Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Adding New Features

1. Add new components in `src/components/`
2. Add new pages in `src/pages/`
3. Update types in `src/types/`
4. Add API methods in `src/lib/api.ts`

## Architecture

```
admin-dashboard/
├── src/
│   ├── components/          # Reusable components
│   │   ├── ui/             # Basic UI components
│   │   ├── CelebrityManager.tsx
│   │   └── SiteSettingsManager.tsx
│   ├── pages/              # Page components
│   │   ├── Login.tsx
│   │   └── Dashboard.tsx
│   ├── lib/                # Utilities
│   │   ├── api.ts          # API client
│   │   └── utils.ts        # Helper functions
│   ├── types/              # TypeScript types
│   └── hooks/              # Custom hooks
├── public/                 # Static assets
└── dist/                   # Built application
```

## Security Best Practices

1. **Separate Deployment**: Deploy admin dashboard on different domain/subdomain
2. **IP Restrictions**: Limit access to specific IP addresses
3. **Strong Authentication**: Use strong passwords and 2FA
4. **HTTPS Only**: Always use SSL/TLS encryption
5. **Regular Updates**: Keep dependencies updated
6. **Monitoring**: Log all admin actions
7. **Backup**: Regular database backups before changes

## License

Private - Internal use only