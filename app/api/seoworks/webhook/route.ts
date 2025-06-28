import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateApiKey, errorResponse, successResponse } from '@/lib/api-auth'

// GET endpoint for testing connectivity
export async function GET(request: NextRequest) {
  const validation = validateApiKey(request, 'SEOWORKS_WEBHOOK_SECRET')
  if (!validation.valid) return validation.response
  
  return successResponse({
    status: 'ok',
    message: 'Webhook endpoint is ready to receive task updates'
  })
}

// POST endpoint for receiving task updates
export async function POST(request: NextRequest) {
  const validation = validateApiKey(request, 'SEOWORKS_WEBHOOK_SECRET')
  if (!validation.valid) return validation.response
  
  try {
    const payload = await request.json()
    
    // Validate required fields
    if (!payload.eventType || !payload.timestamp || !payload.data) {
      return errorResponse('Missing required fields')
    }
    
    const { eventType, timestamp, data } = payload
    
    // Validate task data
    if (!data.externalId || !data.taskType || !data.status) {
      return errorResponse('Missing required task data fields')
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
      return successResponse(null, 'Webhook received (no matching request found)')
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
    
    return successResponse(null, 'Webhook processed successfully')
    
  } catch (error) {
    console.error('Webhook processing error:', error)
    return errorResponse('Internal server error', 500)
  }
}