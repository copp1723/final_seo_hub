const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function createDemoDealerships() {
  console.log('🏢 Creating demo dealerships for presentation...\n')
  
  try {
    // Find SEOWorks agency
    const agency = await prisma.agencies.findFirst({
      where: { id: 'agency-seowerks' }
    })
    
    if (!agency) {
      console.log('❌ SEOWorks agency not found!')
      return
    }
    
    console.log(`✅ Found agency: ${agency.name}`)
    
    // Create demo dealerships
    const dealerships = [
      {
        name: 'AutoMax Dealership',
        website: 'https://automax-demo.com',
        phone: '(555) 123-4567',
        address: '123 Main St, Demo City, CA 90210',
        agencyId: agency.id
      },
      {
        name: 'Premier Motors',
        website: 'https://premier-motors-demo.com',
        phone: '(555) 234-5678',
        address: '456 Oak Ave, Demo Town, TX 75001',
        agencyId: agency.id
      },
      {
        name: 'Elite Auto Group',
        website: 'https://elite-auto-demo.com',
        phone: '(555) 345-6789',
        address: '789 Pine Rd, Demo Hills, FL 33101',
        agencyId: agency.id
      }
    ]
    
    for (const dealership of dealerships) {
      const created = await prisma.dealerships.create({
        data: dealership
      })
      console.log(`✅ Created: ${created.name} (${created.id})`)
    }
    
    // Create some demo requests for each dealership
    const createdDealerships = await prisma.dealerships.findMany({
      where: { agencyId: agency.id }
    })
    
    console.log('\n📝 Creating demo requests...')
    
    for (const dealership of createdDealerships) {
      // Find a user for this dealership (use the agency admin)
      const user = await prisma.users.findFirst({
        where: { agencyId: agency.id }
      })
      
      if (user) {
        // Create some demo requests
        const requests = [
          {
            title: 'SEO Optimization for Landing Pages',
            type: 'page',
            status: 'COMPLETED',
            packageType: 'GOLD',
            userId: user.id,
            dealershipId: dealership.id,
            priority: 'HIGH',
            description: 'Optimize main landing pages for better search rankings',
            completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
            pagesCompleted: 5
          },
          {
            title: 'Blog Content Creation',
            type: 'blog',
            status: 'IN_PROGRESS',
            packageType: 'GOLD',
            userId: user.id,
            dealershipId: dealership.id,
            priority: 'MEDIUM',
            description: 'Create engaging blog content for automotive topics'
          },
          {
            title: 'Google Business Profile Setup',
            type: 'gbp_post',
            status: 'PENDING',
            packageType: 'GOLD',
            userId: user.id,
            dealershipId: dealership.id,
            priority: 'HIGH',
            description: 'Set up and optimize Google Business Profile'
          }
        ]
        
        for (const request of requests) {
          await prisma.requests.create({ data: request })
        }
        
        console.log(`   ✅ Created 3 requests for ${dealership.name}`)
      }
    }
    
    console.log('\n✨ Demo data creation complete!')
    console.log(`\n📊 Summary:`)
    console.log(`- Agency: ${agency.name}`)
    console.log(`- Dealerships: ${dealerships.length}`)
    console.log(`- Requests: ${dealerships.length * 3}`)
    console.log('\nDashboard should now load successfully! 🎉')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createDemoDealerships()