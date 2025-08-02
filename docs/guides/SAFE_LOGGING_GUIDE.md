# Safe Logging Guide

## Overview

To prevent sensitive information leakage, all API routes should use the safe logging utilities instead of direct `console.log` or `console.error`.

## Implementation

### Before (Unsafe)
```typescript
export async function POST(request: NextRequest) {
  try {
    // ... api logic
  } catch (error) {
    console.error('Chat API error:', error) // ❌ Exposes full error details
    return errorResponse('Failed to process chat request', 500)
  }
}
```

### After (Safe)
```typescript
import { logger, getSafeErrorMessage } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    // ... api logic
  } catch (error) {
    logger.error('Chat API error', error, {
      path: '/api/chat',
      method: 'POST'
    })
    
    return errorResponse(getSafeErrorMessage(error), 500)
  }
}
```

## Logger Features

### 1. Automatic Sanitization
- Removes API keys, tokens, passwords from logs
- Truncates long messages
- Filters sensitive patterns

### 2. Environment-Aware
- **Development**: Full error details with stack traces
- **Production**: Sanitized messages only

### 3. Structured Logging
```typescript
logger.error('Database connection failed', error, {
  userId: session.user.id,
  operation: 'createRequest',
  timestamp: new Date().toISOString()
})
```

## API Response Messages

### Development vs Production

```typescript
// Development
{
  "error": "Invalid email format: user@invalid"
}

// Production
{
  "error": "An error occurred. Please try again later."
}
```

## Migration Checklist

Update all API routes to use safe logging:

- [ ] `/api/chat/route.ts`
- [ ] `/api/requests/route.ts`
- [ ] `/api/ga4/*/route.ts`
- [ ] `/api/search-console/*/route.ts`
- [ ] `/api/seoworks/*/route.ts`
- [ ] `/api/onboarding/route.ts`

## Example Updates

### Chat API
```typescript
// Replace
console.error('Chat API error:', error)

// With
logger.error('Chat API error', error, { endpoint: 'chat' })
```

### GA4 API
```typescript
// Replace
console.error('GA4 connection error:', error)

// With
logger.error('GA4 connection failed', error, { 
  userId: authResult.user.id,
  service: 'ga4'
})
```

### Search Console API
```typescript
// Replace
console.error('Search Console OAuth error:', error)

// With
logger.error('OAuth error', error, {
  service: 'search-console',
  operation: 'token-exchange'
})
```

## Best Practices

1. **Never log sensitive data directly**
   ```typescript
   // ❌ Bad
   logger.info(`User ${email} logged in with password ${password}`)
   
   // ✅ Good
   logger.info('User login attempt', { userId: user.id })
   ```

2. **Use context objects for metadata**
   ```typescript
   logger.error('Operation failed', error, {
     userId: user.id,
     requestId: crypto.randomUUID(),
     timestamp: Date.now()
   })
   ```

3. **Different log levels for different scenarios**
   - `error`: Actual errors that need attention
   - `warn`: Potential issues or deprecated usage
   - `info`: General operational information

## Monitoring Integration

The logger is designed to integrate with monitoring services:

```typescript
// Future implementation
private sendToMonitoring(level: string, message: string, context: any) {
  // Send to Sentry, LogRocket, DataDog, etc.
  sentryClient.captureMessage(message, level, context)
}
```