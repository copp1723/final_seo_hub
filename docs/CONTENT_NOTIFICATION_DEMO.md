# Content Notification Demo Guide

## Overview
This guide provides step-by-step instructions for demonstrating the content notification feature during your presentation tomorrow.

## Prerequisites
- Access to the SEO Hub application
- Access to the SEOWorks webhook endpoint
- A test dealership user account with email enabled
- Mailgun configured and working

## Demo Scenarios

### Scenario 1: New Page Added
**Purpose**: Show how dealerships are notified when a new page is added to their website.

**Steps**:
1. Ensure you have a test request in "IN_PROGRESS" status
2. Send this webhook payload to `/api/seoworks/webhook`:
```json
{
  "eventType": "task.completed",
  "timestamp": "2024-01-09T10:00:00Z",
  "data": {
    "externalId": "[REQUEST_ID]",
    "clientId": "[USER_ID]",
    "taskType": "page",
    "status": "completed",
    "deliverables": [
      {
        "type": "page",
        "title": "2024 Toyota Camry Special Offers - Chicago's Best Deals",
        "url": "https://yourdealership.com/2024-toyota-camry-chicago"
      }
    ]
  }
}
```

**Expected Result**:
- Beautiful email sent with subject: "✨ New Page Added: "2024 Toyota Camry Special Offers - Chicago's Best Deals""
- Email shows:
  - Page title and direct link
  - SEO benefits explanation
  - Monthly progress stats
  - Dashboard link

### Scenario 2: Blog Post Published
**Purpose**: Demonstrate content marketing notifications.

**Steps**:
1. Send this webhook payload:
```json
{
  "eventType": "task.completed",
  "timestamp": "2024-01-09T11:00:00Z",
  "data": {
    "externalId": "[REQUEST_ID]",
    "clientId": "[USER_ID]",
    "taskType": "blog",
    "status": "completed",
    "deliverables": [
      {
        "type": "blog",
        "title": "Winter Car Maintenance: 7 Essential Tips for Chicago Drivers",
        "url": "https://yourdealership.com/blog/winter-car-maintenance-tips"
      }
    ]
  }
}
```

**Expected Result**:
- Email with subject: "✨ Blog Post Added: "Winter Car Maintenance: 7 Essential Tips for Chicago Drivers""
- Blog post icon and styling
- Link to read the full blog post

### Scenario 3: Google Business Profile Post
**Purpose**: Show local SEO activity notifications.

**Steps**:
1. Send this webhook payload:
```json
{
  "eventType": "task.completed",
  "timestamp": "2024-01-09T12:00:00Z",
  "data": {
    "externalId": "[REQUEST_ID]",
    "clientId": "[USER_ID]",
    "taskType": "gbp-post",
    "status": "completed",
    "deliverables": [
      {
        "type": "gbp-post",
        "title": "🎄 Holiday Special: 0% APR on All 2024 Models - Limited Time!",
        "url": "https://posts.gle/abc123"
      }
    ]
  }
}
```

**Expected Result**:
- Email with subject: "✨ Google Business Profile Post Added: "🎄 Holiday Special: 0% APR on All 2024 Models - Limited Time!""
- GBP icon and branding
- Direct link to view the post

### Scenario 4: Website Improvement
**Purpose**: Show technical SEO work notifications.

**Steps**:
1. Send this webhook payload:
```json
{
  "eventType": "task.completed",
  "timestamp": "2024-01-09T13:00:00Z",
  "data": {
    "externalId": "[REQUEST_ID]",
    "clientId": "[USER_ID]",
    "taskType": "improvement",
    "status": "completed",
    "deliverables": [
      {
        "type": "improvement",
        "title": "Homepage Load Speed Optimized - 40% Faster",
        "url": "https://yourdealership.com"
      }
    ]
  }
}
```

**Expected Result**:
- Email with subject: "✨ Website Improvement Added: "Homepage Load Speed Optimized - 40% Faster""
- Shows "updated on" instead of "added to"
- Technical improvement icon

## Testing the Webhook

### Using cURL
```bash
curl -X POST https://your-app.com/api/seoworks/webhook \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_WEBHOOK_SECRET" \
  -d '{
    "eventType": "task.completed",
    "timestamp": "2024-01-09T10:00:00Z",
    "data": {
      "externalId": "req_123",
      "clientId": "user_123",
      "taskType": "page",
      "status": "completed",
      "deliverables": [{
        "type": "page",
        "title": "Test Page Title",
        "url": "https://example.com/test"
      }]
    }
  }'
```

### Using the Test Script
Create a file `test-webhook.js`:
```javascript
const fetch = require('node-fetch');

async function testWebhook(taskType, title, url) {
  const response = await fetch('https://your-app.com/api/seoworks/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.SEOWORKS_WEBHOOK_SECRET
    },
    body: JSON.stringify({
      eventType: 'task.completed',
      timestamp: new Date().toISOString(),
      data: {
        externalId: 'req_demo_' + Date.now(),
        clientId: 'user_demo',
        taskType: taskType,
        status: 'completed',
        deliverables: [{
          type: taskType,
          title: title,
          url: url
        }]
      }
    })
  });

  console.log('Response:', await response.json());
}

// Test different content types
testWebhook('page', '2024 Honda Accord Deals', 'https://dealership.com/honda-accord');
```

## Key Points to Highlight

1. **Automatic Notifications**: No manual intervention needed - notifications are sent automatically when content is completed

2. **Professional Design**: Mobile-responsive, branded emails that look professional

3. **Clear Value Communication**: Each email explains why the content matters for SEO

4. **Progress Tracking**: Package users see their monthly progress in every email

5. **Direct Links**: One-click access to view the new content

6. **Respects Preferences**: Users can manage their notification preferences

## Troubleshooting

### Email Not Received
1. Check user preferences: `/settings`
2. Check Mailgun logs
3. Verify webhook secret is correct
4. Check application logs for errors

### Wrong Template Used
- Verify task type is one of: page, blog, gbp-post, gbp_post
- Other task types use the generic template

### Missing Progress Stats
- Ensure the request has a `packageType` set
- Progress only shows for package users

## Email Preview Files
Preview HTML files are available in `/email-previews/`:
- `page-notification.html` - New page example
- `blog-notification.html` - Blog post example
- `gbp-notification.html` - Google Business Profile post
- `improvement-notification.html` - Website improvement
- `no-url-notification.html` - Content without a URL

Open these files in a browser to show how emails will appear to recipients.

## Success Metrics
- Dealerships can SEE the work being done
- Clear subject lines grab attention
- Professional design builds trust
- Direct links drive engagement
- Progress tracking shows value