const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function fixSeoworksAdmin() {
  try {
    console.log('🔧 Fixing SEOWORKS admin association...')
    
    // Find SEOWORKS agency
    const seoworksAgency = await prisma.agencies.findFirst({
      where: { name: 'SEOWORKS' }
    })
    
    if (!seoworksAgency) {
      console.error('❌ SEOWORKS agency not found')
      return
    }
    
    console.log('✅ Found SEOWORKS agency:', seoworksAgency.id)
    
    // Update the admin user to be associated with SEOWORKS agency
    const adminUser = await prisma.users.findFirst({
      where: { email: 'access@seowerks.ai' }
    })
    
    if (!adminUser) {
      console.error('❌ Admin user not found')
      return
    }
    
    console.log('✅ Found admin user:', adminUser.id)
    
    // Update user's agency association
    const updatedUser = await prisma.users.update({
      where: { id: adminUser.id },
      data: { 
        agencyId: seoworksAgency.id,
        dealershipId: null // Clear any existing dealership selection
      }
    })
    
    console.log('✅ Updated admin user agency association')
    console.log(`   User: ${updatedUser.email}`)
    console.log(`   Agency: ${seoworksAgency.name} (${seoworksAgency.id})`)
    
    console.log('🎉 SEOWORKS admin fix completed!')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixSeoworksAdmin() 