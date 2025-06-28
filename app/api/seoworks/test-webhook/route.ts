import { NextRequest, NextResponse } from 'next/server'

// Test endpoint to simulate task completion
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Create a simulated webhook payload
    const webhookPayload = {
      eventType: 'task.completed',
      timestamp: new Date().toISOString(),
      data: {
        externalId: body.externalId || 'task-123',
        taskType: body.taskType || 'blog',
        status: 'completed',
        completionDate: new Date().toISOString(),
        completionNotes: body.completionNotes || 'Task completed successfully',
        deliverables: [
          {
            type: 'blog_post',
            url: 'https://example.com/blog/test-post',
            title: 'Test Blog Post',
            description: 'Test description'
          }
        ],
        actualHours: 6.5,
        qualityScore: 5
      }
    }
    
    // Call the actual webhook endpoint
    const webhookUrl = new URL('/api/seoworks/webhook', request.url)
    const webhookResponse = await fetch(webhookUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.SEOWORKS_WEBHOOK_SECRET || 'test-secret'
      },
      body: JSON.stringify(webhookPayload)
    })
    
    const result = await webhookResponse.json()
    
    return NextResponse.json({
      message: 'Test webhook sent',
      payload: webhookPayload,
      response: result,
      status: webhookResponse.status
    })
    
  } catch (error) {
    console.error('Test webhook error:', error)
    return NextResponse.json({ 
      error: 'Failed to send test webhook' 
    }, { status: 500 })
  }
}