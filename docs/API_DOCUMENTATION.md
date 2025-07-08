# API Documentation

This document provides detailed information about the API endpoints available in the Rylie SEO Hub platform.

## Table of Contents

- [Authentication](#authentication)
- [Requests](#requests)
- [Tasks](#tasks)
- [Users](#users)
- [Agencies](#agencies)
- [SEOWorks Integration](#seoworks-integration)
- [Google Analytics 4](#google-analytics-4)
- [Search Console](#search-console)
- [AI Chat](#ai-chat)
- [Email](#email)
- [Settings](#settings)
- [Health](#health)

## Authentication

Authentication is handled through NextAuth.js with Google OAuth integration. API access can also be managed through API keys.

### Endpoints

#### `POST /api/auth/signin`

Initiates the sign-in process.

#### `POST /api/auth/signout`

Signs the user out.

#### `GET /api/auth/session`

Returns the current session information.

#### `POST /api/auth/apikey`

Generates a new API key for the authenticated user.

**Request Body:**
```json
{}
```

**Response:**
```json
{
  "apiKey": "rylie_api_xxxxxxxxxxxxx",
  "createdAt": "2025-07-07T12:00:00.000Z"
}
```

#### `DELETE /api/auth/apikey`

Revokes the current API key.

**Request Body:**
```json
{}
```

**Response:**
```json
{
  "success": true
}
```

## Requests

Endpoints for managing SEO requests.

### Endpoints

#### `GET /api/requests`

Returns a list of requests based on filters.

**Query Parameters:**
- `status` (optional): Filter by status (PENDING, IN_PROGRESS, COMPLETED, CANCELLED)
- `type` (optional): Filter by type (page, blog, gbp_post, maintenance)
- `limit` (optional): Number of results to return (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "requests": [
    {
      "id": "cuid123",
      "title": "New Landing Page for Ford F-150",
      "description": "Create an SEO-optimized landing page for the new Ford F-150 model",
      "type": "page",
      "status": "PENDING",
      "priority": "MEDIUM",
      "createdAt": "2025-07-01T10:00:00.000Z",
      "updatedAt": "2025-07-01T10:00:00.000Z",
      "user": {
        "id": "user123",
        "name": "John Doe",
        "email": "john@example.com"
      }
    }
  ],
  "total": 120,
  "limit": 50,
  "offset": 0
}
```

#### `POST /api/requests`

Creates a new request.

**Request Body:**
```json
{
  "title": "New Landing Page for Ford F-150",
  "description": "Create an SEO-optimized landing page for the new Ford F-150 model",
  "type": "page",
  "priority": "MEDIUM",
  "keywords": ["Ford F-150", "Ford Trucks", "F-150 Deals"],
  "targetUrl": "https://example.com/ford-f150",
  "targetCities": ["Dallas", "Fort Worth"],
  "targetModels": ["F-150", "F-150 Raptor"]
}
```

**Response:**
```json
{
  "id": "cuid123",
  "title": "New Landing Page for Ford F-150",
  "description": "Create an SEO-optimized landing page for the new Ford F-150 model",
  "type": "page",
  "status": "PENDING",
  "priority": "MEDIUM",
  "createdAt": "2025-07-07T12:00:00.000Z",
  "updatedAt": "2025-07-07T12:00:00.000Z"
}
```

#### `GET /api/requests/:id`

Returns a specific request by ID.

**Response:**
```json
{
  "id": "cuid123",
  "title": "New Landing Page for Ford F-150",
  "description": "Create an SEO-optimized landing page for the new Ford F-150 model",
  "type": "page",
  "status": "PENDING",
  "priority": "MEDIUM",
  "keywords": ["Ford F-150", "Ford Trucks", "F-150 Deals"],
  "targetUrl": "https://example.com/ford-f150",
  "targetCities": ["Dallas", "Fort Worth"],
  "targetModels": ["F-150", "F-150 Raptor"],
  "createdAt": "2025-07-01T10:00:00.000Z",
  "updatedAt": "2025-07-01T10:00:00.000Z",
  "user": {
    "id": "user123",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "tasks": [
    {
      "id": "task123",
      "title": "Content Creation",
      "status": "PENDING",
      "type": "PAGE"
    }
  ]
}
```

#### `PATCH /api/requests/:id`

Updates a request.

**Request Body:**
```json
{
  "status": "IN_PROGRESS",
  "priority": "HIGH",
  "description": "Updated description here"
}
```

**Response:**
```json
{
  "id": "cuid123",
  "title": "New Landing Page for Ford F-150",
  "description": "Updated description here",
  "type": "page",
  "status": "IN_PROGRESS",
  "priority": "HIGH",
  "updatedAt": "2025-07-07T14:00:00.000Z"
}
```

#### `DELETE /api/requests/:id`

Deletes a request.

**Response:**
```json
{
  "success": true
}
```

## Tasks

Endpoints for managing individual tasks within requests.

### Endpoints

#### `GET /api/requests/:requestId/tasks`

Returns tasks for a specific request.

**Response:**
```json
{
  "tasks": [
    {
      "id": "task123",
      "title": "Content Creation",
      "description": "Create the main content for the page",
      "type": "PAGE",
      "status": "PENDING",
      "priority": "MEDIUM",
      "dueDate": "2025-07-15T00:00:00.000Z",
      "createdAt": "2025-07-07T12:00:00.000Z",
      "updatedAt": "2025-07-07T12:00:00.000Z"
    }
  ]
}
```

#### `POST /api/requests/:requestId/tasks`

Creates a new task for a request.

**Request Body:**
```json
{
  "title": "Meta Tag Optimization",
  "description": "Optimize meta title and description for target keywords",
  "type": "PAGE",
  "priority": "HIGH",
  "dueDate": "2025-07-20T00:00:00.000Z"
}
```

**Response:**
```json
{
  "id": "task124",
  "title": "Meta Tag Optimization",
  "description": "Optimize meta title and description for target keywords",
  "type": "PAGE",
  "status": "PENDING",
  "priority": "HIGH",
  "dueDate": "2025-07-20T00:00:00.000Z",
  "createdAt": "2025-07-07T14:00:00.000Z",
  "updatedAt": "2025-07-07T14:00:00.000Z"
}
```

#### `PATCH /api/requests/:requestId/tasks/:taskId`

Updates a task.

**Request Body:**
```json
{
  "status": "COMPLETED",
  "completedUrl": "https://example.com/ford-f150",
  "completedTitle": "Ford F-150 Deals | Example Dealership"
}
```

**Response:**
```json
{
  "id": "task124",
  "title": "Meta Tag Optimization",
  "status": "COMPLETED",
  "completedUrl": "https://example.com/ford-f150",
  "completedTitle": "Ford F-150 Deals | Example Dealership",
  "completedAt": "2025-07-07T15:00:00.000Z",
  "updatedAt": "2025-07-07T15:00:00.000Z"
}
```

## Users

Endpoints for user management.

### Endpoints

#### `GET /api/user`

Returns the current user's profile.

**Response:**
```json
{
  "id": "user123",
  "email": "john@example.com",
  "name": "John Doe",
  "role": "USER",
  "agencyId": "agency123",
  "onboardingCompleted": true,
  "activePackageType": "GOLD",
  "packageUsage": {
    "pagesUsedThisPeriod": 2,
    "blogsUsedThisPeriod": 1,
    "gbpPostsUsedThisPeriod": 0,
    "improvementsUsedThisPeriod": 3
  }
}
```

#### `PATCH /api/user`

Updates the current user's profile.

**Request Body:**
```json
{
  "name": "John Smith"
}
```

**Response:**
```json
{
  "id": "user123",
  "email": "john@example.com",
  "name": "John Smith",
  "updatedAt": "2025-07-07T15:00:00.000Z"
}
```

#### `POST /api/user/preferences`

Updates user preferences.

**Request Body:**
```json
{
  "emailNotifications": true,
  "requestCreated": true,
  "statusChanged": false,
  "taskCompleted": true,
  "weeklySummary": true,
  "marketingEmails": false,
  "timezone": "America/Chicago",
  "language": "en"
}
```

**Response:**
```json
{
  "success": true,
  "preferences": {
    "emailNotifications": true,
    "requestCreated": true,
    "statusChanged": false,
    "taskCompleted": true,
    "weeklySummary": true,
    "marketingEmails": false,
    "timezone": "America/Chicago",
    "language": "en"
  }
}
```

## Agencies

Endpoints for agency management (AGENCY_ADMIN and SUPER_ADMIN only).

### Endpoints

#### `GET /api/admin/agencies`

Returns a list of agencies.

**Response:**
```json
{
  "agencies": [
    {
      "id": "agency123",
      "name": "Example Agency",
      "domain": "example.com",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z",
      "userCount": 25
    }
  ]
}
```

#### `POST /api/admin/agencies`

Creates a new agency.

**Request Body:**
```json
{
  "name": "New Agency",
  "domain": "newagency.com",
  "settings": {
    "branding": {
      "companyName": "New Agency SEO Solutions",
      "primaryColor": "#ff6b35",
      "secondaryColor": "#ff8c42",
      "emailFromName": "New Agency SEO",
      "supportEmail": "support@newagency.com",
      "logoUrl": "https://newagency.com/logo.png"
    }
  }
}
```

**Response:**
```json
{
  "id": "agency456",
  "name": "New Agency",
  "domain": "newagency.com",
  "settings": {
    "branding": {
      "companyName": "New Agency SEO Solutions",
      "primaryColor": "#ff6b35",
      "secondaryColor": "#ff8c42",
      "emailFromName": "New Agency SEO",
      "supportEmail": "support@newagency.com",
      "logoUrl": "https://newagency.com/logo.png"
    }
  },
  "createdAt": "2025-07-07T15:00:00.000Z",
  "updatedAt": "2025-07-07T15:00:00.000Z"
}
```

## SEOWorks Integration

Endpoints for SEOWorks integration.

### Endpoints

#### `POST /api/seoworks/webhook`

Receives webhooks from SEOWorks for task updates.

**Request Body:**
```json
{
  "taskId": "SW123456",
  "status": "completed",
  "clientId": "client123",
  "completedUrl": "https://example.com/ford-f150",
  "completedTitle": "Ford F-150 Deals | Example Dealership",
  "taskType": "page"
}
```

**Response:**
```json
{
  "success": true,
  "requestId": "cuid123",
  "status": "COMPLETED"
}
```

#### `POST /api/seoworks/create-task`

Creates a new task in SEOWorks.

**Request Body:**
```json
{
  "requestId": "cuid123",
  "clientId": "client123"
}
```

**Response:**
```json
{
  "success": true,
  "seoworksTaskId": "SW123456"
}
```

## Google Analytics 4

Endpoints for Google Analytics 4 integration.

### Endpoints

#### `GET /api/ga4/auth-url`

Returns the OAuth URL for connecting GA4.

**Response:**
```json
{
  "url": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

#### `POST /api/ga4/connect`

Completes the GA4 connection process.

**Request Body:**
```json
{
  "code": "oauth_code_here"
}
```

**Response:**
```json
{
  "success": true,
  "property": {
    "id": "123456789",
    "name": "My Website"
  }
}
```

#### `GET /api/ga4/properties`

Returns GA4 properties available to the user.

**Response:**
```json
{
  "properties": [
    {
      "id": "123456789",
      "name": "My Website",
      "createTime": "2023-01-01T00:00:00.000Z"
    }
  ]
}
```

#### `GET /api/ga4/report`

Returns GA4 analytics data.

**Query Parameters:**
- `startDate`: Start date (YYYY-MM-DD)
- `endDate`: End date (YYYY-MM-DD)
- `metrics`: Comma-separated list of metrics (e.g., "sessions,pageviews")
- `dimensions`: Comma-separated list of dimensions (e.g., "date,deviceCategory")

**Response:**
```json
{
  "data": [
    {
      "date": "20250701",
      "sessions": 1234,
      "pageviews": 5678
    },
    {
      "date": "20250702",
      "sessions": 2345,
      "pageviews": 6789
    }
  ]
}
```

## Search Console

Endpoints for Google Search Console integration.

### Endpoints

#### `GET /api/search-console/auth-url`

Returns the OAuth URL for connecting Search Console.

**Response:**
```json
{
  "url": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

#### `POST /api/search-console/connect`

Completes the Search Console connection process.

**Request Body:**
```json
{
  "code": "oauth_code_here"
}
```

**Response:**
```json
{
  "success": true,
  "site": {
    "url": "https://example.com/",
    "name": "Example Website"
  }
}
```

#### `GET /api/search-console/sites`

Returns Search Console sites available to the user.

**Response:**
```json
{
  "sites": [
    {
      "url": "https://example.com/",
      "name": "Example Website"
    }
  ]
}
```

#### `GET /api/search-console/report`

Returns Search Console performance data.

**Query Parameters:**
- `startDate`: Start date (YYYY-MM-DD)
- `endDate`: End date (YYYY-MM-DD)
- `dimensions`: Comma-separated list of dimensions (e.g., "query,page")

**Response:**
```json
{
  "data": [
    {
      "query": "ford f-150 dealer",
      "clicks": 120,
      "impressions": 1500,
      "ctr": 0.08,
      "position": 3.2
    },
    {
      "query": "ford deals",
      "clicks": 85,
      "impressions": 1200,
      "ctr": 0.071,
      "position": 4.1
    }
  ]
}
```

## AI Chat

Endpoints for AI-powered chat functionality.

### Endpoints

#### `POST /api/chat/message`

Sends a message to the AI assistant.

**Request Body:**
```json
{
  "message": "How can I improve my Toyota Camry page SEO?",
  "contextType": "automotive-seo",
  "includeAnalytics": true
}
```

**Response:**
```json
{
  "response": "Based on your current analytics, your Toyota Camry page has an average position of 6.2 for the keyword 'Toyota Camry dealer'. To improve this, I recommend:\n\n1. Enhancing your title tag to include 'Toyota Camry Dealer in [Your City]'\n2. Adding more specific content about the Camry's features\n3. Creating FAQ content targeting common Camry questions\n4. Improving page load speed\n5. Adding schema markup for the vehicle\n\nWould you like me to help with any of these specific areas?",
  "intents": ["inventory_seo", "technical_seo"],
  "suggestedQuestions": [
    "How do I add schema markup for vehicles?",
    "What content should I include on my Camry page?",
    "How can I improve my page load speed?"
  ]
}
```

## Email

Endpoints for email notifications.

### Endpoints

#### `POST /api/email/send`

Sends an email notification (admin only).

**Request Body:**
```json
{
  "template": "request_update",
  "to": "user@example.com",
  "data": {
    "requestId": "cuid123",
    "requestTitle": "New Landing Page for Ford F-150",
    "status": "COMPLETED"
  }
}
```

**Response:**
```json
{
  "success": true,
  "messageId": "email123"
}
```

## Settings

Endpoints for system settings.

### Endpoints

#### `GET /api/settings/system`

Returns system settings (SUPER_ADMIN only).

**Response:**
```json
{
  "settings": {
    "maintenanceMode": false,
    "newUserRegistration": true,
    "emailNotifications": true,
    "auditLogging": true,
    "maxUsersPerAgency": 50,
    "maxRequestsPerUser": 1000,
    "maxFileUploadSize": 10,
    "rateLimitPerMinute": 60,
    "sessionTimeoutMinutes": 480
  }
}
```

#### `PATCH /api/settings/system`

Updates system settings (SUPER_ADMIN only).

**Request Body:**
```json
{
  "maintenanceMode": true,
  "maintenanceMessage": "System maintenance in progress. Please try again later."
}
```

**Response:**
```json
{
  "success": true,
  "settings": {
    "maintenanceMode": true,
    "maintenanceMessage": "System maintenance in progress. Please try again later.",
    "updatedAt": "2025-07-07T15:00:00.000Z"
  }
}
```

## Health

Endpoints for system health checks.

### Endpoints

#### `GET /api/health`

Returns system health status.

**Response:**
```json
{
  "status": "ok",
  "version": "2.0.0",
  "database": "connected",
  "redis": "connected",
  "uptime": 3600
}
```

---

## Error Handling

All API endpoints follow a consistent error format:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "You do not have permission to access this resource",
    "details": {}
  }
}
```

Common error codes:
- `BAD_REQUEST`: Invalid request parameters
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `CONFLICT`: Resource conflict
- `RATE_LIMITED`: Too many requests
- `INTERNAL_SERVER_ERROR`: Server error

## Authentication

All API endpoints (except public ones like `/api/health`) require authentication. You can authenticate using:

1. **Session Cookie**: For browser-based access
2. **API Key**: For programmatic access via the `X-API-Key` header

## Rate Limiting

API endpoints are rate-limited to protect against abuse. The default limit is 60 requests per minute per user/IP. This can be configured in the system settings.

## CSRF Protection

For session-based authentication, CSRF tokens are required for all non-GET requests. The token should be sent in the `X-CSRF-Token` header.
