const { PrismaClient } = require('@prisma/client');

async function cleanupAndConsolidateDealerships() {
  const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL
  });
  
  try {
    console.log('🧹 CLEANUP AND CONSOLIDATE JAY HATFIELD DEALERSHIPS');
    console.log('==================================================\n');
    
    // Step 1: Find the correct Jay Hatfield agency (or create one)
    console.log('📍 STEP 1: IDENTIFYING/CREATING MAIN JAY HATFIELD AGENCY');
    console.log('=======================================================');
    
    // Look for the main Jay Hatfield agency
    let mainJayHatfieldAgency = await prisma.agencies.findFirst({
      where: { slug: 'jay-hatfield' }
    });
    
    if (!mainJayHatfieldAgency) {
      // If no agency with slug 'jay-hatfield', use Jay Hatfield Motors
      mainJayHatfieldAgency = await prisma.agencies.findFirst({
        where: { id: 'f33b0ddd-2bce-4736-8e68-7f60c0bcfe3e' }
      });
      
      if (mainJayHatfieldAgency) {
        // Update it to have the correct slug
        mainJayHatfieldAgency = await prisma.agencies.update({
          where: { id: mainJayHatfieldAgency.id },
          data: {
            slug: 'jay-hatfield',
            name: 'Jay Hatfield Auto Group'
          }
        });
        console.log('✅ Updated existing Jay Hatfield Motors to Jay Hatfield Auto Group');
      }
    }
    
    if (!mainJayHatfieldAgency) {
      console.error('❌ Could not find or create main Jay Hatfield agency');
      return;
    }
    
    console.log(`✅ Main Jay Hatfield Agency: ${mainJayHatfieldAgency.name} (${mainJayHatfieldAgency.id})`);
    
    // Step 2: Get all Jay Hatfield dealerships (expected list)
    console.log('\n🚗 STEP 2: CONSOLIDATING ALL JAY HATFIELD DEALERSHIPS');
    console.log('====================================================');
    
    const expectedDealerships = [
      { name: "Jay Hatfield Chevrolet of Columbus", ga4PropertyId: "323480238", website: "https://www.jayhatfieldchevy.net/" },
      { name: "Jay hatfield Chevrolet GMC of Chanute", ga4PropertyId: "323404832", website: "https://www.jayhatfieldchanute.com/" },
      { name: "Jay Hatfield Chevrolet GMC of Pittsburg", ga4PropertyId: "371672738", website: "https://www.jayhatfieldchevroletgmc.com/" },
      { name: "Jay Hatfield Chevrolet of Vinita", ga4PropertyId: "320759942", website: "https://www.jayhatfieldchevroletvinita.com/" },
      { name: "Jay Hatfield CDJR of Frontenac", ga4PropertyId: "323415736", website: "https://www.jayhatfieldchryslerdodgejeepram.com/" },
      { name: "Sarcoxie Ford", ga4PropertyId: "452793966", website: "https://www.sarcoxieford.com" },
      { name: "Jay Hatfield Honda Powerhouse", ga4PropertyId: "336729443", website: "https://www.jayhatfieldhondawichita.com/" },
      { name: "Jay Hatfield Motorsports of Wichita", ga4PropertyId: "317592148", website: "https://www.kansasmotorsports.com/" },
      { name: "Jay Hatfield Motorsports of Frontenac", ga4PropertyId: "317608467", website: "https://www.jayhatfieldkawasaki.com/" },
      { name: "Jay Hatfield Motorsports of Joplin", ga4PropertyId: "317578343", website: "https://www.jhmofjoplin.com/" },
      { name: "Acura of Columbus", ga4PropertyId: "284944578", website: "https://www.acuracolumbus.com/" },
      { name: "Genesis of Wichita", ga4PropertyId: "323502411", website: "https://www.genesisofwichita.com/" },
      { name: "Jay Hatfield Motorsports Portal", ga4PropertyId: "461644624", website: "http://jayhatfieldmotorsports.com/" },
      { name: "Jay Hatfield Motorsports Ottawa", ga4PropertyId: "472110523", website: "https://www.jayhatfieldottawa.com/" },
      { name: "Hatchett Hyundai East", ga4PropertyId: "323448557", website: "https://www.hatchetthyundaieast.com/" },
      { name: "Hatchett Hyundai West", ga4PropertyId: "323465145", website: "https://www.hatchetthyundaiwest.com/" },
      { name: "Premier Mitsubishi", ga4PropertyId: "473660351", website: "https://premiermitsubishi.com/" },
      { name: "Premier Auto Center - Tucson", ga4PropertyId: "470694371", website: "https://scottsaysyes.com/" },
      { name: "World Kia", ga4PropertyId: null, website: "https://www.worldkiajoliet.com/" },
      { name: "AEO Powersports", ga4PropertyId: null, website: "https://aeopowersports.com/" },
      { name: "Columbus Auto Group", ga4PropertyId: null, website: "https://columbusautogroup.com/" },
      { name: "Winnebago of Rockford", ga4PropertyId: null, website: "https://www.winnebagomotorhomes.com/" }
    ];
    
    // Step 3: Delete all duplicates and reassign to main agency
    console.log('\n🗑️  STEP 3: REMOVING DUPLICATES & REASSIGNING');
    console.log('============================================');
    
    for (const expectedDealer of expectedDealerships) {
      // Find all dealerships with this name
      const existingDealerships = await prisma.dealerships.findMany({
        where: { name: expectedDealer.name }
      });
      
      if (existingDealerships.length === 0) {
        // Create new dealership
        const dealershipSlug = expectedDealer.name.toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim();
        
        await prisma.dealerships.create({
          data: {
            id: `jh-${dealershipSlug}`,
            name: expectedDealer.name,
            agencyId: mainJayHatfieldAgency.id,
            website: expectedDealer.website,
            activePackageType: 'PLATINUM',
            currentBillingPeriodStart: new Date(),
            currentBillingPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            settings: {
              ga4PropertyId: expectedDealer.ga4PropertyId,
              hasGA4Access: expectedDealer.ga4PropertyId !== null
            }
          }
        });
        console.log(`✅ Created: ${expectedDealer.name}`);
        
      } else if (existingDealerships.length === 1) {
        // Update existing dealership
        await prisma.dealerships.update({
          where: { id: existingDealerships[0].id },
          data: {
            agencyId: mainJayHatfieldAgency.id,
            website: expectedDealer.website,
            settings: {
              ga4PropertyId: expectedDealer.ga4PropertyId,
              hasGA4Access: expectedDealer.ga4PropertyId !== null
            }
          }
        });
        console.log(`🔄 Updated: ${expectedDealer.name}`);
        
      } else {
        // Multiple duplicates - keep one, delete others
        console.log(`🔧 Found ${existingDealerships.length} duplicates of ${expectedDealer.name}`);
        
        // Keep the first one (preferably from Jay Hatfield agency)
        const keeper = existingDealerships.find(d => d.agencyId === mainJayHatfieldAgency.id) || existingDealerships[0];
        
        // Update the keeper
        await prisma.dealerships.update({
          where: { id: keeper.id },
          data: {
            agencyId: mainJayHatfieldAgency.id,
            website: expectedDealer.website,
            settings: {
              ga4PropertyId: expectedDealer.ga4PropertyId,
              hasGA4Access: expectedDealer.ga4PropertyId !== null
            }
          }
        });
        
        // Delete the duplicates
        for (const duplicate of existingDealerships) {
          if (duplicate.id !== keeper.id) {
            // First update any users pointing to this dealership
            await prisma.users.updateMany({
              where: { dealershipId: duplicate.id },
              data: { dealershipId: keeper.id }
            });
            
            // Then delete the duplicate
            await prisma.dealerships.delete({
              where: { id: duplicate.id }
            });
            console.log(`  🗑️  Deleted duplicate: ${duplicate.id}`);
          }
        }
        console.log(`  ✅ Kept and updated: ${keeper.id}`);
      }
    }
    
    // Step 4: Clean up other agencies if they're empty
    console.log('\n🧹 STEP 4: CLEANING UP EMPTY AGENCIES');
    console.log('====================================');
    
    const agencies = await prisma.agencies.findMany({
      include: {
        _count: {
          select: { dealerships: true }
        }
      }
    });
    
    for (const agency of agencies) {
      if (agency._count.dealerships === 0 && agency.id !== mainJayHatfieldAgency.id) {
        // Check if there are any users in this agency
        const userCount = await prisma.users.count({
          where: { agencyId: agency.id }
        });
        
        if (userCount === 0) {
          await prisma.agencies.delete({
            where: { id: agency.id }
          });
          console.log(`🗑️  Deleted empty agency: ${agency.name}`);
        } else {
          console.log(`⚠️  Agency ${agency.name} has ${userCount} users, keeping it`);
        }
      }
    }
    
    // Step 5: Update main user assignment
    console.log('\n👤 STEP 5: UPDATING USER ASSIGNMENTS');
    console.log('===================================');
    
    const mainUser = await prisma.users.findFirst({
      where: {
        OR: [
          { id: '3e50bcc8-cd3e-4773-a790-e0570de37371' },
          { email: 'josh.copp@onekeel.ai' }
        ]
      }
    });
    
    if (mainUser && mainUser.agencyId !== mainJayHatfieldAgency.id) {
      await prisma.users.update({
        where: { id: mainUser.id },
        data: { agencyId: mainJayHatfieldAgency.id }
      });
      console.log(`✅ Updated main user agency assignment`);
    }
    
    // Final validation
    console.log('\n📊 FINAL VALIDATION');
    console.log('==================');
    
    const finalStats = {
      totalDealerships: await prisma.dealerships.count(),
      jayHatfieldDealerships: await prisma.dealerships.count({
        where: { agencyId: mainJayHatfieldAgency.id }
      }),
      totalAgencies: await prisma.agencies.count(),
      duplicatesRemaining: 0
    };
    
    // Check for remaining duplicates
    const allDealerships = await prisma.dealerships.findMany();
    const nameCount = {};
    allDealerships.forEach(d => {
      nameCount[d.name] = (nameCount[d.name] || 0) + 1;
    });
    finalStats.duplicatesRemaining = Object.values(nameCount).filter(count => count > 1).length;
    
    console.log('Final Statistics:');
    console.log(`  - Total dealerships: ${finalStats.totalDealerships}`);
    console.log(`  - Jay Hatfield dealerships: ${finalStats.jayHatfieldDealerships} (should be 22)`);
    console.log(`  - Total agencies: ${finalStats.totalAgencies}`);
    console.log(`  - Duplicate dealerships: ${finalStats.duplicatesRemaining} (should be 0)`);
    
    if (finalStats.jayHatfieldDealerships === 22 && finalStats.duplicatesRemaining === 0) {
      console.log('\n🎉 CLEANUP SUCCESSFUL!');
      console.log('All 22 Jay Hatfield dealerships are now properly consolidated under one agency.');
    } else {
      console.log('\n⚠️  CLEANUP INCOMPLETE');
      console.log('Some issues remain. Please check the database manually.');
    }
    
    return finalStats;
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanupAndConsolidateDealerships()
  .then(stats => {
    console.log('\n✅ Cleanup script completed!');
    console.log('Final stats:', stats);
  })
  .catch(error => {
    console.error('💥 Cleanup script failed:', error);
    process.exit(1);
  });
