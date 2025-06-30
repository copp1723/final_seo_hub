import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PackageType } from '@prisma/client' // Added for PackageType enum
import { startOfDay, endOfMonth } from 'date-fns' // Added for date manipulation

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
  try {
    const session = await auth()
    
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userId = session.user.id;
    const formData: OnboardingPayload = await request.json()
    
    // Add timestamp
    formData.timestamp = new Date().toISOString()
    
    // Send to SEOWorks webhook if configured
    if (process.env.SEOWORKS_WEBHOOK_URL && process.env.SEOWORKS_API_KEY) {
      try {
        const response = await fetch(process.env.SEOWORKS_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.SEOWORKS_API_KEY
          },
          body: JSON.stringify(formData)
        })
        
        const result = await response.json()
        
        if (!response.ok || !result.success) {
          console.error('SEOWorks webhook error:', result)
          // Don't fail the request, just log the error
        }
      } catch (webhookError) {
        console.error('Failed to send to SEOWorks:', webhookError)
        // Continue processing even if webhook fails
      }
    }
    
    // Update user record with onboarding data and initial billing setup
    try {
      const now = new Date()
      const updateData: any = { // Use 'any' for now, or create a proper Prisma type
        onboardingCompleted: true,
        activePackageType: formData.package as PackageType, // Assuming formData.package is 'SILVER', 'GOLD', or 'PLATINUM'
        currentBillingPeriodStart: startOfDay(now),
        currentBillingPeriodEnd: endOfMonth(now),
        pagesUsedThisPeriod: 0,
        blogsUsedThisPeriod: 0,
        gbpPostsUsedThisPeriod: 0,
        improvementsUsedThisPeriod: 0,
      }

      await prisma.user.update({
        where: { id: userId },
        data: updateData,
      });

      console.log(`User ${userId} onboarding completed and package ${formData.package} activated.`);

    } catch (dbError) {
      console.error('Failed to update user onboarding status and package info:', dbError);
      // Depending on business logic, this could be a critical error.
      // For now, let's return an error if this fails, as it's crucial for package setup.
      return NextResponse.json({ error: 'Failed to finalize onboarding and activate package.' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Onboarding data received and package activated successfully'
    })
    
  } catch (error) {
    console.error('Onboarding error:', error)
    return NextResponse.json({ 
      error: 'Failed to process onboarding data' 
    }, { status: 500 })
  }
}