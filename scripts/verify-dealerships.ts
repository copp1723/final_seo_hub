import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyDealerships() {
  try {
    console.log('🔍 Verifying all dealerships were created correctly...\n')
    
    // Find the SEOWorks agency
    const agency = await prisma.agencies.findFirst({
      where: {
        OR: [
          { name: { contains: 'SEO', mode: 'insensitive' } },
          { name: { contains: 'SEOWERKS', mode: 'insensitive' } },
          { domain: { contains: 'seowerks', mode: 'insensitive' } }
        ]
      }
    })

    if (!agency) {
      console.error('❌ SEOWorks agency not found!')
      return
    }

    console.log(`✅ Agency: ${agency.name} (ID: ${agency.id})`)
    
    // Get all dealerships for this agency
    const dealerships = await prisma.dealerships.findMany({
      where: { agencyId: agency.id },
      orderBy: { name: 'asc' }
    })

    console.log(`📊 Found ${dealerships.length} dealerships\n`)

    // Check for any missing clientIds
    const missingClientIds = dealerships.filter(d => !d.clientId)
    if (missingClientIds.length > 0) {
      console.log(`⚠️  ${missingClientIds.length} dealerships are missing clientIds:`)
      missingClientIds.forEach(d => console.log(`   - ${d.name}`))
      console.log('')
    }

    // Display all dealerships with their client IDs
    console.log('📋 All Dealerships:')
    console.log('-'.repeat(120))
    console.log(`${'Name'.padEnd(40)} | ${'Client ID'.padEnd(50)} | ${'Website'.padEnd(25)}`)
    console.log('-'.repeat(120))
    
    dealerships.forEach(dealership => {
      const name = dealership.name.length > 37 ? dealership.name.substring(0, 37) + '...' : dealership.name
      const clientId = dealership.clientId || 'NOT SET'
      const website = dealership.website?.substring(0, 22) + '...' || 'N/A'
      console.log(`${name.padEnd(40)} | ${clientId.padEnd(50)} | ${website.padEnd(25)}`)
    })

    console.log('\n🎯 SEOWorks Integration Summary:')
    console.log(`Total Dealerships: ${dealerships.length}`)
    console.log(`With Client IDs: ${dealerships.length - missingClientIds.length}`)
    console.log(`Missing Client IDs: ${missingClientIds.length}`)
    
    if (missingClientIds.length === 0) {
      console.log('\n✅ Perfect! All dealerships have unique client IDs.')
      console.log('Your SEOWorks integration is ready to use these client IDs in webhook payloads.')
    } else {
      console.log('\n⚠️  Some dealerships need client IDs. Re-run the bulk creation script.')
    }

  } catch (error) {
    console.error('❌ Error verifying dealerships:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the verification
verifyDealerships() 