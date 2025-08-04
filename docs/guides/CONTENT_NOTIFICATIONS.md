# Content Notifications

## Overview
When new content is added to a dealership's website (pages, blog posts, or Google Business Profile posts), the dealership user automatically receives an email notification showing the completed work. This ensures clients can see that SEO work is actively being performed on their behalf.

## How It Works

### Trigger
The notification is triggered when the SEOWorks webhook receives a `task.completed` event with:
- `taskType`: `page`, `blog`, `gbp-post`, or `gbp_post`
- `status`: `completed`
- Valid deliverables containing the content details

### Email Recipients
- **Primary**: The dealership user (USER role) who owns the request
- **Fallback**: If no request is found but a `clientId` or `clientEmail` is provided, the system will look up the user and create a retroactive request record

### Email Content
The notification email includes:
- **Subject**: "✨ [Content Type] Added: "[Content Title]""
- **Body**:
  - Friendly greeting with the user's name
  - Clear indication that new content was added
  - Content preview box showing:
    - Content type badge (Page, Blog Post, or Google Business Profile Post)
    - Content title
    - Direct link to view the content
  - Why this matters section explaining SEO benefits
  - Monthly progress summary (if user has an active package)
  - Link to the SEO Hub dashboard

## Implementation Details

### Files Modified
1. **[`lib/mailgun/content-notifications.ts`](../lib/mailgun/content-notifications.ts)**
   - New `contentAddedTemplate()` function for content-specific emails
   - Mobile-responsive HTML template
   - Handles different content types with appropriate messaging

2. **[`app/api/seoworks/webhook/route.ts`](../app/api/seoworks/webhook/route.ts:332-346)**
   - Updated `handleTaskCompleted()` to use content-specific template
   - Detects content tasks (page, blog, gbp-post) vs other task types
   - Falls back to generic template for non-content tasks

### User Preferences
The notification respects the existing `taskCompleted` preference in the `UserPreferences` model:
- If `emailNotifications` is false: No email sent
- If `taskCompleted` is false: No email sent
- Default behavior: Email is sent

Users can manage their preferences at `/settings`.

## Example Scenarios

### Scenario 1: New Page Created
```json
{
  "eventType": "task.completed",
  "data": {
    "taskType": "page",
    "deliverables": [{
      "title": "2024 Toyota Camry Deals in Chicago",
      "url": "https://dealership.com/2024-toyota-camry-chicago"
    }]
  }
}
```
**Result**: Dealership receives email with subject "✨ New Page Added: "2024 Toyota Camry Deals in Chicago""

### Scenario 2: Blog Post Published
```json
{
  "eventType": "task.completed",
  "data": {
    "taskType": "blog",
    "deliverables": [{
      "title": "Winter Car Maintenance Tips",
      "url": "https://dealership.com/blog/winter-maintenance"
    }]
  }
}
```
**Result**: Dealership receives email with subject "✨ Blog Post Added: "Winter Car Maintenance Tips""

### Scenario 3: Google Business Profile Post
```json
{
  "eventType": "task.completed",
  "data": {
    "taskType": "gbp-post",
    "deliverables": [{
      "title": "Black Friday Special - 0% APR",
      "url": "https://posts.gle/abc123"
    }]
  }
}
```
**Result**: Dealership receives email with subject "✨ Google Business Profile Post Added: "Black Friday Special - 0% APR""

## Testing
Run the test suites:
```bash
# Test the email template
npm test lib/mailgun/__tests__/content-notifications.test.ts

# Test the webhook integration
npm test app/api/seoworks/webhook/__tests__/content-notification.test.ts
```

## Monitoring
Monitor email delivery through:
1. **Mailgun Dashboard**: Check delivery status and opens
2. **Application Logs**: Look for `Content notification sent` messages
3. **User Feedback**: Track engagement and satisfaction

## Future Enhancements
1. **Granular Preferences**: Add separate `contentAdded` preference distinct from `taskCompleted`
2. **Content Preview**: Include a snippet or preview of the actual content in the email
3. **Batch Notifications**: Group multiple content additions into a single digest email
4. **Analytics**: Track open rates and click-through rates for optimization