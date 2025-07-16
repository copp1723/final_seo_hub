import { NextRequest, NextResponse } from 'next/server';
import { SimpleAuth } from '@/lib/auth-simple';

export async function POST(request: NextRequest) {
  try {
    await SimpleAuth.deleteSession();
    
    return NextResponse.json({
      success: true,
      message: 'Signed out successfully'
    });

  } catch (error) {
    console.error('Signout error:', error);
    return NextResponse.json(
      { error: 'Signout failed' },
      { status: 500 }
    );
  }
}