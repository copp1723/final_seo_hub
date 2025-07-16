import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { SimpleAuth } from '@/lib/auth-simple';
import crypto from 'crypto';

const prisma = new PrismaClient();

// TEMPORARY FORCE LOGIN - REMOVE AFTER GETTING ACCESS
export async function GET(request: NextRequest) {
  try {
    // Only allow with correct secret
    const secret = request.nextUrl.searchParams.get('secret');
    const expectedSecret = process.env.EMERGENCY_ADMIN_TOKEN || process.env.NEXTAUTH_SECRET?.substring(0, 10);
    
    if (!secret || secret !== expectedSecret) {
      console.log('Force login denied - invalid secret');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const email = 'josh.copp@onekeel.ai';
    
    // Create or update user
    const user = await prisma.users.upsert({
      where: { email },
      update: { role: 'SUPER_ADMIN' },
      create: {
        id: crypto.randomUUID(),
        email,
        role: 'SUPER_ADMIN',
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