import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encryption'
import { google } from 'googleapis'

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get GA4 connection
    const connection = await prisma.gA4Connection.findUnique({
      where: { userId: session.user.id }
    })

    if (!connection) {
      return NextResponse.json({ error: 'No GA4 connection found' }, { status: 404 })
    }

    // Set up OAuth client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL + '/api/ga4/auth/callback'
    )

    oauth2Client.setCredentials({
      access_token: decrypt(connection.accessToken),
      refresh_token: connection.refreshToken ? decrypt(connection.refreshToken) : undefined,
    })

    // Test Analytics Data API
    const analyticsData = google.analyticsdata({ version: 'v1beta', auth: oauth2Client })

    console.log('Testing GA4 Analytics with property:', connection.propertyId)

    try {
      const response = await analyticsData.properties.runReport({
        property: `properties/${connection.propertyId}`,
        dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
        metrics: [{ name: 'sessions' }],
        limit: 1
      })

      return NextResponse.json({
        success: true,
        propertyId: connection.propertyId,
        propertyName: connection.propertyName,
        testData: {
          rowCount: response.data?.rowCount || 0,
          metricHeaders: response.data?.metricHeaders || [],
          hasData: !!(response.data?.rows && response.data.rows.length > 0)
        }
      })

    } catch (apiError: any) {
      console.error('GA4 API Error:', apiError)
      
      return NextResponse.json({
        error: 'GA4 API Error',
        details: {
          message: apiError.message,
          code: apiError.code,
          status: apiError.status,
          errors: apiError.errors || [],
          propertyId: connection.propertyId
        }
      }, { status: 400 })
    }

  } catch (error: any) {
    console.error('Test analytics error:', error)
    return NextResponse.json(
      { error: 'Test failed', details: error.message },
      { status: 500 }
    )
  }
} 