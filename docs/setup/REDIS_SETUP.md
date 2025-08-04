# Redis Setup for Rate Limiting

## Overview

The application includes support for Redis-based rate limiting, which provides distributed rate limiting across multiple server instances. By default, it falls back to in-memory rate limiting if Redis is not configured.

## Configuration

### Environment Variable

Add the following to your `.env` file:

```bash
# Redis URL (optional - for distributed rate limiting)
REDIS_URL=redis://localhost:6379
```

### For Production (Render)

1. Add Redis addon to your Render service
2. The `REDIS_URL` will be automatically provided

### For Local Development

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

## Implementation

The rate limiting system automatically detects if Redis is available:

1. **With Redis**: Uses Redis for distributed rate limiting
2. **Without Redis**: Falls back to in-memory rate limiting

### Rate Limits

- **AI endpoints**: 10 requests per minute
- **API endpoints**: 30 requests per minute  
- **Webhook endpoints**: 100 requests per minute
- **Auth endpoints**: 5 attempts per 15 minutes

## Adding Redis Client

When you're ready to add Redis support:

1. Install the Redis client:
   ```bash
   npm install ioredis
   ```

2. Update `lib/rate-limit-redis.ts` to use the actual Redis client:
   ```typescript
   import Redis from 'ioredis'
   
   export function getRedisClient(): RedisClient | null {
     if (!process.env.REDIS_URL) {
       return null
     }
     
     const redis = new Redis(process.env.REDIS_URL)
     return redis
   }
   ```

## Benefits

- **Distributed**: Works across multiple server instances
- **Persistent**: Survives server restarts
- **Scalable**: Can handle high traffic loads
- **Fallback**: Gracefully degrades to in-memory if Redis is unavailable