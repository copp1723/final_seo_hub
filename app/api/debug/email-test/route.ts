import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, getMailgunClient } from '@/lib/mailgun/client'
import { welcomeEmailTemplate } from '@/lib/mailgun/templates'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    // Test 1: Check Mailgun configuration
    const configTest = {
      hasApiKey: !!process.env.MAILGUN_API_KEY,
      hasDomain: !!process.env.MAILGUN_DOMAIN,
      hasFromEmail: !!process.env.MAILGUN_FROM_EMAIL,
      apiKeyLength: process.env.MAILGUN_API_KEY?.length || 0,
      domain: process.env.MAILGUN_DOMAIN || 'NOT_SET'
    }

    // Test 2: Try to initialize Mailgun client
    let clientTest: { success: boolean; error: string | null } = { success: false, error: null }
    try {
      const { mg, domain } = getMailgunClient()
      clientTest = { success: true, error: null }
    } catch (error) {
      clientTest = { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }

    // Test 3: Check if we can send a test email (optional - only if testEmail query param is provided)
    const { searchParams } = new URL(request.url)
    const testEmail = searchParams.get('testEmail')
    let emailTest = null

    if (testEmail) {
      try {
        const testUser = {
          id: 'test-user-id',
          name: 'Test User',
          email: testEmail
        }
        const template = welcomeEmailTemplate(testUser as any)
        
        const emailSent = await sendEmail({
          to: testEmail,
          subject: '[TEST] ' + template.subject,
          html: template.html,
          tags: ['test', 'debug']
        })

        emailTest = { success: emailSent, email: testEmail }
      } catch (error) {
        emailTest = { 
          success: false, 
          email: testEmail,
          error: error instanceof Error ? error.message : 'Unknown error' 
        }
      }
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      tests: {
        configuration: configTest,
        clientInitialization: clientTest,
        emailSending: emailTest
      },
      diagnosis: {
        canSendEmails: configTest.hasApiKey && configTest.hasDomain && clientTest.success,
        issues: [
          !configTest.hasApiKey && 'Missing MAILGUN_API_KEY',
          !configTest.hasDomain && 'Missing MAILGUN_DOMAIN',
          !clientTest.success && `Client initialization failed: ${clientTest.error}`
        ].filter(Boolean)
      }
    })

  } catch (error) {
    logger.error('Email test failed', error)
    return NextResponse.json({
      error: 'Email test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}