const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function createAgencyAdmin() {
  try {
    // Replace with your actual email
    const email = 'access@seowerks.ai'
    
    // Check if user exists
    const existingUser = await prisma.users.findUnique({
      where: { email }
    })
    
    if (existingUser) {
      console.log('✅ User already exists:', email)
      return
    }
    
    // Find SEOWorks agency
    const agency = await prisma.agencies.findFirst({
      where: { name: 'SEOWorks' }
    })
    
    if (!agency) {
      console.error('❌ SEOWorks agency not found. Run database setup first.')
      return
    }
    
    // Create agency admin user
    const user = await prisma.users.create({
      data: {
        email,
        name: 'Agency Admin',
        role: 'AGENCY_ADMIN',
        agencyId: agency.id,
        // Add any available dealership if needed
        dealershipId: null
      }
    })
    
    console.log('✅ Agency admin created:', user.email)
    console.log('📧 Login with this email at /login')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createAgencyAdmin()