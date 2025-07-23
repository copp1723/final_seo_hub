import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encryption'

// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await SimpleAuth.getSessionFromRequest(request)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check user_ga4_tokens
    const userToken = await prisma.user_ga4_tokens.findUnique({
      where: { userId: session.user.id }
    })

    // Check ga4_connections
    const ga4Connection = await prisma.ga4_connections.findFirst({
      where: { userId: session.user.id }
    })

    // Try to decrypt token if exists
    let decryptedToken = null
    let tokenError = null
    if (userToken?.encryptedAccessToken) {
      try {
        decryptedToken = await decrypt(userToken.encryptedAccessToken)
        // Only show first 10 chars for security
        decryptedToken = decryptedToken ? decryptedToken.substring(0, 10) + '...' : null
      } catch (error) {
        tokenError = error instanceof Error ? error.message : 'Decryption failed'
      }
    }

    return NextResponse.json({
      hasUserToken: !!userToken,
      hasGA4Connection: !!ga4Connection,
      propertyId: ga4Connection?.propertyId,
      propertyName: ga4Connection?.propertyName,
      tokenCreatedAt: userToken?.createdAt,
      tokenExpiryDate: userToken?.expiryDate,
      isTokenExpired: userToken?.expiryDate ? new Date(userToken.expiryDate) < new Date() : null,
      hasEncryptedToken: !!userToken?.encryptedAccessToken,
      hasRefreshToken: !!userToken?.encryptedRefreshToken,
      decryptedTokenPreview: decryptedToken,
      decryptionError: tokenError,
      environmentVars: {
        hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
        hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
        hasEncryptionKey: !!process.env.ENCRYPTION_KEY,
        nextAuthUrl: process.env.NEXTAUTH_URL
      }
    })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Debug check failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}