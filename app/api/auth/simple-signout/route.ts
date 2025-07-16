import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // AUTO-LOGIN: Prevent sign out, always return success
  return NextResponse.json({ success: true });
}