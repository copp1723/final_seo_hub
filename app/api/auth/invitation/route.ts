import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signIn } from '@/lib/auth'
import crypto from 'crypto'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.redirect(new URL('/auth/error?error=MissingToken', request.url))
    }

    // Find user with this invitation token
    const user = await prisma.user.findFirst({
      where: {
        invitationToken: token,
        invitationTokenExpires: {
          gt: new Date() // Token must not be expired
        }
      }
    })

    if (!user) {
      return NextResponse.redirect(new URL('/auth/error?error=InvalidToken', request.url))
    }

    // Clear the invitation token (one-time use)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        invitationToken: null,
        invitationTokenExpires: null,
        emailVerified: new Date() // Mark email as verified
      }
    })

    // Create a session for this user
    const sessionToken = crypto.randomUUID()
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    await prisma.session.create({
      data: {
        sessionToken,
        userId: user.id,
        expires
      }
    })

    // Set the session cookie
    const response = NextResponse.redirect(new URL('/dashboard', request.url))
    response.cookies.set('next-auth.session-token', sessionToken, {
      expires,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    })

    return response

  } catch (error) {
    console.error('Invitation token error:', error)
    return NextResponse.redirect(new URL('/auth/error?error=InternalError', request.url))
  }
}

// Generate invitation token for a user
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Generate secure token
    const invitationToken = crypto.randomBytes(32).toString('hex')
    const invitationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Update user with invitation token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        invitationToken,
        invitationTokenExpires
      }
    })

    // Generate invitation URL
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const invitationUrl = `${baseUrl}/api/auth/invitation?token=${invitationToken}`

    return NextResponse.json({
      success: true,
      invitationUrl,
      expiresAt: invitationTokenExpires
    })

  } catch (error) {
    console.error('Generate invitation token error:', error)
    return NextResponse.json(
      { error: 'Failed to generate invitation token' },
      { status: 500 }
    )
  }
}