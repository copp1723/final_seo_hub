import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { errorResponse, successResponse } from '@/lib/api-auth'
import { PackageType, UserRole } from '@prisma/client'
import crypto from 'crypto'

// SEOWorks API key for authentication
const SEOWORKS_API_KEY = '7f3e9b5d2a8c4f6e1b9d3c7a5e8f2b4d6c9a1e3f7b5d9c2a6e4f8b1d3c7a9e5f'

interface OnboardingPayload {
  timestamp: string
  businessName: string
  clientId: string
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
  email: string
  phone: string
  websiteUrl: string
  billingEmail: string
  siteAccessNotes?: string
  targetVehicleModels: string // semicolon-separated
  targetCities: string // semicolon-separated
  targetDealers: string // semicolon-separated
}

export async function POST(req: NextRequest) {
  try {
    // Verify API key
    const apiKey = req.headers.get('x-api-key')
    if (!apiKey || apiKey !== SEOWORKS_API_KEY) {
      logger.warn('SEOWorks onboarding: Invalid API key', {
        providedKey: apiKey?.substring(0, 8) + '...'
      })
      return errorResponse('Unauthorized', 401)
    }

    const payload: OnboardingPayload = await req.json()
    
    logger.info('SEOWorks onboarding received', {
      clientId: payload.clientId,
      businessName: payload.businessName,
      package: payload.package
    })

    // Convert package string to enum
    const packageTypeMap: Record<string, PackageType> = {
      'SILVER': PackageType.SILVER,
      'GOLD': PackageType.GOLD,
      'PLATINUM': PackageType.PLATINUM
    }
    const packageType = packageTypeMap[payload.package] || PackageType.GOLD

    // Transform target cities from "City1;City2" to "City1, State;City2, State" format
    const transformTargetCities = (cities: string, state: string): string[] => {
      return cities.split(';')
        .map(city => city.trim())
        .filter(city => city.length > 0)
        .map(city => `${city}, ${state}`)
    }

    // Transform semicolon-separated strings to arrays
    const targetCities = transformTargetCities(payload.targetCities, payload.state)
    const targetModels = payload.targetVehicleModels
      .split(';')
      .map(model => model.trim())
      .filter(model => model.length > 0)
    
    const targetDealers = payload.targetDealers
      .split(';')
      .map(dealer => dealer.trim())
     .filter(dealer => dealer.length > 0)

    // Check if user already exists
    let user = await prisma.users.findUnique({
      where: { email: payload.clientEmail }
    })

    if (user) {
      logger.info('SEOWorks onboarding: users already exists, updating', {
        userId: user.id,
        email: payload.clientEmail
      })
      
      // Update existing user
      user = await prisma.users.update({
        where: { id: user.id },
        data: {
          name: payload.contactName,
          onboardingCompleted: true
        }
      })
    } else {
      // Create new user
      user = await prisma.users.create({
        data: {
          id: crypto.randomUUID(),
          email: payload.clientEmail,
          name: payload.contactName,
          role: UserRole.USER,
          onboardingCompleted: true,
          updatedAt: new Date()
        }
      })

      logger.info('SEOWorks onboarding: New user created', {
        userId: user.id,
        email: payload.clientEmail,
        name: payload.contactName
      })
    }

    // Note: This route creates users without dealership context
    // Package type information will need to be set through dealership management
    // Create initial request with onboarding data
    const setupRequest = await prisma.requests.create({
      data: {
        userId: user.id,
        // Note: agencyId and dealershipId are null for legacy onboarding
        agencyId: null,
        dealershipId: null,
        title: `SEO Package Setup - ${payload.businessName}`,
        description: `Initial SEO setup for ${payload.businessName} (${payload.mainBrand})\n\nBusiness Details:\n- Contact: ${payload.contactName} (${payload.contactTitle})\n- Phone: ${payload.phone}\n- Address: ${payload.address}, ${payload.city}, ${payload.state} ${payload.zipCode}\n- Website: ${payload.websiteUrl}\n- Billing: ${payload.billingEmail}\n\nTarget Dealers: ${targetDealers.join('; ')}\n\nOnboarded via SEOWorks at ${payload.timestamp}`,
        type: 'setup',
        packageType: packageType,
        targetUrl: payload.websiteUrl,
        // Store SEO targeting data in JSON fields
        keywords: targetModels, // Vehicle models as keywords
        targetCities: targetCities,
        targetModels: targetModels,
        // Store additional business data in completedTasks field as metadata
        completedTasks: [{
          type: 'onboarding_data',
          title: 'SEOWorks Onboarding Data',
          businessName: payload.businessName,
          clientId: payload.clientId,
          mainBrand: payload.mainBrand,
          otherBrand: payload.otherBrand,
          address: payload.address,
          city: payload.city,
          state: payload.state,
          zipCode: payload.zipCode,
          contactName: payload.contactName,
          contactTitle: payload.contactTitle,
          phone: payload.phone,
          websiteUrl: payload.websiteUrl,
          billingEmail: payload.billingEmail,
          siteAccessNotes: payload.siteAccessNotes,
          targetDealers: targetDealers,
          onboardedAt: payload.timestamp,
          source: 'seoworks_onboarding'
        }]
      }
    })

    logger.info('SEOWorks onboarding: Setup request created', {
      requestId: setupRequest.id,
      userId: user.id,
      businessName: payload.businessName
    })

    return successResponse({
      message: 'Onboarding completed successfully',
      userId: user.id,
      requestId: setupRequest.id,
      clientId: payload.clientId,
      businessName: payload.businessName,
      package: payload.package,
      targetCities: targetCities,
      targetModels: targetModels
    })

  } catch (error) {
    logger.error('SEOWorks onboarding error', error)
    return errorResponse('Onboarding processing failed', 500)
  }
}
