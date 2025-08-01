# Easy Rebranding Guide

**Yes, you can change the website name and branding to anything you want!** The system is built to be completely flexible and rebrandable.

## How to Change the Website Name & Branding

### 1. Quick Name Change (5 minutes)
Simply edit the file `/src/config/branding.ts`:

```typescript
export const SITE_CONFIG = {
  name: "Your New Name Here", // Change this line
  tagline: "Your New Tagline Here",
  description: "Your new description...",
  // ... rest of config
};
```

**Examples of what you could change it to:**
- "StarConnect"
- "Celebrity Bookings Pro"
- "VIP Event Management"
- "A-List Access"
- "Premier Celebrity Services"
- "Elite Entertainment Booking"

### 2. Complete Rebranding (30 minutes)

#### Update All Text & Messaging
Edit `/src/config/branding.ts` to change:
- Company name
- Tagline and descriptions
- Contact information
- Social media links
- Business statistics
- Feature descriptions

#### Update Visual Assets
Replace these files in `/public/` folder:
- `favicon.ico` - Browser tab icon
- `logo.svg` - Main logo
- `apple-touch-icon.png` - Mobile app icon

#### Update Meta Tags & SEO
The branding config automatically updates:
- Page titles
- Meta descriptions
- Open Graph tags
- Keywords

### 3. Domain & Email Changes

#### Update Domain References
1. **Frontend**: Update `.env` file:
```env
VITE_API_URL=https://api.yournewdomain.com
VITE_SITE_URL=https://www.yournewdomain.com
```

2. **Backend**: Update environment variables:
```env
FRONTEND_URL=https://www.yournewdomain.com
ADMIN_URL=https://admin.yournewdomain.com
```

3. **Deployment configs**: Update `vercel.json` and deployment files

#### Update Email Templates
All email templates automatically use the branding config, so changing the config updates:
- Email signatures
- Company name in emails
- Contact information
- Logo references

### 4. Backend Configuration

#### Update Invoice Generation
The invoice service automatically pulls from the branding config for:
- Company name and address
- Contact information
- Logo placement

#### Update CORS Origins
In `backend/server.js`, update allowed origins:
```javascript
cors({
  origin: ['https://www.yournewdomain.com', 'https://admin.yournewdomain.com']
})
```

## Examples of Complete Rebrands

### Example 1: "StarConnect" - Luxury Focus
```typescript
export const SITE_CONFIG = {
  name: "StarConnect",
  tagline: "Exclusive Celebrity Connections",
  description: "The luxury celebrity booking platform for discerning clients and exclusive events.",
  // ... update colors to gold/black theme
};
```

### Example 2: "EventStars" - Corporate Focus
```typescript
export const SITE_CONFIG = {
  name: "EventStars",
  tagline: "Professional Celebrity Booking",
  description: "Connecting businesses with celebrities for impactful corporate events and brand partnerships.",
  // ... update colors to professional blue theme
};
```

### Example 3: "CelebHub" - Modern/Tech Focus
```typescript
export const SITE_CONFIG = {
  name: "CelebHub",
  tagline: "Smart Celebrity Matching",
  description: "AI-powered celebrity booking platform that matches your event with the perfect star.",
  // ... update colors to modern purple/neon theme
};
```

## What Changes Automatically

When you update the branding config, these update automatically:
- ✅ Website header and navigation
- ✅ Homepage hero section
- ✅ Footer information
- ✅ Email templates
- ✅ Invoice templates
- ✅ Meta tags and SEO
- ✅ Social sharing cards
- ✅ Error pages
- ✅ Loading screens

## What You Need to Change Manually

- Logo files (upload new images)
- Color scheme (update CSS variables)
- Domain name (update environment variables)
- Social media accounts (update links)
- Payment processor settings (Stripe account name)

## Testing Your Rebrand

1. **Local Testing**: Change the config and run locally to see all changes
2. **Build Test**: Run `npm run build` to ensure no errors
3. **Deploy**: Deploy to staging to test everything works
4. **Go Live**: Deploy to production with your new brand

## Professional Services

The system includes everything needed for professional rebranding:
- Consistent branding across all touchpoints
- Professional invoice templates
- Email marketing integration
- SEO optimization
- Mobile-responsive design

## Legal Considerations

Remember to update:
- Terms of Service
- Privacy Policy
- Business registration
- Domain ownership
- SSL certificates
- Payment processor account names

---

**The beauty of this system is that it's designed to be YOUR brand from day one. Change it as often as you like - the technical foundation remains solid while your brand evolves!**