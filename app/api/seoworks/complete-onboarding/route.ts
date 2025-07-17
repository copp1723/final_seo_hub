import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { errorResponse, successResponse } from '@/lib/api-auth'
import { PackageType } from '@prisma/client'

// SEOWorks API configuration
const SEOWORKS_API_KEY = process.env.SEOWORKS_API_KEY
if (!SEOWORKS_API_KEY) {
  logger.error('SEOWORKS_API_KEY environment variable is not set')
}
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
  targetVehicleModels: string[]
  targetCities: string[]
  targetDealers: string[]
  userId?: string  // For invited users
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

// This endpoint is called by invited users completing onboarding
export async function POST(request: NextRequest) {
  try {
    const dealerData: DealerOnboardingData = await request.json()
    
    logger.info('Received dealer onboarding completion from invited user', {
      businessName: dealerData.businessName,
      package: dealerData.package,
      userId: dealerData.userId
    })

    // For invited users, we should have a userId
    if (!dealerData.userId) {
      return errorResponse('User ID is required for invited user onboarding', 400)
    }

    // Find the existing user created by agency admin
    const existingUser = await prisma.users.findUnique({
      where: { id: dealerData.userId },
      include: {
        agencies: true,
        dealerships: true
      }
    })

    if (!existingUser) {
      return errorResponse('User not found', 404)
    }

    if (existingUser.onboardingCompleted) {
      return errorResponse('User has already completed onboarding', 400)
    }

    if (!existingUser.dealerships?.id) {
      return errorResponse('User has no dealership assigned', 400)
    }

    // Send to SEOWorks
    const seoworksResult = await sendToSEOWorks(dealerData)

    // Update the user's onboarding status
    const updatedUser = await prisma.users.update({
      where: { id: dealerData.userId },
      data: {
        onboardingCompleted: true
      }
    })

    // Update dealership package info
    await prisma.dealerships.update({
      where: { id: existingUser.dealerships?.id },
      data: {
        activePackageType: dealerData.package as PackageType,
        currentBillingPeriodStart: new Date(),
        currentBillingPeriodEnd: new Date(new Date().setMonth(new Date().getMonth() + 1)),
        pagesUsedThisPeriod: 0,
        blogsUsedThisPeriod: 0,
        gbpPostsUsedThisPeriod: 0,
        improvementsUsedThisPeriod: 0
      }
    })

    // Create initial request
    const setupRequest = await prisma.requests.create({
      data: {
        userId: existingUser.id,
        dealershipId: existingUser.dealerships?.id,
        agencyId: existingUser.agencies?.id,
        title: `SEO Package Setup - ${dealerData.businessName}`,
        description: `Initial SEO setup for ${dealerData.businessName} (${dealerData.mainBrand})\n\nSEOWorks Client ID: ${seoworksResult.clientId}\nManaged by Agency: ${existingUser.agencies?.name || 'N/A'}`,
        type: 'setup',
        packageType: dealerData.package as PackageType,
        targetUrl: dealerData.websiteUrl,
        keywords: dealerData.targetVehicleModels,
        targetCities: dealerData.targetCities,
        targetModels: dealerData.targetVehicleModels
      }
    })

    logger.info('Invited user onboarding completed', {
      userId: existingUser.id,
      requestId: setupRequest.id,
      seoworksClientId: seoworksResult.clientId,
      businessName: dealerData.businessName,
      agencyId: existingUser.agencies?.id
    })

    return successResponse({
      message: 'Dealer onboarding completed successfully',
      userId: existingUser.id,
      requestId: setupRequest.id,
      seoworksClientId: seoworksResult.clientId,
      businessName: dealerData.businessName,
      seoworksResponse: seoworksResult.seoworksResponse
    })

  } catch (error) {
    logger.error('Invited user onboarding failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    return errorResponse('Dealer onboarding failed', 500)
  }
}
