import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { GA4Service } from '@/lib/google/ga4Service'
import { prisma } from '@/lib/prisma'
import { google } from 'googleapis'
import { decrypt } from '@/lib/encryption'

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get GA4 connection
    const ga4Connection = await prisma.gA4Connection.findUnique({
      where: { userId: session.user.id }
    })

    if (!ga4Connection) {
      return NextResponse.json({
        error: 'No GA4 connection found',
        action: 'Connect GA4 in settings first'
      }, { status: 404 })
    }

    // Decrypt tokens
    const accessToken = decrypt(ga4Connection.accessToken)
    
    // Test OAuth Client setup
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL + '/api/ga4/auth/callback'
    )

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: ga4Connection.refreshToken ? decrypt(ga4Connection.refreshToken) : undefined,
    })

    // Test Analytics Admin API access
    const analyticsAdmin = google.analyticsadmin({ version: 'v1beta', auth: oauth2Client })
    
    console.log('Testing OAuth scopes...')
    
    // Test 1: List account summaries (requires analytics.readonly)
    let accountSummariesResult = null
    try {
      const accountSummaries = await analyticsAdmin.accountSummaries.list()
      accountSummariesResult = {
        success: true,
        count: accountSummaries.data.accountSummaries?.length || 0,
        accounts: accountSummaries.data.accountSummaries?.map(acc => ({
          account: acc.account,
          displayName: acc.displayName,
          propertySummaries: acc.propertySummaries?.length || 0
        })) || []
      }
    } catch (error) {
      accountSummariesResult = {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }

    // Test 2: Analytics Data API access
    const analyticsData = google.analyticsdata({ version: 'v1beta', auth: oauth2Client })
    
    let dataApiResult = null
    if (ga4Connection.propertyId) {
      try {
        const report = await analyticsData.properties.runReport({
          property: `properties/${ga4Connection.propertyId}`,
          requestBody: {
            dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
            metrics: [{ name: 'sessions' }],
            dimensions: [{ name: 'date' }],
            limit: 5
          }
        })
        
        dataApiResult = {
          success: true,
          propertyId: ga4Connection.propertyId,
          rowCount: report.data.rows?.length || 0,
          hasData: (report.data.rows?.length || 0) > 0
        }
      } catch (error) {
        dataApiResult = {
          success: false,
          propertyId: ga4Connection.propertyId,
          error: error instanceof Error ? error.message : String(error)
        }
      }
    } else {
      dataApiResult = {
        success: false,
        error: 'No property ID configured'
      }
    }

    return NextResponse.json({
      message: 'OAuth scope test completed',
      connection: {
        userId: session.user.id,
        propertyId: ga4Connection.propertyId,
        propertyName: ga4Connection.propertyName,
        connectedAt: ga4Connection.createdAt,
        hasRefreshToken: !!ga4Connection.refreshToken
      },
      tests: {
        accountSummaries: accountSummariesResult,
        dataApi: dataApiResult
      },
      recommendations: {
        accountSummaries: accountSummariesResult?.success 
          ? '✅ Analytics Admin API access working'
          : '❌ Need analytics.readonly scope in OAuth consent screen',
        dataApi: dataApiResult?.success
          ? '✅ Analytics Data API access working'  
          : '❌ Check property access or add analytics scopes',
        nextSteps: accountSummariesResult?.success && dataApiResult?.success
          ? 'All scopes working! Your reporting should show data now.'
          : 'Update OAuth consent screen scopes and re-authorize'
      }
    })

  } catch (error) {
    console.error('OAuth scope test error:', error)
    return NextResponse.json({
      error: 'OAuth scope test failed',
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5) : undefined
    }, { status: 500 })
  }
}