import { NextResponse } from 'next/server'

// TEMPORARY DEBUG ENDPOINT - REMOVE AFTER TROUBLESHOOTING
export async function GET() {
  return NextResponse.json({
    nodeEnv: process.env.NODE_ENV,
    hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    nextAuthUrl: process.env.NEXTAUTH_URL,
    googleClientIdLength: process.env.GOOGLE_CLIENT_ID?.length || 0,
    googleClientSecretLength: process.env.GOOGLE_CLIENT_SECRET?.length || 0,
    // DO NOT LOG ACTUAL VALUES - ONLY LENGTHS AND EXISTENCE
  })
} 