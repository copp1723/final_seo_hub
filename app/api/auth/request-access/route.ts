import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { sendInvitationEmail } from '@/lib/mailgun/invitation'
import { rateLimits } from '@/lib/rate-limit'
import { z } from 'zod'

export const dynamic = 'force-dynamic';

// Validation schema for access requests
const requestAccessSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional()
})

export async function POST(request: NextRequest) {
  // Apply rate limiting to prevent abuse
  const rateLimitResponse = await rateLimits.api(request)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const body = await request.json()

    // Validate input using Zod schema
    const validation = requestAccessSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: validation.error.issues
      }, { status: 400 })
    }

    const { email, name } = validation.data

    // Check if user exists in database
    const user = await prisma.users.findUnique({
      where: { email }
    })

    if (user) {
      // User exists - generate invitation token
      const invitationToken = crypto.randomBytes(32).toString('hex')
      const invitationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

      await prisma.users.update({
        where: { id: user.id },
        data: {
          invitationToken,
          invitationTokenExpires
        }
      })

      const baseUrl = process.env.NEXTAUTH_URL || 'https://rylie-seo-hub.onrender.com'
      const loginUrl = `${baseUrl}/api/auth/accept-invitation?token=${invitationToken}`

      console.log(`🎯 Generated login link for ${email}: ${loginUrl}`)

      // Debug: Check Mailgun configuration
      console.log('🔍 Checking Mailgun config...')
      console.log('MAILGUN_API_KEY:', process.env.MAILGUN_API_KEY ? 'SET' : 'MISSING')
      console.log('MAILGUN_DOMAIN:', process.env.MAILGUN_DOMAIN || 'MISSING')
      console.log('MAILGUN_FROM_EMAIL:', process.env.MAILGUN_FROM_EMAIL || 'MISSING')

      try {
        // Send invitation email using existing email infrastructure
        console.log('🔄 Attempting to send email...')
        const emailSent = await sendInvitationEmail({
          user: {
            id: user.id,
            email: user.email,
            name: user.name || 'User', // Provide fallback for null name
            role: user.role,
            agencyId: user.agencyId,
            onboardingCompleted: user.onboardingCompleted || false
          },
          invitedBy: 'System',
          loginUrl,
          skipPreferences: true
        })

        console.log('📧 Email send result:', emailSent)

        if (emailSent) {
          return NextResponse.json({ 
            success: true, 
            message: 'Access request sent! Check your email for a login link.'
          })
        } else {
          console.error('❌ Email sending failed - no specific error')
          return NextResponse.json({ 
            success: false, 
            message: 'Failed to send email. Please try again or contact support.'
          }, { status: 500 })
        }
      } catch (emailError) {
        console.error('❌ Email sending threw error:', emailError)
        const errorMessage = emailError instanceof Error ? emailError.message : 'Unknown error'
        return NextResponse.json({ 
          success: false, 
          message: `Email sending failed: ${errorMessage}`
        }, { status: 500 })
      }
          } else {
        // User doesn't exist - they need to be invited by an admin
        console.log(`⚠️ Access request from non-existent user: ${email}`)
        
        // In a production system, you might want to:
        // 1. Store the access request in a database table
        // 2. Send notification email to admins
        // 3. Create a admin interface to approve/deny requests
        
        return NextResponse.json({
          success: true,
          message: 'Access request received. An administrator will review your request and send you an invitation if approved.'
        })
      }

  } catch (error) {
    console.error('Request access error:', error)
    return NextResponse.json(
      { error: 'Failed to process access request' },
      { status: 500 }
    )
  }
} 