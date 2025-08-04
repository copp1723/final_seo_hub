import { NextRequest } from 'next/server'
import { successResponse, errorResponse } from '@/lib/api-auth'
import { getMailgunClient } from '@/lib/mailgun/client'
import { emailQueue } from '@/lib/mailgun/queue'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  logger.info('🔍 Email health check started')
  
  try {
    // Check email queue health
    const queueSize = emailQueue.getSize()
    const failedEmails = emailQueue.getFailedEmails()
    
    logger.info('📊 Queue status', { queueSize, failedEmailsCount: failedEmails.length })
    
    // Check environment variables
    const envCheck = {
      MAILGUN_API_KEY: !!process.env.MAILGUN_API_KEY,
      MAILGUN_DOMAIN: !!process.env.MAILGUN_DOMAIN,
      NEXT_PUBLIC_APP_URL: !!process.env.NEXT_PUBLIC_APP_URL,
      values: {
        apiKey: process.env.MAILGUN_API_KEY ? `${process.env.MAILGUN_API_KEY.substring(0, 8)}...` : 'missing',
        domain: process.env.MAILGUN_DOMAIN || 'missing',
        appUrl: process.env.NEXT_PUBLIC_APP_URL || 'missing'
      }
    }
    
    logger.info('🔧 Environment check', envCheck)
    
    // Check Mailgun configuration
    let mailgunStatus = 'healthy'
    let mailgunError = null
    let mailgunDetails = {}
    
    try {
      const { mg, domain } = getMailgunClient()
      
      if (!domain || !mg) {
        mailgunStatus = 'warning'
        mailgunError = 'Mailgun configuration incomplete'
        logger.warn('⚠️ Mailgun incomplete', { domain: !!domain, mg: !!mg })
      } else {
        // Try to validate the API key with a simple call
        try {
          await mg.domains.get(domain)
          mailgunStatus = 'healthy'
          logger.info('✅ Mailgun API validation successful')
        } catch (apiError) {
          mailgunStatus = 'error'
          mailgunError = `API validation failed: ${apiError instanceof Error ? apiError.message : 'Unknown error'}`
          logger.error('❌ Mailgun API validation failed', apiError)
        }
      }
      
      mailgunDetails = {
        domain,
        hasClient: !!mg,
        envVars: envCheck
      }
      
    } catch (error) {
      mailgunStatus = 'error'
      mailgunError = `Configuration error: ${error instanceof Error ? error.message : 'Unknown error'}`
      logger.error('💥 Mailgun configuration error', error)
    }
    
    // Overall email service status
    let overallStatus = 'healthy'
    
    if (mailgunStatus === 'error' || !envCheck.MAILGUN_API_KEY || !envCheck.MAILGUN_DOMAIN) {
      overallStatus = 'error'
    } else if (mailgunStatus === 'warning' || failedEmails.length > 5 || queueSize > 10) {
      overallStatus = 'warning'
    }
    
    const result: {
      status: string;
      timestamp: string;
      details: any;
      recommendations: string[];
      message?: string;
    } = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      details: {
        mailgun: {
          status: mailgunStatus,
          error: mailgunError,
         ...mailgunDetails
        },
        queue: {
          size: queueSize,
          failedEmails: failedEmails.length,
          recentFailures: failedEmails.slice(-3).map(f => ({
            timestamp: f.timestamp,
            to: f.email.to,
            subject: f.email.subject
          }))
        },
        environment: envCheck
      },
      recommendations: []
    }
    
    // Add specific recommendations
    if (!envCheck.MAILGUN_API_KEY) {
      result.recommendations.push('Set MAILGUN_API_KEY environment variable')
    }
    if (!envCheck.MAILGUN_DOMAIN) {
      result.recommendations.push('Set MAILGUN_DOMAIN environment variable')
    }
    if (!envCheck.NEXT_PUBLIC_APP_URL) {
      result.recommendations.push('Set NEXT_PUBLIC_APP_URL environment variable')
    }
    if (failedEmails.length > 0) {
      result.recommendations.push(`${failedEmails.length} failed emails in queue - check logs`)
    }
    
    result.message = overallStatus === 'healthy'
      ? 'Email service is operating normally'
      : overallStatus === 'warning'
      ? `Email service has minor issues: ${result.recommendations.join(', ')}`
      : `Email service has critical issues: ${result.recommendations.join(', ')}`
    
    logger.info('📋 Email health check complete', { status: overallStatus, recommendations: result.recommendations })
    
    return successResponse(result)
    
  } catch (error) {
    logger.error('💥 Email health check failed', error)
    return errorResponse('Failed to check email service health', 500)
  }
}
