import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { SimpleAuth } from '@/lib/auth-simple';
import { logger } from '@/lib/logger';
import { rateLimits } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await rateLimits.api(request)
    if (rateLimitResponse) return rateLimitResponse

    // Get email from query parameter
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      )
    }
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('Simple signin attempt for:', email)
    }
    
    // Find existing user
    const user = await prisma.users.findUnique({
      where: { email: email.toLowerCase() }
    });
    
    if (!user) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('User not found:', email)
      }
      return NextResponse.json(
        { error: 'User not found. Please contact an administrator.' },
        { status: 404 }
      )
    }
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('User found:', { id: user.id, email: user.email, role: user.role })
    }

    // In production, require verified email for simple signin
    if (process.env.NODE_ENV === 'production' && !user.emailVerified) {
      return NextResponse.json(
        { error: 'Email not verified. Please use your magic link or contact an administrator.' },
        { status: 403 }
      )
    }
    
    // Update last login timestamp (best-effort)
    // Note: lastLoginAt field not present in current schema; skipping DB update.

    // Create session
    const sessionToken = await SimpleAuth.createSession({
      id: user.id,
      email: user.email,
      role: user.role,
      agencyId: user.agencyId,
      dealershipId: user.dealershipId,  // Keep for backwards compatibility
      currentDealershipId: user.currentDealershipId,  // New multi-dealership field
      name: user.name
    });

    // Create response with session cookie
    const baseUrl = process.env.NEXTAUTH_URL || 'https://rylie-seo-hub.onrender.com';
    
    // Redirect based on role
    let redirectPath = '/dashboard'
    if (user.role === 'SUPER_ADMIN') {
      redirectPath = '/settings?tab=users'
    } else if (user.role === 'AGENCY_ADMIN') {
      redirectPath = '/dashboard'
    }
    
    const response = NextResponse.redirect(new URL(redirectPath, baseUrl));
    
    response.cookies.set(SimpleAuth.COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' for OAuth compatibility in production
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log('Session created, redirecting to:', redirectPath)
    }
    return response;
  } catch (error) {
    logger.error('Simple signin error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' }, // Generic message for security
      { status: 500 }
    );
  }
} 