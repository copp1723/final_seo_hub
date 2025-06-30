import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger, getSafeErrorMessage } from '@/lib/logger'

export async function GET() {
  const startTime = Date.now()
  
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`
    
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      responseTime: Date.now() - startTime,
      database: 'connected',
      environment: process.env.NODE_ENV || 'development',
    }
    
    logger.info('Health check completed successfully', {
      responseTime: healthStatus.responseTime,
      database: 'connected'
    })
    
    return NextResponse.json(healthStatus, { status: 200 })
  } catch (error) {
    logger.error('Health check failed', error, {
      path: '/api/health',
      method: 'GET',
      responseTime: Date.now() - startTime
    })
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        database: 'disconnected',
        error: getSafeErrorMessage(error),
      },
      { status: 503 }
    )
  }
}