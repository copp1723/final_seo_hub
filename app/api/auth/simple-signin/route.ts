import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { SimpleAuth } from '@/lib/auth-simple';

const prisma = new PrismaClient();

// No hardcoded users in production

export async function POST(request: NextRequest) {
  try {
    console.log('🔐 SIGNIN: Starting authentication process');
    const { email, token } = await request.json();
    console.log('🔐 SIGNIN: Received email:', email, 'token provided:', !!token);

    if (!email) {
      console.log('❌ SIGNIN: Email missing');
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Normal authentication flow
    if (!token) {
      return NextResponse.json(
        { error: 'Token is required for database users' },
        { status: 400 }
      );
    }

    // Find the user
    const user = await prisma.users.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Verify the invitation token
    const invitation = await prisma.user_invites.findFirst({
      where: {
        email: email.toLowerCase(),
        token: token,
        status: 'pending',
        expiresAt: {
          gt: new Date()
        }
      }
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation' },
        { status: 401 }
      );
    }

    // Mark invitation as accepted
    await prisma.user_invites.update({
      where: { id: invitation.id },
      data: { 
        status: 'accepted',
        acceptedAt: new Date()
      }
    });

    // Create session
    const sessionToken = await SimpleAuth.createSession({
      id: user.id,
      email: user.email,
      role: user.role,
      agencyId: user.agencyId,
      dealershipId: user.dealershipId,
      name: user.name
    });

    // Create the response object
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        agencyId: user.agencyId,
        dealershipId: user.dealershipId,
        name: user.name
      }
    });

    // Set the session cookie directly on the response
    response.cookies.set(SimpleAuth.COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('Simple signin error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}