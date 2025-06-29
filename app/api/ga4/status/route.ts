import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const authResult = await requireAuth()
  if (!authResult.authenticated || !authResult.user) return authResult.response

  try {
    const connection = await prisma.gA4Connection.findUnique({
      where: { userId: authResult.user.id }
    })

    if (!connection) {
      return NextResponse.json({ connected: false })
    }

    // TODO: Fetch actual metrics from GA4
    // For now, return connection status only
    return NextResponse.json({
      connected: true,
      propertyId: connection.propertyId,
      propertyName: connection.propertyName,
      // metrics: ga4Metrics (to be implemented)
    })
  } catch (error) {
    console.error('GA4 status error:', error)
    return NextResponse.json({ connected: false })
  }
}