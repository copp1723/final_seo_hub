import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// TEMPORARY DB TEST ENDPOINT - REMOVE AFTER TROUBLESHOOTING
export async function GET() {
  try {
    // Test basic database connectivity
    const userCount = await prisma.users.count()
    
    // Test if we can create a simple query
    const testQuery = await prisma.$queryRaw`SELECT 1 as test`
    
    return NextResponse.json({
      success: true,
      userCount,
      testQuery,
      timestamp: new Date().toISOString(),
      databaseUrl: process.env.DATABASE_URL ? 'SET' : 'MISSING',
      databaseUrlLength: process.env.DATABASE_URL?.length || 0
    })
  } catch (error) {
    console.error('Database test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      databaseUrl: process.env.DATABASE_URL ? 'SET' : 'MISSING'
    }, { status: 500 })
  }
}
