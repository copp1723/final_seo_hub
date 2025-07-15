import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'

export async function POST() {
  try {
    console.log('🔍 Starting initial user setup...')
    
    // Check current state
    const userCount = await prisma.users.count()
    const agencyCount = await prisma.agencies.count()
    console.log(`Current user count: ${userCount}`)
    console.log(`Current agency count: ${agencyCount}`)
    
    const results = {
      status: 'success',
      created: {
        agency: false,
        superAdmin: false,
        agencyAdmin: false
      },
      existing: {
        agency: null as any,
        superAdmin: null as any,
        agencyAdmin: null as any
      },
      summary: ''
    }
    
    // Step 1: Create SEOWERKS agency if it doesn't exist
    let seowerksAgency = await prisma.agencies.findFirst({
      where: { 
        OR: [
          { name: { contains: 'SEOWERKS', mode: 'insensitive' } },
          { slug: 'seowerks' }
        ]
      }
    })
    
    if (!seowerksAgency) {
      console.log('🏢 Creating SEOWERKS agency...')
      seowerksAgency = await prisma.agencies.create({
        data: {
          id: randomUUID(),
          name: 'SEOWERKS',
          slug: 'seowerks',
          domain: 'seowerks.ai',
          primaryColor: '#3b82f6',
          secondaryColor: '#1e40af',
          plan: 'enterprise',
          status: 'active',
          maxUsers: 100,
          maxConversations: 10000,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
      results.created.agency = true
      console.log(`✅ Created SEOWERKS agency: ${seowerksAgency.id}`)
    } else {
      results.existing.agency = { id: seowerksAgency.id, name: seowerksAgency.name }
      console.log(`✅ SEOWERKS agency already exists: ${seowerksAgency.id}`)
    }
    
    // Step 2: Create Super Admin user (josh.copp@onekeel.ai)
    const superAdminEmail = 'josh.copp@onekeel.ai'
    let superAdmin = await prisma.users.findUnique({
      where: { email: superAdminEmail }
    })
    
    if (!superAdmin) {
      console.log('👑 Creating Super Admin user...')
      superAdmin = await prisma.users.create({
        data: {
          id: randomUUID(),
          email: superAdminEmail,
          name: 'Josh Copp',
          role: 'SUPER_ADMIN',
          isSuperAdmin: true,
          onboardingCompleted: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
      results.created.superAdmin = true
      console.log(`✅ Created Super Admin: ${superAdmin.email} (${superAdmin.role})`)
    } else {
      results.existing.superAdmin = { email: superAdmin.email, role: superAdmin.role }
      console.log(`✅ Super Admin already exists: ${superAdmin.email}`)
    }
    
    // Step 3: Create Agency Admin user (access@seowerks.ai)
    const agencyAdminEmail = 'access@seowerks.ai'
    let agencyAdmin = await prisma.users.findUnique({
      where: { email: agencyAdminEmail }
    })
    
    if (!agencyAdmin) {
      console.log('🏢 Creating Agency Admin user...')
      agencyAdmin = await prisma.users.create({
        data: {
          id: randomUUID(),
          email: agencyAdminEmail,
          name: 'SEOWERKS Access',
          role: 'AGENCY_ADMIN',
          agencyId: seowerksAgency.id,
          isSuperAdmin: false,
          onboardingCompleted: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
      results.created.agencyAdmin = true
      console.log(`✅ Created Agency Admin: ${agencyAdmin.email} (${agencyAdmin.role}) for ${seowerksAgency.name}`)
    } else {
      results.existing.agencyAdmin = { email: agencyAdmin.email, role: agencyAdmin.role }
      console.log(`✅ Agency Admin already exists: ${agencyAdmin.email}`)
    }
    
    // Final verification
    const finalUserCount = await prisma.users.count()
    const finalAgencyCount = await prisma.agencies.count()
    
    results.summary = `Setup complete! Users: ${finalUserCount}, Agencies: ${finalAgencyCount}`
    
    console.log('\n📊 FINAL SUMMARY:')
    console.log(`Total users: ${finalUserCount}`)
    console.log(`Total agencies: ${finalAgencyCount}`)
    console.log(`Super Admin: ${superAdminEmail}`)
    console.log(`Agency Admin: ${agencyAdminEmail} (SEOWERKS)`)
    console.log('\n✅ Setup complete! You can now login to the platform.')
    
    return NextResponse.json({
      ...results,
      userCount: finalUserCount,
      agencyCount: finalAgencyCount,
      message: 'Initial users and agency created successfully! You can now login.'
    })
    
  } catch (error) {
    console.error('❌ Error creating initial users:', error)
    
    return NextResponse.json({
      status: 'error',
      error: (error as Error).message,
      message: 'Failed to create initial users'
    }, { status: 500 })
  }
}