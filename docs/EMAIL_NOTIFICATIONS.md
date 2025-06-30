# Email Notifications Setup Guide

This guide covers the email notification system implemented using Mailgun.

## Environment Variables

Add the following environment variables to your `.env` file:

```env
# Mailgun Configuration
MAILGUN_API_KEY=your-mailgun-api-key
MAILGUN_DOMAIN=your-domain.com
MAILGUN_REGION=US  # or EU for European region

# Cron Job Secret (for weekly summaries)
CRON_SECRET=your-secure-cron-secret

# SEOWorks Webhook Secret (if not already set)
SEOWORKS_WEBHOOK_SECRET=your-webhook-secret
```

## Mailgun Setup

1. **Create a Mailgun Account**
   - Sign up at https://www.mailgun.com
   - Verify your domain or use the sandbox domain for testing

2. **Get API Credentials**
   - Navigate to Settings → API Keys
   - Copy your Private API Key
   - Note your domain name (e.g., mg.yourdomain.com)

3. **Configure DNS Records** (for custom domain)
   - Add the DNS records provided by Mailgun to your domain
   - Wait for verification (usually takes a few minutes)

## Email Types

The system sends the following email notifications:

### 1. Welcome Email
- Sent when a user creates their first request
- Introduces the platform features

### 2. Request Created Confirmation
- Sent when a new request is submitted
- Includes request details and next steps

### 3. Status Changed Notification
- Sent when request status changes (e.g., PENDING → IN_PROGRESS)
- Shows old and new status

### 4. Task Completed Notification
- Sent via webhook when SEOWorks completes a task
- Includes task details and progress update

### 5. Weekly Summary
- Sent every Monday at 9 AM (configurable)
- Summarizes completed tasks and upcoming work

## User Preferences

Users can manage their email preferences through:

1. **API Endpoint**: `PATCH /api/user/preferences`
2. **Settings Page**: `/settings` (when UI is implemented)

Available preferences:
- `emailNotifications`: Master switch for all emails
- `requestCreated`: New request confirmations
- `statusChanged`: Status update notifications
- `taskCompleted`: Task completion notifications
- `weeklySummary`: Weekly progress summaries
- `marketingEmails`: Marketing communications

## Unsubscribe Links

All transactional emails include unsubscribe links that:
- Use base64-encoded tokens
- Allow granular unsubscription by email type
- Show a confirmation page after unsubscribing

## Email Queue

The system implements a simple in-memory queue with:
- Automatic retries (up to 3 attempts)
- Exponential backoff (5s, 10s, 20s)
- Error logging for failed sends

For production, consider upgrading to:
- Redis with Bull queue
- AWS SQS
- RabbitMQ

## Setting Up Weekly Summary Cron Job

### Using Render.com

1. In your Render dashboard, go to your web service
2. Navigate to the "Jobs" tab
3. Create a new cron job:
   - **Name**: Weekly Summary Emails
   - **Schedule**: `0 9 * * 1` (Every Monday at 9 AM)
   - **Command**: `curl -X GET https://your-app.onrender.com/api/cron/weekly-summary -H "x-cron-secret: $CRON_SECRET"`

### Using Other Platforms

For other hosting platforms, use their cron job features or external services like:
- Vercel Cron Jobs
- GitHub Actions with schedule
- EasyCron
- Cron-job.org

## Testing Emails

### Test Individual Templates

```bash
# Test welcome email
curl -X POST http://localhost:3000/api/test/email \
  -H "Content-Type: application/json" \
  -d '{"type": "welcome", "userId": "user-id"}'

# Test request created email
curl -X POST http://localhost:3000/api/test/email \
  -H "Content-Type: application/json" \
  -d '{"type": "requestCreated", "requestId": "request-id"}'
```

### Test Webhook Integration

```bash
# Simulate task completion webhook
curl -X POST http://localhost:3000/api/seoworks/webhook \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-webhook-secret" \
  -d '{
    "eventType": "task.completed",
    "timestamp": "2024-01-15T10:00:00Z",
    "data": {
      "externalId": "request-id",
      "taskType": "blog",
      "status": "completed",
      "deliverables": [{
        "type": "blog",
        "title": "SEO Best Practices 2024",
        "url": "https://example.com/blog/seo-best-practices"
      }]
    }
  }'
```

## Monitoring

Monitor email delivery through:

1. **Mailgun Dashboard**
   - View sent/failed emails
   - Check delivery rates
   - Debug bounces and complaints

2. **Application Logs**
   - Check `/lib/logger.ts` output
   - Monitor email queue size
   - Track retry attempts

3. **User Feedback**
   - Monitor support tickets
   - Check spam folder placement
   - Gather preference data

## Best Practices

1. **Content**
   - Keep subject lines clear and descriptive
   - Use preheader text effectively
   - Include clear CTAs

2. **Deliverability**
   - Warm up new domains gradually
   - Monitor sender reputation
   - Handle bounces and complaints

3. **Performance**
   - Batch weekly summaries
   - Use queue for all sends
   - Monitor API rate limits

4. **Security**
   - Never expose API keys in frontend
   - Use environment variables
   - Implement rate limiting

## Troubleshooting

### Emails Not Sending

1. Check environment variables are set correctly
2. Verify Mailgun domain is verified
3. Check application logs for errors
4. Ensure user has valid email and preferences enabled

### Emails Going to Spam

1. Verify SPF/DKIM records are configured
2. Check email content for spam triggers
3. Monitor sender reputation in Mailgun
4. Consider using a dedicated IP for high volume

### Queue Building Up

1. Check for Mailgun API errors
2. Verify API key has correct permissions
3. Monitor rate limits
4. Consider implementing persistent queue