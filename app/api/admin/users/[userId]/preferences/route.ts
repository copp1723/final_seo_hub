import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, errorResponse, successResponse } from '@/lib/api-auth'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const updatePreferencesSchema = z.object({
  emailNotifications: z.boolean().optional(),
  requestCreated: z.boolean().optional(),
  statusChanged: z.boolean().optional(),
  taskCompleted: z.boolean().optional(),
  weeklySummary: z.boolean().optional(),
  marketingEmails: z.boolean().optional()
})

// PATCH update specific user's notification preferences (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const authResult = await requireAuth()
  if (!authResult.authenticated || !authResult.user) return authResult.response
  
  // Check if user has admin privileges
  if (authResult.user.role !== 'AGENCY_ADMIN' && authResult.user.role !== 'SUPER_ADMIN') {
    return errorResponse('Insufficient permissions', 403)
  }
  
  const { userId } = await params
  
  try {
    // Parse request body
    const body = await request.json()
    const validatedData = updatePreferencesSchema.parse(body)
    
    // Check if target user exists and admin has permission to modify them
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        agencyId: true,
        email: true,
        name: true
      }
    })
    
    if (!targetUser) {
      return errorResponse('User not found', 404)
    }
    
    // Agency admins can only modify users in their agency
    if (authResult.user.role === 'AGENCY_ADMIN' && 
        targetUser.agencyId !== authResult.user.agencyId) {
      return errorResponse('Cannot modify users outside your agency', 403)
    }
    
    // Update or create preferences
    const preferences = await prisma.userPreferences.upsert({
      where: { userId },
      update: validatedData,
      create: {
        userId,
        emailNotifications: validatedData.emailNotifications ?? true,
        requestCreated: validatedData.requestCreated ?? true,
        statusChanged: validatedData.statusChanged ?? true,
        taskCompleted: validatedData.taskCompleted ?? true,
        weeklySummary: validatedData.weeklySummary ?? true,
        marketingEmails: validatedData.marketingEmails ?? false,
        timezone: 'America/New_York',
        language: 'en',
        ...validatedData
      }
    })
    
    logger.info('Admin updated user notification preferences', {
      adminId: authResult.user.id,
      adminEmail: authResult.user.email,
      targetUserId: userId,
      targetUserEmail: targetUser.email,
      changes: validatedData
    })
    
    return successResponse({ 
      preferences,
      message: 'User preferences updated successfully'
    })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid request data', 400)
    }
    
    logger.error('Error updating user preferences (admin)', error, {
      adminId: authResult.user.id,
      targetUserId: userId
    })
    return errorResponse('Failed to update user preferences', 500)
  }
}