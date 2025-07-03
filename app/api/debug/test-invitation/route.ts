import { NextRequest, NextResponse } from 'next/server'
import { sendInvitationEmail } from '@/lib/mailgun/invitation'
import { userInvitationTemplate } from '@/lib/mailgun/templates'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const testEmail = searchParams.get('email')
    const testName = searchParams.get('name') || 'Test User'
    const invitedBy = searchParams.get('invitedBy') || 'System Administrator'

    if (!testEmail) {
      return NextResponse.json({
        error: 'Missing required parameter: email',
        usage: '/api/debug/test-invitation?email=test@example.com&name=Test%20User&invitedBy=Admin'
      }, { status: 400 })
    }

    // Create a mock user object for testing
    const mockUser = {
      id: 'test-invitation-' + Date.now(),
      email: testEmail,
      name: testName,
      emailVerified: null,
      image: null,
      role: 'USER' as const,
      agencyId: null,
      apiKey: null,
      apiKeyCreatedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      onboardingCompleted: false,
      activePackageType: null,
      currentBillingPeriodStart: null,
      currentBillingPeriodEnd: null,
      pagesUsedThisPeriod: 0,
      blogsUsedThisPeriod: 0,
      gbpPostsUsedThisPeriod: 0,
      improvementsUsedThisPeriod: 0
    }

    // Test template generation
    const template = userInvitationTemplate(mockUser, invitedBy)

    // Test email sending
    const invitationSent = await sendInvitationEmail({
      user: mockUser,
      invitedBy,
      skipPreferences: true
    })

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      test: {
        mockUser: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          role: mockUser.role
        },
        template: {
          subject: template.subject,
          htmlLength: template.html.length,
          hasLoginButton: template.html.includes('Sign In to SEO Hub'),
          hasUserDetails: template.html.includes(testEmail)
        },
        invitationSent,
        invitedBy
      },
      result: invitationSent ? 'SUCCESS: Invitation email sent!' : 'FAILED: Invitation email not sent',
      recommendation: invitationSent 
        ? 'Invitation system is working correctly'
        : 'Check Mailgun configuration and logs for errors'
    })

  } catch (error) {
    logger.error('Invitation test failed', error)
    return NextResponse.json({
      error: 'Invitation test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}