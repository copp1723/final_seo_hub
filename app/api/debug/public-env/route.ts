import { NextResponse } from 'next/server'

// PUBLIC DEBUG ENDPOINT - BYPASSES AUTH - REMOVE AFTER TROUBLESHOOTING
export async function GET() {
  try {
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV,
      hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      nextAuthUrl: process.env.NEXTAUTH_URL,
      googleClientIdLength: process.env.GOOGLE_CLIENT_ID?.length || 0,
      googleClientSecretLength: process.env.GOOGLE_CLIENT_SECRET?.length || 0,
      googleClientIdPrefix: process.env.GOOGLE_CLIENT_ID?.substring(0, 10) + '...',
      // Basic validation checks
      googleClientIdValid: process.env.GOOGLE_CLIENT_ID?.includes('.apps.googleusercontent.com') || false,
      nextAuthUrlValid: process.env.NEXTAUTH_URL?.startsWith('https://') || false,
      // DO NOT LOG ACTUAL VALUES - ONLY PREFIXES AND VALIDATION
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to read environment variables',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 