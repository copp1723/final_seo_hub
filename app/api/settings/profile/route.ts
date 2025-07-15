import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, errorResponse, successResponse } from '@/lib/api-auth'
import { rateLimits } from '@/lib/rate-limit'
import { validateRequest, updateProfileSchema } from '@/lib/validations'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await rateLimits.api(request)
  if (rateLimitResponse) return rateLimitResponse
  
  const authResult = await requireAuth()
  if (!authResult.authenticated) return authResult.response
  
  try {
    const user = await prisma.users.findUnique({
      where: { id: authResult.user!.id },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        agencyId: true,
        createdAt: true
      }
    })
    
    if (!user) {
      return errorResponse('User not found', 404)
    }
    
    return successResponse({ user })
  } catch (error) {
    logger.error('Error fetching user profile:', error, { userId: authResult.user!.id })
    return errorResponse('Failed to fetch profile', 500)
  }
}

export async function PATCH(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await rateLimits.api(request)
  if (rateLimitResponse) return rateLimitResponse
  
  const authResult = await requireAuth()
  if (!authResult.authenticated) return authResult.response
  
  // Validate request body
  const validation = await validateRequest(request, updateProfileSchema)
  if (!validation.success) return validation.error
  
  const { data } = validation
  
  try {
    // Check if email is being changed and if it's already taken
    if (data.email !== authResult.user!.email) {
      const existingUser = await prisma.users.findUnique({
        where: { email: data.email }
      })
      
      if (existingUser) {
        return errorResponse('Email already in use', 409)
      }
    }
    
    const updatedUser = await prisma.users.update({
      where: { id: authResult.user!.id },
      data: {
        name: data.name,
        email: data.email
      },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true
      }
    })
    
    logger.info('User profile updated', { userId: authResult.user!.id })
    return successResponse({ user: updatedUser }, 'Profile updated successfully')
  } catch (error) {
    logger.error('Error updating user profile:', error, { userId: authResult.user!.id })
    return errorResponse('Failed to update profile', 500)
  }
}
