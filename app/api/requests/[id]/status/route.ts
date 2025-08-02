import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, errorResponse, successResponse } from '@/lib/api-auth'
import { rateLimits } from '@/lib/rate-limit'
import { RequestStatus } from '@prisma/client'
import { z } from 'zod'
import { validateRequest } from '@/lib/validations'
import { queueEmailWithPreferences } from '@/lib/mailgun/queue'
import { statusChangedTemplate } from '@/lib/mailgun/templates'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic';

// Schema for status update
const updateStatusSchema = z.object({
  status: z.nativeEnum(RequestStatus),
  notes: z.string().optional()
})

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // Apply rate limiting
  const rateLimitResponse = await rateLimits.api(request)
  if (rateLimitResponse) return rateLimitResponse
  
  const authResult = await requireAuth(request)
  if (!authResult.authenticated || !authResult.user) return authResult.response || errorResponse('Unauthorized', 401)
  
  // Validate request body
  const validation = await validateRequest(request, updateStatusSchema)
  if (!validation.success) return validation.error
  
  const { data } = validation
  const { id: requestId } = await context.params
  
  try {
    // Get the current request
    const existingRequest = await prisma.requests.findUnique({
      where: { id: requestId },
      include: { users: true }
    })
    
    if (!existingRequest) {
      return errorResponse('Request not found', 404)
    }
    
    // Check permissions (user can only update their own requests unless admin)
    if (existingRequest.users.id !== authResult.user.id && authResult.user.role === 'USER') {
      return errorResponse('Unauthorized', 403)
    }
    
    // Don't allow status change if already completed or cancelled
    if (existingRequest.status === RequestStatus.COMPLETED || 
        existingRequest.status === RequestStatus.CANCELLED) {
      return errorResponse('Cannot update status of completed or cancelled request', 400)
    }
    
    // Update the request
    const updatedRequest = await prisma.requests.update({
      where: { id: requestId },
      data: {
        status: data.status,
        completedAt: data.status === RequestStatus.COMPLETED ? new Date() : null
      },
      include: { users: true }
    })
    
    // Send status change email if status actually changed
    if (existingRequest.status !== data.status) {
      const emailTemplate = statusChangedTemplate(
        updatedRequest,
        updatedRequest.users,
        existingRequest.status,
        data.status
      )
      
      await queueEmailWithPreferences(
        updatedRequest.users?.id,
        'statusChanged',
        { ...emailTemplate,
          to: updatedRequest.users?.email
        }
      )
      
      logger.info('Request status updated with email notification', {
        requestId,
        oldStatus: existingRequest.status,
        newStatus: data.status,
        userId: updatedRequest.users?.id
      })
    }
    
    return successResponse({ 
      request: updatedRequest,
      message: 'Request status updated successfully'
    }, 200)
  } catch (error) {
    logger.error('Error updating request status', error, {
      requestId,
      status: data.status
    })
    return errorResponse('Failed to update request status', 500)
  }
}
