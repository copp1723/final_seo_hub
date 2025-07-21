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
    const { siteUrl, dealershipId } = await req.json()
    
    if (!siteUrl) {
      return NextResponse.json(
        { error: 'Site URL required' },
        { status: 400 }
      )
    }

    // Get user's info
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { dealershipId: true, role: true, agencyId: true }
    })

    // Determine target dealership
    let targetDealershipId = dealershipId || user?.dealershipId
    
    // If agency admin is setting site for a specific dealership
    if (dealershipId && user?.role === 'AGENCY_ADMIN' && user?.agencyId) {
      // Verify the dealership belongs to the agency
      const dealership = await prisma.dealerships.findFirst({
        where: {
          id: dealershipId,
          agencyId: user.agencyId
        }
      })
      
      if (!dealership) {
        return NextResponse.json(
          { error: 'Dealership not found or does not belong to your agency' },
          { status: 403 }
        )
      }
      targetDealershipId = dealershipId
    }

    if (!targetDealershipId) {
      return NextResponse.json(
        { error: 'No dealership context available' },
        { status: 400 }
      )
    }

    // Update the primary site for the dealership
    await prisma.search_console_connections.update({
      where: { userId: targetDealershipId },
      data: {
        siteUrl: siteUrl,
        siteName: new URL(siteUrl).hostname
      }
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
