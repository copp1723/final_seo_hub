import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { PackageType, Prisma } from '@prisma/client'
import { startOfDay, endOfMonth } from 'date-fns'

// Interface matching the exact format from the handoff document
interface OnboardingPayload {
  timestamp: string
  businessName: string
  package: 'SILVER' | 'GOLD' | 'PLATINUM'
  mainBrand: string
  otherBrand: string
  address: string
  city: string
  state: string
  zipCode: string
  contactName: string
  contactTitle: string
  email: string
  phone: string
  websiteUrl: string
  billingEmail: string
  siteAccessNotes: string
  targetVehicleModels: string // semicolon-delimited
  targetCities: string // semicolon-delimited
  targetDealers: string // semicolon-delimited
}

export async function POST(request: NextRequest) {
  let session
  try {
    session = await auth()
    
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userId = session.user.id;
    const formData: OnboardingPayload = await request.json()
    
    // Add timestamp
    formData.timestamp = new Date().toISOString()
    
    // Add client identification for SEOWorks mapping
    const onboardingPayloadWithClient = { ...formData,
      clientId: userId, // Unique identifier for mapping
      clientEmail: session.user.email
    }
    
    // Send to SEOWorks webhook if configured
    if (process.env.SEOWORKS_WEBHOOK_URL && process.env.SEOWORKS_API_KEY) {
      try {
        const response = await fetch(process.env.SEOWORKS_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.SEOWORKS_API_KEY
          },
          body: JSON.stringify(onboardingPayloadWithClient)
        })
        
        const result = await response.json()
        
        if (!response.ok || !result.success) {
          logger.error('SEOWorks webhook error', undefined, { result, status: response.status })
          // Don't fail the request, just log the error
        }
      } catch (webhookError) {
        logger.error('Failed to send to SEOWorks', webhookError)
        // Continue processing even if webhook fails
      }
    }
    
    // Update user and dealership records with onboarding data and initial billing setup
    try {
      // Get user's dealership
      const user = await prisma.users.findUnique({
        where: { id: userId },
        include: { dealerships: true }
      })

      if (!user?.dealerships) {
        logger.error('User has no dealership assigned', { userId })
        return NextResponse.json({ error: 'No dealership assigned to user' }, { status: 400 })
      }

      const now = new Date()
      
      // Update user onboarding status
      await prisma.users.update({
        where: { id: userId },
        data: { onboardingCompleted: true }
      })

      // Update dealership package and billing info
      await prisma.dealerships.update({
        where: { id: user.dealerships.id },
        data: {
          activePackageType: formData.package as PackageType,
          currentBillingPeriodStart: startOfDay(now),
          currentBillingPeriodEnd: endOfMonth(now),
          pagesUsedThisPeriod: 0,
          blogsUsedThisPeriod: 0,
          gbpPostsUsedThisPeriod: 0,
          improvementsUsedThisPeriod: 0
        }
      })

      logger.info(`User ${userId} onboarding completed and dealership ${user.dealerships.id} package ${formData.package} activated.`)

    } catch (dbError) {
      logger.error('Failed to update user onboarding status and package info:', dbError);
      // This is a critical error as it's crucial for package setup
      return NextResponse.json({ error: 'Failed to finalize onboarding and activate package.' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Onboarding data received and package activated successfully'
    })
    
  } catch (error) {
    logger.error('Onboarding error', error, { userId: session?.user.id })
    return NextResponse.json({ 
      error: 'Failed to process onboarding data' 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userId = session.user.id
    
    // For now, we'll create mock data since we don't have an onboarding table yet
    // In a real implementation, you'd fetch from a dedicated onboarding table
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        onboardingCompleted: true,
        createdAt: true,
        updatedAt: true,
        dealerships: {
          select: {
            activePackageType: true
          }
        }
      }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Create a mock onboarding record based on user data
    const onboardingRecords = user.onboardingCompleted ? [{
      id: user.id,
      businessName: user.name || 'Unknown Business',
      package: user.dealerships?.activePackageType || 'SILVER',
      status: 'submitted',
      submittedAt: user.updatedAt.toISOString(),
      createdAt: user.createdAt.toISOString(),
      contactName: user.name || 'Unknown Contact',
      email: user.email || '',
      seoworksResponse: {
        success: true,
        message: 'Successfully submitted to SEOWorks'
      }
    }] : []
    
    return NextResponse.json({
      onboardings: onboardingRecords
    })
    
  } catch (error) {
    logger.error('Error fetching onboarding records', error)
    return NextResponse.json({
      error: 'Failed to fetch onboarding records'
    }, { status: 500 })
  }
}
