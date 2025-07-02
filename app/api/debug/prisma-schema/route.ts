import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Get the User table schema by querying information_schema
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'User' 
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `

    // Also test a simple user query to see if it works
    let userQueryWorks = false
    let userQueryError = null
    
    try {
      await prisma.user.findFirst({
        select: { id: true, email: true, role: true }
      })
      userQueryWorks = true
    } catch (error) {
      userQueryError = error instanceof Error ? error.message : 'Unknown error'
    }

    return NextResponse.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      userTableColumns: columns,
      userQueryWorks,
      userQueryError,
      message: 'Schema diagnostic completed'
    })
  } catch (error) {
    console.error('[DEBUG] Prisma schema check failed:', error)
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Schema diagnostic failed'
      },
      { status: 500 }
    )
  }
} 