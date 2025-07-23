import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { SimpleAuth } from '@/lib/auth-simple';
import { logger } from '@/lib/logger';
import crypto from 'crypto';


// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic';
const prisma = new PrismaClient();

// EMERGENCY ADMIN ACCESS - ONLY FOR RECOVERY PURPOSES
// This endpoint should be disabled in production or protected by IP restrictions
export async function GET(request: NextRequest) {
  try {
    // Check if emergency access is enabled
    if (process.env.DISABLE_EMERGENCY_ACCESS === 'true') {
      return NextResponse.json({ error: 'Emergency access disabled' }, { status: 403 });
    }

    // Only allow with correct secret
    const secret = request.nextUrl.searchParams.get('secret');
    const expectedSecret = process.env.EMERGENCY_ADMIN_TOKEN;
    
    // Require explicit EMERGENCY_ADMIN_TOKEN to be set
    if (!expectedSecret || !secret || secret !== expectedSecret) {
      console.log('Force login denied - invalid or missing secret');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Log the emergency access attempt
    logger.warn('Emergency admin access used', {
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
      timestamp: new Date().toISOString()
    });

    const email = 'josh.copp@onekeel.ai';
    
    // Create or update user
    const user = await prisma.users.upsert({
      where: { email },
      update: {
        role: 'SUPER_ADMIN',
        isSuperAdmin: true
      },
      create: {
        id: crypto.randomUUID(),
        email,
        role: 'SUPER_ADMIN',
        isSuperAdmin: true,
        name: 'Josh Copp',
        createdAt: new Date(),
        updatedAt: new Date()
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

    // Create response with session cookie
    const response = NextResponse.redirect(new URL('/dashboard', request.url));
    
    response.cookies.set(SimpleAuth.COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Force login error:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}