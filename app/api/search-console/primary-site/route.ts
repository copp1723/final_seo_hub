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
    const { siteUrl } = await req.json()
    
    if (!siteUrl) {
      return NextResponse.json(
        { error: 'Site URL required' },
        { status: 400 }
      )
    }

    // Get user's dealership ID
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { dealershipId: true }
    })

    if (!user?.dealershipId) {
      return NextResponse.json(
        { error: 'User not assigned to dealership' },
        { status: 400 }
      )
    }

    // Update the primary site for the dealership
    await prisma.searchConsoleConnection.update({
      where: { dealershipId: user.dealershipId },
      data: {
        siteUrl: siteUrl,
        siteName: new URL(siteUrl).hostname
      },
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Failed to update primary site', error, { userId: session.user.id })
    return NextResponse.json(
      { error: 'Failed to update primary site' },
      { status: 500 }
    )
  }
}