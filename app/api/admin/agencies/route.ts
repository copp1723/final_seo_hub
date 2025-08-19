import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SimpleAuth } from '@/lib/auth-simple'
import { z } from 'zod'
import crypto from 'crypto'
import { logger } from '@/lib/logger'
import { rateLimits } from '@/lib/rate-limit'

// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

const createAgencySchema = z.object({
  name: z.string().min(1, 'Agency name is required'),
  domain: z.string().optional()
})

// Get all agencies (SUPER_ADMIN only)
export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await rateLimits.api(request)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const session = await SimpleAuth.getSessionFromRequest(request)
    
    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Access denied. Super Admin required.' }, { status: 403 })
    }

    const agencies = await prisma.agencies.findMany({
      include: {
        users: {
          select: { id: true, name: true, email: true, role: true }
        },
        dealerships: {
          select: { id: true, name: true },
          orderBy: { name: 'asc' }
        },
        _count: {
          select: { users: true, requests: true, dealerships: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ agencies })
  } catch (error) {
    logger.error('Error fetching agencies', error)
    return NextResponse.json({ error: 'Failed to fetch agencies' }, { status: 500 })
  }
}

// Create new agency (SUPER_ADMIN only)
export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await rateLimits.api(request)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const session = await SimpleAuth.getSessionFromRequest(request)
    
    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Access denied. Super Admin required.' }, { status: 403 })
    }

    const body = await request.json()
    const validation = createAgencySchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: validation.error.issues 
      }, { status: 400 })
    }

    const { name, domain } = validation.data

    const agency = await prisma.agencies.create({
      data: {
        id: crypto.randomUUID(),
        name,
        slug: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        domain: domain || null,
        updatedAt: new Date()
      },
      include: {
        _count: {
          select: { users: true, requests: true }
        }
      }
    })

    logger.info('Agency created by Super Admin', {
      agencyId: agency.id,
      agencyName: agency.name,
      createdBy: session.user.id
    })

    return NextResponse.json({ 
      message: 'Agency created successfully',
      agency 
    }, { status: 201 })
  } catch (error) {
    logger.error('Error creating agency', error)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'Domain already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create agency' }, { status: 500 })
  }
}

// Update existing agency (SUPER_ADMIN only)
export async function PUT(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await rateLimits.api(request)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const session = await SimpleAuth.getSessionFromRequest(request)
    
    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Access denied. Super Admin required.' }, { status: 403 })
    }

    const body = await request.json()
    const { id, name, domain } = body

    if (!id) {
      return NextResponse.json({ error: 'Agency ID is required' }, { status: 400 })
    }

    const validation = createAgencySchema.safeParse({ name, domain })
    
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: validation.error.issues 
      }, { status: 400 })
    }

    const agency = await prisma.agencies.update({
      where: { id },
      data: {
        name,
        slug: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        domain: domain || null,
        updatedAt: new Date()
      },
      include: {
        _count: {
          select: { users: true, requests: true }
        }
      }
    })

    logger.info('Agency updated by Super Admin', {
      agencyId: agency.id,
      agencyName: agency.name,
      updatedBy: session.user.id
    })

    return NextResponse.json({ 
      message: 'Agency updated successfully',
      agency 
    })
  } catch (error) {
    logger.error('Error updating agency', error)
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'P2002') {
        return NextResponse.json({ error: 'Domain already exists' }, { status: 409 })
      }
      if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Agency not found' }, { status: 404 })
      }
    }
    return NextResponse.json({ error: 'Failed to update agency' }, { status: 500 })
  }
}
