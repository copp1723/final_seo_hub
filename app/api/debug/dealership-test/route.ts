import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    console.log('=== Dealership Debug Test ===')
    
    // Test authentication
    const session = await SimpleAuth.getSessionFromRequest(request)
    console.log('Session:', {
      hasSession: !!session,
      userId: session?.user?.id,
      userRole: session?.user?.role,
      userEmail: session?.user?.email
    })
    
    if (!session?.user.id) {
      return NextResponse.json({
        error: 'No session found',
        debug: 'User needs to be logged in'
      }, { status: 401 })
    }

    // Test database connection
    console.log('Testing database connection...')
    const dbTest = await prisma.$queryRaw`SELECT 1 as test`
    console.log('Database test result:', dbTest)

    // Test user lookup
    console.log('Looking up current user...')
    const currentUser = await prisma.users.findUnique({
      where: { id: session.user.id },
      include: {
        agencies: true,
        dealerships: true
      }
    })
    console.log('Current user:', {
      id: currentUser?.id,
      email: currentUser?.email,
      role: currentUser?.role,
      agencyId: currentUser?.agencyId,
      dealershipId: currentUser?.dealershipId,
      hasAgency: !!currentUser?.agencies,
      hasDealership: !!currentUser?.dealerships
    })

    // Test dealership query
    console.log('Querying dealerships...')
    let dealerships
    
    if (session.user.role === 'SUPER_ADMIN') {
      dealerships = await prisma.dealerships.findMany({
        take: 5,
        orderBy: { name: 'asc' }
      })
    } else if (currentUser?.agencyId) {
      dealerships = await prisma.dealerships.findMany({
        where: { agencyId: currentUser.agencyId },
        take: 5,
        orderBy: { name: 'asc' }
      })
    } else {
      dealerships = []
    }

    console.log('Dealerships found:', dealerships.length)

    return NextResponse.json({
      success: true,
      debug: {
        session: {
          userId: session.user.id,
          userRole: session.user.role,
          userEmail: session.user.email
        },
        user: {
          id: currentUser?.id,
          email: currentUser?.email,
          role: currentUser?.role,
          agencyId: currentUser?.agencyId,
          dealershipId: currentUser?.dealershipId
        },
        dealerships: {
          count: dealerships.length,
          items: dealerships.map(d => ({
            id: d.id,
            name: d.name,
            agencyId: d.agencyId
          }))
        }
      }
    })

  } catch (error) {
    console.error('Dealership debug test error:', error)
    
    return NextResponse.json({
      error: 'Debug test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}