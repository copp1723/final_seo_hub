const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function fixGA4Connection() {
  console.log('🔧 FIXING GA4 CONNECTION AFTER DUPLICATE CLEANUP')
  console.log('=' .repeat(60))
  
  try {
    // Get the GA4 connection
    const connection = await prisma.ga4_connections.findFirst({
      where: { propertyId: '320759942' }
    })
    
    if (!connection) {
      console.log('❌ No GA4 connection found')
      return
    }
    
    console.log(`✅ Found GA4 connection: ${connection.id}`)
    console.log(`   Property: ${connection.propertyName} (${connection.propertyId})`)
    console.log(`   Current dealership: ${connection.dealershipId || 'None'}`)
    
    // Get the user
    const user = await prisma.users.findUnique({
      where: { email: 'josh.copp@onekeel.ai' }
    })
    
    if (!user) {
      console.log('❌ User not found')
      return
    }
    
    console.log(`✅ Found user: ${user.email}`)
    console.log(`   Current dealership: ${user.dealershipId || 'None'}`)
    
    // Get the correct dealership ID for "Jay Hatfield Chevrolet of Columbus"
    const dealership = await prisma.dealerships.findFirst({
      where: { name: 'Jay Hatfield Chevrolet of Columbus' }
    })
    
    if (!dealership) {
      console.log('❌ Dealership not found')
      return
    }
    
    console.log(`✅ Found dealership: ${dealership.name} (${dealership.id})`)
    
    // Update the GA4 connection to link to the correct dealership
    const updatedConnection = await prisma.ga4_connections.update({
      where: { id: connection.id },
      data: { dealershipId: dealership.id }
    })
    
    console.log(`✅ Updated GA4 connection to: ${updatedConnection.dealershipId}`)
    
    // Also update the user to match
    const updatedUser = await prisma.users.update({
      where: { email: 'josh.copp@onekeel.ai' },
      data: { dealershipId: dealership.id }
    })
    
    console.log(`✅ Updated user to: ${updatedUser.dealershipId}`)
    
    console.log('\n🎯 FIX COMPLETE!')
    console.log('1. GA4 connection now linked to: Jay Hatfield Chevrolet of Columbus')
    console.log('2. User now linked to: Jay Hatfield Chevrolet of Columbus')
    console.log('3. Refresh your browser and the analytics should work')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixGA4Connection() 