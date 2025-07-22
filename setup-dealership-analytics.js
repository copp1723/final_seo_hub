import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function setupDealershipAnalytics() {
  try {
    console.log('🔧 Setting up dealership analytics configuration...\n');

    // Get all dealerships
    const dealerships = await prisma.dealerships.findMany({
      select: {
        id: true,
        name: true,
        primaryDomain: true,
        ga4PropertyId: true,
        ga4PropertyName: true,
        siteUrl: true,
      }
    });

    console.log(`Found ${dealerships.length} dealerships\n`);

    // Example GA4 property mappings (you'll need to update these with real values)
    const ga4Mappings = {
      'dealer-jay-hatfield-chevrolet': {
        ga4PropertyId: 'properties/123456789', // Replace with actual
        ga4PropertyName: 'Jay Hatfield Chevrolet',
        siteUrl: 'https://www.jayhatfieldchevrolet.com'
      },
      'dealer-genesis-wichita': {
        ga4PropertyId: 'properties/987654321', // Replace with actual
        ga4PropertyName: 'Genesis of Wichita',
        siteUrl: 'https://www.genesiswichita.com'
      },
      // Add more mappings as needed
    };

    // Update dealerships with analytics configuration
    for (const dealership of dealerships) {
      const mapping = ga4Mappings[dealership.id];
      
      if (mapping) {
        await prisma.dealerships.update({
          where: { id: dealership.id },
          data: {
            ga4PropertyId: mapping.ga4PropertyId,
            ga4PropertyName: mapping.ga4PropertyName,
            siteUrl: mapping.siteUrl || dealership.primaryDomain
          }
        });
        
        console.log(`✅ Updated ${dealership.name}:`);
        console.log(`   GA4 Property: ${mapping.ga4PropertyId}`);
        console.log(`   Site URL: ${mapping.siteUrl || dealership.primaryDomain}`);
      } else {
        console.log(`⚠️  No mapping found for ${dealership.name} (${dealership.id})`);
        
        // Set site URL from primary domain if available
        if (dealership.primaryDomain && !dealership.siteUrl) {
          await prisma.dealerships.update({
            where: { id: dealership.id },
            data: {
              siteUrl: dealership.primaryDomain
            }
          });
          console.log(`   Set site URL to: ${dealership.primaryDomain}`);
        }
      }
    }

    console.log('\n📊 Configuration Summary:');
    
    const configured = await prisma.dealerships.count({
      where: {
        ga4PropertyId: { not: null }
      }
    });
    
    const withSiteUrl = await prisma.dealerships.count({
      where: {
        siteUrl: { not: null }
      }
    });

    console.log(`  Dealerships with GA4: ${configured}/${dealerships.length}`);
    console.log(`  Dealerships with Site URL: ${withSiteUrl}/${dealerships.length}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the setup
setupDealershipAnalytics()
  .then(() => {
    console.log('\n✅ Analytics configuration complete');
    console.log('\nNext steps:');
    console.log('1. Update the ga4Mappings object with actual GA4 property IDs');
    console.log('2. Ensure users connect their Google accounts via /integrations');
    console.log('3. Verify users have access to the configured properties');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
