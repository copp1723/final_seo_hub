import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encryption'
import { google } from 'googleapis'

export async function GET(request: NextRequest) {
  try {
    const session = await SimpleAuth.getSessionFromRequest(request)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const dealershipId = 'dealer-acura-columbus'
    const propertyId = '284944578'

    // Get the GA4 connection
    const connection = await prisma.ga4_connections.findFirst({
      where: { dealershipId },
      orderBy: { updatedAt: 'desc' }
    })

    if (!connection) {
      return NextResponse.json({ error: 'No GA4 connection found' })
    }

    console.log('🔍 GA4 Debug - Connection found:', {
      id: connection.id,
      propertyId: connection.propertyId,
      hasAccessToken: !!connection.accessToken,
      hasRefreshToken: !!connection.refreshToken,
      expiresAt: connection.expiresAt
    })

    // Try to decrypt the access token
    let accessToken: string
    try {
      accessToken = decrypt(connection.accessToken)
      console.log('✅ GA4 Debug - Token decrypted successfully, length:', accessToken.length)
    } catch (error) {
      console.error('❌ GA4 Debug - Token decryption failed:', error)
      return NextResponse.json({ 
        error: 'Token decryption failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // Set up OAuth client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/ga4/auth/callback`
    )

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: connection.refreshToken ? decrypt(connection.refreshToken) : undefined
    })

    // Test the Analytics Data API
    const analyticsData = google.analyticsdata({
      version: 'v1beta',
      auth: oauth2Client
    })

    console.log('🔍 GA4 Debug - Making test API call to property:', propertyId)

    // Make a simple test request
    const response = await analyticsData.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
        metrics: [{ name: 'sessions' }]
      }
    })

    console.log('✅ GA4 Debug - API call successful!')
    
    return NextResponse.json({
      success: true,
      connection: {
        id: connection.id,
        propertyId: connection.propertyId,
        expiresAt: connection.expiresAt
      },
      apiResponse: {
        hasData: !!response.data,
        rowCount: response.data?.rows?.length || 0
      }
    })

  } catch (error) {
    console.error('❌ GA4 Debug - Error:', error)
    
    return NextResponse.json({
      error: 'GA4 test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
  }
}
