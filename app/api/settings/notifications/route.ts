import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, errorResponse, successResponse } from '@/lib/api-auth'
import { rateLimits } from '@/lib/rate-limit'
import { validateRequest, notificationPreferencesSchema } from '@/lib/validations'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await rateLimits.api(request)
  if (rateLimitResponse) return rateLimitResponse
  
  const authResult = await requireAuth()
  if (!authResult.authenticated || !authResult.user) return authResult.response
  
  try {
    const preferences = await prisma.userPreferences.findUnique({
      where: { userId: authResult.user.id },
      select: {
        emailNotifications: true,
        requestCreated: true,
        statusChanged: true,
        taskCompleted: true,
        weeklySummary: true,
        marketingEmails: true,
      }
    })
    
    // Return default preferences if none exist
    const defaultPreferences = {
      emailNotifications: true,
      requestCreated: true,
      statusChanged: true,
      taskCompleted: true,
      weeklySummary: true,
      marketingEmails: false,
    }
    
    return successResponse({ 
      preferences: preferences || defaultPreferences 
    })
  } catch (error) {
    logger.error('Error fetching notification preferences:', error, { userId: authResult.user.id })
    return errorResponse('Failed to fetch notification preferences', 500)
  }
}

export async function PUT(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await rateLimits.api(request)
  if (rateLimitResponse) return rateLimitResponse
  
  const authResult = await requireAuth()
  if (!authResult.authenticated || !authResult.user) return authResult.response
  
  // Validate request body
  const validation = await validateRequest(request, notificationPreferencesSchema)
  if (!validation.success) return validation.error
  
  const { data } = validation
  
  try {
    const preferences = await prisma.userPreferences.upsert({
      where: { userId: authResult.user.id },
      create: {
        userId: authResult.user.id,
        ...data
      },
      update: data,
      select: {
        emailNotifications: true,
        requestCreated: true,
        statusChanged: true,
        taskCompleted: true,
        weeklySummary: true,
        marketingEmails: true,
      }
    })
    
    logger.info('Notification preferences updated', { userId: authResult.user.id })
    return successResponse({ preferences }, 'Notification preferences updated successfully')
  } catch (error) {
    logger.error('Error updating notification preferences:', error, { userId: authResult.user.id })
    return errorResponse('Failed to update notification preferences', 500)
  }
}