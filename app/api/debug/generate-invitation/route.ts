import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// THIS IS A TEMPORARY, INSECURE ENDPOINT FOR ONE-TIME USE
export async function POST(request: NextRequest) {
  try {
    console.log('🚨 USING TEMPORARY, INSECURE INVITATION GENERATOR V2 🚨');
    const email = 'josh.copp@onekeel.ai';

    const user = await prisma.users.findUnique({ where: { email } });
    
    if (!user) {
      const errorMessage = `User ${email} not found. Please ensure the admin user exists in the database. You may need to run 'npm run db:setup-admins'`;
      console.error(errorMessage);
      return NextResponse.json({ error: errorMessage }, { status: 404 });
    }

    // Delete any old invites for this user to ensure a clean slate
    await prisma.user_invites.deleteMany({ where: { email } });

    // Generate a new, single-use invitation
    const invitationToken = crypto.randomBytes(32).toString('hex');
    const now = new Date();
    const invitationTokenExpires = new Date(now.getTime() + 5 * 60 * 1000); // 5 minute expiry for security

    await prisma.user_invites.create({
      data: {
        id: crypto.randomUUID(),
        email: email,
        role: 'SUPER_ADMIN',
        isSuperAdmin: true,
        agencyId: user.agencyId,
        invitedBy: user.id,
        token: invitationToken,
        status: 'pending',
        expiresAt: invitationTokenExpires,
        updatedAt: now,
      },
    });
    
    console.log(`✅ Successfully generated new 5-minute invitation token for ${email}.`);

    return NextResponse.json({
      success: true,
      message: 'Token generated successfully. Use it immediately.',
      email: email,
      token: invitationToken,
      expires: '5 minutes',
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('CRITICAL ERROR in temporary invitation generator:', errorMessage);
    return NextResponse.json(
      { error: 'Failed to generate invitation token', details: errorMessage },
      { status: 500 }
    );
  }
}
