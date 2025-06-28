# SEOWorks Task Status Webhook

This endpoint receives task status updates from SEOWorks.

## Endpoint Details
- **URL**: `/api/seoworks/webhook`
- **Methods**: GET (test connectivity), POST (receive updates)
- **Authentication**: `x-api-key` header

## Security Features
- Timing-safe API key comparison
- Failed authentication logging
- HTTPS only in production

## Testing
```bash
# Test connectivity
curl -X GET https://rylie-seo-hub.onrender.com/api/seoworks/webhook \
  -H "x-api-key: your-webhook-secret"

# Send test webhook
curl -X POST https://rylie-seo-hub.onrender.com/api/seoworks/test-webhook \
  -H "Content-Type: application/json" \
  -d '{"externalId": "task-123", "taskType": "blog"}'
```