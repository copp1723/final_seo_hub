import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { SimpleAuth } from '@/lib/auth-simple';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Get email from query parameter
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      )
    }
    
    console.log('Simple signin attempt for:', email)
    
    // Find existing user
    const user = await prisma.users.findUnique({
      where: { email: email.toLowerCase() }
    });
    
    if (!user) {
      console.log('User not found:', email)
      return NextResponse.json(
        { error: 'User not found. Please contact an administrator.' },
        { status: 404 }
      )
    }
    
    console.log('User found:', { id: user.id, email: user.email, role: user.role })
    
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
    
    // Redirect based on role
    let redirectPath = '/dashboard'
    if (user.role === 'SUPER_ADMIN') {
      redirectPath = '/super-admin'
    } else if (user.role === 'AGENCY_ADMIN') {
      redirectPath = '/dashboard'
    }
    
    const response = NextResponse.redirect(new URL(redirectPath, baseUrl));
    
    response.cookies.set(SimpleAuth.COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    console.log('Session created, redirecting to:', redirectPath)
    return response;
  } catch (error) {
    logger.error('Simple signin error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' }, // Generic message for security
      { status: 500 }
    );
  }
} 