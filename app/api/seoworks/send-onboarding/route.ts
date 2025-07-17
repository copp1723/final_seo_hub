import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { errorResponse, successResponse } from '@/lib/api-auth'
import { PackageType } from '@prisma/client'
import crypto from 'crypto'

// SEOWorks API configuration
const SEOWORKS_API_KEY = process.env.SEOWORKS_API_KEY

const SEOWORKS_ONBOARD_URL = 'https://api.seoworks.ai/rylie-onboard.cfm'

interface DealerOnboardingData {
  businessName: string
  clientEmail: string
  package: string
  mainBrand: string
  otherBrand?: string
  address: string
  city: string
  state: string
  zipCode: string
  contactName: string
  contactTitle: string
  phone: string
  websiteUrl: string
  billingEmail: string
  siteAccessNotes?: string
  targetVehicleModels: string[] // Array from our form
  targetCities: string[] // Array in "City, State" format
  targetDealers: string[] // Array from our form
}

async function sendToSEOWorks(data: DealerOnboardingData) {
  // Transform our data format to Jeff's expected format
  const seoworksPayload = {
    timestamp: new Date().toISOString(),
    businessName: data.businessName,
    clientId: `user_${data.businessName.toLowerCase().replace(/[^a-z0-9]/g, '')}_${data.city.toLowerCase()}_${new Date().getFullYear()}`,
    clientEmail: data.clientEmail,
    package: data.package,
    mainBrand: data.mainBrand,
    otherBrand: data.otherBrand || '',
    address: data.address,
    city: data.city,
    state: data.state,
    zipCode: data.zipCode,
    contactName: data.contactName,
    contactTitle: data.contactTitle,
    email: data.clientEmail,
    phone: data.phone,
    websiteUrl: data.websiteUrl,
    billingEmail: data.billingEmail,
    siteAccessNotes: data.siteAccessNotes || '',
    // Convert arrays to semicolon-separated strings for Jeff's format
    targetVehicleModels: data.targetVehicleModels.join(';'),
    targetCities: data.targetCities.map(city => {
      // Convert "City, State" back to just "City" for Jeff's format
      return city.split(',')[0].trim()
    }).join(';'),
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

    logger.info('Successfully sent onboarding data to SEOWorks', {
      clientId: seoworksPayload.clientId,
      businessName: data.businessName,
      seoworksResponse: responseData
    })

    return {
      success: true,
      clientId: seoworksPayload.clientId,
      seoworksResponse: responseData
    }

  } catch (error) {
    logger.error('Failed to send onboarding data to SEOWorks', {
      error: error instanceof Error ? error.message : String(error),
      businessName: data.businessName,
      payload: seoworksPayload
    })
    throw error
  }
}

// This endpoint is called for standalone dealer onboarding (not invited users)
export async function POST(request: NextRequest) {
  try {
    const dealerData: DealerOnboardingData = await request.json()
    
    logger.info('Received standalone dealer onboarding data', {
      businessName: dealerData.businessName,
      package: dealerData.package,
      clientEmail: dealerData.clientEmail
    })

    // Check if user already exists - prevent duplicates from invited users
    const existingUser = await prisma.users.findUnique({
      where: { email: dealerData.clientEmail }
    })

    if (existingUser) {
      logger.warn('User already exists for standalone onboarding', {
        email: dealerData.clientEmail,
        existingUserId: existingUser.id,
        businessName: dealerData.businessName
      })
      return errorResponse('A user with this email already exists.If you were invited by an agency, please use the invitation link provided.', 409)
    }

    // Send to SEOWorks
    const seoworksResult = await sendToSEOWorks(dealerData)

    // Create new user for standalone onboarding
    const user = await prisma.users.create({
      data: {
        id: crypto.randomUUID(),
        email: dealerData.clientEmail,
        name: dealerData.contactName,
        role: 'USER',
        onboardingCompleted: true,
        updatedAt: new Date()
        // Note: agencyId and dealershipId are null for standalone users
        // Package tracking is now managed at dealership level
      }
    })

    // Create initial request
    const setupRequest = await prisma.requests.create({
      data: {
        userId: user.id,
        // Note: agencyId and dealershipId are null for standalone users
        agencyId: null,
        dealershipId: null,
        title: `SEO Package Setup - ${dealerData.businessName}`,
        description: `Initial SEO setup for ${dealerData.businessName} (${dealerData.mainBrand})\n\nSEOWorks Client ID: ${seoworksResult.clientId}`,
        type: 'setup',
        packageType: dealerData.package as PackageType,
        targetUrl: dealerData.websiteUrl,
        keywords: dealerData.targetVehicleModels,
        targetCities: dealerData.targetCities,
        targetModels: dealerData.targetVehicleModels
      }
    })

    logger.info('Standalone dealer onboarding completed', {
      userId: user.id,
      requestId: setupRequest.id,
      seoworksClientId: seoworksResult.clientId,
      businessName: dealerData.businessName,
      userType: 'standalone'
    })

    return successResponse({
      message: 'Dealer onboarding completed successfully',
      userId: user.id,
      requestId: setupRequest.id,
      seoworksClientId: seoworksResult.clientId,
      businessName: dealerData.businessName,
      seoworksResponse: seoworksResult.seoworksResponse
    })

  } catch (error) {
    logger.error('Dealer onboarding failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    return errorResponse('Dealer onboarding failed', 500)
  }
}
