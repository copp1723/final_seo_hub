import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

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
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
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
    
    return NextResponse.json({ 
      success: true,
      message: 'Onboarding data received successfully'
    })
    
  } catch (error) {
    console.error('Onboarding error:', error)
    return NextResponse.json({ 
      error: 'Failed to process onboarding data' 
    }, { status: 500 })
  }
}