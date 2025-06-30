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
    // Delete the Search Console token for the user
    await prisma.searchConsoleConnection.delete({
      where: { userId: session.user.id },
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