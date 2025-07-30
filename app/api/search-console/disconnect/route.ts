import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get user's dealership ID
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { dealershipId: true }
    })

    if (!user?.dealershipId) {
      return NextResponse.json(
        { error: 'User not assigned to dealership' },
        { status: 400 }
      )
    }

    // Delete the Search Console token for the dealership
    const connection = await prisma.search_console_connections.findFirst({
      where: { 
        userId: session.user.id,
        dealershipId: user.dealershipId 
      }
    })

    if (connection) {
      await prisma.search_console_connections.delete({
        where: { id: connection.id }
      })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Failed to disconnect Search Console', error, { userId: session.user.id })
    return NextResponse.json(
      { error: 'Failed to disconnect Search Console' },
      { status: 500 }
    )
  }
}
