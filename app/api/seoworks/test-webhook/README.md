# SEOWorks Test Webhook

This endpoint simulates a task completion webhook for testing purposes.

## Usage
Send a POST request with optional task details:

```bash
curl -X POST https://rylie-seo-hub.onrender.com/api/seoworks/test-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "externalId": "task-456",
    "taskType": "page",
    "completionNotes": "Homepage redesign completed"
  }'
```

The endpoint will:
1. Create a properly formatted webhook payload
2. Send it to the actual webhook endpoint
3. Return the results for debugging