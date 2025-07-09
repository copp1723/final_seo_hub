import { NextRequest } from 'next/server'
import { successResponse, errorResponse } from '@/lib/api-auth'

export async function POST(request: NextRequest) {
  try {
    const { taskType, userId, title } = await request.json()
    
    // Default values for demo
    const contentTitle = title || getDemoTitle(taskType || 'page')
    const contentUrl = getDemoUrl(taskType || 'page')
    
    // Send test webhook to your own endpoint
    const webhookPayload = {
      eventType: 'task.completed',
      timestamp: new Date().toISOString(),
      data: {
        externalId: `demo-${Date.now()}`,
        clientId: userId || 'demo-user-id',
        taskType: taskType || 'page',
        status: 'completed',
        completionDate: new Date().toISOString(),
        deliverables: [{
          title: contentTitle,
          type: taskType || 'page',
          url: contentUrl
        }]
      }
    }
    
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/seoworks/webhook`
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.SEOWORKS_WEBHOOK_SECRET!
      },
      body: JSON.stringify(webhookPayload)
    })
    
    const result = await response.json()
    
    return successResponse({
      success: true,
      message: 'Test webhook sent successfully',
      webhookResponse: result,
      webhookStatus: response.status,
      payload: webhookPayload,
      webhookUrl
    })
  } catch (error) {
    return errorResponse(`Test webhook failed: ${error}`, 500)
  }
}

function getDemoTitle(taskType: string): string {
  const titles = {
    page: '2024 Toyota Camry Deals in Chicago',
    blog: 'Winter Car Maintenance Tips for 2024',
    gbp_post: 'Black Friday Special - 0% APR on All Models',
    'gbp-post': 'Black Friday Special - 0% APR on All Models',
    improvement: 'Homepage Speed Optimization',
    maintenance: 'SSL Certificate Update'
  }
  
  return titles[taskType as keyof typeof titles] || 'Demo Content'
}

function getDemoUrl(taskType: string): string {
  const urls = {
    page: 'https://dealership.com/2024-toyota-camry-chicago',
    blog: 'https://dealership.com/blog/winter-maintenance-tips',
    gbp_post: 'https://posts.gle/abc123demo',
    'gbp-post': 'https://posts.gle/abc123demo',
    improvement: 'https://dealership.com',
    maintenance: 'https://dealership.com'
  }
  
  return urls[taskType as keyof typeof urls] || 'https://dealership.com/demo-content'
}

// GET endpoint for quick testing
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const taskType = url.searchParams.get('type') || 'page'
  const userId = url.searchParams.get('userId') || 'demo-user'
  
  // Trigger the POST with query params
  return POST(new NextRequest(request.url, {
    method: 'POST',
    body: JSON.stringify({ taskType, userId })
  }))
}