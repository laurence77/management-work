# 🚀 Production Supabase Setup Guide

This guide walks you through creating a production Supabase project and updating all environment variables.

## Step 1: Create Production Supabase Project

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Sign in to your account

2. **Create New Project**
   - Click "New Project"
   - Organization: Select your organization
   - Project Name: `celebrity-booking-production`
   - Database Password: Use a strong password (save this!)
   - Region: Choose closest to your users
   - Pricing Plan: Select appropriate plan for production

3. **Wait for Project Creation**
   - This takes 1-2 minutes
   - Note down your project reference ID

## Step 2: Get Production Credentials

Once your project is ready:

1. **Project Settings → API**
   - Copy `Project URL`: `https://YOUR-PROJECT-ID.supabase.co`
   - Copy `anon public` key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - Copy `service_role` key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

2. **Keep these secure** - you'll need them for environment files

## Step 3: Update Environment Files

Replace the placeholder values in these files:

### `/backend/.env.production`
```bash
# Replace these lines:
SUPABASE_URL=https://YOUR-PRODUCTION-PROJECT-ID.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.YOUR-PRODUCTION-ANON-KEY
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.YOUR-PRODUCTION-SERVICE-ROLE-KEY
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.YOUR-PRODUCTION-SERVICE-KEY
```

### `/.env.production` (Main Frontend)
```bash
# Replace these lines:
VITE_SUPABASE_URL=https://YOUR-PRODUCTION-PROJECT-ID.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.YOUR-PRODUCTION-ANON-KEY
```

### `/admin-dashboard/.env.production`
```bash
# Replace these lines:
VITE_SUPABASE_URL=https://YOUR-PRODUCTION-PROJECT-ID.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.YOUR-PRODUCTION-ANON-KEY
```

## Step 4: Run Database Migrations

1. **Go to SQL Editor** in your Supabase dashboard
2. **Run the master migration**:
   - Copy contents of `/backend/migrations/000_MASTER_CONSOLIDATED.sql`
   - Paste and execute in SQL Editor

3. **Verify tables created**:
   - Check Table Editor
   - Should see: celebrities, bookings, users, site_settings, etc.

## Step 5: Configure Row Level Security (RLS)

1. **In Supabase Dashboard → Authentication → Policies**
2. **Run the RLS migration**:
   - Copy contents of `/backend/migrations/008_rbac_rls_security.sql`
   - Execute in SQL Editor

3. **Verify RLS is enabled** on all tables

## Step 6: Set up Email Edge Function

1. **Functions → Create Function**
2. **Copy email template functions**:
   - Use `/backend/migrations/015_templated_email_functions.sql`
   - Deploy to edge functions

## Step 7: Test Production Configuration

1. **Update backend environment**:
   ```bash
   cd backend
   cp .env.production .env
   npm start
   ```

2. **Test API endpoints**:
   ```bash
   curl http://localhost:3000/api/health
   ```

3. **Test database connection**:
   ```bash
   curl http://localhost:3000/api/settings/public
   ```

## Step 8: Security Checklist

- [ ] All demo/test keys replaced with production keys
- [ ] RLS policies enabled on all tables
- [ ] Service role key kept secure (server-side only)
- [ ] Anon key properly scoped for frontend use
- [ ] Database backups enabled in Supabase
- [ ] API logs monitoring enabled

## Important Security Notes

⚠️ **Never commit production keys to version control**
⚠️ **Use environment variables for all secrets**
⚠️ **Enable 2FA on your Supabase account**
⚠️ **Regularly rotate keys and passwords**
⚠️ **Monitor API usage in Supabase dashboard**

## Next Steps

After completing this setup:
1. ✅ Mark Task #33 as completed
2. 🔄 Move to Task #34: Replace demo Supabase keys
3. 🔐 Configure remaining production secrets (SMTP, Sentry, Stripe)

## Support

If you encounter issues:
- Check Supabase project logs
- Verify environment file syntax
- Test API connectivity: `curl http://localhost:3000/api/health`
- Check database migrations in Supabase dashboard