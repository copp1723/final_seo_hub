# Orphaned Task Storage System

## Overview

The Orphaned Task Storage System is designed to prevent data loss when SEOWorks webhooks arrive for dealerships that haven't been onboarded to the SEO Hub platform yet. This commonly happens when:

1. A dealership is working directly with SEOWorks before being onboarded to the Hub
2. There's a timing mismatch between task completion and dealership onboarding
3. A dealership is being migrated from direct SEOWorks management to the Hub

## Architecture

### Database Schema

The system uses a dedicated `orphaned_tasks` table with the following structure:

```sql
CREATE TABLE "orphaned_tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalId" TEXT NOT NULL UNIQUE,
    "clientId" TEXT,
    "clientEmail" TEXT,
    "eventType" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "completionDate" TEXT,
    "deliverables" JSONB,
    "rawPayload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "linkedRequestId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Key Fields

- **externalId**: The SEOWorks task ID (unique identifier)
- **clientId**: SEOWorks client ID (if provided in webhook)
- **clientEmail**: Client email address (if provided in webhook)
- **eventType**: Type of webhook event (task.completed, task.updated, etc.)
- **taskType**: Type of task (page, blog, gbp_post, improvement, etc.)
- **rawPayload**: Complete webhook payload for reference
- **processed**: Boolean flag indicating if the task has been processed
- **linkedRequestId**: ID of the request created from this orphaned task

## Workflow

### 1. Webhook Reception

When a webhook arrives at `/api/seoworks/webhook`, the system:

1. Attempts to find a matching request by external ID
2. If not found, tries to find by SEOWorks task ID
3. If still not found, attempts to find the user by client ID or email
4. If no user is found, stores the webhook data as an orphaned task

```typescript
// Store orphaned task data for later processing
const orphanedTask = await prisma.orphaned_tasks.create({
  data: {
    externalId: data.externalId,
    clientId: data.clientId,
    clientEmail: data.clientEmail,
    eventType,
    taskType: data.taskType,
    status: data.status,
    completionDate: data.completionDate,
    deliverables: data.deliverables || null,
    rawPayload: payload,
    processed: false,
    notes: 'Webhook received for unknown dealership - task orphaned for later processing'
  }
})
```

### 2. Dealership Onboarding

When a dealership completes onboarding, the system automatically:

1. Searches for orphaned tasks matching the user's ID or email
2. Processes completed tasks by creating corresponding requests
3. Marks non-completed tasks as processed with appropriate notes
4. Links processed tasks to the created requests

### 3. Manual Processing

Administrators can manually process orphaned tasks using the API endpoint:

```bash
POST /api/seoworks/process-orphaned-tasks
{
  "userId": "user_id",
  "userEmail": "user@example.com",
  "clientId": "seoworks_client_id"
}
```

## API Endpoints

### Process Orphaned Tasks

**POST** `/api/seoworks/process-orphaned-tasks`

Processes orphaned tasks for a specific user.

**Request Body:**
```json
{
  "userId": "string (optional)",
  "userEmail": "string (optional)", 
  "clientId": "string (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Orphaned tasks processed successfully",
  "userId": "user_id",
  "userEmail": "user@example.com",
  "orphanedTasksProcessed": 3,
  "requestsCreated": 2
}
```

### List Orphaned Tasks

**GET** `/api/seoworks/process-orphaned-tasks`

Lists orphaned tasks with optional filtering.

**Query Parameters:**
- `processed`: Filter by processed status (true/false)
- `clientId`: Filter by client ID
- `clientEmail`: Filter by client email

**Response:**
```json
{
  "success": true,
  "orphanedTasks": [...],
  "summary": [...],
  "total": 10
}
```

## Processing Logic

### Completed Tasks

For tasks with `eventType: 'task.completed'`, the system:

1. Creates a new request with status 'COMPLETED'
2. Sets appropriate completion counters based on task type
3. Stores deliverables in the request
4. Links the orphaned task to the new request

### Non-Completed Tasks

For other event types (updated, cancelled), the system:

1. Marks the orphaned task as processed
2. Adds notes about the processing
3. Does not create a request (since task wasn't completed)

## Task Type Mapping

| SEOWorks Task Type | Hub Request Type | Completion Counter |
|-------------------|------------------|-------------------|
| page              | page             | pagesCompleted    |
| blog              | blog             | blogsCompleted    |
| gbp_post          | gbp_post         | gbpPostsCompleted |
| improvement       | improvement      | improvementsCompleted |
| maintenance       | improvement      | improvementsCompleted |

## Error Handling

### Webhook Storage Failures

If storing an orphaned task fails:
- The webhook still returns success to prevent SEOWorks retries
- The failure is logged with full context
- A response indicates the storage failure

### Processing Failures

If processing an individual orphaned task fails:
- Other tasks continue to be processed
- The failure is logged with task context
- The failed task remains unprocessed for retry

## Monitoring and Maintenance

### Logging

All orphaned task operations are logged with:
- Task IDs and external IDs
- User information when available
- Processing results and error details
- Timestamps for audit trails

### Cleanup

Consider implementing periodic cleanup of:
- Very old processed orphaned tasks (>90 days)
- Failed tasks that can't be linked to users
- Orphaned tasks with invalid data

## Usage Examples

### Testing the System

Run the test script to verify functionality:

```bash
node scripts/test-orphaned-task-storage.js
```

### Manual Processing

Process orphaned tasks for a newly onboarded user:

```bash
curl -X POST /api/seoworks/process-orphaned-tasks \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_webhook_secret" \
  -d '{"userEmail": "newuser@dealership.com"}'
```

### Monitoring Orphaned Tasks

List unprocessed orphaned tasks:

```bash
curl "/api/seoworks/process-orphaned-tasks?processed=false" \
  -H "x-api-key: your_webhook_secret"
```

## Best Practices

1. **Monitor regularly**: Check for unprocessed orphaned tasks
2. **Process quickly**: Run processing after each dealership onboarding
3. **Clean up**: Remove old processed tasks to keep the table manageable
4. **Log thoroughly**: Maintain audit trails for debugging
5. **Test scenarios**: Regularly test the orphaned task workflow

## Future Enhancements

1. **Automatic retry**: Implement automatic retry for failed processing
2. **Bulk processing**: Add endpoints for bulk processing operations
3. **Analytics**: Track metrics on orphaned task frequency and processing
4. **Notifications**: Alert admins when orphaned tasks accumulate
5. **Advanced matching**: Improve user matching logic with fuzzy matching