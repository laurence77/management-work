# 🔐 Secure Deployment Guide - Environment Variables

## 🚀 **Step 1: Deploy Supabase Migrations**

**Go to Supabase SQL Editor** and run the two migrations as instructed previously.

## 🔐 **Step 2: Deploy Secure Edge Function**

### **2a. Set Environment Variables in Supabase**

1. **Go to Supabase Dashboard** → **Settings** → **Edge Functions**
2. **Add Environment Variables**:

```env
SMTP_USERNAME=management@bookmyreservation.org
SMTP_PASSWORD=[REDACTED - Use secure password]
```

### **2b. Deploy Edge Function**

**Go to Supabase Dashboard** → **Edge Functions** → **Create new function**
- **Function name**: `send-email`
- **Copy this secure code**:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const { to, subject, html, type = 'general' } = await req.json()

    // Hostinger SMTP Configuration
    const client = new SMTPClient({
      connection: {
        hostname: 'smtp.hostinger.com',
        port: 587,
        tls: true,
        auth: {
          username: Deno.env.get("SMTP_USERNAME") || 'management@bookmyreservation.org',
          password: Deno.env.get("SMTP_PASSWORD") || '',
        },
      },
    })

    // Send email via Hostinger SMTP
    await client.send({
      from: `BookMyReservation <${Deno.env.get("SMTP_USERNAME") || 'management@bookmyreservation.org'}>`,
      to: to,
      subject: subject,
      content: html,
      html: html,
    })

    await client.close()

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully via Hostinger',
        type: type,
        provider: 'hostinger_smtp',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Hostinger email sending error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        provider: 'hostinger_smtp'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})
```

## 🧪 **Step 3: Test Your Secure System**

After deployment, test with:

```bash
# Test high-value booking (sends secure email)
curl -X POST http://localhost:5678/webhook/smart-booking \
  -H "Content-Type: application/json" \
  -d '{
    "booking_id": "secure-test-456",
    "budget": 125000,
    "user_name": "Secure Test Client",
    "celebrity_name": "Premium Celebrity"
  }'
```

## 📧 **Expected Email Result**

```
Subject: 🚨 HIGH VALUE Booking Requires Review: $125,000
From: BookMyReservation <management@bookmyreservation.org>
To: management@bookmyreservation.org

HIGH VALUE BOOKING - IMMEDIATE ATTENTION REQUIRED

Booking ID: secure-test-456
User: Secure Test Client
Budget: $125,000
Celebrity: Premium Celebrity
Priority: HIGH
Action Required: Manual review and approval

[Review Booking Now]
```

## 🔒 **Security Benefits**

✅ **No hardcoded passwords** in your code
✅ **Environment variables** stored securely in Supabase
✅ **Credentials protected** from version control
✅ **Easy to update** passwords without code changes
✅ **Production-ready** security practices

## 🎮 **Admin Dashboard Features**

- **Change email addresses** from Settings → Email Settings
- **Toggle notification types** on/off
- **Test email configuration** securely
- **View all email logs** and delivery status
- **Real-time automation monitoring**

## 🎯 **What You'll Get**

Once deployed, your system will automatically send you emails for:

- 🚨 **High-value bookings** (>$50K) → Urgent review alerts
- 😱 **Abandoned bookings** → Recovery opportunities  
- ✅ **Auto-approved bookings** → Confirmation notifications
- 🔥 **High-interest users** → Sales opportunities
- 📊 **Daily summaries** → Performance reports

**Your secure, professional email automation system is ready to deploy! 🚀**

**Follow the steps above and your system will be live with enterprise-grade security! 🔐**