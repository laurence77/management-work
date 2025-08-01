# Hostinger Email Setup Guide for BookMyReservation.org

## 🎯 Hostinger Integration Options

### Option 1: Hostinger Email API (Recommended)
**Benefits**: Direct API integration, reliable delivery, professional setup

### Option 2: Hostinger SMTP
**Benefits**: Standard email setup, works with any email client

### Option 3: Hostinger + EmailJS
**Benefits**: Easy frontend integration, no server configuration needed

## 📧 **Setup Steps with Hostinger**

### **Step 1: Domain & Email Setup**
1. **Login to Hostinger Panel**: [hpanel.hostinger.com](https://hpanel.hostinger.com)
2. **Add Domain**: Add `bookmyreservation.org` if not already added
3. **Create Email**: Create `management@bookmyreservation.org`
4. **Get Credentials**: Note down the email password

### **Step 2: Get Hostinger API Access**
1. **API Settings**: Go to Hostinger Panel → API Management
2. **Generate API Key**: Create new API key for email services
3. **API Documentation**: Check Hostinger's email API docs

### **Step 3: Hostinger SMTP Settings**
```
SMTP Server: smtp.hostinger.com (or mail.bookmyreservation.org)
Port: 587 (TLS) or 465 (SSL)
Username: management@bookmyreservation.org
Password: [your email password]
Authentication: Required
Encryption: TLS/SSL
```

## 🛠️ **Supabase Configuration**

### **Environment Variables** (Supabase Dashboard → Settings → Edge Functions)
```
HOSTINGER_API_KEY=your_hostinger_api_key
HOSTINGER_EMAIL_USERNAME=management@bookmyreservation.org
HOSTINGER_EMAIL_PASSWORD=your_email_password
```

### **Updated SQL Triggers** (Already configured for your email!)
```sql
-- Your triggers will automatically send to: management@bookmyreservation.org
-- All automation events will email you directly
```

## 🎮 **Alternative: Simple Hostinger SMTP Setup**

If you prefer a simpler approach, update the Edge Function with direct SMTP:

```typescript
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'

const client = new SMTPClient({
  connection: {
    hostname: 'smtp.hostinger.com', // or mail.bookmyreservation.org
    port: 587,
    tls: true,
    auth: {
      username: 'management@bookmyreservation.org',
      password: 'your_email_password',
    },
  },
})

await client.send({
  from: 'management@bookmyreservation.org',
  to: to,
  subject: subject,
  content: html,
  html: html,
})
```

## 📊 **What You'll Get**

### **Automated Emails to management@bookmyreservation.org:**
1. **🎉 Booking Success**: "🎉 Booking Completed Successfully: $25,000"
2. **😱 Abandoned Cart**: "😱 Booking Abandoned - Recovery Needed" 
3. **✅ Auto-Approval**: "✅ Booking Auto-Approved: Low risk booking"
4. **🚨 High Value**: "🚨 HIGH VALUE Booking: $75,000 - URGENT REVIEW"
5. **🔥 Hot Lead**: "🔥 High Interest User: 90+ seconds viewing celebrity"

### **Admin Dashboard Features:**
- **Real-time activity feed**
- **Email delivery logs** 
- **User behavior analytics**
- **Booking automation metrics**
- **Customer journey tracking**

## ⚡ **Quick Setup Commands**

After Hostinger setup, test with:
```bash
# Test high-value booking (triggers urgent email)
curl -X POST http://localhost:5678/webhook/smart-booking \
  -H "Content-Type: application/json" \
  -d '{"booking_id":"urgent123","budget":85000,"user_name":"VIP Client"}'

# Test abandoned booking (triggers recovery email)  
curl -X POST http://localhost:5678/webhook/user-behavior \
  -H "Content-Type: application/json" \
  -d '{"user_id":"test789","event":"booking_abandoned","user_email":"management@bookmyreservation.org","budget":35000}'
```

## 🎯 **Next Steps**

1. **Login to Hostinger Panel**
2. **Set up management@bookmyreservation.org email**
3. **Get SMTP credentials or API key**
4. **Deploy the updated Edge Function**
5. **Test the automation**

## 💡 **Hostinger Advantages**

- ✅ **Professional email hosting**
- ✅ **Reliable delivery rates**  
- ✅ **Custom domain email**
- ✅ **API and SMTP options**
- ✅ **Cost-effective**
- ✅ **Easy domain management**

**Ready to set this up with Hostinger?** 

**Just need:**
1. Your Hostinger login credentials
2. Domain verification (if needed)
3. Email password once created

**The system will automatically email you for every important event while showing everything in your dashboard!** 🚀