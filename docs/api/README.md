# Celebrity Booking Platform API Documentation

## Overview

The Celebrity Booking Platform API provides a comprehensive set of endpoints for managing celebrity bookings, user authentication, and administrative functions. This RESTful API is built with modern security practices and follows OpenAPI 3.0 specifications.

## Base URL

- **Production**: `https://api.celebrity-booking.com`
- **Staging**: `https://staging-api.celebrity-booking.com`  
- **Development**: `http://localhost:8000`

## Authentication

The API uses JWT (JSON Web Tokens) for authentication with separate access and refresh tokens for enhanced security.

### Authentication Flow

1. **Login**: Send credentials to `/api/auth/login` to receive access and refresh tokens
2. **Access Token**: Include in `Authorization: Bearer <token>` header for API requests
3. **Token Refresh**: Use refresh token at `/api/auth/refresh` to get new access token
4. **Logout**: Call `/api/auth/logout` to invalidate tokens

### Token Expiration

- **Access Token**: 15 minutes
- **Refresh Token**: 7 days

## Rate Limiting

All endpoints are rate-limited to prevent abuse:

- **Authentication endpoints**: 5 requests per minute per IP
- **General API endpoints**: 100 requests per minute per user
- **Celebrity search**: 30 requests per minute per user

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Request limit per window
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Time when current window resets

## Error Handling

The API uses standard HTTP status codes and returns consistent error responses:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ],
    "timestamp": "2024-01-20T10:30:00Z",
    "requestId": "req_123456789"
  }
}
```

### Common Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Validation Error
- `429` - Rate Limit Exceeded
- `500` - Internal Server Error

## Pagination

List endpoints support cursor-based pagination:

```json
{
  "data": [...],
  "pagination": {
    "hasNextPage": true,
    "hasPreviousPage": false,
    "startCursor": "cursor_abc123",
    "endCursor": "cursor_xyz789",
    "totalCount": 150
  }
}
```

**Query Parameters:**
- `first`: Number of items to return (max 100, default 20)
- `after`: Cursor for forward pagination
- `before`: Cursor for backward pagination

## Data Formats

### Dates and Times

All timestamps are returned in ISO 8601 format with UTC timezone:
```
2024-01-20T10:30:00Z
```

### Monetary Values

All monetary amounts are represented as integers in cents (USD):
```json
{
  "basePrice": 1500000,  // $15,000.00
  "currency": "USD"
}
```

### Phone Numbers

Phone numbers are stored and returned in E.164 format:
```
+1-555-123-4567
```

## API Endpoints

### Authentication

- [POST /api/auth/register](./auth.md#register) - User registration
- [POST /api/auth/login](./auth.md#login) - User login
- [POST /api/auth/refresh](./auth.md#refresh) - Refresh access token
- [POST /api/auth/logout](./auth.md#logout) - User logout
- [POST /api/auth/forgot-password](./auth.md#forgot-password) - Password reset request
- [POST /api/auth/reset-password](./auth.md#reset-password) - Password reset confirmation
- [GET /api/auth/me](./auth.md#me) - Get current user profile

### Users

- [GET /api/users/profile](./users.md#get-profile) - Get user profile
- [PUT /api/users/profile](./users.md#update-profile) - Update user profile
- [POST /api/users/change-password](./users.md#change-password) - Change password
- [DELETE /api/users/account](./users.md#delete-account) - Delete user account

### Celebrities

- [GET /api/celebrities](./celebrities.md#list-celebrities) - List celebrities
- [GET /api/celebrities/:id](./celebrities.md#get-celebrity) - Get celebrity details
- [GET /api/celebrities/search](./celebrities.md#search-celebrities) - Search celebrities
- [GET /api/celebrities/categories](./celebrities.md#get-categories) - Get celebrity categories
- [GET /api/celebrities/:id/availability](./celebrities.md#get-availability) - Check celebrity availability

### Bookings

- [GET /api/bookings](./bookings.md#list-bookings) - List user bookings
- [POST /api/bookings](./bookings.md#create-booking) - Create new booking
- [GET /api/bookings/:id](./bookings.md#get-booking) - Get booking details
- [PUT /api/bookings/:id](./bookings.md#update-booking) - Update booking
- [DELETE /api/bookings/:id](./bookings.md#cancel-booking) - Cancel booking
- [POST /api/bookings/:id/confirm](./bookings.md#confirm-booking) - Confirm booking

### Services

- [GET /api/services](./services.md#list-services) - List available services
- [GET /api/services/:id](./services.md#get-service) - Get service details

### Contact

- [POST /api/contact](./contact.md#send-message) - Send contact message
- [GET /api/contact/inquiries](./contact.md#list-inquiries) - List contact inquiries (admin)

### Admin

- [GET /api/admin/analytics](./admin.md#get-analytics) - Get platform analytics
- [GET /api/admin/users](./admin.md#list-users) - List all users
- [GET /api/admin/bookings](./admin.md#list-all-bookings) - List all bookings
- [PUT /api/admin/celebrities/:id](./admin.md#update-celebrity) - Update celebrity (admin)
- [POST /api/admin/celebrities](./admin.md#create-celebrity) - Create celebrity (admin)

### Health & Monitoring

- [GET /api/health](./health.md#health-check) - API health check
- [GET /api/metrics](./health.md#metrics) - API metrics (admin)

## Webhooks

The platform supports webhooks for real-time event notifications:

### Supported Events

- `booking.created` - New booking created
- `booking.confirmed` - Booking confirmed by celebrity
- `booking.cancelled` - Booking cancelled
- `payment.processed` - Payment successfully processed
- `payment.failed` - Payment processing failed

### Webhook Security

Webhooks are signed using HMAC-SHA256. Verify the signature using the `X-Webhook-Signature` header:

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return signature === `sha256=${expectedSignature}`;
}
```

## SDKs and Libraries

### Official SDKs

- **JavaScript/TypeScript**: `@celebrity-booking/sdk-js`
- **Python**: `celebrity-booking-python`
- **PHP**: `celebrity-booking-php`

### Installation

```bash
npm install @celebrity-booking/sdk-js
```

```python
pip install celebrity-booking-python
```

```bash
composer require celebrity-booking/sdk-php
```

## Code Examples

### JavaScript/TypeScript

```typescript
import { CelebrityBookingClient } from '@celebrity-booking/sdk-js';

const client = new CelebrityBookingClient({
  apiKey: 'your-api-key',
  environment: 'production' // or 'staging', 'development'
});

// List celebrities
const celebrities = await client.celebrities.list({
  category: 'Actor',
  first: 10
});

// Create booking
const booking = await client.bookings.create({
  celebrityId: 'celebrity_123',
  serviceId: 'service_456',
  eventDate: '2024-12-25T18:00:00Z',
  clientInfo: {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1-555-123-4567'
  },
  eventDetails: {
    location: 'Los Angeles, CA',
    duration: 2
  }
});
```

### Python

```python
from celebrity_booking import CelebrityBookingClient

client = CelebrityBookingClient(
    api_key='your-api-key',
    environment='production'
)

# List celebrities
celebrities = client.celebrities.list(
    category='Actor',
    first=10
)

# Create booking
booking = client.bookings.create({
    'celebrity_id': 'celebrity_123',
    'service_id': 'service_456',
    'event_date': '2024-12-25T18:00:00Z',
    'client_info': {
        'name': 'John Doe',
        'email': 'john@example.com',
        'phone': '+1-555-123-4567'
    },
    'event_details': {
        'location': 'Los Angeles, CA',
        'duration': 2
    }
})
```

## Testing

### Test Environment

Use the staging environment for testing:
- **Base URL**: `https://staging-api.celebrity-booking.com`
- **Test Cards**: Use Stripe test card numbers
- **Test Data**: Sample celebrities and services available

### Test Credentials

```json
{
  "email": "test@example.com",
  "password": "test-password-123"
}
```

## Support

- **Documentation Issues**: Create an issue on GitHub
- **API Questions**: Email support@celebrity-booking.com
- **Status Page**: https://status.celebrity-booking.com
- **Community**: https://community.celebrity-booking.com

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history and breaking changes.

## OpenAPI Specification

Download the complete OpenAPI 3.0 specification:
- [JSON Format](./openapi.json)
- [YAML Format](./openapi.yaml)
- [Interactive Documentation](https://docs.celebrity-booking.com/api)

---

**Last Updated**: January 2025  
**API Version**: v1.0.0