import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, errorResponse, successResponse } from '@/lib/api-auth'
import { rateLimits } from '@/lib/rate-limit'
import { validateRequest, notificationPreferencesSchema } from '@/lib/validations'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  logger.info('🔍 GET /api/settings/notifications - Start')
  
  // Apply rate limiting
  const rateLimitResponse = await rateLimits.api(request)
  if (rateLimitResponse) {
    logger.warn('⚠️ Rate limited')
    return rateLimitResponse
  }
  
  const authResult = await requireAuth(request)
  if (!authResult.authenticated || !authResult.user) {
    logger.error('❌ Authentication failed')
    return authResult.response
  }
  
  logger.info('🔐 Auth result:', {
    authenticated: authResult.authenticated,
    userId: authResult.user.id,
    hasUser: !!authResult.user
  })
  
  try {
    logger.info('🗄️ Querying userPreferences', { userId: authResult.user.id })
    
    const preferences = await prisma.user_preferences.findUnique({
      where: { userId: authResult.user.id },
      select: {
        emailNotifications: true,
        requestCreated: true,
        statusChanged: true,
        taskCompleted: true,
        weeklySummary: true,
        marketingEmails: true
      }
    })
    
    logger.info('📊 Query result:', {
      found: !!preferences,
      preferences: preferences ? 'exists' : 'null'
    })
    
    // Return default preferences if none exist
    const defaultPreferences = {
      emailNotifications: true,
      requestCreated: true,
      statusChanged: true,
      taskCompleted: true,
      weeklySummary: true,
      marketingEmails: false
    }
    
    const result = preferences || defaultPreferences
    logger.info('✅ Returning preferences:', result)
    
    return successResponse({
      preferences: result
    })
  } catch (error) {
    logger.error('💥 Database error in notification preferences:', error, {
      userId: authResult.user.id,
      errorName: error instanceof Error ? error.name : 'Unknown',
      errorMessage: error instanceof Error ? error.message : String(error)
    })
    return errorResponse('Failed to fetch notification preferences', 500)
  }
}

export async function PUT(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await rateLimits.api(request)
  if (rateLimitResponse) return rateLimitResponse
  
  const authResult = await requireAuth(request)
  if (!authResult.authenticated || !authResult.user) return authResult.response
  
  // Validate request body
  const validation = await validateRequest(request, notificationPreferencesSchema)
  if (!validation.success) return validation.error
  
  const { data } = validation
  
  try {
    const preferences = await prisma.user_preferences.upsert({
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
        marketingEmails: true
      }
    })
    
    logger.info('Notification preferences updated', { userId: authResult.user.id })
    return successResponse({ preferences }, 'Notification preferences updated successfully')
  } catch (error) {
    logger.error('Error updating notification preferences:', error, { userId: authResult.user.id })
    return errorResponse('Failed to update notification preferences', 500)
  }
}
