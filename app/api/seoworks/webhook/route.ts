import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

// Timing-safe comparison for API key
function timingSafeEqual(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a)
  const bBuffer = Buffer.from(b)
  
  if (aBuffer.length !== bBuffer.length) {
    return false
  }
  
  return crypto.timingSafeEqual(aBuffer, bBuffer)
}

// GET endpoint for testing connectivity
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key')
  
  if (!apiKey || !process.env.SEOWORKS_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  if (!timingSafeEqual(apiKey, process.env.SEOWORKS_WEBHOOK_SECRET)) {
    console.error('Failed webhook authentication attempt')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  return NextResponse.json({ 
    status: 'ok',
    message: 'Webhook endpoint is ready to receive task updates'
  })
}

// POST endpoint for receiving task updates
export async function POST(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key')
  
  if (!apiKey || !process.env.SEOWORKS_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  if (!timingSafeEqual(apiKey, process.env.SEOWORKS_WEBHOOK_SECRET)) {
    console.error('Failed webhook authentication attempt')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    const payload = await request.json()
    
    // Validate required fields
    if (!payload.eventType || !payload.timestamp || !payload.data) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 })
    }
    
    const { eventType, timestamp, data } = payload
    
    // Validate task data
    if (!data.externalId || !data.taskType || !data.status) {
      return NextResponse.json({ 
        error: 'Missing required task data fields' 
      }, { status: 400 })
    }
    
    // Find the request by external ID
    const existingRequest = await prisma.request.findFirst({
      where: {
        // Store external ID in description or create a new field
        description: {
          contains: `[SEOWorks:${data.externalId}]`
        }
      }
    })
    
    if (!existingRequest) {
      console.log(`No matching request found for external ID: ${data.externalId}`)
      // Still return success to avoid retries from SEOWorks
      return NextResponse.json({ 
        success: true,
        message: 'Webhook received (no matching request found)'
      })
    }
    
    // Update request based on event type
    const updateData: any = {
      status: data.status,
      updatedAt: new Date(timestamp),
    }
    
    if (eventType === 'task.completed' && data.completionDate) {
      updateData.completedAt = new Date(data.completionDate)
      
      if (data.deliverables && data.deliverables.length > 0) {
        const firstDeliverable = data.deliverables[0]
        updateData.contentUrl = firstDeliverable.url
        updateData.pageTitle = firstDeliverable.title
      }
    }
    
    // Update the request
    await prisma.request.update({
      where: { id: existingRequest.id },
      data: updateData
    })
    
    console.log(`Successfully processed webhook for task ${data.externalId}`)
    
    return NextResponse.json({ 
      success: true,
      message: 'Webhook processed successfully'
    })
    
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}