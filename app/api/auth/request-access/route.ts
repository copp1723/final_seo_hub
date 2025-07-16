import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { sendInvitationEmail } from '@/lib/mailgun/invitation'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

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
      const loginUrl = `${baseUrl}/api/invitation?token=${invitationToken}`

      console.log(`🎯 Generated login link for ${email}: ${loginUrl}`)

      // Send invitation email using existing email infrastructure
      const emailSent = await sendInvitationEmail({
        user,
        invitedBy: 'System', // Or you could track who requested access
        loginUrl,
        skipPreferences: true
      })

      if (emailSent) {
        return NextResponse.json({ 
          success: true, 
          message: 'Access request sent! Check your email for a login link.'
        })
      } else {
        return NextResponse.json({ 
          success: false, 
          message: 'Failed to send email. Please try again or contact support.'
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