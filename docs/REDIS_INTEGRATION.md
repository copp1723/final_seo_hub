# Redis Integration for CSRF and Rate Limiting

## Overview

This project now includes Redis integration for both CSRF token storage and rate limiting, with graceful fallback to in-memory storage when Redis is unavailable.

## Features

- **Redis-backed CSRF tokens**: Persistent storage across server restarts and multiple instances
- **Redis-backed rate limiting**: Distributed rate limiting that works across multiple servers
- **Graceful fallback**: Automatic fallback to in-memory storage if Redis is unavailable
- **Error handling**: Robust error handling with logging and automatic failover
- **Comprehensive testing**: Integration tests for both Redis and fallback modes

## Environment Configuration

Add the following to your `.env` file:

```bash
# Redis URL (optional - for distributed CSRF and rate limiting)
REDIS_URL=redis://localhost:6379
```

If `REDIS_URL` is not configured, the system automatically falls back to in-memory storage.

## Implementation Details

### CSRF Token Storage (`lib/csrf.ts`)

- **Redis Mode**: Stores tokens in Redis with automatic expiration (1 hour TTL)
- **Fallback Mode**: Uses in-memory Map when Redis is unavailable
- **Key Format**: `csrf:{sessionId}`
- **Data Format**: JSON object with token and expiration timestamp

### Rate Limiting (`lib/rate-limit-redis.ts`)

- **Redis Mode**: Uses Redis INCR and EXPIRE commands for distributed counting
- **Fallback Mode**: Uses existing in-memory rate limiting
- **Key Format**: `rate_limit:{clientType}:{clientId}`
- **Client Types**: `user:{userId}` or `ip:{ipAddress}`

### Redis Client (`lib/redis.ts`)

- **Connection Management**: Lazy connection with automatic reconnection
- **Error Handling**: Graceful degradation on connection failures
- **Logging**: Comprehensive logging of connection events and errors
- **Configuration**: Configurable timeouts and retry settings

## Rate Limit Configurations

```typescript
import { enhancedRateLimits } from '@/lib/rate-limit-redis'

// Available rate limiters
enhancedRateLimits.ai       // 5 requests per minute for AI endpoints
enhancedRateLimits.api      // 30 requests per minute for API endpoints
enhancedRateLimits.webhook  // 30 requests per minute for webhooks
enhancedRateLimits.auth     // 10 requests per 15 minutes for auth
```

## Usage Examples

### CSRF Protection

```typescript
import { csrfProtection, addCSRFTokenToResponse } from '@/lib/csrf'

// In your API route
export async function POST(request: NextRequest) {
  const getSessionId = () => /* get session ID */
  
  // Check CSRF
  const csrfError = await csrfProtection(request, getSessionId)
  if (csrfError) return csrfError
  
  // Your API logic here
  const response = NextResponse.json({ success: true })
  
  // Add CSRF token to response
  return await addCSRFTokenToResponse(response, sessionId)
}
```

### Rate Limiting

```typescript
import { enhancedRateLimits } from '@/lib/rate-limit-redis'

// In your API route
export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await enhancedRateLimits.api(request)
  if (rateLimitResponse) return rateLimitResponse
  
  // Your API logic here
  return NextResponse.json({ success: true })
}
```

## Testing

The implementation includes comprehensive integration tests that verify:

- **Redis functionality**: Storing, retrieving, and expiring data
- **Fallback behavior**: Graceful degradation when Redis is unavailable
- **Error handling**: Proper handling of Redis connection failures
- **Security**: Cryptographic token generation and timing-safe comparison

### Running Tests

```bash
# Run Redis integration tests
npm run test:redis

# Run all tests
npm run test

# Run tests with coverage
npm run test:coverage
```

## Deployment

### Local Development

1. Install Redis locally:
   ```bash
   # macOS
   brew install redis
   brew services start redis
   
   # Ubuntu/Debian
   sudo apt-get install redis-server
   sudo systemctl start redis
   ```

2. Or use Docker:
   ```bash
   docker run -d -p 6379:6379 redis:alpine
   ```

3. Add `REDIS_URL=redis://localhost:6379` to your `.env` file

### Production (Render)

1. Add Redis addon to your Render service
2. The `REDIS_URL` environment variable will be automatically provided
3. The application will automatically use Redis when available

### Production (Other Platforms)

1. Set up a Redis instance (AWS ElastiCache, Google Cloud Memorystore, etc.)
2. Set the `REDIS_URL` environment variable in your deployment
3. Ensure your application can connect to Redis (security groups, firewall rules, etc.)

## Benefits

### With Redis
- **Persistence**: Survives server restarts and deployments
- **Scalability**: Works across multiple server instances
- **Performance**: Fast Redis operations with sub-millisecond latency
- **Reliability**: Built-in Redis failover and persistence options

### Fallback Mode
- **Reliability**: Always works even without Redis
- **Development**: No Redis dependency for local development
- **Gradual Migration**: Can deploy without Redis and add it later

## Monitoring

The implementation includes comprehensive logging:

- **Connection Events**: Redis connect/disconnect/error events
- **Fallback Events**: When system falls back to in-memory storage
- **Error Events**: Detailed error logging for debugging

Monitor these logs to ensure proper Redis connectivity and performance.

## Performance Considerations

- **Connection Pooling**: Single Redis connection per application instance
- **Command Efficiency**: Uses optimal Redis commands (SETEX, INCR, EXPIRE)
- **Memory Usage**: Automatic cleanup of expired keys
- **Network**: Minimal data transfer with compact key formats

## Security

- **Key Isolation**: Prefixed keys prevent collisions
- **Timing Safety**: Cryptographically secure token comparison
- **Expiration**: Automatic cleanup of sensitive data
- **Error Handling**: No sensitive data in error messages