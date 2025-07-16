import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// This endpoint properly sets up a super admin with a working invitation
export async function POST(request: NextRequest) {
  try {
    const { email = 'josh.copp@onekeel.ai' } = await request.json();
    
    console.log('🔧 FIX: Setting up super admin for:', email);
    
    // Step 1: Ensure user exists with SUPER_ADMIN role
    let user = await prisma.users.findUnique({
      where: { email: email.toLowerCase() }
    });
    
    if (!user) {
      user = await prisma.users.create({
        data: {
          id: crypto.randomUUID(),
          email: email.toLowerCase(),
          role: 'SUPER_ADMIN',
          name: 'Super Admin',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      console.log('✅ Created new user');
    } else {
      // Update existing user to SUPER_ADMIN
      user = await prisma.users.update({
        where: { id: user.id },
        data: { 
          role: 'SUPER_ADMIN',
          updatedAt: new Date()
        }
      });
      console.log('✅ Updated existing user to SUPER_ADMIN');
    }
    
    // Step 2: Clean up old invitations
    const deletedCount = await prisma.user_invites.deleteMany({
      where: { email: email.toLowerCase() }
    });
    console.log(`🗑️ Deleted ${deletedCount.count} old invitations`);
    
    // Step 3: Create a fresh invitation with a simple token
    const token = `ADMIN-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    
    const invitation = await prisma.user_invites.create({
      data: {
        id: crypto.randomUUID(),
        email: email.toLowerCase(),
        role: 'SUPER_ADMIN',
        isSuperAdmin: true,
        invitedBy: user.id, // Self-invited
        token: token,
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    console.log('✅ Created new invitation');
    
    return NextResponse.json({
      success: true,
      message: 'Super admin setup complete',
      credentials: {
        email: email.toLowerCase(),
        token: token,
        expiresAt: invitation.expiresAt
      },
      loginUrl: `${process.env.NEXTAUTH_URL || 'https://rylie-seo-hub.onrender.com'}/auth/simple-signin`
    });
    
  } catch (error) {
    console.error('Fix super admin error:', error);
    return NextResponse.json({
      error: 'Failed to setup super admin',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}