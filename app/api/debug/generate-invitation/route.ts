import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    // Check authentication - only SUPER_ADMIN can generate invitation tokens
    const session = await auth()
    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Find the user
    const user = await prisma.users.findUnique({
      where: { email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Generate secure token
    const invitationToken = crypto.randomBytes(32).toString('hex')
    const invitationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // In a real app, you would store this in a separate `invitations` table
    // associated with the user. This example adds it directly to the user for simplicity.
    await prisma.user_invites.create({
        data: {
          id: crypto.randomUUID(),
          email: email,
          role: user.role,
          isSuperAdmin: user.role === 'SUPER_ADMIN',
          agencyId: user.agencyId,
          invitedBy: session.user.id,
          token: invitationToken,
          status: 'pending',
          expiresAt: invitationTokenExpires,
          updatedAt: new Date(),
        }
    })

    // Generate invitation URL for convenience
    const baseUrl = process.env.NEXTAUTH_URL || 'https://rylie-seo-hub.onrender.com'
    const invitationUrl = `${baseUrl}/auth/simple-signin?token=${invitationToken}&email=${encodeURIComponent(email)}`

    return NextResponse.json({
      success: true,
      user: {
        email: user.email,
        role: user.role,
        name: user.name
      },
      invitationUrl,
      expiresAt: invitationTokenExpires.toISOString(),
      message: 'Invitation token generated successfully! User can use the URL to sign in.'
    })

  } catch (error) {
    console.error('Generate invitation token error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate invitation token',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
