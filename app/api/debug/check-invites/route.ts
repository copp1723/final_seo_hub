import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email') || 'josh.copp@onekeel.ai';
    
    // Get all invitations for this email
    const invitations = await prisma.user_invites.findMany({
      where: { email: email.toLowerCase() },
      orderBy: { createdAt: 'desc' }
    });
    
    // Get the user
    const user = await prisma.users.findUnique({
      where: { email: email.toLowerCase() }
    });
    
    return NextResponse.json({
      email: email.toLowerCase(),
      user: user ? {
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      } : null,
      invitations: invitations.map(inv => ({
        id: inv.id,
        token: inv.token,
        status: inv.status,
        expiresAt: inv.expiresAt,
        createdAt: inv.createdAt,
        isExpired: new Date() > inv.expiresAt,
        invitedBy: inv.invitedBy
      })),
      currentTime: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to check invitations',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}