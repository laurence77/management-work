# Email Setup Guide for BookMyReservation.org

## 🎯 Your Email Configuration
- **Primary Email**: `management@bookmyreservation.org`
- **Domain**: `bookmyreservation.org`
- **All automation emails will be sent from and to this address**

## 📧 Email Service Options (Choose One)

### Option 1: Resend.com (Recommended - Free Tier)
**Benefits**: 3,000 emails/month free, easy setup, great for automation

**Setup Steps**:
1. Go to [resend.com](https://resend.com)
2. Sign up with `management@bookmyreservation.org`
3. Add your domain `bookmyreservation.org`
4. Verify domain ownership (add DNS records)
5. Get your API key
6. Update the Edge Function with your API key

**DNS Records to Add** (in your domain provider):
```
Type: TXT
Name: @
Value: resend-domain-verification=<verification-code>

Type: MX
Name: @
Value: mx1.resend.com (Priority: 10)
Value: mx2.resend.com (Priority: 20)
```

### Option 2: Gmail/Google Workspace
**Benefits**: Professional email with your domain, familiar interface

**Setup Steps**:
1. Set up Google Workspace for `bookmyreservation.org`
2. Create `management@bookmyreservation.org` mailbox
3. Generate App Password for SMTP
4. Use Gmail SMTP settings in the Edge Function

### Option 3: Domain Provider Email
**Benefits**: Often included with domain registration

**Setup Steps**:
1. Check if your domain provider offers email hosting
2. Create `management@bookmyreservation.org` mailbox
3. Get SMTP settings
4. Configure in the Edge Function

## 🛠️ Supabase Setup Steps

### 1. Create the Edge Function
```bash
# In your project directory
npx supabase functions new send-email
```

### 2. Deploy the Edge Function
Copy the content from `supabase-edge-function-send-email.js` and deploy:
```bash
npx supabase functions deploy send-email
```

### 3. Run the Email Triggers Migration
In your Supabase SQL Editor, run:
```sql
-- Copy and paste the entire content of supabase-email-triggers.sql
```

### 4. Add Environment Variables
In Supabase Dashboard → Settings → Edge Functions:
```
RESEND_API_KEY=your_resend_api_key_here
```

## 🎮 Frontend Integration

### Update API Configuration
Add to your frontend API client:
```javascript
// In src/lib/api.ts
export const automationApi = {
  getActivities: () => api.get('/automation/activities'),
  getStats: () => api.get('/automation/stats'),
  sendTestEmail: (data) => api.post('/automation/test-email', data)
};
```

### Add Backend Route
```javascript
// In backend/routes/automation.js
app.get('/api/automation/activities', async (req, res) => {
  const { data } = await supabase
    .from('automation_dashboard_view')
    .select('*')
    .order('activity_time', { ascending: false })
    .limit(100);
  
  res.json(data);
});
```

## 📊 What You'll See in Your Admin Dashboard

### Real-time Email Notifications:
1. **🎉 Booking Completed**: When users complete bookings
2. **😱 Booking Abandoned**: When users abandon carts (for recovery)
3. **✅ Auto-Approved**: Low-value bookings approved automatically
4. **🚨 High Value Alert**: Bookings >$50K requiring immediate attention
5. **🔥 High Interest User**: Users spending >60 seconds viewing celebrities

### Dashboard Views:
- **Live Activity Feed**: Real-time stream of all automation events
- **Email Log**: All emails sent with timestamps and status
- **User Behavior**: Journey analytics and conversion tracking
- **Booking Analytics**: Auto-approval rates and processing times

## ⚡ Quick Test Commands

After setup, test with:
```bash
# Test booking automation
curl -X POST http://localhost:5678/webhook/smart-booking \
  -H "Content-Type: application/json" \
  -d '{"booking_id":"test123","budget":75000,"user_name":"Test User"}'

# Test user behavior tracking  
curl -X POST http://localhost:5678/webhook/user-behavior \
  -H "Content-Type: application/json" \
  -d '{"user_id":"test456","event":"booking_abandoned","user_email":"management@bookmyreservation.org"}'
```

## 🎯 Next Steps

1. **Choose your email service** (Resend recommended)
2. **Set up domain verification** 
3. **Deploy the Supabase Edge Function**
4. **Run the SQL migrations**
5. **Test the email automation**

**Need domain login info?** 
If you need help with DNS setup or domain configuration, please share:
- Your domain registrar (GoDaddy, Namecheap, etc.)
- Access to DNS settings

The system will automatically send you emails for all important events while showing everything in your admin dashboard! 🚀