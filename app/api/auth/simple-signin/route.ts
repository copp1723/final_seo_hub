import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { SimpleAuth } from '@/lib/auth-simple';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // For now, let's create a simple signin that works with the existing system
    // This will be a temporary solution until Google OAuth is properly configured
    
    const email = 'josh.copp@onekeel.ai';
    
    // Find or create user
    let user = await prisma.users.findUnique({
      where: { email: email.toLowerCase() }
    });
    
    if (!user) {
      // Create a new user with SUPER_ADMIN role
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
    }
    
    // Create session
    const sessionToken = await SimpleAuth.createSession({
      id: user.id,
      email: user.email,
      role: user.role,
      agencyId: user.agencyId,
      dealershipId: user.dealershipId,
      name: user.name
    });

    // Create response with session cookie
    const baseUrl = process.env.NEXTAUTH_URL || 'https://rylie-seo-hub.onrender.com';
    const response = NextResponse.redirect(new URL('/dashboard', baseUrl));
    
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
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
} 