import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { errorResponse, successResponse } from '@/lib/api-auth'
import { logger } from '@/lib/logger'
import { verifyUnsubscribeToken } from '@/lib/mailgun/secure-tokens'
import { getBrandingFromRequest } from '@/lib/branding/config'


// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic';
// GET endpoint for unsubscribe link
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const token = searchParams.get('token')
  
  if (!token) {
    return errorResponse('Invalid unsubscribe link', 400)
  }
  
  try {
    // Verify the secure token
    const tokenData = verifyUnsubscribeToken(token)
    
    if (!tokenData) {
      return errorResponse('Invalid or expired unsubscribe token', 400)
    }
    
    const { userId, emailType } = tokenData
    
    // Get user preferences
    const preferences = await prisma.user_preferences.findUnique({
      where: { userId }
    })
    
    if (!preferences) {
      return errorResponse('User preferences not found', 404)
    }
    
    // Update the specific email preference
    const updateData: any = {}
    
    switch (emailType) {
      case 'all':
        updateData.emailNotifications = false
        break
      case 'requestCreated':
        updateData.requestCreated = false
        break
      case 'statusChanged':
        updateData.statusChanged = false
        break
      case 'taskCompleted':
        updateData.taskCompleted = false
        break
      case 'weeklySummary':
        updateData.weeklySummary = false
        break
      case 'marketing':
        updateData.marketingEmails = false
        break
      default:
        return errorResponse('Invalid email type', 400)
    }
    
    // Update preferences
    await prisma.user_preferences.update({
      where: { userId },
      data: updateData
    })
    
    logger.info('User unsubscribed from email', {
      userId,
      emailType
    })
    
    // Get branding configuration
    const branding = getBrandingFromRequest(request)
    
    // Return HTML response for browser
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unsubscribed - ${branding.companyName}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #f5f5f5;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
    }
   .container {
      background-color: white;
      padding: 48px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      text-align: center;
      max-width: 400px;
    }
    h1 {
      color: ${branding.primaryColor};
      margin-bottom: 16px;
    }
    p {
      color: #666;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    a {
      color: ${branding.primaryColor};
      text-decoration: none;
      font-weight: 500;
    }
    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Unsubscribed Successfully</h1>
    <p>You have been unsubscribed from ${emailType === 'all' ? 'all email notifications' : `${emailType.replace(/([A-Z])/g, ' $1').toLowerCase()} emails`}.</p>
    <p>You can manage your email preferences anytime in your <a href="/settings">account settings</a>.</p>
    <p><a href="/dashboard">Return to Dashboard</a></p>
  </div>
</body>
</html>
    `
    
    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html'
      }
    })
  } catch (error) {
    logger.error('Error processing unsubscribe', error)
    return errorResponse('Failed to process unsubscribe request', 500)
  }
}
