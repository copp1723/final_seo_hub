import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateApiKey, errorResponse, successResponse } from '@/lib/api-auth'
import { rateLimits } from '@/lib/rate-limit'
import { RequestStatus } from '@prisma/client'
import { validateRequest, seoworksWebhookSchema } from '@/lib/validations/index'
import { incrementUsage, TaskType } from '@/lib/package-utils'

// GET endpoint for testing connectivity
export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await rateLimits.webhook(request)
  if (rateLimitResponse) return rateLimitResponse
  
  const validation = validateApiKey(request, 'SEOWORKS_WEBHOOK_SECRET')
  if (!validation.valid) return validation.response
  
  return successResponse({
    status: 'ok',
    message: 'Webhook endpoint is ready to receive task updates'
  })
}

// POST endpoint for receiving task updates
export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await rateLimits.webhook(request)
  if (rateLimitResponse) return rateLimitResponse
  
  const apiKeyValidation = validateApiKey(request, 'SEOWORKS_WEBHOOK_SECRET')
  if (!apiKeyValidation.valid) return apiKeyValidation.response
  
  // Validate webhook payload
  const payloadValidation = await validateRequest(request, seoworksWebhookSchema)
  if (!payloadValidation.success) return payloadValidation.error
  
  const payload = payloadValidation.data
  
  try {
    const { eventType, timestamp, data } = payload
    
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
    
    // Map external status to our enum
    const statusMap: Record<string, RequestStatus> = {
      'pending': RequestStatus.PENDING,
      'in_progress': RequestStatus.IN_PROGRESS,
      'completed': RequestStatus.COMPLETED,
      'cancelled': RequestStatus.CANCELLED,
    }
    
    // Update request based on event type
    const updateData: any = {
      status: statusMap[data.status.toLowerCase()] || RequestStatus.PENDING,
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
    const updatedRequest = await prisma.request.update({
      where: { id: existingRequest.id },
      data: updateData
    })
    
    // If task completed, increment usage
    if (eventType === 'task.completed' && updatedRequest.userId) {
      let taskTypeForUsage: TaskType | null = null
      switch (updatedRequest.type.toLowerCase()) {
        case 'page':
          taskTypeForUsage = 'pages'
          break
        case 'blog':
          taskTypeForUsage = 'blogs'
          break
        case 'gbp_post': // As per schema comment
          taskTypeForUsage = 'gbpPosts'
          break
        case 'maintenance': // Assuming maintenance maps to improvements
          taskTypeForUsage = 'improvements'
          break
        default:
          console.warn(`Webhook: Unknown request type ${updatedRequest.type} for usage tracking for request ID ${updatedRequest.id}`)
      }

      if (taskTypeForUsage) {
        try {
          await incrementUsage(updatedRequest.userId, taskTypeForUsage)
          console.log(`Webhook: Successfully incremented ${taskTypeForUsage} usage for user ${updatedRequest.userId}`)
        } catch (usageError: any) {
          console.error(`Webhook: Failed to increment usage for user ${updatedRequest.userId}, request ${updatedRequest.id}: ${usageError.message}`)
          // Decide if this error should affect the webhook response.
          // For now, log it and continue, as the primary task update succeeded.
        }
      }
    }

    console.log(`Successfully processed webhook for task ${data.externalId}`)
    
    return successResponse(null, 'Webhook processed successfully')
    
  } catch (error) {
    console.error('Webhook processing error:', error)
    return errorResponse('Internal server error', 500)
  }
}