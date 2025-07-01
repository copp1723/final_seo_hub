import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, errorResponse, successResponse } from '@/lib/api-auth'
import { rateLimits } from '@/lib/rate-limit'
import { validateRequest, regenerateApiKeySchema } from '@/lib/validations'
import { logger } from '@/lib/logger'
import crypto from 'crypto'

// Generate a secure API key
function generateApiKey(): string {
  const prefix = 'sk_live_'
  const randomBytes = crypto.randomBytes(32).toString('hex')
  return `${prefix}${randomBytes}`
}

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await rateLimits.api(request)
  if (rateLimitResponse) return rateLimitResponse
  
  const authResult = await requireAuth()
  if (!authResult.authenticated || !authResult.user) return authResult.response
  
  try {
    const user = await prisma.user.findUnique({
      where: { id: authResult.user.id },
      select: {
        apiKey: true,
        apiKeyCreatedAt: true,
      }
    })
    
    if (!user) {
      return errorResponse('User not found', 404)
    }
    
    // Only return masked version of API key for security
    const maskedApiKey = user.apiKey 
      ? `${user.apiKey.substring(0, 12)}...${user.apiKey.substring(user.apiKey.length - 4)}`
      : null
    
    return successResponse({ 
      apiKey: maskedApiKey,
      apiKeyCreatedAt: user.apiKeyCreatedAt,
      hasApiKey: !!user.apiKey
    })
  } catch (error) {
    logger.error('Error fetching API key info:', error, { userId: authResult.user.id })
    return errorResponse('Failed to fetch API key information', 500)
  }
}

export async function POST(request: NextRequest) {
  // Apply rate limiting - stricter for API key generation
  const rateLimitResponse = await rateLimits.auth(request)
  if (rateLimitResponse) return rateLimitResponse
  
  const authResult = await requireAuth()
  if (!authResult.authenticated || !authResult.user) return authResult.response
  
  // Validate request body
  const validation = await validateRequest(request, regenerateApiKeySchema)
  if (!validation.success) return validation.error
  
  try {
    const newApiKey = generateApiKey()
    
    const updatedUser = await prisma.user.update({
      where: { id: authResult.user.id },
      data: {
        apiKey: newApiKey,
        apiKeyCreatedAt: new Date(),
      },
      select: {
        apiKey: true,
        apiKeyCreatedAt: true,
      }
    })
    
    logger.info('API key regenerated', { userId: authResult.user.id })
    
    // Return the full API key only once during generation
    return successResponse({ 
      apiKey: updatedUser.apiKey,
      apiKeyCreatedAt: updatedUser.apiKeyCreatedAt,
      message: 'API key generated successfully. Please save it securely as it will not be shown again.'
    })
  } catch (error) {
    logger.error('Error regenerating API key:', error, { userId: authResult.user.id })
    return errorResponse('Failed to regenerate API key', 500)
  }
}

export async function DELETE(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await rateLimits.auth(request)
  if (rateLimitResponse) return rateLimitResponse
  
  const authResult = await requireAuth()
  if (!authResult.authenticated || !authResult.user) return authResult.response
  
  try {
    await prisma.user.update({
      where: { id: authResult.user.id },
      data: {
        apiKey: null,
        apiKeyCreatedAt: null,
      }
    })
    
    logger.info('API key deleted', { userId: authResult.user.id })
    return successResponse({ message: 'API key deleted successfully' })
  } catch (error) {
    logger.error('Error deleting API key:', error, { userId: authResult.user.id })
    return errorResponse('Failed to delete API key', 500)
  }
}