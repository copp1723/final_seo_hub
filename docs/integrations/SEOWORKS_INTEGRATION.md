# SEOWorks Integration Documentation

## Overview

This document describes the bidirectional integration between Rylie SEO Hub and SEOWorks (Jeff's backend SEO service provider). The integration enables automatic data flow for dealer onboarding and SEO task requests, with webhook notifications for task completion.

## Architecture

```
┌─────────────────┐    Onboarding Data     ┌─────────────────┐
│                 │ ──────────────────────> │                 │
│   Rylie SEO     │                         │   SEOWorks      │
│   Hub           │    Focus Requests       │   (Jeff's API)  │
│                 │ ──────────────────────> │                 │
│                 │                         │                 │
│                 │ <────────────────────── │                 │
└─────────────────┘   Completion Webhooks   └─────────────────┘
```

## Data Flow

### 1. Dealer Onboarding
- **Trigger**: Agency onboards a new dealer through Rylie
- **Direction**: Rylie → SEOWorks
- **Endpoint**: `POST https://api.seowerks.ai/rylie-onboard.cfm`
- **Purpose**: Notify SEOWorks of new dealer for setup

### 2. SEO Task Requests
- **Trigger**: New request created in Rylie
- **Direction**: Rylie → SEOWorks
- **Endpoint**: `POST https://api.seowerks.ai/rylie-focus.cfm`
- **Purpose**: Send specific SEO tasks to SEOWorks for fulfillment

### 3. Task Completion Notifications
- **Trigger**: SEOWorks completes a task
- **Direction**: SEOWorks → Rylie
- **Endpoint**: `POST {RYLIE_URL}/api/seoworks/webhook`
- **Purpose**: Notify Rylie when tasks are completed

## API Endpoints

### Rylie Endpoints (Outbound)

#### Send Onboarding Data
```
POST /api/seoworks/send-onboarding
Content-Type: application/json
Authorization: Bearer {API_KEY}

{
  "dealerName": "Test Auto Dealership",
  "dealerAddress": "123 Main St, Test City, TX 75001",
  "dealerPhone": "(555) 123-4567",
  "dealerWebsite": "https://testdealer.com",
  "contactName": "John Test",
  "contactEmail": "john@testdealer.com",
  "contactPhone": "(555) 123-4567",
  "targetCities": ["Dallas", "Fort Worth", "Arlington"],
  "targetModels": ["Honda Civic", "Toyota Camry", "Ford F-150"],
  "packageType": "PREMIUM"
}
```

#### Send Focus Request
```
POST /api/seoworks/send-focus-request
Content-Type: application/json
Authorization: Bearer {API_KEY}

{
  "requestId": "req_123456789"
}
```

### Rylie Endpoints (Inbound)

#### Webhook Receiver
```
POST /api/seoworks/webhook
Content-Type: application/json
X-API-Key: {SHARED_SECRET}

{
  "taskId": "task_123",
  "requestId": "req_456", 
  "status": "completed",
  "completedAt": "2025-01-03T20:30:00Z",
  "results": {
    "keywordsOptimized": 15,
    "pagesUpdated": 5,
    "backlinksCreated": 3
  }
}
```

#### Task Mapping Management
```
POST /api/seoworks/mapping
Content-Type: application/json

{
  "requestId": "req_123",
  "taskId": "task_456"
}

GET /api/seoworks/mapping?requestId=req_123
GET /api/seoworks/mapping?taskId=task_456
```

### SEOWorks Endpoints (External)

#### Onboarding Endpoint
```
POST https://api.seowerks.ai/rylie-onboard.cfm
Content-Type: application/json
X-API-Key: {API_KEY}

{
  "dealerName": "string",
  "dealerAddress": "string", 
  "dealerPhone": "string",
  "dealerWebsite": "string",
  "contactName": "string",
  "contactEmail": "string",
  "contactPhone": "string",
  "targetCities": "semicolon;separated;values",
  "targetModels": "semicolon;separated;values",
  "packageType": "BASIC|STANDARD|PREMIUM"
}
```

#### Focus Request Endpoint
```
POST https://api.seowerks.ai/rylie-focus.cfm
Content-Type: application/json
X-API-Key: {API_KEY}

{
  "requestId": "string",
  "title": "string",
  "description": "string", 
  "type": "string",
  "priority": "LOW|MEDIUM|HIGH",
  "keywords": "semicolon;separated;values",
  "targetUrl": "string",
  "targetCities": "semicolon;separated;values", 
  "targetModels": "semicolon;separated;values",
  "packageType": "BASIC|STANDARD|PREMIUM"
}
```

## Database Schema

### Request Model Updates
```sql
-- Added to existing Request table
ALTER TABLE "Request" ADD COLUMN "seoworksTaskId" TEXT;
```

### SEOWorks Task Mapping Table
```sql
CREATE TABLE "SEOWorksTaskMapping" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SEOWorksTaskMapping_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SEOWorksTaskMapping_requestId_key" ON "SEOWorksTaskMapping"("requestId");
CREATE UNIQUE INDEX "SEOWorksTaskMapping_taskId_key" ON "SEOWorksTaskMapping"("taskId");
CREATE INDEX "SEOWorksTaskMapping_requestId_idx" ON "SEOWorksTaskMapping"("requestId");
CREATE INDEX "SEOWorksTaskMapping_taskId_idx" ON "SEOWorksTaskMapping"("taskId");
```

## Data Transformations

### Array to Semicolon-Separated
Rylie stores arrays, SEOWorks expects semicolon-separated strings:

```javascript
// Rylie format
targetCities: ["Dallas", "Fort Worth", "Arlington"]

// SEOWorks format  
targetCities: "Dallas;Fort Worth;Arlington"
```

### Request ID Mapping
Three-tier lookup strategy for webhook processing:

1. **Direct lookup**: `seoworksTaskId` field on Request
2. **Mapping table**: SEOWorksTaskMapping table
3. **Request ID match**: Direct requestId comparison

## Environment Variables

```bash
# Required for SEOWorks integration
SEOWORKS_API_KEY=your-shared-api-key-here
NEXT_PUBLIC_APP_URL=https://your-rylie-domain.com

# Optional for enhanced logging
SEOWORKS_DEBUG=true
```

## Integration Flow

### Dealer Onboarding Flow
1. Agency creates dealer account in Rylie
2. Rylie automatically calls `/api/seoworks/send-onboarding`
3. Onboarding endpoint transforms data and sends to SEOWorks
4. SEOWorks receives dealer information for setup

### Request Processing Flow
1. User creates SEO request in Rylie
2. Request is saved to database with PENDING status
3. Rylie automatically calls `/api/seoworks/send-focus-request`
4. Focus request endpoint transforms data and sends to SEOWorks
5. SEOWorks receives task and begins work
6. When complete, SEOWorks sends webhook to Rylie
7. Rylie updates request status to COMPLETED

## Error Handling

### Outbound Request Failures
- Non-blocking: Request creation succeeds even if SEOWorks integration fails
- Logged warnings for monitoring and retry capabilities
- Graceful degradation maintains core Rylie functionality

### Webhook Processing Failures
- Three-tier lookup strategy ensures maximum compatibility
- Detailed logging for debugging webhook issues
- Validation of webhook authenticity via API key

### Data Validation
- Schema validation on all outbound requests
- Required field checking before sending to SEOWorks
- Type conversion and format validation

## Testing

### Test Script
Use the comprehensive test script to verify integration:

```bash
# Run all integration tests
node scripts/test-seoworks-integration.js

# Test specific components
node -e "require('./scripts/test-seoworks-integration.js').testOnboardingIntegration()"
node -e "require('./scripts/test-seoworks-integration.js').testFocusRequestIntegration()"
node -e "require('./scripts/test-seoworks-integration.js').testWebhookEndpoint()"
```

### Manual Testing
1. Create a dealer account and verify onboarding data is sent
2. Create an SEO request and verify focus request is sent
3. Send test webhook and verify request status updates

## Security

### Authentication
- **Outbound**: API key in `X-API-Key` header
- **Inbound**: Shared secret validation for webhooks
- **Transport**: HTTPS for all communications

### Data Protection
- No sensitive data stored in logs
- API keys stored as environment variables
- Request/response data sanitized in logs

## Monitoring

### Logging
All integration events are logged with structured data:

```javascript
logger.info('Request sent to SEOWorks successfully', {
  requestId: newRequest.id,
  seoworksTaskId: response.taskId
})

logger.warn('Failed to send request to SEOWorks', {
  requestId: newRequest.id,
  status: response.status,
  error: response.error
})
```

### Metrics to Monitor
- Onboarding success/failure rates
- Focus request delivery rates  
- Webhook processing success rates
- Response times for SEOWorks API calls
- Request completion rates

## Troubleshooting

### Common Issues

#### "Request not found" in webhook
- Check three-tier lookup strategy
- Verify requestId format consistency
- Check SEOWorksTaskMapping table

#### Onboarding data not received
- Verify API key configuration
- Check data format transformations
- Validate required fields

#### Focus requests not being sent
- Check request creation flow integration
- Verify endpoint URL configuration
- Review error logs for failures

### Debug Mode
Enable debug logging:

```bash
export SEOWORKS_DEBUG=true
```

This provides detailed request/response logging for troubleshooting.

## Future Enhancements

### Planned Features
1. **Retry Logic**: Automatic retry for failed API calls
2. **Status Sync**: Periodic sync of request statuses
3. **Bulk Operations**: Batch processing for multiple requests
4. **Analytics**: Integration performance metrics dashboard

### Scalability Considerations
- Rate limiting for outbound requests
- Queue-based processing for high volume
- Caching for frequently accessed data
- Database indexing optimization

## Support

For integration issues:
1. Check logs for error details
2. Run test script to verify connectivity
3. Review this documentation for configuration
4. Contact Jeff for SEOWorks-side issues
5. Contact Rylie development team for Rylie-side issues