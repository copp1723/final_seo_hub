import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, errorResponse, successResponse } from '@/lib/api-auth'
import { logger } from '@/lib/logger'

// GET all users with their notification preferences
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (!authResult.authenticated || !authResult.user) return authResult.response
  
  // Check if user has admin privileges
  if (authResult.user.role !== 'AGENCY_ADMIN' && authResult.user.role !== 'SUPER_ADMIN') {
    return errorResponse('Insufficient permissions', 403)
  }
  
  try {
    const users = await prisma.users.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        agencyId: true,
        user_preferences: {
          select: {
            emailNotifications: true,
            taskCompleted: true,
            requestCreated: true,
            statusChanged: true,
            weeklySummary: true
          }
        }
      },
      // Agency admins can only see users in their agency
      where: authResult.user.role === 'AGENCY_ADMIN' 
        ? { agencyId: authResult.user.agencyId }
        : undefined,
      orderBy: { email: 'asc' }
    })
    
    return successResponse({ users })
  } catch (error) {
    logger.error('Error fetching users for notification preferences', error)
    return errorResponse('Failed to fetch users', 500)
  }
}
