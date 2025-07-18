import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'
import { prisma } from '@/lib/prisma'

async function handleGET(request: NextRequest) {
  try {
    const session = await SimpleAuth.getSessionFromRequest(request)
    
    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.users.findUnique({
      where: { id: session.user.id }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get first dealership for super admin or demo data
    const firstDealership = await prisma.dealerships.findFirst()
    
    if (!firstDealership) {
      return NextResponse.json({
        success: true,
        data: {
          activeRequests: 0,
          totalRequests: 0,
          tasksCompletedThisMonth: 0,
          tasksSubtitle: "No dealerships available",
          gaConnected: false,
          packageProgress: null,
          latestRequest: null,
          dealershipId: null
        }
      })
    }

    // Return basic stats for alpha launch
    return NextResponse.json({
      success: true,
      data: {
        activeRequests: 0,
        totalRequests: 0,
        tasksCompletedThisMonth: 0,
        tasksSubtitle: "Alpha launch ready",
        gaConnected: false,
        packageProgress: null,
        latestRequest: null,
        dealershipId: firstDealership.id
      }
    })

  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const GET = handleGET