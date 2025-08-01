# Stripe Production Setup Guide

## 🔐 Critical: Production Stripe Configuration

### Overview
This guide covers setting up Stripe for production payments in the Celebrity Booking Platform.

⚠️ **WARNING**: NEVER use test keys in production or commit live keys to version control.

### 1. Stripe Account Setup

**1.1 Create Production Stripe Account**
1. Log into your Stripe Dashboard: https://dashboard.stripe.com
2. Switch to "Live mode" (toggle in top left)
3. Complete account verification:
   - Business information
   - Tax information  
   - Banking details for payouts
   - Identity verification

**1.2 Enable Required Features**
- Payment Methods: Cards, digital wallets (Apple Pay, Google Pay)
- Webhooks for real-time event handling
- Customer Portal for subscription management
- Stripe Connect (if supporting marketplace features)

### 2. API Keys Configuration

**2.1 Get Production Keys**
1. In Stripe Dashboard → Developers → API Keys
2. Copy the **Publishable key** (starts with `pk_live_`)
3. Copy the **Secret key** (starts with `sk_live_`)
4. Store securely - never expose secret key client-side

**2.2 Environment Configuration**
Update your production environment files:

```bash
# Backend (.env.production)
STRIPE_SECRET_KEY=sk_live_your_actual_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_live_your_actual_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Frontend (admin-dashboard/.env.production)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_actual_publishable_key_here
```

### 3. Webhook Configuration

**3.1 Create Production Webhook**
1. Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://api.your-domain.com/api/webhooks/stripe`
3. Select events to listen for:
   ```
   payment_intent.succeeded
   payment_intent.payment_failed
   customer.subscription.created
   customer.subscription.updated
   customer.subscription.deleted
   invoice.payment_succeeded
   invoice.payment_failed
   charge.dispute.created
   ```
4. Copy the webhook signing secret

**3.2 Webhook Security**
```javascript
// backend/routes/webhooks.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

app.post('/api/webhooks/stripe', express.raw({type: 'application/json'}), (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.log(`Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      handlePaymentSuccess(event.data.object);
      break;
    case 'payment_intent.payment_failed':
      handlePaymentFailure(event.data.object);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({received: true});
});
```

### 4. Payment Security Configuration

**4.1 Enable Radar for Fraud Prevention**
1. Stripe Dashboard → Radar
2. Configure fraud rules:
   - Block payments from high-risk countries
   - Flag unusual spending patterns
   - Block payments with mismatched billing/shipping addresses
   - Set velocity limits

**4.2 3D Secure Authentication**
```javascript
// Ensure 3D Secure is used for high-value transactions
const paymentIntent = await stripe.paymentIntents.create({
  amount: 2000, // $20.00
  currency: 'usd',
  payment_method_types: ['card'],
  confirmation_method: 'manual',
  // Require 3D Secure for amounts over $100
  payment_method_options: {
    card: {
      request_three_d_secure: amount > 10000 ? 'automatic' : 'any'
    }
  }
});
```

### 5. Production Testing Checklist

**5.1 Test Payment Flow**
- [ ] Small payment ($1) with real card
- [ ] Failed payment with insufficient funds
- [ ] Refund processing
- [ ] Webhook event delivery
- [ ] Email notifications

**5.2 Security Testing**
- [ ] Verify webhook signature validation
- [ ] Test with invalid API keys (should fail)
- [ ] Verify no test keys in production code
- [ ] Check HTTPS enforcement for all payments

### 6. Monitoring & Alerting

**6.1 Stripe Dashboard Monitoring**
- Set up email alerts for:
  - Failed payments
  - Disputes/chargebacks
  - Unusual activity
  - Webhook failures

**6.2 Application Monitoring**
```javascript
// backend/utils/stripe-monitoring.js
const { captureException } = require('./sentry-config');

const monitorStripeEvent = (eventType, success, error = null) => {
  if (!success) {
    captureException(new Error(`Stripe ${eventType} failed`), {
      context: {
        stripe_event: eventType,
        error_message: error?.message
      },
      tags: {
        service: 'stripe',
        event_type: eventType
      }
    });
  }
};
```

### 7. Compliance & Legal

**7.1 PCI Compliance**
- Use Stripe Elements for card collection (PCI DSS compliant)
- Never store card details on your servers
- Use Stripe's secure vault for saved cards

**7.2 Privacy & GDPR**
- Update privacy policy to mention payment processing
- Implement data retention policies for payment data
- Provide customer data export/deletion

### 8. Production Deployment Script

```bash
#!/bin/bash
# scripts/deploy-stripe-production.sh

set -e

echo "🔐 Configuring Stripe for production..."

# Verify required environment variables
required_vars=("STRIPE_SECRET_KEY" "STRIPE_PUBLISHABLE_KEY" "STRIPE_WEBHOOK_SECRET")
for var in "${required_vars[@]}"; do
    if [[ -z "${!var}" ]]; then
        echo "❌ Error: $var is not set"
        exit 1
    fi
done

# Verify keys are production keys
if [[ $STRIPE_SECRET_KEY != sk_live_* ]]; then
    echo "❌ Error: STRIPE_SECRET_KEY must be a live key (sk_live_)"
    exit 1
fi

if [[ $STRIPE_PUBLISHABLE_KEY != pk_live_* ]]; then
    echo "❌ Error: STRIPE_PUBLISHABLE_KEY must be a live key (pk_live_)"
    exit 1
fi

echo "✅ Stripe production keys validated"

# Test Stripe connection
node -e "
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
stripe.accounts.retrieve()
  .then(account => {
    console.log('✅ Stripe connection successful');
    console.log('Account ID:', account.id);
    console.log('Country:', account.country);
    console.log('Charges enabled:', account.charges_enabled);
    console.log('Payouts enabled:', account.payouts_enabled);
  })
  .catch(err => {
    console.error('❌ Stripe connection failed:', err.message);
    process.exit(1);
  });
"

echo "🎉 Stripe production setup complete!"
```

### 9. Emergency Procedures

**9.1 Key Compromise**
If Stripe keys are compromised:
1. Immediately revoke keys in Stripe Dashboard
2. Generate new keys
3. Update environment variables
4. Deploy updated configuration
5. Monitor for unauthorized transactions

**9.2 Payment Failures**
For widespread payment failures:
1. Check Stripe Dashboard status
2. Verify webhook endpoints are responding
3. Check application logs for errors
4. Monitor Sentry for related exceptions

### 10. Performance Optimization

**10.1 Connection Pooling**
```javascript
// backend/services/stripe-service.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, {
  maxNetworkRetries: 3,
  timeout: 20000, // 20 seconds
  telemetry: false // Disable telemetry in production
});
```

**10.2 Caching Customer Data**
```javascript
// Cache customer data to reduce API calls
const getCustomer = async (customerId) => {
  const cached = await redis.get(`stripe:customer:${customerId}`);
  if (cached) return JSON.parse(cached);
  
  const customer = await stripe.customers.retrieve(customerId);
  await redis.setex(`stripe:customer:${customerId}`, 3600, JSON.stringify(customer));
  return customer;
};
```

### 11. Monthly Review Checklist

- [ ] Review payment success rates
- [ ] Check dispute/chargeback rates
- [ ] Verify webhook delivery success
- [ ] Review fraud detection effectiveness
- [ ] Update payment method support
- [ ] Check compliance with new regulations

## 🚨 Security Reminders

1. **Never commit live Stripe keys to version control**
2. **Rotate keys every 90 days**
3. **Monitor webhook signatures closely**
4. **Keep Stripe SDK updated**
5. **Regular security audits of payment flow**
6. **Implement rate limiting on payment endpoints**
7. **Use HTTPS everywhere**
8. **Validate all payment amounts server-side**

## 📞 Support Contacts

- **Stripe Support**: https://support.stripe.com
- **Payment Issues**: Monitor Stripe Dashboard
- **Integration Questions**: Stripe Documentation
- **Security Concerns**: security@stripe.com

Remember: Payment security is critical - when in doubt, consult Stripe's security best practices!