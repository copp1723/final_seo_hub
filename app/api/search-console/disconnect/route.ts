import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function POST(req: Request) {
  const authResult = await requireAuth(req)
  if (!authResult.authenticated) return authResult.response
  const session = { user: authResult.user }
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
    await prisma.search_console_connections.delete({
      where: { userId: user.dealershipId }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Failed to disconnect Search Console', error, { userId: session.user.id })
    return NextResponse.json(
      { error: 'Failed to disconnect Search Console' },
      { status: 500 }
    )
  }
}
