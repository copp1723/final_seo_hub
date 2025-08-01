import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SimpleAuth } from '@/lib/auth-simple'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import crypto from 'crypto'

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

// Create a new dealership (SUPER_ADMIN only)
export async function POST(request: NextRequest) {
  try {
    const session = await SimpleAuth.getSessionFromRequest(request)
    
    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Access denied. Super Admin required.' }, { status: 403 })
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

    // Verify agency exists
    const agency = await prisma.agencies.findUnique({
      where: { id: agencyId }
    })

    if (!agency) {
      return NextResponse.json({ error: 'Agency not found' }, { status: 404 })
    }

    // Create dealership
    const dealership = await prisma.dealerships.create({
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

    logger.info('Dealership created by Super Admin', {
      dealershipId: dealership.id,
      dealershipName: dealership.name,
      agencyId: dealership.agencyId,
      agencyName: dealership.agencies.name,
      createdBy: session.user.id
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
      }
    }, { status: 201 })

  } catch (error) {
    logger.error('Error creating dealership', error)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'Dealership name already exists' }, { status: 409 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
