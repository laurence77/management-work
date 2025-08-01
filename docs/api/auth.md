# Authentication API

## Overview

The Authentication API handles user registration, login, password management, and token operations for the Celebrity Booking Platform.

## Endpoints

### Register

Create a new user account.

**Request:**
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure-password-123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1-555-123-4567",
  "acceptTerms": true
}
```

**Response:**
```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "user": {
    "id": "user_123456789",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1-555-123-4567",
    "role": "user",
    "emailVerified": false,
    "createdAt": "2024-01-20T10:30:00Z"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900
  }
}
```

**Validation Rules:**
- `email`: Valid email format, unique
- `password`: Minimum 8 characters, contains uppercase, lowercase, number
- `firstName`: 1-50 characters
- `lastName`: 1-50 characters
- `phone`: Valid E.164 format
- `acceptTerms`: Must be true

**Error Responses:**
```http
HTTP/1.1 409 Conflict

{
  "error": {
    "code": "EMAIL_ALREADY_EXISTS",
    "message": "An account with this email already exists"
  }
}
```

### Login

Authenticate user and receive access tokens.

**Request:**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure-password-123",
  "rememberMe": true
}
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "user": {
    "id": "user_123456789",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user",
    "emailVerified": true,
    "lastLoginAt": "2024-01-20T10:30:00Z"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900
  }
}
```

**Error Responses:**
```http
HTTP/1.1 401 Unauthorized

{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}
```

```http
HTTP/1.1 423 Locked

{
  "error": {
    "code": "ACCOUNT_LOCKED",
    "message": "Account temporarily locked due to too many failed login attempts",
    "retryAfter": 300
  }
}
```

### Refresh Token

Obtain a new access token using a valid refresh token.

**Request:**
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900
  }
}
```

**Error Responses:**
```http
HTTP/1.1 401 Unauthorized

{
  "error": {
    "code": "INVALID_REFRESH_TOKEN",
    "message": "Refresh token is invalid or expired"
  }
}
```

### Logout

Invalidate user session and tokens.

**Request:**
```http
POST /api/auth/logout
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "message": "Logged out successfully"
}
```

### Forgot Password

Request password reset for user account.

**Request:**
```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "message": "Password reset instructions sent to your email"
}
```

**Note**: Response is always 200 OK regardless of whether email exists (security measure).

### Reset Password

Reset user password using reset token.

**Request:**
```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "reset_token_123456789",
  "password": "new-secure-password-456"
}
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "message": "Password reset successfully"
}
```

**Error Responses:**
```http
HTTP/1.1 400 Bad Request

{
  "error": {
    "code": "INVALID_RESET_TOKEN",
    "message": "Reset token is invalid or expired"
  }
}
```

### Get Current User

Get currently authenticated user information.

**Request:**
```http
GET /api/auth/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "user": {
    "id": "user_123456789",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1-555-123-4567",
    "role": "user",
    "emailVerified": true,
    "phoneVerified": false,
    "profile": {
      "avatar": "https://cdn.celebrity-booking.com/avatars/user_123456789.jpg",
      "bio": "Entertainment industry professional",
      "preferences": {
        "emailNotifications": true,
        "smsNotifications": false,
        "marketingEmails": true
      }
    },
    "createdAt": "2024-01-15T09:00:00Z",
    "lastLoginAt": "2024-01-20T10:30:00Z"
  }
}
```

### Verify Email

Verify user email address using verification token.

**Request:**
```http
POST /api/auth/verify-email
Content-Type: application/json

{
  "token": "email_verification_token_123456789"
}
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "message": "Email verified successfully"
}
```

### Resend Email Verification

Request new email verification for current user.

**Request:**
```http
POST /api/auth/resend-verification
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "message": "Verification email sent"
}
```

## Security Considerations

### Rate Limiting

Authentication endpoints have strict rate limiting:

- **Login**: 5 attempts per 5 minutes per IP
- **Register**: 3 attempts per hour per IP
- **Password Reset**: 3 attempts per hour per email
- **Email Verification**: 5 attempts per hour per user

### Account Lockout

Accounts are temporarily locked after failed login attempts:

- **3 failed attempts**: 5-minute lockout
- **5 failed attempts**: 15-minute lockout
- **10 failed attempts**: 1-hour lockout

### Token Security

- Access tokens expire after 15 minutes
- Refresh tokens expire after 7 days
- Tokens are invalidated on logout
- Refresh token rotation is implemented

### Password Requirements

Passwords must meet the following criteria:

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character
- Cannot be a common password
- Cannot contain user's email or name

## Error Codes

| Code | Description |
|------|-------------|
| `INVALID_CREDENTIALS` | Email or password is incorrect |
| `EMAIL_ALREADY_EXISTS` | Account with email already exists |
| `ACCOUNT_LOCKED` | Account temporarily locked |
| `INVALID_REFRESH_TOKEN` | Refresh token invalid or expired |
| `INVALID_RESET_TOKEN` | Password reset token invalid |
| `EMAIL_NOT_VERIFIED` | Email address not verified |
| `WEAK_PASSWORD` | Password does not meet requirements |
| `RATE_LIMIT_EXCEEDED` | Too many requests |

## Code Examples

### Registration Flow

```typescript
// Register new user
const registerResponse = await fetch('/api/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePass123!',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+1-555-123-4567',
    acceptTerms: true
  })
});

const { user, tokens } = await registerResponse.json();

// Store tokens securely
localStorage.setItem('accessToken', tokens.accessToken);
localStorage.setItem('refreshToken', tokens.refreshToken);
```

### Login Flow

```typescript
// Login user
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePass123!',
    rememberMe: true
  })
});

const { user, tokens } = await loginResponse.json();

// Store tokens
localStorage.setItem('accessToken', tokens.accessToken);
localStorage.setItem('refreshToken', tokens.refreshToken);
```

### Token Refresh

```typescript
async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refreshToken');
  
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken })
  });
  
  if (response.ok) {
    const { tokens } = await response.json();
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
    return tokens.accessToken;
  } else {
    // Refresh failed, redirect to login
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
  }
}
```

### Authenticated Requests

```typescript
async function makeAuthenticatedRequest(url: string, options: RequestInit = {}) {
  let accessToken = localStorage.getItem('accessToken');
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  
  if (response.status === 401) {
    // Token expired, try to refresh
    accessToken = await refreshAccessToken();
    
    if (accessToken) {
      // Retry request with new token
      return fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${accessToken}`,
        },
      });
    }
  }
  
  return response;
}
```