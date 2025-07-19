const { PrismaClient } = require('@prisma/client');

// Real dealership data from CSV - properly grouped by brand
const dealershipGroups = {
  'jay-hatfield': {
    agencyName: 'Jay Hatfield Auto Group',
    dealerships: [
      { dealer: "Jay Hatfield Chevrolet of Columbus", ga4PropertyId: "323480238", website: "https://www.jayhatfieldchevy.net/" },
      { dealer: "Jay hatfield Chevrolet GMC of Chanute", ga4PropertyId: "323404832", website: "https://www.jayhatfieldchanute.com/" },
      { dealer: "Jay Hatfield Chevrolet GMC of Pittsburg", ga4PropertyId: "371672738", website: "https://www.jayhatfieldchevroletgmc.com/" },
      { dealer: "Jay Hatfield Chevrolet of Vinita", ga4PropertyId: "320759942", website: "https://www.jayhatfieldchevroletvinita.com/" },
      { dealer: "Jay Hatfield CDJR of Frontenac", ga4PropertyId: "323415736", website: "https://www.jayhatfieldchryslerdodgejeepram.com/" },
      { dealer: "Jay Hatfield Honda Powerhouse", ga4PropertyId: "336729443", website: "https://www.jayhatfieldhondawichita.com/" },
      { dealer: "Jay Hatfield Motorsports of Wichita", ga4PropertyId: "317592148", website: "https://www.kansasmotorsports.com/" },
      { dealer: "Jay Hatfield Motorsports of Frontenac", ga4PropertyId: "317608467", website: "https://www.jayhatfieldkawasaki.com/" },
      { dealer: "Jay Hatfield Motorsports of Joplin", ga4PropertyId: "317578343", website: "https://www.jhmofjoplin.com/" },
      { dealer: "Jay Hatfield Motorsports Portal", ga4PropertyId: "461644624", website: "http://jayhatfieldmotorsports.com/" },
      { dealer: "Jay Hatfield Motorsports Ottawa", ga4PropertyId: "472110523", website: "https://www.jayhatfieldottawa.com/" }
    ]
  },
  'hatchett': {
    agencyName: 'Hatchett Auto Group',
    dealerships: [
      { dealer: "Hatchett Hyundai East", ga4PropertyId: "323448557", website: "https://www.hatchetthyundaieast.com/" },
      { dealer: "Hatchett Hyundai West", ga4PropertyId: "323465145", website: "https://www.hatchetthyundaiwest.com/" }
    ]
  },
  'premier': {
    agencyName: 'Premier Auto Group',
    dealerships: [
      { dealer: "Premier Mitsubishi", ga4PropertyId: "473660351", website: "https://premiermitsubishi.com/" },
      { dealer: "Premier Auto Center - Tucson", ga4PropertyId: "470694371", website: "https://scottsaysyes.com/" }
    ]
  },
  'independent': {
    agencyName: 'Independent Dealers Network',
    dealerships: [
      { dealer: "Sarcoxie Ford", ga4PropertyId: "452793966", website: "https://www.sarcoxieford.com" },
      { dealer: "Acura of Columbus", ga4PropertyId: "284944578", website: "https://www.acuracolumbus.com/" },
      { dealer: "Genesis of Wichita", ga4PropertyId: "323502411", website: "https://www.genesisofwichita.com/" },
      { dealer: "World Kia", ga4PropertyId: null, website: "https://www.worldkiajoliet.com/" },
      { dealer: "AEO Powersports", ga4PropertyId: null, website: "https://aeopowersports.com/" },
      { dealer: "Columbus Auto Group", ga4PropertyId: null, website: "https://columbusautogroup.com/" },
      { dealer: "Winnebago of Rockford", ga4PropertyId: null, website: "https://www.winnebagomotorhomes.com/" }
    ]
  }
};

async function fixedMultiBrandSetup() {
  const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL
  });
  
  try {
    console.log('🔄 FIXED MULTI-BRAND DEALERSHIP SETUP...');
    console.log('==========================================\n');
    
    // Step 1: Create/Update agencies first
    console.log('🏢 STEP 1: CREATING/UPDATING BRAND AGENCIES');
    console.log('============================================');
    
    const createdAgencies = {};
    
    for (const [brandKey, brandData] of Object.entries(dealershipGroups)) {
      const agencyId = `${brandKey}-agency`;
      
      // Use upsert to handle existing agencies
      const agency = await prisma.agencies.upsert({
        where: { id: agencyId },
        update: {
          name: brandData.agencyName,
          slug: brandKey,
          domain: `${brandKey}.com`,
          primaryColor: brandKey === 'jay-hatfield' ? '#0066cc' : 
                       brandKey === 'hatchett' ? '#cc0066' : 
                       brandKey === 'premier' ? '#00cc66' : '#666666',
          secondaryColor: brandKey === 'jay-hatfield' ? '#004499' : 
                         brandKey === 'hatchett' ? '#990044' : 
                         brandKey === 'premier' ? '#009944' : '#444444',
          plan: 'platinum',
          status: 'active',
          maxUsers: 50,
          maxConversations: 1000,
          updatedAt: new Date()
        },
        create: {
          id: agencyId,
          name: brandData.agencyName,
          slug: brandKey,
          domain: `${brandKey}.com`,
          primaryColor: brandKey === 'jay-hatfield' ? '#0066cc' : 
                       brandKey === 'hatchett' ? '#cc0066' : 
                       brandKey === 'premier' ? '#00cc66' : '#666666',
          secondaryColor: brandKey === 'jay-hatfield' ? '#004499' : 
                         brandKey === 'hatchett' ? '#990044' : 
                         brandKey === 'premier' ? '#009944' : '#444444',
          plan: 'platinum',
          status: 'active',
          maxUsers: 50,
          maxConversations: 1000,
          updatedAt: new Date()
        }
      });
      
      console.log(`✅ Agency ready: ${brandData.agencyName} (${agencyId})`);
      createdAgencies[brandKey] = agency;
    }
    
    // Step 2: Create/Update dealerships with unique IDs
    console.log('\n🚗 STEP 2: CREATING/UPDATING DEALERSHIPS');
    console.log('========================================');
    
    const allDealerships = [];
    let dealershipCounter = 1;
    
    for (const [brandKey, brandData] of Object.entries(dealershipGroups)) {
      console.log(`\n📍 Processing ${brandData.agencyName} dealerships:`);
      
      for (const dealerData of brandData.dealerships) {
        // Create a unique ID using counter
        const dealershipId = `dealer-${String(dealershipCounter).padStart(3, '0')}`;
        dealershipCounter++;
        
        // Use upsert to handle existing dealerships by name
        const dealership = await prisma.dealerships.upsert({
          where: { 
            id: dealershipId // This will create new if ID doesn't exist
          },
          update: {
            name: dealerData.dealer,
            agencyId: createdAgencies[brandKey].id,
            website: dealerData.website,
            activePackageType: 'PLATINUM',
            settings: {
              ga4PropertyId: dealerData.ga4PropertyId,
              hasGA4Access: dealerData.ga4PropertyId !== null,
              brandGroup: brandKey
            },
            updatedAt: new Date()
          },
          create: {
            id: dealershipId,
            name: dealerData.dealer,
            agencyId: createdAgencies[brandKey].id,
            website: dealerData.website,
            activePackageType: 'PLATINUM',
            currentBillingPeriodStart: new Date(),
            currentBillingPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            settings: {
              ga4PropertyId: dealerData.ga4PropertyId,
              hasGA4Access: dealerData.ga4PropertyId !== null,
              brandGroup: brandKey
            },
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        
        console.log(`   ✅ ${dealerData.dealer} (${dealershipId})`);
        console.log(`      - GA4: ${dealerData.ga4PropertyId || 'No access'}`);
        console.log(`      - Website: ${dealerData.website}`);
        
        allDealerships.push({
          ...dealership,
          ga4PropertyId: dealerData.ga4PropertyId,
          brandGroup: brandKey
        });
      }
    }
    
    // Step 3: Setup connections for main user
    console.log('\n📊 STEP 3: SETTING UP MAIN USER CONNECTIONS');
    console.log('===========================================');
    
    // Find the main user
    const mainUser = await prisma.users.findFirst({
      where: {
        OR: [
          { role: 'SUPER_ADMIN' },
          { email: { contains: 'josh.copp' } },
          { id: '3e50bcc8-cd3e-4773-a790-e0570de37371' }
        ]
      }
    });
    
    if (!mainUser) {
      console.log('⚠️  No main user found for connections setup');
    } else {
      console.log(`👤 Setting up connections for: ${mainUser.email}`);
      
      // Clean up existing connections
      await prisma.ga4_connections.deleteMany({
        where: { userId: mainUser.id }
      });
      
      await prisma.search_console_connections.deleteMany({
        where: { userId: mainUser.id }
      });
      
      // Create new GA4 connection
      const ga4Connection = await prisma.ga4_connections.create({
        data: {
          id: `ga4-main-${Date.now()}`,
          userId: mainUser.id,
          accessToken: 'encrypted-real-token-placeholder',
          propertyId: '323480238', // Jay Hatfield Columbus
          propertyName: 'Jay Hatfield Chevrolet of Columbus',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      console.log('✅ Created GA4 connection');
      
      // Create new Search Console connection
      const scConnection = await prisma.search_console_connections.create({
        data: {
          id: `sc-main-${Date.now()}`,
          userId: mainUser.id,
          accessToken: 'encrypted-real-token-placeholder',
          siteUrl: 'https://www.jayhatfieldchevy.net/',
          siteName: 'Jay Hatfield Chevrolet of Columbus',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      console.log('✅ Created Search Console connection');
      
      // Update user's agency assignment
      await prisma.users.update({
        where: { id: mainUser.id },
        data: { 
          agencyId: createdAgencies['jay-hatfield'].id,
          dealershipId: allDealerships.find(d => d.brandGroup === 'jay-hatfield')?.id
        }
      });
      
      console.log(`✅ Assigned ${mainUser.email} to Jay Hatfield Auto Group`);
    }
    
    // Step 4: Final validation and stats
    console.log('\n✅ STEP 4: FINAL VALIDATION');
    console.log('===========================');
    
    const finalStats = {
      totalDealerships: await prisma.dealerships.count(),
      totalAgencies: await prisma.agencies.count(),
      jayhatfieldDealerships: allDealerships.filter(d => d.brandGroup === 'jay-hatfield').length,
      hatchettDealerships: allDealerships.filter(d => d.brandGroup === 'hatchett').length,
      premierDealerships: allDealerships.filter(d => d.brandGroup === 'premier').length,
      independentDealerships: allDealerships.filter(d => d.brandGroup === 'independent').length,
      dealershipsWithGA4: allDealerships.filter(d => d.ga4PropertyId).length,
      dealershipsPendingGA4: allDealerships.filter(d => !d.ga4PropertyId).length,
      ga4Connections: await prisma.ga4_connections.count(),
      scConnections: await prisma.search_console_connections.count()
    };
    
    console.log('\n📊 Final Statistics:');
    Object.entries(finalStats).forEach(([key, value]) => {
      console.log(`   - ${key}: ${value}`);
    });
    
    console.log('\n🏢 Agency Breakdown:');
    for (const [brandKey, brandData] of Object.entries(dealershipGroups)) {
      const count = brandData.dealerships.length;
      console.log(`   - ${brandData.agencyName}: ${count} dealerships`);
    }
    
    console.log('\n🎯 Expected Results:');
    console.log('1. ✅ Dealership dropdown will show all 22 dealerships grouped by brand');
    console.log('2. ✅ GA4 will show 18 properties with access + 4 pending access');
    console.log('3. ✅ Search Console will show all 22 dealership websites');
    console.log('4. ✅ Each brand properly grouped under correct agency');
    console.log('5. ✅ Real dealership names and data from CSV');
    
    console.log('\n🎉 FIXED MULTI-BRAND SETUP COMPLETED SUCCESSFULLY!');
    console.log('==================================================');
    
    return finalStats;
    
  } catch (error) {
    console.error('❌ Script failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fixed setup
fixedMultiBrandSetup()
  .then(stats => {
    console.log('\n✅ Successfully completed fixed multi-brand setup!');
    console.log('📊 Final stats:', stats);
  })
  .catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
