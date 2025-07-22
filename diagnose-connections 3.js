const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function diagnoseDatabaseConnections() {
  try {
    console.log('🔍 DIAGNOSING DATABASE CONNECTIONS...')
    console.log('='.repeat(50))
    
    // Check users
    const users = await prisma.users.findMany({
      select: {
        id: true,
        email: true, 
        role: true,
        agencyId: true
      }
    })
    
    console.log(`📊 Found ${users.length} users:`)
    users.forEach(user => {
      console.log(`  - ${user.email} (Role: ${user.role}, Agency: ${user.agencyId})`)
    })
    console.log('')
    
    // Check GA4 connections
    const ga4Connections = await prisma.ga4_connections.findMany({
      include: {
        users: {
          select: { email: true, role: true }
        }
      }
    })
    
    console.log(`🔗 GA4 Connections: ${ga4Connections.length}`)
    ga4Connections.forEach(conn => {
      console.log(`  - User: ${conn.users.email}`)
      console.log(`    Property ID: ${conn.propertyId}`)
      console.log(`    Property Name: ${conn.propertyName}`)
      console.log(`    Has Access Token: ${!!conn.accessToken}`)
      console.log(`    Expires At: ${conn.expiresAt}`)
      console.log('')
    })
    
    // Check Search Console connections
    const scConnections = await prisma.search_console_connections.findMany({
      include: {
        users: {
          select: { email: true, role: true }
        }
      }
    })
    
    console.log(`🔍 Search Console Connections: ${scConnections.length}`)
    scConnections.forEach(conn => {
      console.log(`  - User: ${conn.users.email}`)
      console.log(`    Site URL: ${conn.siteUrl}`)
      console.log(`    Site Name: ${conn.siteName}`)
      console.log(`    Has Access Token: ${!!conn.accessToken}`)
      console.log(`    Expires At: ${conn.expiresAt}`)
      console.log('')
    })
    
    // Check agencies
    const agencies = await prisma.agencies.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        ga4PropertyId: true,
        ga4PropertyName: true
      }
    })
    
    console.log(`🏢 Agencies: ${agencies.length}`)
    agencies.forEach(agency => {
      console.log(`  - ${agency.name} (slug: ${agency.slug})`)
      console.log(`    GA4 Property: ${agency.ga4PropertyId} - ${agency.ga4PropertyName}`)
    })
    
  } catch (error) {
    console.error('❌ Diagnosis Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

diagnoseDatabaseConnections()
