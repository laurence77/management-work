# Celebrities API

## Overview

The Celebrities API provides endpoints for discovering, searching, and retrieving information about celebrities available for booking.

## Endpoints

### List Celebrities

Retrieve a paginated list of celebrities with optional filtering.

**Request:**
```http
GET /api/celebrities?category=Actor&availability=true&first=20&after=cursor_abc123
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Query Parameters:**
- `category` (string, optional): Filter by celebrity category
- `availability` (boolean, optional): Filter by availability status
- `minPrice` (integer, optional): Minimum base price in cents
- `maxPrice` (integer, optional): Maximum base price in cents
- `location` (string, optional): Filter by location/region
- `tags` (string[], optional): Filter by tags (comma-separated)
- `sortBy` (string, optional): Sort field (`name`, `price`, `popularity`, `rating`)
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
      "id": "celebrity_123456789",
      "name": "Emma Thompson",
      "category": "Actor",
      "description": "Academy Award-winning British actress known for her versatile performances in drama and comedy.",
      "profileImage": "https://cdn.celebrity-booking.com/profiles/emma-thompson.jpg",
      "coverImage": "https://cdn.celebrity-booking.com/covers/emma-thompson-cover.jpg",
      "basePrice": 2500000,
      "currency": "USD",
      "availability": true,
      "rating": 4.9,
      "reviewCount": 127,
      "location": "London, UK",
      "tags": ["movies", "theater", "voice-acting", "awards"],
      "services": [
        {
          "id": "service_meet_greet",
          "name": "Meet & Greet",
          "description": "Personal meeting with photo opportunities",
          "duration": 30,
          "price": 2500000
        },
        {
          "id": "service_video_message",
          "name": "Personal Video Message",
          "description": "Customized video message for special occasions",
          "duration": 5,
          "price": 500000
        }
      ],
      "socialMedia": {
        "instagram": "@emmathompsonofficial",
        "twitter": "@EmmaThompson",
        "facebook": "EmmaThompsonOfficial"
      },
      "achievements": [
        "Academy Award Winner",
        "BAFTA Award Winner",
        "Golden Globe Winner"
      ],
      "createdAt": "2024-01-15T09:00:00Z",
      "updatedAt": "2024-01-20T10:30:00Z"
    }
  ],
  "pagination": {
    "hasNextPage": true,
    "hasPreviousPage": false,
    "startCursor": "cursor_abc123",
    "endCursor": "cursor_xyz789",
    "totalCount": 156
  }
}
```

### Get Celebrity Details

Retrieve detailed information about a specific celebrity.

**Request:**
```http
GET /api/celebrities/celebrity_123456789
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": "celebrity_123456789",
  "name": "Emma Thompson",
  "category": "Actor",
  "description": "Academy Award-winning British actress known for her versatile performances in drama and comedy. With a career spanning over three decades, Emma has established herself as one of the most respected performers of her generation.",
  "detailedBio": "Emma Thompson was born in London in 1959. She studied English Literature at Cambridge University, where she was part of the famous Footlights comedy troupe...",
  "profileImage": "https://cdn.celebrity-booking.com/profiles/emma-thompson.jpg",
  "coverImage": "https://cdn.celebrity-booking.com/covers/emma-thompson-cover.jpg",
  "gallery": [
    "https://cdn.celebrity-booking.com/gallery/emma-thompson-1.jpg",
    "https://cdn.celebrity-booking.com/gallery/emma-thompson-2.jpg",
    "https://cdn.celebrity-booking.com/gallery/emma-thompson-3.jpg"
  ],
  "basePrice": 2500000,
  "currency": "USD",
  "availability": true,
  "availabilityNote": "Available for bookings 3+ months in advance",
  "rating": 4.9,
  "reviewCount": 127,
  "location": "London, UK",
  "languages": ["English", "French"],
  "tags": ["movies", "theater", "voice-acting", "awards", "british", "comedy", "drama"],
  "services": [
    {
      "id": "service_meet_greet",
      "name": "Meet & Greet",
      "description": "Personal meeting with photo opportunities and brief conversation",
      "duration": 30,
      "price": 2500000,
      "requirements": ["Security clearance", "Photo release"],
      "included": ["Professional photos", "Autographed item", "Certificate"]
    },
    {
      "id": "service_video_message",
      "name": "Personal Video Message",
      "description": "Customized video message for special occasions",
      "duration": 5,
      "price": 500000,
      "requirements": ["Message script approval"],
      "included": ["HD video file", "Personal message"]
    },
    {
      "id": "service_private_event",
      "name": "Private Event Appearance",
      "description": "Attend private events, parties, or corporate functions",
      "duration": 120,
      "price": 5000000,
      "requirements": ["Event approval", "Travel arrangements", "Security"],
      "included": ["2-hour appearance", "Photos with guests", "Brief speech if requested"]
    }
  ],
  "socialMedia": {
    "instagram": "@emmathompsonofficial",
    "twitter": "@EmmaThompson",
    "facebook": "EmmaThompsonOfficial",
    "website": "https://emmathompson.com"
  },
  "achievements": [
    "Academy Award Winner - Best Actress (1993)",
    "Academy Award Winner - Best Adapted Screenplay (1996)",
    "BAFTA Award Winner - Multiple wins",
    "Golden Globe Winner - Multiple wins",
    "Dame Commander of the Order of the British Empire (2018)"
  ],
  "filmography": [
    {
      "title": "Sense and Sensibility",
      "year": 1995,
      "role": "Elinor Dashwood / Screenwriter"
    },
    {
      "title": "Love Actually",
      "year": 2003,
      "role": "Karen"
    },
    {
      "title": "Saving Mr. Banks",
      "year": 2013,
      "role": "P.L. Travers"
    }
  ],
  "bookingTerms": {
    "cancellationPolicy": "Full refund if cancelled 30+ days before event",
    "paymentTerms": "50% deposit required, balance due 7 days before event",
    "travelRequirements": "First-class travel and 4-star accommodation minimum",
    "additionalFees": "Travel expenses, accommodation, and security costs additional"
  },
  "reviews": [
    {
      "id": "review_123",
      "rating": 5,
      "comment": "Emma was absolutely wonderful! So professional and kind to everyone.",
      "author": "Corporate Event Planner",
      "date": "2024-01-15T09:00:00Z",
      "verified": true
    }
  ],
  "createdAt": "2024-01-15T09:00:00Z",
  "updatedAt": "2024-01-20T10:30:00Z"
}
```

### Search Celebrities

Search for celebrities using various criteria.

**Request:**
```http
GET /api/celebrities/search?q=emma&category=Actor&minPrice=1000000&maxPrice=5000000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Query Parameters:**
- `q` (string, required): Search query
- `category` (string, optional): Filter by category
- `minPrice` (integer, optional): Minimum price in cents
- `maxPrice` (integer, optional): Maximum price in cents
- `location` (string, optional): Location filter
- `tags` (string[], optional): Tags filter
- `availability` (boolean, optional): Availability filter
- `first` (integer, optional): Number of results (max 50, default 20)

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "query": "emma",
  "results": [
    {
      "id": "celebrity_123456789",
      "name": "Emma Thompson",
      "category": "Actor",
      "description": "Academy Award-winning British actress...",
      "profileImage": "https://cdn.celebrity-booking.com/profiles/emma-thompson.jpg",
      "basePrice": 2500000,
      "rating": 4.9,
      "matchScore": 0.95,
      "highlighted": {
        "name": "<em>Emma</em> Thompson",
        "description": "Academy Award-winning British actress known for..."
      }
    }
  ],
  "filters": {
    "categories": [
      { "name": "Actor", "count": 2 },
      { "name": "Director", "count": 1 }
    ],
    "priceRanges": [
      { "min": 100000, "max": 500000, "count": 1 },
      { "min": 500000, "max": 1000000, "count": 2 },
      { "min": 1000000, "max": 5000000, "count": 3 }
    ],
    "locations": [
      { "name": "London, UK", "count": 2 },
      { "name": "Los Angeles, CA", "count": 1 }
    ]
  },
  "pagination": {
    "hasNextPage": false,
    "totalCount": 3
  }
}
```

### Get Celebrity Categories

Retrieve all available celebrity categories.

**Request:**
```http
GET /api/celebrities/categories
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "categories": [
    {
      "id": "actor",
      "name": "Actor",
      "description": "Film and television actors",
      "count": 45,
      "featured": true
    },
    {
      "id": "musician",
      "name": "Musician",
      "description": "Recording artists and performers",
      "count": 32,
      "featured": true
    },
    {
      "id": "athlete",
      "name": "Athlete",
      "description": "Professional sports personalities",
      "count": 28,
      "featured": true
    },
    {
      "id": "influencer",
      "name": "Social Media Influencer",
      "description": "Online content creators and influencers",
      "count": 19,
      "featured": false
    },
    {
      "id": "chef",
      "name": "Chef",
      "description": "Celebrity chefs and culinary experts",
      "count": 12,
      "featured": false
    },
    {
      "id": "author",
      "name": "Author",
      "description": "Published authors and writers",
      "count": 8,
      "featured": false
    }
  ]
}
```

### Check Celebrity Availability

Check if a celebrity is available for a specific date and service.

**Request:**
```http
GET /api/celebrities/celebrity_123456789/availability?eventDate=2024-03-15&serviceId=service_meet_greet&duration=30
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Query Parameters:**
- `eventDate` (string, required): Event date in ISO format
- `serviceId` (string, required): Service ID
- `duration` (integer, optional): Event duration in minutes

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "available": true,
  "date": "2024-03-15",
  "service": {
    "id": "service_meet_greet",
    "name": "Meet & Greet",
    "available": true
  },
  "pricing": {
    "basePrice": 2500000,
    "additionalFees": 500000,
    "totalPrice": 3000000,
    "currency": "USD",
    "breakdown": [
      {
        "type": "base",
        "description": "Meet & Greet service",
        "amount": 2500000
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
      }
    ]
  },
  "requirements": [
    "Event must be approved by celebrity management",
    "Security clearance required for all attendees",
    "Professional photography only"
  ],
  "alternativeDates": [
    {
      "date": "2024-03-16",
      "available": true,
      "pricing": {
        "totalPrice": 3000000
      }
    },
    {
      "date": "2024-03-17",
      "available": true,
      "pricing": {
        "totalPrice": 2800000
      }
    }
  ]
}
```

**Unavailable Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "available": false,
  "date": "2024-03-15",
  "service": {
    "id": "service_meet_greet",
    "name": "Meet & Greet",
    "available": false
  },
  "reason": "Celebrity has prior commitment",
  "alternativeDates": [
    {
      "date": "2024-03-22",
      "available": true,
      "pricing": {
        "totalPrice": 3000000
      }
    }
  ]
}
```

## Error Responses

### Celebrity Not Found
```http
HTTP/1.1 404 Not Found
Content-Type: application/json

{
  "error": {
    "code": "CELEBRITY_NOT_FOUND",
    "message": "Celebrity not found"
  }
}
```

### Invalid Category
```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": {
    "code": "INVALID_CATEGORY",
    "message": "Invalid celebrity category",
    "validCategories": ["Actor", "Musician", "Athlete", "Influencer", "Chef", "Author"]
  }
}
```

## Code Examples

### Search for Celebrities

```typescript
async function searchCelebrities(query: string, filters: any = {}) {
  const params = new URLSearchParams({
    q: query,
    ...filters
  });

  const response = await fetch(`/api/celebrities/search?${params}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  const data = await response.json();
  return data.results;
}

// Usage
const celebrities = await searchCelebrities('emma', {
  category: 'Actor',
  minPrice: 1000000,
  maxPrice: 5000000
});
```

### Check Availability

```typescript
async function checkAvailability(celebrityId: string, eventDate: string, serviceId: string) {
  const params = new URLSearchParams({
    eventDate,
    serviceId
  });

  const response = await fetch(
    `/api/celebrities/${celebrityId}/availability?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );

  return response.json();
}

// Usage
const availability = await checkAvailability(
  'celebrity_123456789',
  '2024-03-15',
  'service_meet_greet'
);

if (availability.available) {
  console.log('Celebrity is available!');
  console.log('Total price:', availability.pricing.totalPrice);
} else {
  console.log('Not available:', availability.reason);
  console.log('Alternative dates:', availability.alternativeDates);
}
```

### Get Celebrity Details

```typescript
async function getCelebrityDetails(celebrityId: string) {
  const response = await fetch(`/api/celebrities/${celebrityId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (response.ok) {
    return response.json();
  } else {
    throw new Error('Celebrity not found');
  }
}

// Usage
try {
  const celebrity = await getCelebrityDetails('celebrity_123456789');
  console.log(`${celebrity.name} - ${celebrity.category}`);
  console.log(`Rating: ${celebrity.rating}/5 (${celebrity.reviewCount} reviews)`);
  console.log(`Base price: $${celebrity.basePrice / 100}`);
} catch (error) {
  console.error('Error fetching celebrity:', error);
}
```