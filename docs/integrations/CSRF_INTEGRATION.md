# CSRF Protection Integration Guide

## Overview

CSRF (Cross-Site Request Forgery) protection has been implemented to secure state-changing API endpoints. The system uses token-based validation with automatic token management.

## How It Works

1. **Token Generation**: A unique CSRF token is generated for each authenticated session
2. **Token Validation**: All POST/PUT/DELETE requests must include the token
3. **Automatic Refresh**: Tokens are refreshed automatically when expired

## Client-Side Implementation

### Using the useCSRF Hook

```typescript
import { useCSRF } from '@/hooks/useCSRF'

function MyComponent() {
  const { csrfToken, secureRequest } = useCSRF()
  
  const handleSubmit = async (data) => {
    // Option 1: Use secureRequest (recommended)
    const response = await secureRequest('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    
    // Option 2: Manual token inclusion
    const response2 = await fetch('/api/requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken
      },
      body: JSON.stringify(data)
    })
  }
}
```

### In API Calls

```typescript
// The hook automatically handles token refresh on 403 errors
const { secureRequest } = useCSRF()

const createRequest = async (data) => {
  const response = await secureRequest('/api/requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  
  if (!response.ok) {
    throw new Error('Request failed')
  }
  
  return response.json()
}
```

## Server-Side Implementation

### Protected Endpoints

To add CSRF protection to an API endpoint:

```typescript
import { csrfProtection } from '@/lib/csrf'
import { auth } from '@/lib/auth'

export async function POST(request: NextRequest) {
  // Get session
  const session = await auth()
  
  // Apply CSRF protection
  const csrfCheck = await csrfProtection(
    request,
    () => session?.user?.id || null
  )
  if (csrfCheck) return csrfCheck
  
  // Your endpoint logic here
}
```

## Excluded Endpoints

The following endpoints are excluded from CSRF protection:

- GET, HEAD, OPTIONS requests (safe methods)
- Webhook endpoints (use API key authentication)
- Public endpoints without authentication

## Token Lifecycle

- **Generation**: On first authenticated request
- **Lifetime**: 1 hour
- **Storage**: Server-side only (not in cookies/localStorage)
- **Refresh**: Automatic on expiration

## Security Best Practices

1. **Never store CSRF tokens in localStorage** - Use memory only
2. **Always use HTTPS** in production
3. **Include credentials** in requests: `credentials: 'include'`
4. **Validate on server** - Never trust client-side validation

## Troubleshooting

### 403 Forbidden Errors

1. Check if token is included in request headers
2. Verify user is authenticated
3. Ensure token hasn't expired
4. Check browser console for CSRF fetch errors

### Token Not Found

1. Ensure `/api/csrf` endpoint is accessible
2. Verify authentication is working
3. Check network tab for CSRF token response

## Migration Guide

For existing API calls, update them to use the `useCSRF` hook:

**Before:**
```typescript
fetch('/api/requests', {
  method: 'POST',
  body: JSON.stringify(data)
})
```

**After:**
```typescript
const { secureRequest } = useCSRF()

secureRequest('/api/requests', {
  method: 'POST',
  body: JSON.stringify(data)
})
```