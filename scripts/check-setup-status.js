const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkSetupStatus() {
  console.log('🔍 Checking SEO Hub Setup Status...\n')
  
  try {
    // Check agencies
    const agencies = await prisma.agencies.findMany()
    console.log(`📢 Agencies: ${agencies.length}`)
    agencies.forEach(a => console.log(`   - ${a.name} (${a.id})`))
    
    // Check users
    const users = await prisma.users.findMany({
      select: { email: true, role: true, name: true }
    })
    console.log(`\n👥 Users: ${users.length}`)
    users.forEach(u => console.log(`   - ${u.email} (${u.role})`))
    
    // Check dealerships
    const dealerships = await prisma.dealerships.findMany({
      select: { name: true, ga4PropertyId: true, siteUrl: true }
    })
    console.log(`\n🏢 Dealerships: ${dealerships.length}`)
    dealerships.forEach(d => {
      console.log(`   - ${d.name}`)
      console.log(`     GA4: ${d.ga4PropertyId || 'Not configured'}`)
      console.log(`     URL: ${d.siteUrl || 'Not configured'}`)
    })
    
    // Check GA4 connections
    const ga4Connections = await prisma.ga4_connections.findMany({
      include: { user: { select: { email: true } } }
    })
    console.log(`\n📊 GA4 Connections: ${ga4Connections.length}`)
    ga4Connections.forEach(c => {
      console.log(`   - User: ${c.user.email}`)
      console.log(`     Property: ${c.propertyId || 'Not set'}`)
    })
    
    // Check environment
    console.log('\n🔐 Environment Check:')
    console.log(`   NEXTAUTH_URL: ${process.env.NEXTAUTH_URL ? '✅ Set' : '❌ Missing'}`)
    console.log(`   NEXTAUTH_SECRET: ${process.env.NEXTAUTH_SECRET ? '✅ Set' : '❌ Missing'}`)
    console.log(`   GOOGLE_CLIENT_ID: ${process.env.GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing'}`)
    console.log(`   GOOGLE_CLIENT_SECRET: ${process.env.GOOGLE_CLIENT_SECRET ? '✅ Set' : '❌ Missing'}`)
    console.log(`   ENCRYPTION_KEY: ${process.env.ENCRYPTION_KEY ? '✅ Set' : '❌ Missing'}`)
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkSetupStatus()