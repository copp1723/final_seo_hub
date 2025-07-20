import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const switchDealershipSchema = z.object({
  dealershipId: z.string().min(1)
})

export async function POST(request: NextRequest) {
  try {
    console.log('=== DEBUG: POST /api/dealerships/switch called ===');
    
    const session = await SimpleAuth.getSessionFromRequest(request)
    
    if (!session?.user.id) {
      console.log('DEBUG: POST - No user ID in session');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    console.log('DEBUG: POST - Request body:', body);
    
    const { dealershipId } = switchDealershipSchema.parse(body)
    console.log('DEBUG: POST - Parsed dealershipId:', dealershipId);

    // Handle super admin user
    if (session.user.id === '3e50bcc8-cd3e-4773-a790-e0570de37371' || session.user.role === 'SUPER_ADMIN') {
      console.log('DEBUG: POST - Super admin detected, allowing any dealership');
      
      const dealership = await prisma.dealerships.findUnique({
        where: { id: dealershipId }
      })
      
      if (!dealership) {
        console.log('DEBUG: POST - Dealership not found:', dealershipId);
        return NextResponse.json(
          { error: 'Dealership not found' },
          { status: 404 }
        )
      }

      console.log('DEBUG: POST - Super admin switched to dealership:', dealership.name);
      
      return NextResponse.json({
        success: true,
        dealership: {
          id: dealership.id,
          name: dealership.name
        }
      })
    }

    // Get current user
    console.log('DEBUG: POST - Fetching user:', session.user.id);
    const currentUser = await prisma.users.findUnique({
      where: { id: session.user.id }
    })

    // SUPER_ADMIN users don't need an agencyId, but other users do
    if (!currentUser?.agencyId && session.user.role !== 'SUPER_ADMIN') {
      console.log('DEBUG: POST - User not associated with agency');
      return NextResponse.json(
        { error: 'User is not associated with an agency' },
        { status: 403 }
      )
    }

    // Find dealership by ID and verify access
    console.log('DEBUG: POST - Finding dealership:', dealershipId);
    const dealership = await prisma.dealerships.findUnique({
      where: { id: dealershipId }
    })

    if (!dealership) {
      console.log('DEBUG: POST - Dealership not found:', dealershipId);
      return NextResponse.json(
        { error: 'Dealership not found' },
        { status: 404 }
      )
    }

    console.log('DEBUG: POST - Found dealership:', dealership.name, 'agencyId:', dealership.agencyId);

    // Check if user has access to this dealership
    if (session.user.role !== 'SUPER_ADMIN') {
      console.log('DEBUG: POST - Checking access for non-super admin');
      const hasAccess = await prisma.users.findFirst({
        where: {
          id: session.user.id,
          agencyId: dealership.agencyId
        }
      })

      if (!hasAccess) {
        console.log('DEBUG: POST - Access denied for user to dealership');
        return NextResponse.json(
          { error: 'Access denied to this dealership' },
          { status: 403 }
        )
      }
    }

    console.log('DEBUG: POST - User switched to dealership:', dealership.name);

    return NextResponse.json({
      success: true,
      dealership: {
        id: dealership.id,
        name: dealership.name
      }
    })

  } catch (error) {
    console.error('=== DEBUG: POST Error ===', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    if (error instanceof z.ZodError) {
      console.log('DEBUG: POST - Zod validation error:', error.errors);
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('=== DEBUG: GET /api/dealerships/switch called ===');
    
    // Test database connection first
    try {
      await prisma.$connect()
    } catch (dbError) {
      console.error('Database connection failed:', dbError)
      return NextResponse.json(
        { error: 'Database connection failed', details: dbError instanceof Error ? dbError.message : 'Unknown DB error' },
        { status: 503 }
      )
    }
    
    const session = await SimpleAuth.getSessionFromRequest(request)
    console.log('Session:', {
      hasUser: !!session?.user.id,
      userId: session?.user.id,
      role: session?.user.role
    });
    
    if (!session?.user.id) {
      console.log('DEBUG: No user ID in session');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Handle super admin user
    if (session.user.id === '3e50bcc8-cd3e-4773-a790-e0570de37371' || session.user.role === 'SUPER_ADMIN') {
      console.log('DEBUG: Super admin detected, fetching all dealerships');
      
      const dealerships = await prisma.dealerships.findMany({
        orderBy: { name: 'asc' }
      })

      console.log('DEBUG: Found dealerships for super admin:', dealerships.length);

      const availableDealerships = dealerships.map(dealership => ({
        id: dealership.id,
        name: dealership.name
      }))

      return NextResponse.json({
        currentDealership: availableDealerships.length > 0 ? availableDealerships[0] : null,
        availableDealerships
      })
    }

    // Get current user
    console.log('DEBUG: Fetching user with agency:', session.user.id);
    const currentUser = await prisma.users.findUnique({
      where: { id: session.user.id },
      include: {
        agencies: true
      }
    })
    
    console.log('DEBUG: User data:', {
      userId: currentUser?.id,
      email: currentUser?.email,
      agencyId: currentUser?.agencies?.id,
      dealershipId: currentUser?.dealershipId
    });

    // SUPER_ADMIN users don't need an agencyId, but other users do
    if (!currentUser?.agencies?.id && session.user.role !== 'SUPER_ADMIN') {
      console.log('DEBUG: User not associated with agency');
      return NextResponse.json(
        { error: 'User is not associated with an agency' },
        { status: 403 }
      )
    }

    // Get all dealerships for the agency
    console.log('DEBUG: Fetching dealerships for agency:', currentUser?.agencies?.id);
    const dealerships = await prisma.dealerships.findMany({
      where: session.user.role === 'SUPER_ADMIN'
        ? {} // SUPER_ADMIN can see all dealerships
        : {
            agencyId: currentUser?.agencies?.id
          },
      orderBy: { name: 'asc' }
    })

    console.log('DEBUG: Found dealerships:', dealerships.length, dealerships.map(d => ({ id: d.id, name: d.name })));

    // Map dealerships to the expected format and deduplicate by name
    const dealershipMap = new Map()
    dealerships.forEach(dealership => {
      // Use name as key to prevent duplicates, but keep the first occurrence
      if (!dealershipMap.has(dealership.name)) {
        dealershipMap.set(dealership.name, {
          id: dealership.id,
          name: dealership.name
        })
      }
    })
    
    const availableDealerships = Array.from(dealershipMap.values())

    // Determine current dealership - either from user's dealershipId or first available
    let currentDealership = null
    
    if (currentUser?.dealershipId) {
      const userDealership = dealerships.find(d => d.id === currentUser.dealershipId)
      if (userDealership) {
        currentDealership = {
          id: userDealership.id,
          name: userDealership.name
        }
      }
    }
    
    // Fallback to first available dealership if no current one is set
    if (!currentDealership && availableDealerships.length > 0) {
      currentDealership = availableDealerships[0]
    }
    
    console.log('DEBUG: Final response:', {
      currentDealership,
      availableDealershipsCount: availableDealerships.length
    });

    return NextResponse.json({
      currentDealership,
      availableDealerships
    })

  } catch (error) {
    console.error('=== DEBUG: Error in GET /api/dealerships/switch ===', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
