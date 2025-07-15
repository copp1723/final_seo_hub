import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const users = await prisma.users.findMany({
      where: {
        OR: [
          { email: { contains: 'seowerks' } },
          { email: { contains: 'onekeel' } },
          { email: { contains: 'josh' } },
          { email: { contains: 'copp' } }
        ]
      },
      select: {
        id: true,
        email: true,
        role: true,
        agencyId: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    })

    const agencies = await prisma.agencies.findMany({
      select: {
        id: true,
        name: true,
        domain: true,
        createdAt: true,
        _count: {
          select: { users: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const accounts = await prisma.accounts.findMany({
      include: {
        users: {
          select: {
            email: true,
            role: true
          }
        }
      },
      orderBy: { id: 'desc' }
    })

    return NextResponse.json({
      users,
      agencies,
      accounts,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Debug users error:', error)
    return NextResponse.json({ error: 'Failed to fetch debug info' }, { status: 500 })
  }
}
