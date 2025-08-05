import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SimpleAuth } from '@/lib/auth-simple'
import { logger } from '@/lib/logger'
import { safeDbOperation } from '@/lib/db-resilience'
import { withErrorBoundary } from '@/lib/error-boundaries'
import { z } from 'zod'
import crypto from 'crypto'
import { DealershipConnectionService } from '@/lib/services/dealership-connection-service'

// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

const createDealershipSchema = z.object({
  name: z.string().min(1, 'Dealership name is required'),
  website: z.string().url().optional().or(z.literal('')),
  address: z.string().optional(),
  phone: z.string().optional(),
  agencyId: z.string().min(1, 'Agency is required'),
  activePackageType: z.enum(['SILVER', 'GOLD', 'PLATINUM']).default('GOLD'),
  notes: z.string().optional()
})

// Get dealerships (SUPER_ADMIN can see all, AGENCY_ADMIN can see their agency's)
export const GET = withErrorBoundary(async (request: NextRequest) => {
  const session = await SimpleAuth.getSessionFromRequest(request)
  
  if (!session?.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'AGENCY_ADMIN') {
    return NextResponse.json({ error: 'Access denied. Admin required.' }, { status: 403 })
  }

  // Build where clause based on user role
  const whereClause: any = {}
  
  // If AGENCY_ADMIN, only show dealerships from their agency
  if (session.user.role === 'AGENCY_ADMIN' && session.user.agencyId) {
    whereClause.agencyId = session.user.agencyId
  }
  // SUPER_ADMIN can see all dealerships (no where clause restriction)

  const dealerships = await safeDbOperation(async () => {
    return prisma.dealerships.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        agencyId: true,
        createdAt: true,
        updatedAt: true,
        agencies: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            users: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })
  })

  return NextResponse.json({
    success: true,
    dealerships
  })
})

// Create a new dealership (SUPER_ADMIN can create for any agency, AGENCY_ADMIN can create for their agency)
export const POST = withErrorBoundary(async (request: NextRequest) => {
  const session = await SimpleAuth.getSessionFromRequest(request)

  if (!session?.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'AGENCY_ADMIN') {
    return NextResponse.json({ error: 'Access denied. Admin required.' }, { status: 403 })
  }

  const body = await request.json()
  const validation = createDealershipSchema.safeParse(body)

  if (!validation.success) {
    return NextResponse.json({
      error: 'Validation failed',
      details: validation.error.issues
    }, { status: 400 })
  }

  const { name, website, address, phone, agencyId, activePackageType, notes } = validation.data

  // If AGENCY_ADMIN, ensure they can only create dealerships for their own agency
  if (session.user.role === 'AGENCY_ADMIN') {
    if (!session.user.agencyId) {
      return NextResponse.json({ error: 'Agency admin must have an associated agency' }, { status: 400 })
    }
    if (agencyId !== session.user.agencyId) {
      return NextResponse.json({ error: 'Agency admin can only create dealerships for their own agency' }, { status: 403 })
    }
  }

  // Verify agency exists
  const agency = await safeDbOperation(async () => {
    return prisma.agencies.findUnique({
      where: { id: agencyId }
    })
  })

  if (!agency) {
    return NextResponse.json({ error: 'Agency not found' }, { status: 404 })
  }

  // Create dealership
  const dealership = await safeDbOperation(async () => {
    return prisma.dealerships.create({
      data: {
        id: crypto.randomUUID(),
        name,
        website: website || null,
        address: address || null,
        phone: phone || null,
        agencyId,
        activePackageType,
        settings: {
          notes: notes || null,
          branding: {
            primaryColor: '#1f2937' // Default color
          }
        },
        updatedAt: new Date()
      },
      include: {
        agencies: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })
  })

  // Automatically create GA4 and Search Console connections based on hardcoded mappings
  const connectionResult = await DealershipConnectionService.createConnectionsForDealership(
    dealership.id,
    dealership.name
  )

  logger.info('Dealership created by admin', {
    dealershipId: dealership.id,
    dealershipName: dealership.name,
    agencyId: dealership.agencyId,
    agencyName: dealership.agencies.name,
    createdBy: session.user.id,
    createdByRole: session.user.role,
    connectionsCreated: {
      ga4: connectionResult.ga4Created,
      searchConsole: connectionResult.searchConsoleCreated,
      success: connectionResult.success,
      errors: connectionResult.errors
    }
  })

  return NextResponse.json({
    message: 'Dealership created successfully',
    dealership: {
      id: dealership.id,
      name: dealership.name,
      website: dealership.website,
      address: dealership.address,
      phone: dealership.phone,
      activePackageType: dealership.activePackageType,
      agency: dealership.agencies.name
    },
    connections: {
      ga4Created: connectionResult.ga4Created,
      searchConsoleCreated: connectionResult.searchConsoleCreated,
      success: connectionResult.success,
      ga4PropertyId: connectionResult.connections.ga4PropertyId,
      searchConsoleUrl: connectionResult.connections.searchConsoleUrl,
      errors: connectionResult.errors
    }
  }, { status: 201 })
}, {
  success: false,
  dealership: null,
  message: 'Unable to create dealership at this time'
})
