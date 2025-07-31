import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { logger } from '@/lib/logger';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
);

export async function GET(request: NextRequest) {
  try {
    let token: string | undefined;

    // Safe cookie access
    if (request.cookies && typeof request.cookies.get === 'function') {
      token = request.cookies.get('auth-token')?.value;
    }

    if (!token) {
      return NextResponse.json({ user: null });
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    
    return NextResponse.json({
      user: {
        email: payload.email,
        role: payload.role,
        id: payload.id,
        agencyId: payload.agencyId,
        dealershipId: payload.dealershipId,
        name: payload.name,
      }
    });
  } catch (error) {
    logger.error('Session verification error:', error);
    return NextResponse.json({ user: null });
  }
}