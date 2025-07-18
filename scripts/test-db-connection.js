const { PrismaClient } = require('@prisma/client')

async function testConnection() {
  console.log('🔍 Testing database connection...')
  
  const prisma = new PrismaClient()
  
  try {
    // Test basic connection
    await prisma.$connect()
    console.log('✅ Database connection successful!')
    
    // Test a simple query
    const result = await prisma.$queryRaw`SELECT 1 as test`
    console.log('✅ Database query successful:', result)
    
    // Check if there are any agencies
    const agencies = await prisma.agency.findMany()
    console.log(`✅ Found ${agencies.length} agencies in database`)
    
    if (agencies.length > 0) {
      console.log('📋 Existing agencies:')
      agencies.forEach(agency => {
        console.log(`  - ${agency.name} (ID: ${agency.id})`)
      })
    }
    
    // Check if there are any dealerships
    const dealerships = await prisma.dealership.findMany()
    console.log(`✅ Found ${dealerships.length} dealerships in database`)
    
    if (dealerships.length > 0) {
      console.log('🚗 Existing dealerships:')
      dealerships.forEach(dealer => {
        console.log(`  - ${dealer.name} (ID: ${dealer.id})`)
      })
    } else {
      console.log('❗ No dealerships found - this is why the dropdown shows "AGENCY"')
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message)
    console.log('\n🔧 Troubleshooting steps:')
    console.log('1. Check your DATABASE_URL in .env file')
    console.log('2. Verify the database server is running')
    console.log('3. Check if you need to allowlist your IP address')
    console.log('4. Verify the database credentials are correct')
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()