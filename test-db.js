const { PrismaClient } = require('@prisma/client')

async function testConnection() {
  const prisma = new PrismaClient()
  
  try {
    console.log('Testing database connection...')
    
    // Test basic connection
    const result = await prisma.$queryRaw`SELECT 1 as test`
    console.log('✅ Database connection successful:', result)
    
    // Test agency query
    const agencies = await prisma.agency.findMany()
    console.log('✅ Found agencies:', agencies.length)
    
    // Test dealership query
    const dealerships = await prisma.dealership.findMany()
    console.log('✅ Found dealerships:', dealerships.length)
    
  } catch (error) {
    console.error('❌ Database connection failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()