import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { SimpleAuth } from '@/lib/auth-simple';

const prisma = new PrismaClient();

// Hard-coded admin users for emergency access
const HARDCODED_USERS = [
  {
    email: 'josh.copp@onekeel.ai',
    role: 'SUPER_ADMIN',
    id: 'hardcoded-super-admin',
    agencyId: null,
    dealershipId: null,
    name: 'Super Admin'
  },
  {
    email: 'access@seowerks.ai',
    role: 'AGENCY_ADMIN',
    id: 'hardcoded-agency-admin',
    agencyId: 'agency-1', // Assuming this is a valid agency ID
    dealershipId: null,
    name: 'Agency Admin'
  }
];

export async function POST(request: NextRequest) {
  try {
    const { email, token } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check for hardcoded admin users first (ALWAYS - regardless of emergency checkbox)
    const hardcodedUser = HARDCODED_USERS.find(
      user => user.email.toLowerCase() === email.toLowerCase()
    );

    if (hardcodedUser) {
      console.log(`Hardcoded admin access granted for ${hardcodedUser.email} with role ${hardcodedUser.role}`);
      
      // Create session for hardcoded user
      const sessionToken = await SimpleAuth.createSession(hardcodedUser);
      
      // Set cookie
      await SimpleAuth.setSessionCookie(sessionToken);
      
      return NextResponse.json({
        success: true,
        user: hardcodedUser,
        emergency: true
      });
    }

    // Normal authentication flow for non-hardcoded users
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

    // Set cookie
    await SimpleAuth.setSessionCookie(sessionToken);

    return NextResponse.json({
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

  } catch (error) {
    console.error('Simple signin error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}