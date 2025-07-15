import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, errorResponse, successResponse } from '@/lib/api-auth'
import { rateLimits } from '@/lib/rate-limit'
import { z } from 'zod'
import { validateRequest } from '@/lib/validations'
import { logger } from '@/lib/logger'

// Schema for updating preferences
const updatePreferencesSchema = z.object({
  emailNotifications: z.boolean().optional(),
  requestCreated: z.boolean().optional(),
  statusChanged: z.boolean().optional(),
  taskCompleted: z.boolean().optional(),
  weeklySummary: z.boolean().optional(),
  marketingEmails: z.boolean().optional(),
  timezone: z.string().optional(),
  language: z.string().optional()
})

// GET user preferences
export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await rateLimits.api(request)
  if (rateLimitResponse) return rateLimitResponse
  
  const authResult = await requireAuth()
  if (!authResult.authenticated) return authResult.response
  
  try {
    // Get or create user preferences
    let preferences = await prisma.users.preferences.findUnique({
      where: { userId: authResult.user.id }
    })
    
    // If preferences don't exist, create default ones
    if (!preferences) {
      preferences = await prisma.users.preferences.create({
        data: {
          userId: authResult.user.id,
          emailNotifications: true,
          requestCreated: true,
          statusChanged: true,
          taskCompleted: true,
          weeklySummary: true,
          marketingEmails: false,
          timezone: 'America/New_York',
          language: 'en'
        }
      })
    }
    
    return successResponse({ preferences })
  } catch (error) {
    logger.error('Error fetching user preferences', error, {
      userId: authResult.user.id
    })
    return errorResponse('Failed to fetch preferences', 500)
  }
}

// PATCH update user preferences
export async function PATCH(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await rateLimits.api(request)
  if (rateLimitResponse) return rateLimitResponse
  
  const authResult = await requireAuth()
  if (!authResult.authenticated) return authResult.response
  
  // Validate request body
  const validation = await validateRequest(request, updatePreferencesSchema)
  if (!validation.success) return validation.error
  
  const { data } = validation
  
  try {
    // Update or create preferences
    const preferences = await prisma.users.preferences.upsert({
      where: { userId: authResult.user.id },
      update: data,
      create: {
        userId: authResult.user.id,
        ...data
      }
    })
    
    logger.info('User preferences updated', {
      userId: authResult.user.id,
      changes: data
    })
    
    return successResponse({ 
      preferences 
    }, 'Preferences updated successfully')
  } catch (error) {
    logger.error('Error updating user preferences', error, {
      userId: authResult.user.id
    })
    return errorResponse('Failed to update preferences', 500)
  }
}
