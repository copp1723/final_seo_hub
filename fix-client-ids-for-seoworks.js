#!/usr/bin/env node

/**
 * Fix Client IDs to Match SEOWorks Integration
 * 
 * This script updates all dealership clientId values to match what
 * SEOWorks expects to send in their webhook payloads.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Mapping from current database clientIds to what SEOWorks expects
const CLIENT_ID_MAPPING = {
  'user_acuraofcolumbus_www_2024': 'dealer-acura-columbus',
  'user_aeopowersports_aeopowersports_2024': 'dealer-aeo-powersports', 
  'user_columbusautogroup_columbusautogroup_2024': 'dealer-columbus-auto-group',
  'user_genesisofwichita_www_2024': 'dealer-genesis-wichita',
  'user_hatchetthyundaieast_www_2024': 'dealer-hatchett-hyundai-east',
  'user_hatchetthyundaiwest_www_2024': 'dealer-hatchett-hyundai-west',
  'user_jayhatfieldchevroletofcolumbus_www_2024': 'dealer-jhc-columbus',
  'user_jayhatfieldchevroletgmcofchanute_www_2024': 'dealer-jhc-chanute',
  'user_jayhatfieldchevroletgmcofpittsburg_www_2024': 'dealer-jhc-pittsburg',
  'user_jayhatfieldchevroletofvinita_www_2024': 'dealer-jhc-vinita',
  'user_jayhatfieldcdjroffrontenac_www_2024': 'dealer-jhdjr-frontenac',
  'user_jayhatfieldhonda_www_2024': 'dealer-jhhp-wichita',
  'user_jayhatfieldmotorsoffrontenac_www_2024': 'dealer-jhm-frontenac',
  'user_jayhatfieldmotorsofjoplin_www_2024': 'dealer-jhm-joplin',
  'user_jayhatfieldmotorsottawa_www_2024': 'dealer-jhm-ottawa',
  'user_jayhatfieldmotorsofwichita_www_2024': 'dealer-jhm-wichita',
  'user_jayhatfieldmotorsportal_jayhatfieldmotorsports_2024': 'dealer-jhm-portal',
  'user_premierautocentertucson_scottsaysyes_2024': 'dealer-premier-auto-tucson',
  'user_premiermitsubishi_premiermitsubishi_2024': 'dealer-premier-mitsubishi',
  'user_sarcoxieford_www_2024': 'dealer-sarcoxie-ford',
  'user_winnebagoofrockford_www_2024': 'dealer-winnebago-rockford',
  'user_worldkia_www_2024': 'dealer-world-kia',
  'dealer-brown-motors': 'dealer-brown-motors' // Already correct
};

async function updateClientIds() {
  console.log('🚀 FIXING CLIENT IDS FOR SEOWORKS INTEGRATION');
  console.log('=' .repeat(60));
  
  try {
    const dealerships = await prisma.dealerships.findMany({
      select: { id: true, name: true, clientId: true }
    });
    
    let updateCount = 0;
    let skippedCount = 0;
    
    for (const dealership of dealerships) {
      const newClientId = CLIENT_ID_MAPPING[dealership.clientId];
      
      if (newClientId && newClientId !== dealership.clientId) {
        console.log(`📝 Updating ${dealership.name}:`);
        console.log(`   FROM: ${dealership.clientId}`);
        console.log(`   TO:   ${newClientId}`);
        
        await prisma.dealerships.update({
          where: { id: dealership.id },
          data: { clientId: newClientId }
        });
        
        updateCount++;
        console.log('   ✅ Updated successfully\n');
      } else if (newClientId === dealership.clientId) {
        console.log(`✅ ${dealership.name}: Already correct (${dealership.clientId})`);
        skippedCount++;
      } else {
        console.log(`❓ ${dealership.name}: No mapping found for ${dealership.clientId}`);
        skippedCount++;
      }
    }
    
    console.log('\n🎉 CLIENT ID UPDATE COMPLETE!');
    console.log(`   ✅ Updated: ${updateCount} dealerships`);
    console.log(`   ⏭️  Skipped: ${skippedCount} dealerships`);
    console.log('\n🚀 SEOWorks integration is now ready!');
    console.log('   Webhooks with the correct clientId values will now work.');
    console.log('   Test by asking SEOWorks to send a webhook for any dealership.');
    
  } catch (error) {
    console.error('❌ Error updating client IDs:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update
updateClientIds().catch(console.error);