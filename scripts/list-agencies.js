const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function listAgencies() {
  try {
    const agencies = await prisma.agencies.findMany({
      include: {
        users: { select: { email: true, role: true } },
        dealerships: { select: { name: true } }
      }
    })
    
    console.log('📊 All agencies in database:')
    console.log('=====================================')
    
    agencies.forEach((agency, index) => {
      console.log(`${index + 1}. ${agency.name}`)
      console.log(`   ID: ${agency.id}`)
      console.log(`   Slug: ${agency.slug}`)
      console.log(`   Domain: ${agency.domain}`)
      console.log(`   Users: ${agency.users.length}`)
      if (agency.users.length > 0) {
        agency.users.forEach(user => {
          console.log(`     - ${user.email} (${user.role})`)
        })
      }
      console.log(`   Dealerships: ${agency.dealerships.length}`)
      if (agency.dealerships.length > 0) {
        agency.dealerships.forEach(dealership => {
          console.log(`     - ${dealership.name}`)
        })
      }
      console.log('   ---')
    })
    
    if (agencies.length === 0) {
      console.log('No agencies found in database')
    } else {
      console.log(`\nTotal agencies: ${agencies.length}`)
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

listAgencies()