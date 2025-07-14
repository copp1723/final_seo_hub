# SEOWorks Client ID Mapping Guide

## How Client Identification Works

When SEOWorks sends webhook events, they need to identify which dealership/user the task belongs to. They can use:

1. **clientId**: The User ID from your database
2. **clientEmail**: The User's email address
3. **externalId**: Your internal request ID (if tasks originate from your system)

## Recommended Approach

### Step 1: Create Integration Users
Run the SQL script to create one user per dealership:
```sql
-- This creates users with emails like:
-- jay.hatfield.chevrolet.of.columbus@seoworks.integration
```

### Step 2: Provide Mapping to SEOWorks
After running the script, you'll get a table like:

| Dealership Name | User ID (clientId) | Email (clientEmail) |
|-----------------|-------------------|---------------------|
| Jay Hatfield Chevrolet of Columbus | 123e4567-... | jay.hatfield.chevrolet.of.columbus@seoworks.integration |
| Jay Hatfield Chevrolet GMC of Chanute | 223e4567-... | jay.hatfield.chevrolet.gmc.of.chanute@seoworks.integration |
| ... | ... | ... |

### Step 3: SEOWorks Webhook Format
SEOWorks should send webhooks like:

```json
{
  "eventType": "task.completed",
  "data": {
    "externalId": "seoworks-task-123",
    "clientId": "123e4567-e89b-12d3-a456-426614174000",  // User ID from mapping
    "clientEmail": "jay.hatfield.chevrolet.of.columbus@seoworks.integration",  // Or use email
    "taskType": "page",  // Must be: page, blog, gbp_post, or improvement
    "status": "completed",
    "completionDate": "2025-01-14T10:00:00Z",
    "deliverables": [{
      "type": "page",
      "title": "Ford F-150 Deals | Jay Hatfield Chevrolet",
      "url": "https://www.jayhatfieldchevy.net/ford-f150"
    }]
  }
}
```

## Important Notes

1. **Either clientId OR clientEmail is required** - SEOWorks can use whichever is easier
2. **Case-sensitive matching** - User IDs must match exactly
3. **Email matching is case-insensitive** - Emails will be matched regardless of case
4. **Task types must be exact**: Use `page`, `blog`, `gbp_post`, or `improvement`

## Dashboard Updates

When a webhook is received:
1. The system finds the user by ID or email
2. Updates the request progress counters
3. Increments the dealership's usage for the current billing period
4. The dashboard automatically reflects the new counts

## Testing

Before going live:
1. Have SEOWorks send a test webhook for one dealership
2. Verify the dashboard updates correctly
3. Check that usage counters increment
4. Confirm email notifications are sent (if enabled)