import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/mailgun/client'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    console.log('🧪 Testing email send to:', email)
    console.log('🔍 Environment check:')
    console.log('  MAILGUN_API_KEY:', process.env.MAILGUN_API_KEY ? 'SET' : 'MISSING')
    console.log('  MAILGUN_DOMAIN:', process.env.MAILGUN_DOMAIN || 'MISSING')

    const success = await sendEmail({
      to: email,
      subject: 'Test Email from SEO Hub',
      html: `
        <h2>Test Email</h2>
        <p>This is a test email to verify that Mailgun is working correctly.</p>
        <p>If you received this email, the email system is functioning properly.</p>
      `,
      tags: ['test']
    })

    console.log('📧 Email test result:', success)

    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Test email sent successfully!' 
      })
    } else {
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to send test email' 
      }, { status: 500 })
    }

  } catch (error) {
    console.error('❌ Test email error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ 
      success: false, 
      message: `Test email failed: ${errorMessage}` 
    }, { status: 500 })
  }
} 