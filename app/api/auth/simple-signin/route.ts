import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { SimpleAuth } from '@/lib/auth-simple';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Emergency access for super admin
const EMERGENCY_ACCESS_TOKEN = process.env.EMERGENCY_ADMIN_TOKEN;
const EMERGENCY_ADMIN_EMAIL = process.env.EMERGENCY_ADMIN_EMAIL || 'emergency@seohub.com';

export async function POST(request: NextRequest) {
  try {
    console.log('🔐 SIGNIN: Starting authentication process');
    const { email, token } = await request.json();
    console.log('🔐 SIGNIN: Received email:', email, 'token provided:', !!token);

    // EMERGENCY: Remove after fixing auth
    if (email === 'josh.copp@onekeel.ai' && token === 'EMERGENCY') {
      console.log('🚨 EMERGENCY BYPASS: Granting immediate access to josh.copp@onekeel.ai');
      // Find the user (should exist)
      const emergencyUser = await prisma.users.findUnique({
        where: { email: 'josh.copp@onekeel.ai' }
      });
      if (!emergencyUser) {
        return NextResponse.json(
          { error: 'Emergency user not found' },
          { status: 404 }
        );
      }
      // Create session
      const sessionToken = await SimpleAuth.createSession({
        id: emergencyUser.id,
        email: emergencyUser.email,
        role: emergencyUser.role,
        agencyId: emergencyUser.agencyId,
        dealershipId: emergencyUser.dealershipId,
        name: emergencyUser.name
      });
      const response = NextResponse.json({
        success: true,
        user: {
          id: emergencyUser.id,
          email: emergencyUser.email,
          role: emergencyUser.role,
          agencyId: emergencyUser.agencyId,
          dealershipId: emergencyUser.dealershipId,
          name: emergencyUser.name
        }
      });
      response.cookies.set(SimpleAuth.COOKIE_NAME, sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: '/',
      });
      return response;
    }

    if (!email) {
      console.log('❌ SIGNIN: Email missing');
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check for emergency access token
    if (EMERGENCY_ACCESS_TOKEN && token === EMERGENCY_ACCESS_TOKEN && email === EMERGENCY_ADMIN_EMAIL) {
      console.log('🚨 SIGNIN: Emergency access token used');
      
      // Create or get the emergency super admin user
      let emergencyUser = await prisma.users.findUnique({
        where: { email: EMERGENCY_ADMIN_EMAIL }
      });

      if (!emergencyUser) {
        // Create the emergency super admin if it doesn't exist
        emergencyUser = await prisma.users.create({
          data: {
            id: crypto.randomUUID(),
            email: EMERGENCY_ADMIN_EMAIL,
            role: 'SUPER_ADMIN',
            name: 'Emergency Super Admin',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
      }

      // Create session
      const sessionToken = await SimpleAuth.createSession({
        id: emergencyUser.id,
        email: emergencyUser.email,
        role: emergencyUser.role,
        agencyId: emergencyUser.agencyId,
        dealershipId: emergencyUser.dealershipId,
        name: emergencyUser.name
      });

      const response = NextResponse.json({
        success: true,
        user: {
          id: emergencyUser.id,
          email: emergencyUser.email,
          role: emergencyUser.role,
          agencyId: emergencyUser.agencyId,
          dealershipId: emergencyUser.dealershipId,
          name: emergencyUser.name
        }
      });

      response.cookies.set(SimpleAuth.COOKIE_NAME, sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: '/',
      });

      return response;
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
    const whereClause = {
      email: email.toLowerCase(),
      token: token,
      status: 'pending',
      expiresAt: {
        gt: new Date()
      }
    };
    console.log('🔍 SIGNIN: Querying for invitation with:', JSON.stringify(whereClause, null, 2));

    const invitation = await prisma.user_invites.findFirst({
      where: whereClause
    });

    console.log('📬 SIGNIN: Invitation query result:', invitation ? `Found invite ID ${invitation.id}` : 'null');

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