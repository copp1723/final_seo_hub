import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// This endpoint allows creating invitations using environment credentials
// It's designed to break the circular dependency where you need to be logged in to create invitations
export async function POST(request: NextRequest) {
  try {
    // Verify emergency access token
    const authHeader = request.headers.get('authorization');
    const emergencyToken = process.env.EMERGENCY_ADMIN_TOKEN;
    
    if (!emergencyToken || !authHeader || authHeader !== `Bearer ${emergencyToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { email, role = 'SUPER_ADMIN', agencyId = null } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.users.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!existingUser) {
      // Create the user first
      await prisma.users.create({
        data: {
          id: crypto.randomUUID(),
          email: email.toLowerCase(),
          role,
          agencyId,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }

    // Generate a secure token
    const token = crypto.randomBytes(32).toString('hex');

    // Create the invitation
    const invitation = await prisma.user_invites.create({
      data: {
        id: crypto.randomUUID(),
        email: email.toLowerCase(),
        role,
        isSuperAdmin: role === 'SUPER_ADMIN',
        agencyId,
        invitedBy: '00000000-0000-0000-0000-000000000000', // System-generated
        token,
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      invitation: {
        email: invitation.email,
        token: invitation.token,
        expiresAt: invitation.expiresAt,
        loginUrl: `${process.env.NEXTAUTH_URL || 'https://rylie-seo-hub.onrender.com'}/auth/simple-signin`
      }
    });
  } catch (error) {
    console.error('Emergency invite creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create invitation' },
      { status: 500 }
    );
  }
}