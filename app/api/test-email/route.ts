import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/mailgun/client'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { to, subject = 'Test Email', message = 'This is a test email from the SEO Hub platform.' } = body

    if (!to) {
      return NextResponse.json({ 
        error: 'Email address is required' 
      }, { status: 400 })
    }

    const success = await sendEmail({
      to,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Test Email</h2>
          <p>${message}</p>
          <p style="color: #666; font-size: 14px;">
            This is a test email sent from the SEO Hub platform to verify email configuration.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">
            Sent at: ${new Date().toISOString()}
          </p>
        </div>
      `,
      tags: ['test', 'configuration']
    })

    if (success) {
      logger.info('Test email sent successfully', { to, subject })
      return NextResponse.json({
        success: true,
        message: 'Test email sent successfully'
      })
    } else {
      logger.error('Test email failed to send', undefined, { to, subject })
      return NextResponse.json({
        success: false,
        error: 'Failed to send test email'
      }, { status: 500 })
    }

  } catch (error) {
    logger.error('Error in test email endpoint', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Test email endpoint. Use POST with { "to": "email@example.com" } to send a test email.'
  })
}
