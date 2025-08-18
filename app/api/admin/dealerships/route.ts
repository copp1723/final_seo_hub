import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SimpleAuth } from '@/lib/auth-simple'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import crypto from 'crypto'
import { DealershipConnectionService } from '@/lib/services/dealership-connection-service'

// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

// SEOWorks API configuration
const SEOWORKS_API_KEY = process.env.SEOWORKS_API_KEY
const SEOWORKS_ONBOARD_URL = 'https://api.seowerks.ai/rylie-onboard.cfm'

const createDealershipSchema = z.object({
  // Basic Information
  name: z.string().min(2, 'Dealership name must be at least 2 characters'),
  website: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().length(2, 'State must be 2 characters'),
  zipCode: z.string().min(5, 'ZIP code must be at least 5 characters'),
  phone: z.string().optional(),
  agencyId: z.string().min(1, 'Agency is required'),
  activePackageType: z.enum(['SILVER', 'GOLD', 'PLATINUM']).default('GOLD'),
  clientId: z.string().optional(),
  mainBrand: z.string().min(1, 'Main brand is required'),
  otherBrand: z.string().optional(),
  
  // Contact Information
  contactName: z.string().min(2, 'Contact name must be at least 2 characters'),
  contactTitle: z.string().optional(),
  email: z.string().email('Please enter a valid email address'),
  billingEmail: z.string().email('Please enter a valid billing email').optional().or(z.literal('')),
  
  // Technical Information
  siteAccessNotes: z.string().optional(),
  
  // Target Markets - require minimum entries
  targetVehicleModels: z.array(z.string().min(1)).min(3, 'Please add at least 3 vehicle models'),
  targetCities: z.array(z.string().min(1)).min(3, 'Please add at least 3 target cities'),
  targetDealers: z.array(z.string().min(1)).min(3, 'Please add at least 3 competitor dealers'),
  
  // Administrative
  notes: z.string().optional()
})

async function sendToSEOWorks(data: z.infer<typeof createDealershipSchema>, generatedClientId: string) {
  // Transform our data format to SEOWorks expected format
  const seoworksPayload = {
    timestamp: new Date().toISOString(),
    businessName: data.name,
    clientId: generatedClientId,
    clientEmail: data.email,
    package: data.activePackageType,
    mainBrand: data.mainBrand,
    otherBrand: data.otherBrand || '',
    address: data.address || '',
    city: data.city,
    state: data.state,
    zipCode: data.zipCode,
    contactName: data.contactName,
    contactTitle: data.contactTitle || '',
    email: data.email,
    phone: data.phone || '',
    websiteUrl: data.website || '',
    billingEmail: data.billingEmail || data.email,
    siteAccessNotes: data.siteAccessNotes || '',
    // Convert arrays to semicolon-separated strings for SEOWorks format
    targetVehicleModels: data.targetVehicleModels.join(';'),
    targetCities: data.targetCities.join(';'),
    targetDealers: data.targetDealers.join(';')
  }

  try {
    const response = await fetch(SEOWORKS_ONBOARD_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': SEOWORKS_API_KEY || ''
      },
      body: JSON.stringify(seoworksPayload)
    })

    const responseData = await response.json()

    if (!response.ok) {
      throw new Error(`SEOWorks API error: ${response.status} - ${JSON.stringify(responseData)}`)
    }

    logger.info('Successfully sent dealership onboarding data to SEOWorks', {
      clientId: generatedClientId,
      businessName: data.name,
      seoworksResponse: responseData
    })

    return {
      success: true,
      clientId: generatedClientId,
      seoworksResponse: responseData
    }

  } catch (error) {
    logger.error('Failed to send dealership onboarding data to SEOWorks', {
      error: error instanceof Error ? error.message : String(error),
      businessName: data.name,
      payload: seoworksPayload
    })
    // Don't throw - we'll log the error but continue with dealership creation
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

// Create a new dealership (SUPER_ADMIN and AGENCY_ADMIN)
export async function POST(request: NextRequest) {
  try {
    const session = await SimpleAuth.getSessionFromRequest(request)
    
    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Allow both SUPER_ADMIN and AGENCY_ADMIN
    if (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'AGENCY_ADMIN') {
      return NextResponse.json({ error: 'Access denied. Admin access required.' }, { status: 403 })
    }

    const body = await request.json()
    const validation = createDealershipSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validation.error.issues
      }, { status: 400 })
    }

    // Additional validation for AGENCY_ADMIN users
    if (session.user.role === 'AGENCY_ADMIN') {
      if (!session.user.agencyId) {
        return NextResponse.json({ error: 'Agency admin must be associated with an agency' }, { status: 403 })
      }
      
      // Ensure agency admin can only create dealerships for their own agency
      if (validation.data.agencyId !== session.user.agencyId) {
        return NextResponse.json({ error: 'Cannot create dealership for other agencies' }, { status: 403 })
      }
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

    // Generate client ID if not provided
    const generatedClientId = clientId || `dealer_${name.toLowerCase().replace(/[^a-z0-9]/g, '')}_${city.toLowerCase()}_${new Date().getFullYear()}`

    // Check if clientId is already in use
    const existingDealership = await prisma.dealerships.findUnique({
      where: { clientId: generatedClientId }
    })
    
    if (existingDealership) {
      return NextResponse.json({ error: 'Client ID already in use' }, { status: 409 })
    }

    // Send to SEOWorks API
    const seoworksResult = await sendToSEOWorks(validation.data, generatedClientId)

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
        clientId: generatedClientId,
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
          siteAccessNotes: siteAccessNotes || null,
          seoworks: {
            submitted: seoworksResult.success,
            submittedAt: seoworksResult.success ? new Date().toISOString() : null,
            response: seoworksResult.seoworksResponse || null,
            error: seoworksResult.error || null
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

    // Create a dealership onboarding record for future use and tracking
    const onboardingRecord = await prisma.dealership_onboardings.create({
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
        status: seoworksResult.success ? 'submitted' : 'pending',
        seoworksResponse: seoworksResult.seoworksResponse || null,
        submittedAt: seoworksResult.success ? new Date() : null
      }
    })

    // Automatically create GA4 and Search Console connections based on hardcoded mappings
    const connectionResult = await DealershipConnectionService.createConnectionsForDealership(
      dealership.id,
      dealership.name
    )

    logger.info('Dealership created by Super Admin', {
      dealershipId: dealership.id,
      dealershipName: dealership.name,
      agencyId: dealership.agencyId,
      agencyName: dealership.agencies.name,
      createdBy: session.user.id,
      clientId: dealership.clientId,
      seoworksSubmitted: seoworksResult.success,
      onboardingRecordId: onboardingRecord.id,
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
        agency: dealership.agencies.name,
        clientId: dealership.clientId
      },
      seoworks: {
        submitted: seoworksResult.success,
        clientId: generatedClientId,
        response: seoworksResult.seoworksResponse
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

  } catch (error) {
    logger.error('Error creating dealership', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      dealershipName: validation?.success ? validation.data?.name : 'unknown',
      agencyId: validation?.success ? validation.data?.agencyId : 'unknown',
      userId: session?.user?.id || 'unknown'
    })

    // Handle specific database constraint errors
    if (error && typeof error === 'object' && 'code' in error) {
      switch (error.code) {
        case 'P2002':
          const target = (error as any).meta?.target
          if (target?.includes('clientId')) {
            return NextResponse.json({ error: 'Client ID already exists. Please try a different name.' }, { status: 409 })
          }
          return NextResponse.json({ error: 'Dealership with this information already exists' }, { status: 409 })
        case 'P2003':
          return NextResponse.json({ error: 'Invalid agency reference' }, { status: 400 })
        default:
          break
      }
    }

    // Handle validation errors from external APIs
    if (error instanceof Error && error.message.includes('SEOWorks')) {
      return NextResponse.json({
        error: 'Dealership created but SEO service integration failed. Please contact support.',
        partial: true
      }, { status: 207 }) // Multi-status for partial success
    }

    return NextResponse.json(
      { error: 'Failed to create dealership. Please try again.' },
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