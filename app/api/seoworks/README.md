# SEOWorks Integration API Documentation

## Overview
This directory contains the API endpoints for integrating with SEOWorks (Jeff Leisegang's system) for automated task completion tracking and client management.

## Authentication
All SEOWorks API endpoints require authentication via the `x-api-key` header:
```
x-api-key: 7f3e9b5d2a8c4f6e1b9d3c7a5e8f2b4d6c9a1e3f7b5d9c2a6e4f8b1d3c7a9e5f
```

## Endpoints

### 1. Webhook Endpoint (`/api/seoworks/webhook`)

**Purpose:** Receives task completion notifications from SEOWorks

**Methods:** 
- `GET` - Connectivity test
- `POST` - Process webhook events

**URL:** `https://rylie-seo-hub.onrender.com/api/seoworks/webhook`

#### POST Request Format
```json
{
  "eventType": "task.completed",
  "timestamp": "2024-07-03T10:30:00Z",
  "data": {
    "externalId": "request-id-or-seoworks-task-id",
    "clientId": "user_jayhatfieldchevy_pittsburg_2024",
    "clientEmail": "manager@jayhatfieldchevrolet.com",
    "taskType": "page",
    "status": "completed",
    "completionDate": "2024-07-03T10:30:00Z",
    "notes": "Task completion notes",
    "deliverables": [
      {
        "type": "page_post",
        "title": "Page Title",
        "url": "https://example.com/page"
      }
    ]
  }
}
```

#### Supported Event Types
- `task.completed` - Task has been completed
- `task.updated` - Task status has been updated
- `task.cancelled` - Task has been cancelled

#### Task Types
- `page` - Landing page creation
- `blog` - Blog post creation
- `gbp_post` - Google Business Profile post
- `improvement` - Site improvement/maintenance
- `maintenance` - Site maintenance

#### Response Format
```json
{
  "success": true,
  "message": "Webhook processed successfully",
  "eventType": "task.completed",
  "requestId": "clx123abc456",
  "externalId": "task-p-70906",
  "clientId": "user_jayhatfieldchevy_pittsburg_2024",
  "clientEmail": "manager@jayhatfieldchevrolet.com",
  "taskType": "page",
  "status": "completed"
}
```

### 2. Task Mapping Endpoint (`/api/seoworks/mapping`)

**Purpose:** Create and retrieve mappings between our request IDs and SEOWorks task IDs

**Methods:**
- `POST` - Create a new mapping
- `GET` - Retrieve existing mapping

#### POST - Create Mapping
```json
{
  "requestId": "clx123abc456",
  "seoworksTaskId": "task-p-70906",
  "taskType": "page",
  "metadata": {
    "priority": "high",
    "assignedTo": "john.doe"
  }
}
```

#### GET - Retrieve Mapping
Query parameters:
- `requestId` - Our internal request ID
- `seoworksTaskId` - SEOWorks task ID

Example: `/api/seoworks/mapping?seoworksTaskId=task-p-70906`

## ID Mapping Strategy

The webhook endpoint uses a three-tier lookup strategy to find requests:

1. **Direct Lookup**: Try to find request by our internal request ID
2. **SEOWorks Task ID**: Look up by `seoworksTaskId` field in Request table
3. **Mapping Table**: Use the `SEOWorksTaskMapping` table for complex mappings

## Database Schema

### Request Table Updates
```sql
-- Added field for direct SEOWorks task ID mapping
ALTER TABLE "Request" ADD COLUMN "seoworksTaskId" TEXT;
CREATE INDEX "Request_seoworksTaskId_idx" ON "Request"("seoworksTaskId");
```

### SEOWorksTaskMapping Table
```sql
CREATE TABLE "SEOWorksTaskMapping" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "seoworksTaskId" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SEOWorksTaskMapping_pkey" PRIMARY KEY ("id")
);
```

## Client Identification

### Onboarding Payload Enhancement
When dealerships complete onboarding, we send enhanced data to SEOWorks:

```json
{
  "timestamp": "2024-07-03T10:30:00Z",
  "businessName": "Jay Hatfield Chevrolet",
  "clientId": "user_jayhatfieldchevy_pittsburg_2024",
  "clientEmail": "manager@jayhatfieldchevrolet.com",
  "package": "GOLD",
  "mainBrand": "Chevrolet",
  "otherBrand": "",
  "address": "1107 E 30th St",
  "city": "Pittsburg",
  "state": "KS",
  "zipCode": "66762",
  "contactName": "John Doe",
  "contactTitle": "General Manager",
  "email": "manager@jayhatfieldchevrolet.com",
  "phone": "(620) 231-0900",
  "websiteUrl": "https://jayhatfieldchevrolet.com",
  "billingEmail": "billing@jayhatfieldchevrolet.com",
  "siteAccessNotes": "",
  "targetVehicleModels": "Chevrolet Silverado;Chevrolet Equinox;Chevrolet Malibu",
  "targetCities": "Pittsburg, KS;Joplin, MO;Parsons, KS",
  "targetDealers": "Competitor Chevy;City Motors;Premier Chevrolet"
}
```

**Note:** Target fields are semicolon-delimited strings, not arrays.

**Target Cities Format:** Cities must include state codes in the format "City, State" (e.g., "Denver, CO"). This is important for dealerships near state lines that may target cities in neighboring states.

### Client ID Format
Client IDs follow the pattern: `user_{businessname}_{city}_{year}`
- Example: `user_jayhatfieldchevy_pittsburg_2024`
- Handles multiple locations: `user_jayhatfieldchevy_vinita_2024`

## Integration Workflow

### 1. Onboarding Flow
1. Dealership completes onboarding in our system
2. We send enhanced payload to SEOWorks with `clientId` and `clientEmail`
3. SEOWorks stores client mapping for future task assignments

### 2. Task Creation Flow
1. Request is created in our system (gets internal request ID)
2. **Option A**: We send request details to SEOWorks with our request ID
3. **Option B**: SEOWorks creates task and we create mapping via `/api/seoworks/mapping`

### 3. Task Completion Flow
1. SEOWorks completes task
2. SEOWorks sends webhook to `/api/seoworks/webhook` with task completion data
3. Our system finds the request using the lookup strategy
4. We update request progress and send notification emails
5. Package usage is incremented automatically

## Error Handling

### Common Issues
1. **Request Not Found**: SEOWorks task ID doesn't match any request
   - Returns 200 OK to prevent retries
   - Logs warning with client identification info

2. **Invalid Payload**: Webhook data doesn't match schema
   - Returns 400 Bad Request
   - Logs validation errors

3. **Authentication Failure**: Invalid or missing API key
   - Returns 401 Unauthorized

### Logging
All webhook events are logged with:
- Event type and external ID
- Client identification (if available)
- Request ID (if found)
- Processing status and any errors

## Testing

### Connectivity Test
```bash
curl -H "x-api-key: 7f3e9b5d2a8c4f6e1b9d3c7a5e8f2b4d6c9a1e3f7b5d9c2a6e4f8b1d3c7a9e5f" \
     https://rylie-seo-hub.onrender.com/api/seoworks/webhook
```

### Test Webhook
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "x-api-key: 7f3e9b5d2a8c4f6e1b9d3c7a5e8f2b4d6c9a1e3f7b5d9c2a6e4f8b1d3c7a9e5f" \
  -d '{
    "eventType": "task.completed",
    "timestamp": "2024-07-03T10:30:00Z",
    "data": {
      "externalId": "test-request-id",
      "taskType": "page",
      "status": "completed",
      "clientId": "user_test_client_2024",
      "clientEmail": "test@example.com"
    }
  }' \
  https://rylie-seo-hub.onrender.com/api/seoworks/webhook
```

## Environment Variables

Required environment variables:
- `SEOWORKS_WEBHOOK_SECRET` - API key for authentication
- `SEOWORKS_WEBHOOK_URL` - SEOWorks endpoint for sending onboarding data
- `SEOWORKS_API_KEY` - API key for sending data to SEOWorks

## Next Steps

1. **Create Test Mapping**: Use the mapping endpoint to create a test request-to-task mapping
2. **Test Full Flow**: Create a request, map it to a SEOWorks task ID, then test webhook completion
3. **Production Deployment**: Coordinate with Jeff on production task ID mapping strategy
4. **Monitor Logs**: Watch for "Request not found" warnings and create mappings as needed

## Contact Information
- **Jeff Leisegang** - SEOWorks CTO implementing webhook integration
- **Josh Copp** - 913.526.5281 (Our contact)