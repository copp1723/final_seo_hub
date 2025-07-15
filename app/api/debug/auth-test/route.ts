import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const authConfig = {
      NODE_ENV: process.env.NODE_ENV,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'SET' : 'MISSING',
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'SET' : 'MISSING',
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'MISSING',
      DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'MISSING'
    }

    console.log('🔍 Auth Configuration Check:', authConfig)

    return NextResponse.json({
      status: 'success',
      config: authConfig,
      message: 'Auth configuration check complete'
    })
  } catch (error) {
    console.error('❌ Auth config check error:', error)
    return NextResponse.json({
      status: 'error',
      error: (error as Error).message
    }, { status: 500 })
  }
}