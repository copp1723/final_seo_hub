import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, errorResponse, successResponse } from '@/lib/api-auth'
import { rateLimits } from '@/lib/rate-limit'
import { z } from 'zod'
import { validateRequest } from '@/lib/validations'
import { logger } from '@/lib/logger'
import { PackageType } from '@prisma/client'

// Schema for updating dealership settings
const updateDealershipSettingsSchema = z.object({
  dealershipId: z.string().cuid(),
  activePackageType: z.nativeEnum(PackageType).optional(),
  settings: z.object({
    emailNotifications: z.boolean().optional(),
    requestCreated: z.boolean().optional(),
    statusChanged: z.boolean().optional(),
    taskCompleted: z.boolean().optional(),
    weeklySummary: z.boolean().optional(),
    marketingEmails: z.boolean().optional(),
    timezone: z.string().optional(),
    language: z.string().optional(),
  }).optional()
})

// GET - List all dealerships for the agency with their settings
export async function GET(request: NextRequest) {
  const rateLimitResponse = await rateLimits.api(request)
  if (rateLimitResponse) return rateLimitResponse
  
  const authResult = await requireAuth(request)
  if (!authResult.authenticated || !authResult.user) {
    return authResult.response || errorResponse('Unauthorized', 401)
  }

  // Only allow AGENCY_ADMIN and SUPER_ADMIN
  if (!['AGENCY_ADMIN', 'SUPER_ADMIN'].includes(authResult.user.role)) {
    return errorResponse('Forbidden - Agency admin access required', 403)
  }

  try {
    const agencyId = authResult.user.role === 'SUPER_ADMIN' 
      ? request.nextUrl.searchParams.get('agencyId')
      : authResult.user.agencyId

    if (!agencyId) {
      return errorResponse('Agency ID is required', 400)
    }

    // Get all dealerships for the agency with user preferences
    const dealerships = await prisma.dealerships.findMany({
      where: { agencyId },
      include: {
        users: {
          include: {
            user_preferences: true
          }
        },
        _count: {
          select: {
            users: true
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    // Transform data for the UI
    const dealershipsWithSettings = dealerships.map(dealership => ({
      id: dealership.id,
      name: dealership.name,
      website: dealership.website,
      address: dealership.address,
      phone: dealership.phone,
      activePackageType: dealership.activePackageType,
      currentBillingPeriodStart: dealership.currentBillingPeriodStart,
      currentBillingPeriodEnd: dealership.currentBillingPeriodEnd,
      pagesUsedThisPeriod: dealership.pagesUsedThisPeriod,
      blogsUsedThisPeriod: dealership.blogsUsedThisPeriod,
      gbpPostsUsedThisPeriod: dealership.gbpPostsUsedThisPeriod,
      improvementsUsedThisPeriod: dealership.improvementsUsedThisPeriod,
      userCount: dealership._count.users,
      createdAt: dealership.createdAt,
      // Aggregate notification preferences from all users
      users: dealership.users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        preferences: user.user_preferences
      }))
    }))

    return successResponse({
      dealerships: dealershipsWithSettings,
      total: dealershipsWithSettings.length
    })

  } catch (error) {
    logger.error('Error fetching agency dealerships', error, {
      userId: authResult.user.id,
      agencyId: authResult.user.agencyId
    })
    return errorResponse('Failed to fetch dealerships', 500)
  }
}

// PATCH - Update dealership settings
export async function PATCH(request: NextRequest) {
  const rateLimitResponse = await rateLimits.api(request)
  if (rateLimitResponse) return rateLimitResponse
  
  const authResult = await requireAuth(request)
  if (!authResult.authenticated || !authResult.user) {
    return authResult.response || errorResponse('Unauthorized', 401)
  }

  // Only allow AGENCY_ADMIN and SUPER_ADMIN
  if (!['AGENCY_ADMIN', 'SUPER_ADMIN'].includes(authResult.user.role)) {
    return errorResponse('Forbidden - Agency admin access required', 403)
  }

  const validation = await validateRequest(request, updateDealershipSettingsSchema)
  if (!validation.success) return validation.error

  const { dealershipId, activePackageType, settings } = validation.data

  try {
    // Verify dealership belongs to the user's agency (unless SUPER_ADMIN)
    const whereClause = authResult.user.role === 'SUPER_ADMIN' 
      ? { id: dealershipId }
      : { id: dealershipId, agencyId: authResult.user.agencyId! }

    const dealership = await prisma.dealerships.findFirst({
      where: whereClause,
      include: {
        users: true
      }
    })

    if (!dealership) {
      return errorResponse('Dealership not found or access denied', 404)
    }

    // Update dealership package if provided
    const dealershipUpdate: any = {}
    if (activePackageType !== undefined) {
      dealershipUpdate.activePackageType = activePackageType
      
      // Reset usage counters when changing package
      dealershipUpdate.pagesUsedThisPeriod = 0
      dealershipUpdate.blogsUsedThisPeriod = 0
      dealershipUpdate.gbpPostsUsedThisPeriod = 0
      dealershipUpdate.improvementsUsedThisPeriod = 0
      
      // Set new billing period
      const now = new Date()
      dealershipUpdate.currentBillingPeriodStart = now
      const nextMonth = new Date(now)
      nextMonth.setMonth(nextMonth.getMonth() + 1)
      dealershipUpdate.currentBillingPeriodEnd = nextMonth
    }

    if (Object.keys(dealershipUpdate).length > 0) {
      await prisma.dealerships.update({
        where: { id: dealershipId },
        data: dealershipUpdate
      })
    }

    // Update user preferences for all users in this dealership
    if (settings && Object.keys(settings).length > 0) {
      const userIds = dealership.users.map((user: any) => user.id)
      
      if (userIds.length > 0) {
        // Use upsert for each user to ensure preferences exist
        await Promise.all(userIds.map((userId: string) =>
          prisma.user_preferences.upsert({
            where: { userId },
            create: {
              userId,
              emailNotifications: settings.emailNotifications ?? true,
              requestCreated: settings.requestCreated ?? true,
              statusChanged: settings.statusChanged ?? true,
              taskCompleted: settings.taskCompleted ?? true,
              weeklySummary: settings.weeklySummary ?? true,
              marketingEmails: settings.marketingEmails ?? false,
              timezone: settings.timezone ?? 'America/New_York',
              language: settings.language ?? 'en'
            },
            update: settings
          })
        ))
      }
    }

    // Fetch updated dealership data
    const updatedDealership = await prisma.dealerships.findUnique({
      where: { id: dealershipId },
      include: {
        users: {
          include: {
            user_preferences: true
          }
        }
      }
    })

    logger.info('Dealership settings updated', {
      dealershipId,
      userId: authResult.user.id,
      agencyId: authResult.user.agencyId,
      packageChanged: !!activePackageType,
      settingsUpdated: !!settings
    })

    return successResponse({
      dealership: updatedDealership,
      message: 'Dealership settings updated successfully'
    })

  } catch (error) {
    logger.error('Error updating dealership settings', error, {
      dealershipId,
      userId: authResult.user.id,
      agencyId: authResult.user.agencyId
    })
    return errorResponse('Failed to update dealership settings', 500)
  }
} 