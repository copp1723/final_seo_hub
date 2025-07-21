import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    // Check authentication - only SUPER_ADMIN can generate invitation tokens
    const authResult = await requireAuth(request)
  if (!authResult.authenticated) return authResult.response
  const session = { user: authResult.user }
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

    // Update user with invitation token
    await prisma.users.update({
      where: { id: user.id },
      data: {
        invitationToken,
        invitationTokenExpires
      }
    })

    // Generate invitation URL
    const baseUrl = process.env.NEXTAUTH_URL || 'https://rylie-seo-hub.onrender.com'
    const invitationUrl = `${baseUrl}/api/auth/invitation?token=${invitationToken}`

    return NextResponse.json({
      success: true,
      user: {
        email: user.email,
        role: user.role,
        name: user.name
      },
      invitationUrl,
      expiresAt: invitationTokenExpires.toISOString(),
      message: 'Invitation token generated successfully! User can click the URL to sign in.'
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
