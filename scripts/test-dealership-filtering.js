const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testDealershipFiltering() {
  console.log('🔍 Testing Dealership Filtering System...\n')
  
  try {
    // 1. Check available dealerships
    console.log('1. Available Dealerships:')
    const dealerships = await prisma.dealerships.findMany({
      select: {
        id: true,
        name: true,
        agencyId: true,
        activePackageType: true
      },
      orderBy: { name: 'asc' }
    })
    
    console.log(`Found ${dealerships.length} dealerships:`)
    dealerships.forEach(d => {
      console.log(`  - ${d.name} (${d.id}) - Package: ${d.activePackageType || 'None'}`)
    })
    
    // 2. Check users and their dealership assignments
    console.log('\n2. User Dealership Assignments:')
    const users = await prisma.users.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        dealershipId: true,
        agencyId: true,
        role: true,
        dealerships: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })
    
    console.log(`Found ${users.length} users:`)
    users.forEach(u => {
      console.log(`  - ${u.name || u.email} (${u.role})`)
      console.log(`    Agency: ${u.agencyId}`)
      console.log(`    Current Dealership: ${u.dealershipId || 'None'}`)
      if (u.dealerships) {
        console.log(`    Assigned to: ${u.dealerships.name}`)
      }
    })
    
    // 3. Check GA4 connections by dealership
    console.log('\n3. GA4 Connections by Dealership:')
    const ga4Connections = await prisma.ga4_connections.findMany({
      select: {
        id: true,
        dealershipId: true,
        userId: true,
        propertyId: true,
        dealerships: {
          select: {
            name: true
          }
        }
      }
    })
    
    console.log(`Found ${ga4Connections.length} GA4 connections:`)
    ga4Connections.forEach(conn => {
      console.log(`  - Property ${conn.propertyId}`)
      console.log(`    Dealership: ${conn.dealerships?.name || 'User-level connection'}`)
      console.log(`    User: ${conn.userId}`)
    })
    
    // 4. Check Search Console connections by dealership
    console.log('\n4. Search Console Connections by Dealership:')
    const scConnections = await prisma.search_console_connections.findMany({
      select: {
        id: true,
        dealershipId: true,
        userId: true,
        siteUrl: true,
        dealerships: {
          select: {
            name: true
          }
        }
      }
    })
    
    console.log(`Found ${scConnections.length} Search Console connections:`)
    scConnections.forEach(conn => {
      console.log(`  - Site: ${conn.siteUrl}`)
      console.log(`    Dealership: ${conn.dealerships?.name || 'User-level connection'}`)
      console.log(`    User: ${conn.userId}`)
    })
    
    // 5. Check tasks by dealership
    console.log('\n5. Tasks by Dealership:')
    const tasks = await prisma.tasks.findMany({
      select: {
        id: true,
        title: true,
        dealershipId: true,
        status: true,
        dealerships: {
          select: {
            name: true
          }
        }
      },
      take: 10
    })
    
    console.log(`Found ${tasks.length} tasks (showing first 10):`)
    tasks.forEach(task => {
      console.log(`  - ${task.title} (${task.status})`)
      console.log(`    Dealership: ${task.dealerships?.name || 'No dealership assigned'}`)
    })
    
    console.log('\n✅ Dealership filtering test completed!')
    
  } catch (error) {
    console.error('❌ Error testing dealership filtering:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testDealershipFiltering()
