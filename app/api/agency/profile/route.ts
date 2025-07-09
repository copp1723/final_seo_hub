import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, errorResponse, successResponse } from '@/lib/api-auth'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const updateAgencyProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  domain: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  contactPhone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zipCode: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  businessType: z.string().optional().nullable(),
  industry: z.string().optional().nullable(),
  timezone: z.string().optional().nullable(),
  maxUsers: z.number().min(1).max(500).optional(),
  allowSelfSignup: z.boolean().optional(),
  defaultPackageType: z.enum(['SILVER', 'GOLD', 'PLATINUM']).optional(),
  logoUrl: z.string().url().optional().nullable(),
  primaryColor: z.string().optional().nullable(),
  secondaryColor: z.string().optional().nullable(),
})

// GET agency profile
export async function GET(request: NextRequest) {
  const authResult = await requireAuth()
  if (!authResult.authenticated || !authResult.user) return authResult.response
  
  try {
    // Get user's agency
    const user = await prisma.user.findUnique({
      where: { id: authResult.user.id },
      select: { agencyId: true, role: true }
    })
    
    if (!user?.agencyId) {
      return errorResponse('User not associated with an agency', 404)
    }
    
    // Check if user has permission to view agency settings
    if (user.role !== 'AGENCY_ADMIN' && user.role !== 'SUPER_ADMIN') {
      return errorResponse('Insufficient permissions', 403)
    }
    
    const agency = await prisma.agency.findUnique({
      where: { id: user.agencyId },
      include: {
        _count: {
          select: {
            users: true,
            requests: true
          }
        }
      }
    })
    
    if (!agency) {
      return errorResponse('Agency not found', 404)
    }
    
    return successResponse({ agency })
  } catch (error) {
    logger.error('Error fetching agency profile', error)
    return errorResponse('Failed to fetch agency profile', 500)
  }
}

// PATCH update agency profile
export async function PATCH(request: NextRequest) {
  const authResult = await requireAuth()
  if (!authResult.authenticated || !authResult.user) return authResult.response
  
  try {
    // Get user's agency
    const user = await prisma.user.findUnique({
      where: { id: authResult.user.id },
      select: { agencyId: true, role: true }
    })
    
    if (!user?.agencyId) {
      return errorResponse('User not associated with an agency', 404)
    }
    
    // Check if user has permission to update agency settings
    if (user.role !== 'AGENCY_ADMIN' && user.role !== 'SUPER_ADMIN') {
      return errorResponse('Insufficient permissions', 403)
    }
    
    const body = await request.json()
    const validatedData = updateAgencyProfileSchema.parse(body)
    
    // Check if agency name is unique (if updating name)
    if (validatedData.name) {
      const existingAgency = await prisma.agency.findFirst({
        where: { 
          name: { equals: validatedData.name, mode: 'insensitive' },
          id: { not: user.agencyId }
        }
      })
      
      if (existingAgency) {
        return errorResponse('An agency with this name already exists', 400)
      }
    }
    
    // Check if domain is unique (if updating domain)
    if (validatedData.domain) {
      const existingDomain = await prisma.agency.findFirst({
        where: { 
          domain: { equals: validatedData.domain, mode: 'insensitive' },
          id: { not: user.agencyId }
        }
      })
      
      if (existingDomain) {
        return errorResponse('An agency with this domain already exists', 400)
      }
    }
    
    const updatedAgency = await prisma.agency.update({
      where: { id: user.agencyId },
      data: {
        ...validatedData,
        updatedAt: new Date()
      },
      include: {
        _count: {
          select: {
            users: true,
            requests: true
          }
        }
      }
    })
    
    logger.info('Agency profile updated', {
      agencyId: user.agencyId,
      userId: authResult.user.id,
      changes: Object.keys(validatedData)
    })
    
    return successResponse({ 
      agency: updatedAgency,
      message: 'Agency profile updated successfully'
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid request data', 400)
    }
    
    logger.error('Error updating agency profile', error)
    return errorResponse('Failed to update agency profile', 500)
  }
}