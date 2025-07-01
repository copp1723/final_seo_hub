import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

// TEMPORARY ENDPOINT - REMOVE AFTER INITIAL SETUP
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Update the current user to SUPER_ADMIN
    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: { role: 'SUPER_ADMIN' },
      select: { id: true, email: true, role: true }
    })

    return NextResponse.json({ 
      message: 'Successfully promoted to SUPER_ADMIN',
      user: updatedUser 
    })
  } catch (error) {
    console.error('Error promoting user:', error)
    return NextResponse.json({ error: 'Failed to promote user' }, { status: 500 })
  }
} 