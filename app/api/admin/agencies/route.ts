import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'
import { z } from 'zod'

const createAgencySchema = z.object({
  name: z.string().min(1, 'Agency name is required'),
  domain: z.string().optional(),
  settings: z.object({}).optional()
})

// Get all agencies (SUPER_ADMIN only)
export async function GET(request: NextRequest) {
  const authResult = await requireAuth()
  if (!authResult.authenticated || !authResult.user) return authResult.response

  if (authResult.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Access denied. Super Admin required.' }, { status: 403 })
  }

  try {
    const agencies = await prisma.agency.findMany({
      include: {
        users: {
          select: { id: true, name: true, email: true, role: true }
        },
        _count: {
          select: { users: true, requests: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ agencies })
  } catch (error) {
    console.error('Error fetching agencies:', error)
    return NextResponse.json({ error: 'Failed to fetch agencies' }, { status: 500 })
  }
}

// Create new agency (SUPER_ADMIN only)
export async function POST(request: NextRequest) {
  const authResult = await requireAuth()
  if (!authResult.authenticated || !authResult.user) return authResult.response

  if (authResult.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Access denied. Super Admin required.' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const validation = createAgencySchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: validation.error.issues 
      }, { status: 400 })
    }

    const { name, domain, settings } = validation.data

    const agency = await prisma.agency.create({
      data: {
        name,
        domain: domain || null,
        settings: settings || {}
      },
      include: {
        _count: {
          select: { users: true, requests: true }
        }
      }
    })

    return NextResponse.json({ 
      message: 'Agency created successfully',
      agency 
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating agency:', error)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'Domain already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create agency' }, { status: 500 })
  }
} 