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
  city: z.string().min(1, 'City is required'),
  state: z.string().min(2).max(2, 'State must be 2 characters'),
  zipCode: z.string().min(1, 'ZIP code is required'),
  phone: z.string().optional(),
  agencyId: z.string().min(1, 'Agency is required'),
  activePackageType: z.enum(['SILVER', 'GOLD', 'PLATINUM']).default('GOLD'),
  clientId: z.string().optional(),
  mainBrand: z.string().min(1, 'Main brand is required'),
  otherBrand: z.string().optional(),
  contactName: z.string().min(1, 'Contact name is required'),
  contactTitle: z.string().optional(),
  email: z.string().email('Valid email is required'),
  billingEmail: z.string().email().optional().or(z.literal('')),
  siteAccessNotes: z.string().optional(),
  targetVehicleModels: z.array(z.string()).optional().default([]),
  targetCities: z.array(z.string()).optional().default([]),
  targetDealers: z.array(z.string()).optional().default([]),
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

    const { 
      name, 
      website, 
      address, 
      city,
      state,
      zipCode,
      phone, 
      agencyId, 
      activePackageType, 
      clientId,
      mainBrand,
      otherBrand,
      contactName,
      contactTitle,
      email,
      billingEmail,
      siteAccessNotes,
      targetVehicleModels,
      targetCities,
      targetDealers,
      notes 
    } = validation.data

    // Verify agency exists
    const agency = await prisma.agencies.findUnique({
      where: { id: agencyId }
    })

    if (!agency) {
      return NextResponse.json({ error: 'Agency not found' }, { status: 404 })
    }

    // Check if clientId is already in use (if provided)
    if (clientId) {
      const existingDealership = await prisma.dealerships.findUnique({
        where: { clientId }
      })
      
      if (existingDealership) {
        return NextResponse.json({ error: 'Client ID already in use' }, { status: 409 })
      }
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
        clientId: clientId || null,
        settings: {
          notes: notes || null,
          branding: {
            primaryColor: '#1f2937' // Default color
          },
          contact: {
            name: contactName,
            title: contactTitle || null,
            email: email,
            billingEmail: billingEmail || null
          },
          location: {
            city,
            state,
            zipCode
          },
          brands: {
            main: mainBrand,
            others: otherBrand || null
          },
          targetMarkets: {
            vehicleModels: targetVehicleModels,
            cities: targetCities,
            competitors: targetDealers
          },
          siteAccessNotes: siteAccessNotes || null
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

    // Create a dealership onboarding record for future use
    await prisma.dealership_onboardings.create({
      data: {
        agencyId,
        businessName: name,
        package: activePackageType,
        mainBrand,
        otherBrand: otherBrand || null,
        address: address || '',
        city,
        state,
        zipCode,
        contactName,
        contactTitle: contactTitle || '',
        email,
        phone: phone || '',
        websiteUrl: website || '',
        billingEmail: billingEmail || email,
        siteAccessNotes: siteAccessNotes || null,
        targetVehicleModels: targetVehicleModels,
        targetCities: targetCities,
        targetDealers: targetDealers,
        submittedBy: session.user.email || 'system',
        status: 'completed',
        submittedAt: new Date()
      }
    })

    logger.info('Dealership created by Super Admin', {
      dealershipId: dealership.id,
      dealershipName: dealership.name,
      agencyId: dealership.agencyId,
      agencyName: dealership.agencies.name,
      createdBy: session.user.id,
      clientId: dealership.clientId
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
        agency: dealership.agencies.name,
        clientId: dealership.clientId
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

// GET endpoint to fetch dealerships (existing functionality)
export async function GET(request: NextRequest) {
  try {
    const session = await SimpleAuth.getSessionFromRequest(request)
    
    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only SUPER_ADMIN can view all dealerships
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Access denied. Super Admin required.' }, { status: 403 })
    }

    const dealerships = await prisma.dealerships.findMany({
      include: {
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
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      dealerships: dealerships.map(d => ({
        id: d.id,
        name: d.name,
        website: d.website,
        address: d.address,
        phone: d.phone,
        activePackageType: d.activePackageType,
        clientId: d.clientId,
        agency: {
          id: d.agencies.id,
          name: d.agencies.name
        },
        userCount: d._count.users,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt
      }))
    })

  } catch (error) {
    logger.error('Error fetching dealerships', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}