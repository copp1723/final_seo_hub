import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  return NextResponse.json({ message: 'Test endpoint working', timestamp: new Date().toISOString() })
}