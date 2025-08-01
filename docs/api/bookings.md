# Bookings API

## Overview

The Bookings API handles the creation, management, and tracking of celebrity booking requests throughout their lifecycle.

## Booking Lifecycle

1. **Draft** - Initial booking creation
2. **Pending** - Submitted for celebrity approval
3. **Confirmed** - Accepted by celebrity
4. **In Progress** - Event is happening
5. **Completed** - Event finished successfully
6. **Cancelled** - Booking was cancelled
7. **Rejected** - Declined by celebrity

## Endpoints

### List User Bookings

Retrieve a paginated list of bookings for the authenticated user.

**Request:**
```http
GET /api/bookings?status=confirmed&first=20&after=cursor_abc123
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Query Parameters:**
- `status` (string, optional): Filter by booking status
- `celebrityId` (string, optional): Filter by celebrity
- `serviceId` (string, optional): Filter by service type
- `dateFrom` (string, optional): Filter events from date (ISO format)
- `dateTo` (string, optional): Filter events to date (ISO format)
- `sortBy` (string, optional): Sort field (`eventDate`, `createdAt`, `updatedAt`)
- `sortOrder` (string, optional): Sort order (`asc`, `desc`)
- `first` (integer, optional): Number of items (max 100, default 20)
- `after` (string, optional): Cursor for pagination

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": [
    {
      "id": "booking_123456789",
      "status": "confirmed",
      "celebrity": {
        "id": "celebrity_123456789",
        "name": "Emma Thompson",
        "profileImage": "https://cdn.celebrity-booking.com/profiles/emma-thompson.jpg"
      },
      "service": {
        "id": "service_meet_greet",
        "name": "Meet & Greet",
        "duration": 30
      },
      "eventDate": "2024-03-15T14:00:00Z",
      "eventDetails": {
        "location": "Los Angeles Convention Center",
        "address": "1201 S Figueroa St, Los Angeles, CA 90015",
        "duration": 30,
        "attendeeCount": 25,
        "requirements": ["Security clearance required", "Professional photography only"]
      },
      "clientInfo": {
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+1-555-123-4567",
        "company": "ABC Productions"
      },
      "pricing": {
        "basePrice": 2500000,
        "additionalFees": 500000,
        "totalPrice": 3000000,
        "currency": "USD",
        "deposit": 1500000,
        "balance": 1500000
      },
      "payment": {
        "status": "deposit_paid",
        "depositPaidAt": "2024-01-20T10:30:00Z",
        "balanceDueDate": "2024-03-08T00:00:00Z"
      },
      "confirmationCode": "CBP-2024-001234",
      "createdAt": "2024-01-20T10:30:00Z",
      "updatedAt": "2024-01-20T11:45:00Z"
    }
  ],
  "pagination": {
    "hasNextPage": true,
    "hasPreviousPage": false,
    "startCursor": "cursor_abc123",
    "endCursor": "cursor_xyz789",
    "totalCount": 7
  }
}
```

### Create Booking

Create a new celebrity booking request.

**Request:**
```http
POST /api/bookings
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "celebrityId": "celebrity_123456789",
  "serviceId": "service_meet_greet",
  "eventDate": "2024-03-15T14:00:00Z",
  "clientInfo": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1-555-123-4567",
    "company": "ABC Productions"
  },
  "eventDetails": {
    "location": "Los Angeles Convention Center",
    "address": "1201 S Figueroa St, Los Angeles, CA 90015",
    "city": "Los Angeles",
    "state": "CA",
    "zipCode": "90015",
    "country": "USA",
    "duration": 30,
    "attendeeCount": 25,
    "eventType": "corporate",
    "description": "Annual company awards ceremony meet and greet session",
    "requirements": ["Security clearance required", "Professional photography only"],
    "specialInstructions": "Please arrive 30 minutes early for setup"
  },
  "additionalServices": [
    {
      "type": "photography",
      "description": "Professional event photography",
      "price": 100000
    }
  ],
  "emergencyContact": {
    "name": "Jane Smith",
    "phone": "+1-555-987-6543",
    "relationship": "Event Coordinator"
  }
}
```

**Response:**
```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "id": "booking_123456789",
  "status": "draft",
  "celebrity": {
    "id": "celebrity_123456789",
    "name": "Emma Thompson",
    "profileImage": "https://cdn.celebrity-booking.com/profiles/emma-thompson.jpg"
  },
  "service": {
    "id": "service_meet_greet",
    "name": "Meet & Greet",
    "duration": 30
  },
  "eventDate": "2024-03-15T14:00:00Z",
  "eventDetails": {
    "location": "Los Angeles Convention Center",
    "address": "1201 S Figueroa St, Los Angeles, CA 90015",
    "city": "Los Angeles",
    "state": "CA",
    "zipCode": "90015",
    "country": "USA",
    "duration": 30,
    "attendeeCount": 25,
    "eventType": "corporate",
    "description": "Annual company awards ceremony meet and greet session",
    "requirements": ["Security clearance required", "Professional photography only"],
    "specialInstructions": "Please arrive 30 minutes early for setup"
  },
  "clientInfo": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1-555-123-4567",
    "company": "ABC Productions"
  },
  "pricing": {
    "basePrice": 2500000,
    "additionalServices": 100000,
    "travelExpenses": 300000,
    "securityFees": 200000,
    "serviceFee": 150000,
    "totalPrice": 3250000,
    "currency": "USD",
    "deposit": 1625000,
    "balance": 1625000,
    "breakdown": [
      {
        "type": "base",
        "description": "Meet & Greet service",
        "amount": 2500000
      },
      {
        "type": "additional",
        "description": "Professional photography",
        "amount": 100000
      },
      {
        "type": "travel",
        "description": "Travel expenses",
        "amount": 300000
      },
      {
        "type": "security",
        "description": "Security requirements",
        "amount": 200000
      },
      {
        "type": "service",
        "description": "Platform service fee",
        "amount": 150000
      }
    ]
  },
  "payment": {
    "status": "pending",
    "depositDueDate": "2024-01-27T00:00:00Z",
    "balanceDueDate": "2024-03-08T00:00:00Z"
  },
  "confirmationCode": "CBP-2024-001234",
  "expiresAt": "2024-01-27T10:30:00Z",
  "createdAt": "2024-01-20T10:30:00Z",
  "updatedAt": "2024-01-20T10:30:00Z"
}
```

### Get Booking Details

Retrieve detailed information about a specific booking.

**Request:**
```http
GET /api/bookings/booking_123456789
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": "booking_123456789",
  "status": "confirmed",
  "celebrity": {
    "id": "celebrity_123456789",
    "name": "Emma Thompson",
    "profileImage": "https://cdn.celebrity-booking.com/profiles/emma-thompson.jpg",
    "category": "Actor",
    "managementContact": {
      "name": "Celebrity Management Ltd",
      "email": "bookings@celebritymanagement.com",
      "phone": "+44-20-7123-4567"
    }
  },
  "service": {
    "id": "service_meet_greet",
    "name": "Meet & Greet",
    "description": "Personal meeting with photo opportunities",
    "duration": 30,
    "requirements": ["Security clearance", "Photo release"],
    "included": ["Professional photos", "Autographed item", "Certificate"]
  },
  "eventDate": "2024-03-15T14:00:00Z",
  "eventDetails": {
    "location": "Los Angeles Convention Center",
    "address": "1201 S Figueroa St, Los Angeles, CA 90015",
    "city": "Los Angeles",
    "state": "CA",
    "zipCode": "90015",
    "country": "USA",
    "coordinates": {
      "latitude": 34.0522,
      "longitude": -118.2437
    },
    "duration": 30,
    "attendeeCount": 25,
    "eventType": "corporate",
    "description": "Annual company awards ceremony meet and greet session",
    "requirements": ["Security clearance required", "Professional photography only"],
    "specialInstructions": "Please arrive 30 minutes early for setup",
    "setupTime": "2024-03-15T13:30:00Z",
    "startTime": "2024-03-15T14:00:00Z",
    "endTime": "2024-03-15T14:30:00Z"
  },
  "clientInfo": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1-555-123-4567",
    "company": "ABC Productions",
    "title": "Event Director"
  },
  "emergencyContact": {
    "name": "Jane Smith",
    "phone": "+1-555-987-6543",
    "relationship": "Event Coordinator"
  },
  "pricing": {
    "basePrice": 2500000,
    "additionalServices": 100000,
    "travelExpenses": 300000,
    "securityFees": 200000,
    "serviceFee": 150000,
    "totalPrice": 3250000,
    "currency": "USD",
    "deposit": 1625000,
    "balance": 1625000,
    "breakdown": [
      {
        "type": "base",
        "description": "Meet & Greet service",
        "amount": 2500000
      },
      {
        "type": "additional",
        "description": "Professional photography",
        "amount": 100000
      },
      {
        "type": "travel",
        "description": "Travel expenses",
        "amount": 300000
      },
      {
        "type": "security",
        "description": "Security requirements",
        "amount": 200000
      },
      {
        "type": "service",
        "description": "Platform service fee",
        "amount": 150000
      }
    ]
  },
  "payment": {
    "status": "deposit_paid",
    "depositPaidAt": "2024-01-20T10:30:00Z",
    "balanceDueDate": "2024-03-08T00:00:00Z",
    "paymentMethod": "credit_card",
    "transactions": [
      {
        "id": "txn_123456789",
        "type": "deposit",
        "amount": 1625000,
        "status": "completed",
        "paidAt": "2024-01-20T10:30:00Z",
        "paymentMethod": "credit_card"
      }
    ]
  },
  "documents": [
    {
      "id": "doc_contract_123",
      "type": "contract",
      "name": "Booking Contract",
      "url": "https://docs.celebrity-booking.com/contracts/booking_123456789.pdf",
      "signedAt": "2024-01-20T11:45:00Z"
    },
    {
      "id": "doc_rider_123",
      "type": "rider",
      "name": "Technical Rider",
      "url": "https://docs.celebrity-booking.com/riders/celebrity_123456789.pdf"
    }
  ],
  "timeline": [
    {
      "status": "draft",
      "timestamp": "2024-01-20T10:30:00Z",
      "note": "Booking created"
    },
    {
      "status": "pending",
      "timestamp": "2024-01-20T10:35:00Z",
      "note": "Submitted for celebrity approval"
    },
    {
      "status": "confirmed",
      "timestamp": "2024-01-20T11:45:00Z",
      "note": "Confirmed by celebrity management"
    }
  ],
  "cancellationPolicy": {
    "freeUntil": "2024-02-14T00:00:00Z",
    "partialRefund": {
      "until": "2024-03-01T00:00:00Z",
      "percentage": 50
    },
    "noRefund": "2024-03-08T00:00:00Z"
  },
  "confirmationCode": "CBP-2024-001234",
  "createdAt": "2024-01-20T10:30:00Z",
  "updatedAt": "2024-01-20T11:45:00Z"
}
```

### Update Booking

Update booking details (only available for draft bookings).

**Request:**
```http
PUT /api/bookings/booking_123456789
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "eventDate": "2024-03-16T14:00:00Z",
  "eventDetails": {
    "attendeeCount": 30,
    "specialInstructions": "Please arrive 45 minutes early for extended setup"
  },
  "clientInfo": {
    "company": "ABC Productions Inc."
  }
}
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": "booking_123456789",
  "status": "draft",
  "eventDate": "2024-03-16T14:00:00Z",
  "eventDetails": {
    "location": "Los Angeles Convention Center",
    "address": "1201 S Figueroa St, Los Angeles, CA 90015",
    "duration": 30,
    "attendeeCount": 30,
    "specialInstructions": "Please arrive 45 minutes early for extended setup"
  },
  "clientInfo": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1-555-123-4567",
    "company": "ABC Productions Inc."
  },
  "updatedAt": "2024-01-20T12:00:00Z"
}
```

### Cancel Booking

Cancel a booking request.

**Request:**
```http
DELETE /api/bookings/booking_123456789
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "reason": "Event postponed indefinitely",
  "requestRefund": true
}
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": "booking_123456789",
  "status": "cancelled",
  "cancellation": {
    "reason": "Event postponed indefinitely",
    "cancelledAt": "2024-01-20T12:15:00Z",
    "cancelledBy": "client",
    "refund": {
      "eligible": true,
      "amount": 1625000,
      "percentage": 100,
      "processedAt": null,
      "estimatedProcessingTime": "3-5 business days"
    }
  },
  "updatedAt": "2024-01-20T12:15:00Z"
}
```

### Confirm Booking

Submit booking for celebrity approval (move from draft to pending).

**Request:**
```http
POST /api/bookings/booking_123456789/confirm
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "agreedToTerms": true,
  "paymentMethodId": "pm_1234567890abcdef"
}
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": "booking_123456789",
  "status": "pending",
  "payment": {
    "status": "deposit_paid",
    "depositPaidAt": "2024-01-20T12:30:00Z",
    "balanceDueDate": "2024-03-08T00:00:00Z"
  },
  "estimatedResponseTime": "24-48 hours",
  "confirmationCode": "CBP-2024-001234",
  "updatedAt": "2024-01-20T12:30:00Z"
}
```

## Booking Status Transitions

| From | To | Conditions |
|------|-------|------------|
| Draft | Pending | Payment submitted, terms agreed |
| Draft | Cancelled | User cancellation |
| Pending | Confirmed | Celebrity approval |
| Pending | Rejected | Celebrity decline |
| Pending | Cancelled | User cancellation |
| Confirmed | In Progress | Event start time |
| Confirmed | Cancelled | Cancellation request |
| In Progress | Completed | Event end time |
| In Progress | Cancelled | Emergency cancellation |

## Error Responses

### Booking Not Found
```http
HTTP/1.1 404 Not Found
Content-Type: application/json

{
  "error": {
    "code": "BOOKING_NOT_FOUND",
    "message": "Booking not found"
  }
}
```

### Invalid Status Transition
```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": {
    "code": "INVALID_STATUS_TRANSITION",
    "message": "Cannot update confirmed booking",
    "currentStatus": "confirmed",
    "allowedActions": ["cancel"]
  }
}
```

### Celebrity Unavailable
```http
HTTP/1.1 409 Conflict
Content-Type: application/json

{
  "error": {
    "code": "CELEBRITY_UNAVAILABLE",
    "message": "Celebrity is not available for the selected date",
    "conflictingBooking": {
      "date": "2024-03-15T14:00:00Z",
      "reason": "Prior commitment"
    },
    "alternativeDates": [
      "2024-03-16T14:00:00Z",
      "2024-03-17T14:00:00Z"
    ]
  }
}
```

## Code Examples

### Create a Booking

```typescript
async function createBooking(bookingData: any) {
  const response = await fetch('/api/bookings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(bookingData)
  });

  if (response.ok) {
    return response.json();
  } else {
    const error = await response.json();
    throw new Error(error.error.message);
  }
}

// Usage
const booking = await createBooking({
  celebrityId: 'celebrity_123456789',
  serviceId: 'service_meet_greet',
  eventDate: '2024-03-15T14:00:00Z',
  clientInfo: {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1-555-123-4567'
  },
  eventDetails: {
    location: 'Los Angeles Convention Center',
    duration: 30,
    attendeeCount: 25
  }
});
```

### Submit Booking for Approval

```typescript
async function confirmBooking(bookingId: string, paymentMethodId: string) {
  const response = await fetch(`/api/bookings/${bookingId}/confirm`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      agreedToTerms: true,
      paymentMethodId
    })
  });

  return response.json();
}

// Usage
const confirmedBooking = await confirmBooking(
  'booking_123456789',
  'pm_1234567890abcdef'
);

console.log('Booking submitted for approval!');
console.log('Status:', confirmedBooking.status);
console.log('Estimated response time:', confirmedBooking.estimatedResponseTime);
```

### Track Booking Status

```typescript
async function getBookingStatus(bookingId: string) {
  const response = await fetch(`/api/bookings/${bookingId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  const booking = await response.json();
  return {
    status: booking.status,
    timeline: booking.timeline,
    nextSteps: getNextSteps(booking.status)
  };
}

function getNextSteps(status: string): string[] {
  switch (status) {
    case 'draft':
      return ['Complete booking details', 'Submit for approval'];
    case 'pending':
      return ['Wait for celebrity response', 'Check status in 24-48 hours'];
    case 'confirmed':
      return ['Pay remaining balance', 'Prepare for event'];
    case 'in_progress':
      return ['Event is happening', 'Enjoy the experience!'];
    case 'completed':
      return ['Leave a review', 'Book again'];
    default:
      return [];
  }
}
```