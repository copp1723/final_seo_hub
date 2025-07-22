import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/route-utils'
import { SearchConsoleAPI } from '@/lib/api/search-console-api'
import { logger } from '@/lib/logger'

// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  return withAuth(req, async (session) => {
    try {
      const oauth2Client = SearchConsoleAPI.getOAuth2Client()

      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: [
          'https://www.googleapis.com/auth/webmasters.readonly',
          'https://www.googleapis.com/auth/siteverification.verify_only'
        ],
        prompt: 'consent',
        state: session.user.id,
      })

      logger.info('Search Console OAuth initiated', { 
        userId: session.user.id,
        callbackUrl: `${process.env.NEXTAUTH_URL}/api/search-console/callback`
      })

      return NextResponse.redirect(authUrl)
    } catch (error) {
      logger.error('Search Console connect error', error, { 
        userId: session.user.id,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
      
      return NextResponse.json(
        { error: 'Failed to initiate Search Console connection' },
        { status: 500 }
      )
    }
  })
}
