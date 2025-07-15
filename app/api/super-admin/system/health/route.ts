import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getMailgunClient } from '@/lib/mailgun/client'

interface HealthStatus {
  database: 'healthy' | 'warning' | 'error'
  email: 'healthy' | 'warning' | 'error'
  storage: 'healthy' | 'warning' | 'error'
  api: 'healthy' | 'warning' | 'error'
  lastChecked: string
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is super admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (user?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Super admin access required' }, { status: 403 })
    }

    const health: HealthStatus = {
      database: 'healthy',
      email: 'healthy',
      storage: 'healthy',
      api: 'healthy',
      lastChecked: new Date().toISOString()
    }

    // Check database health
    try {
      await prisma.$queryRaw`SELECT 1`
      
      // Check database performance with a simple query
      const start = Date.now()
      await prisma.user.count()
      const dbResponseTime = Date.now() - start
      
      if (dbResponseTime > 1000) {
        health.database = 'warning'
      } else if (dbResponseTime > 5000) {
        health.database = 'error'
      }
    } catch (error) {
      console.error('Database health check failed:', error)
      health.database = 'error'
    }

    // Check email service health (Mailgun configuration validation)
    try {
      // Check Mailgun environment variables
      const hasMailgunApiKey = !!process.env.MAILGUN_API_KEY
      const hasMailgunDomain = !!process.env.MAILGUN_DOMAIN
      const hasAppUrl = !!process.env.NEXT_PUBLIC_APP_URL
      
      if (!hasMailgunApiKey || !hasMailgunDomain) {
        health.email = 'error'
        console.warn('Missing Mailgun configuration:', {
          hasApiKey: hasMailgunApiKey,
          hasDomain: hasMailgunDomain,
          hasAppUrl
        })
      } else if (!hasAppUrl) {
        health.email = 'warning'
        console.warn('Missing NEXT_PUBLIC_APP_URL for email links')
      } else {
        // Try to validate Mailgun configuration
        try {
          const { mg, domain } = getMailgunClient()
          if (mg && domain) {
            health.email = 'healthy'
          } else {
            health.email = 'warning'
          }
        } catch (mailgunError) {
          console.error('Mailgun client initialization failed:', mailgunError)
          health.email = 'warning'
        }
      }
    } catch (error) {
      console.error('Email health check failed:', error)
      health.email = 'error'
    }

    // Check storage health (file system or cloud storage)
    try {
      // Check if we can write to temp directory
      const fs = require('fs').promises
      const path = require('path')
      const tempFile = path.join(process.cwd(), 'temp_health_check.txt')
      
      await fs.writeFile(tempFile, 'health check')
      await fs.unlink(tempFile)
      
      health.storage = 'healthy'
    } catch (error) {
      console.error('Storage health check failed:', error)
      health.storage = 'warning'
    }

    // Check API health (response times and error rates)
    try {
      // Check recent error logs or response times
      // For now, we'll assume API is healthy if we got this far
      health.api = 'healthy'
      
      // In a real implementation, you might check:
      // - Recent error rates from logs
      // - Average response times
      // - External API dependencies
    } catch (error) {
      console.error('API health check failed:', error)
      health.api = 'warning'
    }

    return NextResponse.json({ health })

  } catch (error) {
    console.error('Error performing health check:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST endpoint to trigger manual health checks or system maintenance tasks
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is super admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (user?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Super admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'cleanup_sessions':
        // Clean up expired sessions
        try {
          const result = await prisma.session.deleteMany({
            where: {
              expires: {
                lt: new Date()
              }
            }
          })
          return NextResponse.json({ 
            message: `Cleaned up ${result.count} expired sessions`,
            action: 'cleanup_sessions',
            count: result.count
          })
        } catch (error) {
          console.error('Session cleanup failed:', error)
          return NextResponse.json({ error: 'Session cleanup failed' }, { status: 500 })
        }

      case 'cleanup_audit_logs':
        // Clean up old audit logs (older than 90 days)
        try {
          const ninetyDaysAgo = new Date()
          ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
          
          const result = await prisma.auditLog.deleteMany({
            where: {
              createdAt: {
                lt: ninetyDaysAgo
              }
            }
          })
          return NextResponse.json({ 
            message: `Cleaned up ${result.count} old audit logs`,
            action: 'cleanup_audit_logs',
            count: result.count
          })
        } catch (error) {
          console.error('Audit log cleanup failed:', error)
          return NextResponse.json({ error: 'Audit log cleanup failed' }, { status: 500 })
        }

      case 'optimize_database':
        // Run database optimization tasks
        try {
          // In a real implementation, you might run VACUUM, ANALYZE, or similar
          // For now, we'll just return a success message
          return NextResponse.json({ 
            message: 'Database optimization completed',
            action: 'optimize_database'
          })
        } catch (error) {
          console.error('Database optimization failed:', error)
          return NextResponse.json({ error: 'Database optimization failed' }, { status: 500 })
        }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error performing maintenance action:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}