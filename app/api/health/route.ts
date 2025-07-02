import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger, getSafeErrorMessage } from '@/lib/logger'

export async function GET() {
  // Test database connection
  const startTime = Date.now()
  
  try {
    // Simple query to test DB connection
    await prisma.$queryRaw`SELECT 1 as test`
    const responseTime = Date.now() - startTime
    
    const response = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      buildTime: new Date().toISOString(), // Force cache bust for Prisma client regeneration
      database: 'connected',
      responseTime
    }
    
    console.log('[PRODUCTION INFO] Health check completed successfully', { responseTime, database: 'connected' })
    
    return NextResponse.json(response)
  } catch (error) {
    console.error('[PRODUCTION ERROR] Health check failed:', error)
    return NextResponse.json(
      { 
        status: 'unhealthy', 
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: 'Database connection failed'
      },
      { status: 500 }
    )
  }
}