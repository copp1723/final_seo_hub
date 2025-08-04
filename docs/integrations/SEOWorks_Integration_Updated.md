# SEOWorks Integration Document - Updated
**Contact**: Josh Copp - 913.526.5281  
**Date**: January 2025  
**Status**: Ready for Testing

## Overview
This document contains the current technical specifications for integrating with the Rylie SEO Hub webhook endpoints. There are two main integrations:

1. **Task Status Webhooks** - For sending task updates from SEOWorks to Rylie SEO Hub
2. **Onboarding Data Webhooks** - For receiving dealership onboarding submissions

---

## 1. Task Status Webhook (SEOWorks → Rylie SEO Hub)

### Endpoint Details
- **URL**: `https://rylie-seo-hub.onrender.com/api/seoworks/webhook`
- **Method**: POST
- **Content-Type**: `application/json`
- **Authentication**: `x-api-key` header (API key to be provided)

### Request Format

```json
{
  "eventType": "task.completed",
  "timestamp": "2024-03-15T10:30:00Z",
  "data": {
    "externalId": "task-123",
    "taskType": "blog",
    "status": "completed",
    "completionDate": "2024-03-15T10:30:00Z",
    "notes": "Blog post completed with all SEO optimizations",
    "deliverables": [
      {
        "type": "blog_post",
        "title": "10 Essential SEO Tips for 2024",
        "url": "https://example.com/blog/seo-tips-2024",
        "publishedDate": "2024-03-15T10:30:00Z"
      }
    ]
  }
}
```

### Field Descriptions

**Required Fields:**
- `eventType`: One of: `task.created`, `task.updated`, `task.completed`, `task.cancelled`
- `timestamp`: ISO 8601 datetime when the event occurred
- `data.externalId`: Unique identifier for the task from SEOWorks
- `data.taskType`: One of: `page`, `blog`, `gbp_post`, `improvement`, `maintenance`
- `data.status`: Current status of the task

**Optional Fields:**
- `data.agencyName`: Name of the agency handling the task
- `data.assignedTo`: Person assigned to the task
- `data.dueDate`: ISO 8601 datetime when task is due
- `data.completionDate`: ISO 8601 datetime when task was completed
- `data.notes`: Additional notes about the task
- `data.deliverables`: Array of deliverable objects with:
  - `type`: Type of deliverable
  - `title`: Title of the deliverable
  - `url`: URL to the deliverable
  - `publishedDate`: When the deliverable was published (optional)

### Task Type Mapping
The system currently handles these task types:
- `page` → Increments pages completed
- `blog` → Increments blogs completed  
- `gbp_post` → Increments GBP posts completed
- `improvement` → Increments improvements completed
- `maintenance` → Increments improvements completed

### Testing Commands

```bash
# Test webhook connectivity
curl -X GET https://rylie-seo-hub.onrender.com/api/seoworks/webhook \
  -H "x-api-key: your-webhook-secret"

# Send test task completion
curl -X POST https://rylie-seo-hub.onrender.com/api/seoworks/webhook \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-webhook-secret" \
  -d '{
    "eventType": "task.completed",
    "timestamp": "2024-03-15T10:30:00Z",
    "data": {
      "externalId": "test-task-123",
      "taskType": "blog",
      "status": "completed",
      "completionDate": "2024-03-15T10:30:00Z",
      "notes": "Test blog post completed",
      "deliverables": [
        {
          "type": "blog_post",
          "title": "Test Blog Post",
          "url": "https://example.com/test-blog",
          "publishedDate": "2024-03-15T10:30:00Z"
        }
      ]
    }
  }'
```

### Expected Responses

**Success Response:**
```json
{
  "success": true,
  "message": "Webhook processed successfully",
  "eventType": "task.completed"
}
```

**Error Responses:**
```json
{
  "error": "Unauthorized",
  "status": 401
}
```

```json
{
  "error": "Validation error message",
  "status": 400
}
```

---

## 2. Onboarding Webhook (Rylie SEO Hub → SEOWorks)

### Endpoint Details
- **URL**: Your webhook endpoint (please provide)
- **Method**: POST
- **Content-Type**: `application/json`
- **Authentication**: `x-api-key` header (you provide the key)

### Request Format
When a dealership completes the onboarding form, we'll send this JSON payload:

```json
{
  "timestamp": "2024-03-15T10:30:00Z",
  "businessName": "Example Dealership",
  "package": "GOLD",
  "mainBrand": "Toyota",
  "otherBrand": "Lexus",
  "address": "123 Main Street",
  "city": "Austin",
  "state": "TX",
  "zipCode": "78701",
  "contactName": "John Smith",
  "contactTitle": "General Manager",
  "email": "john.smith@example.com",
  "phone": "(512) 555-0123",
  "websiteUrl": "https://www.exampledealership.com",
  "billingEmail": "billing@exampledealership.com",
  "siteAccessNotes": "WordPress admin access will be provided via email",
  "targetVehicleModels": "Toyota Camry;Toyota RAV4;Toyota Highlander;Lexus RX350",
  "targetCities": "Austin;Round Rock;Cedar Park;Georgetown;Pflugerville",
  "targetDealers": "Competitor Auto Group;City Motors;Premier Toyota of Downtown"
}
```

### Important Notes on Format
- **Semicolon-Delimited Lists**: The fields `targetVehicleModels`, `targetCities`, and `targetDealers` are semicolon-delimited strings (not arrays)
- **Minimum Requirements**: Each semicolon-delimited field will have at least 3 items
- **Optional Fields**: `otherBrand` and `siteAccessNotes` may be empty strings if not provided

### Parsing Example
```javascript
// To parse the semicolon-delimited fields:
const vehicles = payload.targetVehicleModels.split(';');
const cities = payload.targetCities.split(';');
const dealers = payload.targetDealers.split(';');
```

### Expected Response
Please return a JSON response indicating success or failure:

**Success Response:**
```json
{
  "success": true,
  "message": "Onboarding received",
  "referenceId": "optional-reference-id"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message"
}
```

---

## Configuration Requirements

### From SEOWorks Team:
- **For Task Status Webhooks**: API key for the `x-api-key` header (we'll configure this on our end)
- **For Onboarding Webhooks**: 
  - Your webhook endpoint URL
  - API key that we should send in the `x-api-key` header

### Environment Variables We'll Configure:
```bash
# For receiving task status updates
SEOWORKS_WEBHOOK_SECRET="your-api-key-for-task-webhooks"

# For sending onboarding data
SEOWORKS_WEBHOOK_URL="https://your-endpoint.com/onboarding"
SEOWORKS_API_KEY="your-api-key-for-onboarding"
```

---

## Security Features
- All webhooks use HTTPS
- API keys use timing-safe comparison to prevent timing attacks
- Failed authentication attempts are logged
- API keys should be kept secure and not exposed in client-side code

---

## Package Completion Logic
The system tracks task completion by package type:

### Package Requirements:
- **SILVER**: 1 page, 2 blogs, 4 GBP posts
- **GOLD**: 2 pages, 4 blogs, 8 GBP posts  
- **PLATINUM**: 4 pages, 8 blogs, 16 GBP posts

When all requirements for a package are met, the request status is automatically updated to "COMPLETED".

---

## Next Steps

### SEOWorks Team to Provide:
1. Webhook endpoint URL for onboarding data
2. API key for onboarding webhook authentication
3. API key for task status webhook authentication

### We Will:
1. Configure the environment variables
2. Test the integration
3. Monitor initial webhook traffic

---

## Support
For technical questions or issues during integration testing, contact:
- **Josh Copp**: 913.526.5281
- **Email**: [contact email if available]

---

*Document Version: 2.0 - Updated January 2025*