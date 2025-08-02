# SEOWorks Integration Guide

This guide explains how the Rylie SEO Hub platform integrates with SEOWorks for SEO task management and tracking.

## Table of Contents

- [Overview](#overview)
- [Integration Architecture](#integration-architecture)
- [Webhook System](#webhook-system)
- [ID Mapping Strategy](#id-mapping-strategy)
- [Request Workflow](#request-workflow)
- [API Endpoints](#api-endpoints)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)
- [Extending the Integration](#extending-the-integration)

## Overview

The Rylie SEO Hub platform integrates with SEOWorks, an external SEO service provider, to track and manage SEO tasks. This integration allows:

- Creation of tasks in SEOWorks from within the platform
- Automatic status updates when tasks are completed in SEOWorks
- Mapping of SEOWorks tasks to internal requests
- Detailed tracking of task completion

## Integration Architecture

The integration follows a webhook-based architecture with API communication:

```
┌───────────────────┐         ┌───────────────────┐
│                   │         │                   │
│   Rylie SEO Hub   │◄────────┤    SEOWorks API   │
│                   │         │                   │
└───────────┬───────┘         └───────────┬───────┘
            │                             │
            │                             │
            │                             │
┌───────────▼───────┐         ┌───────────▼───────┐
│                   │         │                   │
│   Webhook API     │◄────────┤   Task Updates    │
│                   │         │                   │
└───────────────────┘         └───────────────────┘
```

### Key Components

1. **Outbound API Calls**: The platform makes API calls to SEOWorks to create and query tasks
2. **Webhook Receiver**: A webhook endpoint receives updates when tasks are completed in SEOWorks
3. **Task Mapping**: A system for mapping SEOWorks task IDs to internal request IDs
4. **Status Synchronization**: Automatic updates to request statuses based on SEOWorks data

## Webhook System

The webhook system is central to the integration, allowing SEOWorks to notify the platform when tasks are completed.

### Webhook Endpoint

The platform provides a webhook endpoint at `/api/seoworks/webhook` that accepts POST requests from SEOWorks with task update information.

### Authentication

Webhooks are authenticated using a shared secret:

```typescript
// Webhook authentication
const webhookSecret = process.env.SEOWORKS_WEBHOOK_SECRET;
const providedSecret = req.headers.get('x-seoworks-signature');

if (providedSecret !== webhookSecret) {
  return new Response(JSON.stringify({ error: 'Invalid webhook signature' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### Payload Format

SEOWorks sends webhooks with the following payload format:

```json
{
  "taskId": "SW123456",
  "status": "completed",
  "clientId": "client123",
  "completedUrl": "https://example.com/ford-f150",
  "completedTitle": "Ford F-150 Deals | Example Dealership",
  "taskType": "page",
  "completedAt": "2025-07-01T10:00:00.000Z"
}
```

### Webhook Handler Implementation

```typescript
// app/api/seoworks/webhook/route.ts
import { prisma } from '@/lib/db';
import { incrementPackageUsage } from '@/lib/usage';

export async function POST(req: Request) {
  // Webhook authentication (as shown above)
  
  try {
    const payload = await req.json();
    const { taskId, status, clientId, completedUrl, completedTitle, taskType } = payload;
    
    // Find the associated request using the three-tier lookup strategy
    const request = await findRequestByTaskId(taskId);
    
    if (!request) {
      return new Response(JSON.stringify({ error: 'Request not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Update request status
    if (status === 'completed') {
      await prisma.request.update({
        where: { id: request.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          contentUrl: completedUrl,
          pageTitle: completedTitle,
          completedTasks: {
            push: {
              title: completedTitle,
              url: completedUrl,
              type: taskType,
              completedAt: new Date()
            }
          }
        }
      });
      
      // Increment package usage
      await incrementPackageUsage(request.userId, taskType);
      
      // Send notification email
      await sendTaskCompletionEmail(request.id);
    }
    
    return new Response(JSON.stringify({ 
      success: true,
      requestId: request.id,
      status: 'COMPLETED'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(JSON.stringify({ error: 'Webhook processing error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
```

## ID Mapping Strategy

The platform uses a three-tier lookup strategy to map SEOWorks task IDs to internal requests:

### Tier 1: Direct Request Lookup

```typescript
// Try to find request with matching seoworksTaskId
const requestByTaskId = await prisma.request.findFirst({
  where: { seoworksTaskId: taskId }
});

if (requestByTaskId) {
  return requestByTaskId;
}
```

### Tier 2: Task Mapping Table Lookup

```typescript
// Try to find task mapping
const taskMapping = await prisma.sEOWorksTaskMapping.findUnique({
  where: { seoworksTaskId: taskId },
  include: { request: true }
});

if (taskMapping) {
  return taskMapping.request;
}
```

### Tier 3: Client ID Lookup

```typescript
// Try to find request by client ID (user ID)
const user = await prisma.user.findFirst({
  where: { id: clientId }
});

if (user) {
  // Find the most recent pending request for this user
  const request = await prisma.request.findFirst({
    where: { 
      userId: user.id,
      status: 'PENDING',
      type: taskType // Match the task type (page, blog, etc.)
    },
    orderBy: { createdAt: 'desc' }
  });
  
  if (request) {
    // Update the request with the SEOWorks task ID for future lookups
    await prisma.request.update({
      where: { id: request.id },
      data: { seoworksTaskId: taskId }
    });
    
    return request;
  }
}
```

## Request Workflow

The integration facilitates a complete workflow from request creation to completion:

### 1. Request Creation

When a user creates a new request in Rylie SEO Hub:

```typescript
// Create request in our system
const request = await prisma.request.create({
  data: {
    title: data.title,
    description: data.description,
    type: data.type,
    priority: data.priority,
    userId: session.user.id,
    agencyId: session.user.agencyId,
    keywords: data.keywords,
    targetUrl: data.targetUrl,
    targetCities: data.targetCities,
    targetModels: data.targetModels
  }
});

// If SEOWorks integration is enabled, create task in SEOWorks
if (process.env.SEOWORKS_API_KEY) {
  try {
    const seoworksTaskId = await createSEOWorksTask(request);
    
    // Update request with SEOWorks task ID
    await prisma.request.update({
      where: { id: request.id },
      data: { seoworksTaskId }
    });
  } catch (error) {
    console.error('SEOWorks task creation error:', error);
    // Continue without SEOWorks integration - admin can manually create later
  }
}
```

### 2. SEOWorks Task Creation

Creating a task in SEOWorks:

```typescript
// lib/seoworks/api.ts
export async function createSEOWorksTask(request) {
  const user = await prisma.user.findUnique({
    where: { id: request.userId },
    include: { agency: true }
  });
  
  const clientName = user.agency ? user.agency.name : user.name;
  
  const response = await fetch('https://api.seoworks.com/tasks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.SEOWORKS_API_KEY}`
    },
    body: JSON.stringify({
      clientId: request.userId,
      clientName: clientName,
      taskType: request.type,
      title: request.title,
      description: request.description,
      priority: request.priority.toLowerCase(),
      metadata: {
        keywords: request.keywords,
        targetUrl: request.targetUrl,
        targetCities: request.targetCities,
        targetModels: request.targetModels,
        platformRequestId: request.id
      }
    })
  });
  
  if (!response.ok) {
    throw new Error(`SEOWorks API error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.taskId;
}
```

### 3. Task Status Updates

SEOWorks updates task status:

```
SEOWorks → Webhook → Rylie SEO Hub → Status Update → Email Notification
```

### 4. Completion Tracking

When a task is completed, the platform:

1. Updates the request status to COMPLETED
2. Records completed content details (URL, title, etc.)
3. Increments the user's package usage counters
4. Sends a completion notification email
5. Updates any related tasks

## API Endpoints

The platform provides several API endpoints for SEOWorks integration:

### `POST /api/seoworks/webhook`

Receives webhooks from SEOWorks for task updates (detailed above).

### `POST /api/seoworks/create-task`

Manually creates a SEOWorks task for an existing request:

```typescript
// app/api/seoworks/create-task/route.ts
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !['ADMIN', 'AGENCY_ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    const { requestId } = await req.json();
    
    const request = await prisma.request.findUnique({
      where: { id: requestId }
    });
    
    if (!request) {
      return new Response(JSON.stringify({ error: 'Request not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Check if request already has a SEOWorks task ID
    if (request.seoworksTaskId) {
      return new Response(JSON.stringify({ 
        success: true,
        seoworksTaskId: request.seoworksTaskId,
        message: 'Request already has a SEOWorks task'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Create SEOWorks task
    const seoworksTaskId = await createSEOWorksTask(request);
    
    // Update request with SEOWorks task ID
    await prisma.request.update({
      where: { id: request.id },
      data: { seoworksTaskId }
    });
    
    return new Response(JSON.stringify({ 
      success: true,
      seoworksTaskId
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('SEOWorks task creation error:', error);
    return new Response(JSON.stringify({ 
      error: 'SEOWorks task creation failed',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
```

### `GET /api/seoworks/task/:taskId`

Retrieves task details from SEOWorks:

```typescript
// app/api/seoworks/task/[taskId]/route.ts
export async function GET(req: Request, { params }: { params: { taskId: string } }) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    const { taskId } = params;
    
    const response = await fetch(`https://api.seoworks.com/tasks/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.SEOWORKS_API_KEY}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`SEOWorks API error: ${response.status}`);
    }
    
    const task = await response.json();
    
    return new Response(JSON.stringify({ task }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('SEOWorks task fetch error:', error);
    return new Response(JSON.stringify({ 
      error: 'SEOWorks task fetch failed',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
```

### `POST /api/seoworks/sync`

Synchronizes task statuses between SEOWorks and the platform:

```typescript
// app/api/seoworks/sync/route.ts
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !['ADMIN', 'AGENCY_ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    // Get all requests with SEOWorks task IDs
    const requests = await prisma.request.findMany({
      where: {
        seoworksTaskId: { not: null },
        status: { not: 'COMPLETED' } // Only sync non-completed requests
      },
      select: {
        id: true,
        seoworksTaskId: true,
        status: true
      }
    });
    
    const results = [];
    
    // Process each request
    for (const request of requests) {
      try {
        const response = await fetch(`https://api.seoworks.com/tasks/${request.seoworksTaskId}`, {
          headers: {
            'Authorization': `Bearer ${process.env.SEOWORKS_API_KEY}`
          }
        });
        
        if (!response.ok) {
          results.push({
            requestId: request.id,
            success: false,
            error: `API error: ${response.status}`
          });
          continue;
        }
        
        const task = await response.json();
        
        // Map SEOWorks status to platform status
        const statusMap = {
          'pending': 'PENDING',
          'in_progress': 'IN_PROGRESS',
          'completed': 'COMPLETED',
          'cancelled': 'CANCELLED'
        };
        
        const newStatus = statusMap[task.status] || request.status;
        
        // Update request if status changed
        if (newStatus !== request.status) {
          await prisma.request.update({
            where: { id: request.id },
            data: {
              status: newStatus,
              completedAt: newStatus === 'COMPLETED' ? new Date() : null,
              // Add other fields if available in the task response
              contentUrl: task.completedUrl,
              pageTitle: task.completedTitle
            }
          });
          
          results.push({
            requestId: request.id,
            success: true,
            oldStatus: request.status,
            newStatus
          });
        } else {
          results.push({
            requestId: request.id,
            success: true,
            statusUnchanged: true
          });
        }
      } catch (error) {
        results.push({
          requestId: request.id,
          success: false,
          error: error.message
        });
      }
    }
    
    return new Response(JSON.stringify({ 
      success: true,
      processed: requests.length,
      results
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('SEOWorks sync error:', error);
    return new Response(JSON.stringify({ 
      error: 'SEOWorks sync failed',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
```

## Configuration

### Environment Variables

Configure the following environment variables for SEOWorks integration:

```
SEOWORKS_API_KEY=your-seoworks-api-key
SEOWORKS_WEBHOOK_SECRET=your-webhook-secret
SEOWORKS_API_URL=https://api.seoworks.com
```

### Feature Flag

SEOWorks integration can be enabled/disabled with a feature flag:

```typescript
// lib/features.ts
export const FEATURES = {
  SEOWORKS_INTEGRATION: process.env.SEOWORKS_API_KEY ? true : false,
  // Other feature flags...
};
```

### Webhook URL Configuration

Configure your SEOWorks account to send webhooks to:

```
https://your-domain.com/api/seoworks/webhook
```

Don't forget to set the webhook secret in the SEOWorks dashboard to match your `SEOWORKS_WEBHOOK_SECRET` environment variable.

## Troubleshooting

### Webhook Not Received

If webhooks are not being received:

1. Check the webhook URL configuration in SEOWorks
2. Verify the webhook secret matches
3. Check server logs for webhook requests
4. Ensure your server is publicly accessible
5. Try manually triggering a webhook from SEOWorks

### Task Mapping Failures

If task mapping is failing:

1. Check the SEOWorks task ID in the webhook payload
2. Verify the client ID is correctly set in SEOWorks
3. Check the three-tier lookup implementation
4. Look for database consistency issues

### API Communication Errors

If API calls to SEOWorks fail:

1. Verify the API key is correct
2. Check for API rate limiting
3. Ensure the SEOWorks API URL is correct
4. Check for network connectivity issues

### Webhook Processing Errors

If webhook processing fails:

1. Check the webhook payload format
2. Verify database operations are working
3. Look for errors in email sending
4. Check for exceptions in the webhook handler

### Common Error Patterns

1. **"Request not found"**: The three-tier lookup strategy couldn't find a matching request
   - Solution: Manually map the SEOWorks task ID to a request

2. **"Invalid webhook signature"**: Webhook authentication failed
   - Solution: Verify the webhook secret in both systems

3. **"SEOWorks API error"**: API communication failed
   - Solution: Check API credentials and connectivity

## Extending the Integration

### Adding New Task Types

To add support for a new task type:

1. Update the task type enum in Prisma schema:
   ```prisma
   enum TaskType {
     PAGE
     BLOG
     GBP_POST
     IMPROVEMENT
     NEW_TYPE // Add new type here
   }
   ```

2. Update the package usage tracking:
   ```typescript
   // lib/usage.ts
   export async function incrementPackageUsage(userId: string, taskType: string) {
     // Existing task types...
     
     // Add new task type
     if (taskType === 'new_type') {
       await prisma.user.update({
         where: { id: userId },
         data: { newTypeUsedThisPeriod: { increment: 1 } }
       });
     }
   }
   ```

3. Update the SEOWorks task creation logic to support the new type

### Custom Webhook Handlers

To implement custom webhook handling for specific task types:

```typescript
// lib/seoworks/handlers.ts
export const taskTypeHandlers = {
  page: handlePageCompletion,
  blog: handleBlogCompletion,
  gbp_post: handleGBPPostCompletion,
  improvement: handleImprovementCompletion,
  // Add custom handler for new task type
  new_type: handleNewTypeCompletion
};

async function handleNewTypeCompletion(request, payload) {
  // Custom handling for new task type
  // ...
  
  // Return updated request data
  return {
    status: 'COMPLETED',
    completedAt: new Date(),
    // Custom fields for this task type
    customField1: payload.customData1,
    customField2: payload.customData2
  };
}
```

Then update the webhook handler to use these custom handlers:

```typescript
// app/api/seoworks/webhook/route.ts
import { taskTypeHandlers } from '@/lib/seoworks/handlers';

export async function POST(req: Request) {
  // Authentication and request lookup...
  
  const payload = await req.json();
  const { taskType } = payload;
  
  // Get the appropriate handler for this task type
  const handler = taskTypeHandlers[taskType] || defaultTaskHandler;
  
  // Process the task with the specific handler
  const updateData = await handler(request, payload);
  
  // Update the request with the handler result
  await prisma.request.update({
    where: { id: request.id },
    data: updateData
  });
  
  // Rest of the function...
}
```

### Bi-directional Synchronization

To implement bi-directional synchronization where updates in the platform are sent to SEOWorks:

```typescript
// app/api/requests/[id]/route.ts
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  // Authentication and validation...
  
  const { id } = params;
  const data = await req.json();
  
  // Update the request in our system
  const updatedRequest = await prisma.request.update({
    where: { id },
    data
  });
  
  // If this request has a SEOWorks task ID and SEOWorks integration is enabled,
  // update the task in SEOWorks
  if (updatedRequest.seoworksTaskId && process.env.SEOWORKS_API_KEY) {
    try {
      await updateSEOWorksTask(updatedRequest);
    } catch (error) {
      console.error('SEOWorks task update error:', error);
      // Continue without SEOWorks integration - admin can manually sync later
    }
  }
  
  // Return the updated request
  return new Response(JSON.stringify(updatedRequest), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

// lib/seoworks/api.ts
export async function updateSEOWorksTask(request) {
  const response = await fetch(`https://api.seoworks.com/tasks/${request.seoworksTaskId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.SEOWORKS_API_KEY}`
    },
    body: JSON.stringify({
      title: request.title,
      description: request.description,
      priority: request.priority.toLowerCase(),
      status: request.status.toLowerCase(),
      metadata: {
        keywords: request.keywords,
        targetUrl: request.targetUrl,
        targetCities: request.targetCities,
        targetModels: request.targetModels
      }
    })
  });
  
  if (!response.ok) {
    throw new Error(`SEOWorks API error: ${response.status}`);
  }
  
  return await response.json();
}
```
