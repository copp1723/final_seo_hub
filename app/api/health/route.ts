import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
    
    return NextResponse.json(healthStatus, { status: 200 })
  } catch (error) {
    console.error('Health check failed:', error)
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        database: 'disconnected',
        error: 'Database connection failed',
      },
      { status: 503 }
    )
  }
}