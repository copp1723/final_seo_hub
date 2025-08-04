# API Monitoring

## Overview
Automatic performance monitoring for all API endpoints with response time tracking and error logging.

## Features
- Response time measurement
- Status code logging
- Slow request detection (configurable threshold)
- User context tracking
- Error aggregation

## Usage
Wrap API handlers with `withApiMonitoring`:

```typescript
import { withApiMonitoring } from '@/lib/api-wrapper'

async function handleGET(request: NextRequest) {
  // Your API logic
}

export const GET = withApiMonitoring(handleGET)
```

## Configuration
Set `API_SLOW_THRESHOLD_MS` environment variable (default: 1000ms)

## Logs
- Slow requests: Logged as warnings
- Errors (4xx/5xx): Logged as errors  
- Success (dev only): Logged as info