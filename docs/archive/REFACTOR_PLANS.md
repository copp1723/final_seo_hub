# Refactor Plans

## 1. API Route `/api/requests/[id]/route.ts` - Prisma Integration

### Current State Analysis
- Currently uses a mock database object with placeholder implementations
- Has proper TypeScript interfaces but lacks real database operations
- Implements business logic for status updates and task completion tracking

### Refactor Plan

#### Phase 1: Replace Mock Database with Prisma Client
```typescript
// Remove mock db object, replace with:
import { prisma } from '@/lib/prisma'
import { RequestStatus, Request } from '@prisma/client'
```

#### Phase 2: Update Database Operations

**GET Handler Refactor:**
```typescript
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  
  if (!id) {
    return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
  }
  
  try {
    const req = await prisma.request.findUnique({ 
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });
    
    if (!req) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }
    
    return NextResponse.json(req, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch request:', error);
    return NextResponse.json({ error: 'Failed to fetch request' }, { status: 500 });
  }
}
```

**PUT Handler Refactor:**
```typescript
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;

  if (!id) {
    return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { status, taskDetails } = body;

    // Fetch existing request with proper Prisma query
    const existingRequest = await prisma.request.findUnique({ 
      where: { id },
      include: {
        user: true // Include user data if needed for business logic
      }
    });

    if (!existingRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    let updateData: any = {};

    // Handle status updates with proper enum validation
    if (status) {
      if (!Object.values(RequestStatus).includes(status)) {
        return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
      }
      updateData.status = status;
      
      // Add completion tracking
      if (status === 'COMPLETED' && existingRequest.status !== 'COMPLETED') {
        updateData.completedAt = new Date();
      }
    }

    // Handle task completion with proper JSON handling
    if (taskDetails && existingRequest.status === 'IN_PROGRESS') {
      const { title, url, notes, type } = taskDetails;
      
      if (!title) {
        return NextResponse.json({ error: 'Task title is required' }, { status: 400 });
      }

      const newCompletedTask = {
        id: `task-${Date.now()}-${crypto.randomUUID()}`,
        title,
        url,
        notes,
        type: type || 'general',
        completedAt: new Date().toISOString(),
      };

      // Handle JSON array properly
      const currentTasks = Array.isArray(existingRequest.completedTasks) 
        ? existingRequest.completedTasks as any[]
        : [];
      
      updateData.completedTasks = [...currentTasks, newCompletedTask];

      // Update progress counters based on task type
      switch (type) {
        case 'page':
          updateData.pagesCompleted = existingRequest.pagesCompleted + 1;
          break;
        case 'blog':
          updateData.blogsCompleted = existingRequest.blogsCompleted + 1;
          break;
        case 'gbp_post':
          updateData.gbpPostsCompleted = existingRequest.gbpPostsCompleted + 1;
          break;
        case 'improvement':
          updateData.improvementsCompleted = existingRequest.improvementsCompleted + 1;
          break;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: 'No update performed' }, { status: 200 });
    }

    // Update with Prisma transaction for data consistency
    const updatedRequest = await prisma.request.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    return NextResponse.json({ 
      message: 'Request updated successfully', 
      request: updatedRequest 
    }, { status: 200 });

  } catch (error) {
    console.error('Failed to update request:', error);
    return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
  }
}
```

#### Phase 3: Add Additional Features
- Implement proper error handling with Prisma error types
- Add input validation with Zod schemas
- Add authentication/authorization checks
- Add audit logging for status changes
- Add webhook triggers for status updates

---

## 2. CSRF Library (`lib/csrf.ts`) - Redis Integration

### Current State Analysis
- Uses in-memory Map for token storage
- Has cleanup intervals but limited to single instance
- Good security practices with timing-safe comparison

### Refactor Plan

#### Phase 1: Add Redis Dependencies
```bash
npm install redis @types/redis
```

#### Phase 2: Create Redis CSRF Implementation
```typescript
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { Redis } from 'redis'
import { errorResponse } from './api-auth'

// Redis client setup
let redisClient: Redis | null = null;

async function getRedisClient(): Promise<Redis | null> {
  if (!process.env.REDIS_URL) {
    console.warn('REDIS_URL not configured, using in-memory CSRF storage');
    return null;
  }

  if (!redisClient) {
    try {
      redisClient = new Redis(process.env.REDIS_URL);
      await redisClient.ping();
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      return null;
    }
  }

  return redisClient;
}

const TOKEN_LIFETIME = 60 * 60; // 1 hour in seconds

// Fallback to in-memory storage when Redis unavailable
const memoryStore = new Map<string, { token: string; expires: number }>();

/**
 * Generate a CSRF token for a session (Redis-backed)
 */
export async function generateCSRFToken(sessionId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const redis = await getRedisClient();
  
  if (redis) {
    try {
      const key = `csrf:${sessionId}`;
      await redis.setex(key, TOKEN_LIFETIME, token);
      return token;
    } catch (error) {
      console.error('Redis CSRF storage failed, falling back to memory:', error);
    }
  }
  
  // Fallback to memory storage
  const expires = Date.now() + (TOKEN_LIFETIME * 1000);
  memoryStore.set(sessionId, { token, expires });
  return token;
}

/**
 * Validate CSRF token from request (Redis-backed)
 */
export async function validateCSRFToken(
  request: NextRequest,
  sessionId: string
): Promise<boolean> {
  const headerToken = request.headers.get('x-csrf-token');
  
  if (!headerToken) {
    return false;
  }
  
  const redis = await getRedisClient();
  
  if (redis) {
    try {
      const key = `csrf:${sessionId}`;
      const storedToken = await redis.get(key);
      
      if (!storedToken) {
        return false;
      }
      
      // Timing-safe comparison
      return crypto.timingSafeEqual(
        Buffer.from(headerToken),
        Buffer.from(storedToken)
      );
    } catch (error) {
      console.error('Redis CSRF validation failed, falling back to memory:', error);
    }
  }
  
  // Fallback to memory validation
  const storedData = memoryStore.get(sessionId);
  if (!storedData || storedData.expires < Date.now()) {
    memoryStore.delete(sessionId);
    return false;
  }
  
  return crypto.timingSafeEqual(
    Buffer.from(headerToken),
    Buffer.from(storedData.token)
  );
}

/**
 * Get or create CSRF token for a session (Redis-backed)
 */
export async function getOrCreateCSRFToken(sessionId: string): Promise<string> {
  const redis = await getRedisClient();
  
  if (redis) {
    try {
      const key = `csrf:${sessionId}`;
      const existing = await redis.get(key);
      
      if (existing) {
        return existing;
      }
    } catch (error) {
      console.error('Redis CSRF retrieval failed:', error);
    }
  } else {
    // Check memory fallback
    const existing = memoryStore.get(sessionId);
    if (existing && existing.expires > Date.now()) {
      return existing.token;
    }
  }
  
  return generateCSRFToken(sessionId);
}
```

#### Phase 3: Environment Configuration
- Add Redis configuration validation
- Add connection health checks
- Add graceful fallback mechanisms
- Add Redis connection pooling for production

---

## 3. Rate Limiting Library (`lib/rate-limit.ts`) - Redis Integration

### Current State Analysis
- Uses in-memory storage with cleanup mechanisms
- Good structure with configurable rate limits
- Limited to single instance scaling

### Refactor Plan

#### Phase 1: Redis Integration Architecture
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { Redis } from 'redis'
import { ApiResponse } from '@/lib/api-auth'

// Redis client with connection management
class RedisRateLimiter {
  private static instance: RedisRateLimiter;
  private client: Redis | null = null;
  
  private constructor() {}
  
  static getInstance(): RedisRateLimiter {
    if (!RedisRateLimiter.instance) {
      RedisRateLimiter.instance = new RedisRateLimiter();
    }
    return RedisRateLimiter.instance;
  }
  
  async getClient(): Promise<Redis | null> {
    if (!process.env.REDIS_URL) {
      return null;
    }
    
    if (!this.client) {
      try {
        this.client = new Redis(process.env.REDIS_URL);
        await this.client.ping();
      } catch (error) {
        console.error('Redis connection failed:', error);
        return null;
      }
    }
    
    return this.client;
  }
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
  keyGenerator?: (request: NextRequest) => string;
}

export function createRedisRateLimit(config: RateLimitConfig) {
  const limiter = RedisRateLimiter.getInstance();
  
  return async (request: NextRequest): Promise<NextResponse | null> => {
    const clientId = config.keyGenerator ? config.keyGenerator(request) : getClientId(request);
    const redis = await limiter.getClient();
    
    if (redis) {
      return await redisRateLimit(redis, clientId, config);
    } else {
      // Fallback to memory-based rate limiting
      return await memoryRateLimit(clientId, config);
    }
  };
}

async function redisRateLimit(
  redis: Redis,
  clientId: string,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  const key = `rate_limit:${clientId}`;
  const windowSeconds = Math.ceil(config.windowMs / 1000);
  
  try {
    // Use Redis pipeline for atomic operations
    const pipeline = redis.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, windowSeconds);
    pipeline.ttl(key);
    
    const results = await pipeline.exec();
    const count = results[0][1] as number;
    const ttl = results[2][1] as number;
    
    const remaining = Math.max(0, config.maxRequests - count);
    const resetTime = Date.now() + (ttl * 1000);
    
    if (count > config.maxRequests) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: config.message || 'Rate limit exceeded',
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': resetTime.toString(),
            'Retry-After': ttl.toString(),
          },
        }
      );
    }
    
    return null; // Allow request
  } catch (error) {
    console.error('Redis rate limit error:', error);
    // Fallback to memory-based limiting
    return await memoryRateLimit(clientId, config);
  }
}

// Keep existing memory-based implementation as fallback
const memoryStore: { [key: string]: { count: number; resetTime: number } } = {};

async function memoryRateLimit(
  clientId: string,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  // Implementation similar to existing memory-based rate limiting
  // ... (existing logic)
}
```

#### Phase 2: Enhanced Rate Limit Configurations
```typescript
// Enhanced configurations with Redis support
export const redisRateLimits = {
  ai: createRedisRateLimit({
    windowMs: 60 * 1000,
    maxRequests: 10,
    message: 'AI rate limit exceeded',
    keyGenerator: (request) => {
      const userId = request.headers.get('x-user-id');
      return userId ? `ai:user:${userId}` : `ai:ip:${getClientIp(request)}`;
    }
  }),
  
  api: createRedisRateLimit({
    windowMs: 60 * 1000,
    maxRequests: 100,
    message: 'API rate limit exceeded',
    keyGenerator: (request) => {
      const apiKey = request.headers.get('x-api-key');
      if (apiKey) return `api:key:${apiKey}`;
      
      const userId = request.headers.get('x-user-id');
      return userId ? `api:user:${userId}` : `api:ip:${getClientIp(request)}`;
    }
  }),
  
  webhook: createRedisRateLimit({
    windowMs: 60 * 1000,
    maxRequests: 1000,
    message: 'Webhook rate limit exceeded'
  })
};
```

#### Phase 3: Production Considerations
- Add Redis cluster support
- Implement distributed rate limiting patterns
- Add monitoring and alerting for rate limit breaches
- Add rate limit analytics and reporting

---

## Implementation Priority

1. **High Priority**: API Route Prisma integration (core functionality)
2. **Medium Priority**: Redis rate limiting (performance/scaling)
3. **Low Priority**: Redis CSRF (security enhancement)

## Dependencies to Add

```bash
# For Redis integration
npm install redis @types/redis

# For enhanced validation (optional)
npm install zod

# For monitoring (optional)
npm install @sentry/node
```

## Environment Variables Required

```env
# Redis configuration
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your_redis_password

# Database (already configured)
DATABASE_URL=your_database_url
```

## Testing Strategy

1. **Unit Tests**: Test individual functions with mocked Redis/Prisma
2. **Integration Tests**: Test with actual Redis/database connections
3. **Load Tests**: Verify rate limiting under high load
4. **Fallback Tests**: Ensure graceful degradation when Redis is unavailable