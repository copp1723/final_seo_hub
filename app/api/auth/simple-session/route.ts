import { NextRequest, NextResponse } from 'next/server';
import { SimpleAuth } from '@/lib/auth-simple';

export async function GET(request: NextRequest) {
  // AUTO-LOGIN: Always return super admin session
  return NextResponse.json({
    authenticated: true,
    user: {
      id: 'auto-super-admin',
      email: 'josh.copp@onekeel.ai',
      role: 'SUPER_ADMIN',
      agencyId: null,
      dealershipId: null,
      name: 'Josh Copp (Auto Super Admin)'
    },
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  });
}