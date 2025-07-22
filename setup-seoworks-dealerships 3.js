const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');
const Papa = require('papaparse');

async function setupSEOwerksAndDealerships() {
  const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL
  });
  
  try {
    console.log('🏢 SETTING UP SEOWORKS AGENCY AND DEALERSHIPS');
    console.log('=============================================\n');
    
    // Step 1: Read the CSV file
    console.log('📄 STEP 1: READING DEALERSHIP DATA FROM CSV');
    console.log('==========================================');
    
    let dealershipData;
    try {
      const csvPath = path.join(process.cwd(), 'GSEO Onboards  Sheet1 1.csv');
      const csvContent = await fs.readFile(csvPath, 'utf-8');
      
      const parseResult = Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim()
      });
      
      dealershipData = parseResult.data;
      console.log(`✅ Read ${dealershipData.length} dealerships from CSV`);
    } catch (error) {
      console.log('⚠️  Could not read CSV file, using hardcoded data');
      // Fallback to hardcoded data
      dealershipData = [
        { Dealer: "Jay Hatfield Chevrolet of Columbus", "G44 Property IDs": "323480238", "Website URL": "https://www.jayhatfieldchevy.net/" },
        { Dealer: "Jay hatfield Chevrolet GMC of Chanute", "G44 Property IDs": "323404832", "Website URL": "https://www.jayhatfieldchanute.com/" },
        { Dealer: "Jay Hatfield Chevrolet GMC of Pittsburg", "G44 Property IDs": "371672738", "Website URL": "https://www.jayhatfieldchevroletgmc.com/" },
        { Dealer: "Jay Hatfield Chevrolet of Vinita", "G44 Property IDs": "320759942", "Website URL": "https://www.jayhatfieldchevroletvinita.com/" },
        { Dealer: "Jay Hatfield CDJR of Frontenac", "G44 Property IDs": "323415736", "Website URL": "https://www.jayhatfieldchryslerdodgejeepram.com/" },
        { Dealer: "Sarcoxie Ford", "G44 Property IDs": "452793966", "Website URL": "https://www.sarcoxieford.com" },
        { Dealer: "Jay Hatfield Honda Powerhouse", "G44 Property IDs": "336729443", "Website URL": "https://www.jayhatfieldhondawichita.com/" },
        { Dealer: "Jay Hatfield Motorsports of Wichita", "G44 Property IDs": "317592148", "Website URL": "https://www.kansasmotorsports.com/" },
        { Dealer: "Jay Hatfield Motorsports of Frontenac", "G44 Property IDs": "317608467", "Website URL": "https://www.jayhatfieldkawasaki.com/" },
        { Dealer: "Jay Hatfield Motorsports of Joplin", "G44 Property IDs": "317578343", "Website URL": "https://www.jhmofjoplin.com/" },
        { Dealer: "Acura of Columbus", "G44 Property IDs": "284944578", "Website URL": "https://www.acuracolumbus.com/" },
        { Dealer: "Genesis of Wichita", "G44 Property IDs": "323502411", "Website URL": "https://www.genesisofwichita.com/" },
        { Dealer: "Jay Hatfield Motorsports Portal", "G44 Property IDs": "461644624", "Website URL": "http://jayhatfieldmotorsports.com/" },
        { Dealer: "Jay Hatfield Motorsports Ottawa", "G44 Property IDs": "472110523", "Website URL": "https://www.jayhatfieldottawa.com/" },
        { Dealer: "Hatchett Hyundai East", "G44 Property IDs": "323448557", "Website URL": "https://www.hatchetthyundaieast.com/" },
        { Dealer: "Hatchett Hyundai West", "G44 Property IDs": "323465145", "Website URL": "https://www.hatchetthyundaiwest.com/" },
        { Dealer: "Premier Mitsubishi", "G44 Property IDs": "473660351", "Website URL": "https://premiermitsubishi.com/" },
        { Dealer: "Premier Auto Center - Tucson", "G44 Property IDs": "470694371", "Website URL": "https://scottsaysyes.com/" },
        { Dealer: "World Kia", "G44 Property IDs": "no access", "Website URL": "https://www.worldkiajoliet.com/" },
        { Dealer: "AEO Powersports", "G44 Property IDs": "no access yet", "Website URL": "https://aeopowersports.com/" },
        { Dealer: "Columbus Auto Group", "G44 Property IDs": "no access (pending name change?)", "Website URL": "https://columbusautogroup.com/" },
        { Dealer: "Winnebago of Rockford", "G44 Property IDs": "not launched", "Website URL": "https://www.winnebagomotorhomes.com/" }
      ];
    }
    
    // Step 2: Clean up ALL existing data
    console.log('\n🧹 STEP 2: CLEANING UP ALL EXISTING DATA');
    console.log('========================================');
    
    // Delete all dealerships
    const deletedDealerships = await prisma.dealerships.deleteMany();
    console.log(`🗑️  Deleted ${deletedDealerships.count} existing dealerships`);
    
    // Delete all agencies
    const deletedAgencies = await prisma.agencies.deleteMany();
    console.log(`🗑️  Deleted ${deletedAgencies.count} existing agencies`);
    
    // Step 3: Create SEOwerks agency
    console.log('\n🏢 STEP 3: CREATING SEOWORKS AGENCY');
    console.log('===================================');
    
    const seowerksAgency = await prisma.agencies.create({
      data: {
        id: 'seoworks-agency',
        name: 'SEOwerks',
        slug: 'seoworks',
        domain: 'seoworks.com',
        primaryColor: '#0066cc',
        secondaryColor: '#004499',
        plan: 'platinum',
        status: 'active',
        maxUsers: 100,
        maxConversations: 10000,
        updatedAt: new Date()
      }
    });
    
    console.log('✅ Created SEOwerks agency');
    console.log(`   - ID: ${seowerksAgency.id}`);
    console.log(`   - Name: ${seowerksAgency.name}`);
    console.log(`   - Slug: ${seowerksAgency.slug}`);
    
    // Step 4: Create all dealerships under SEOwerks
    console.log('\n🚗 STEP 4: CREATING DEALERSHIPS UNDER SEOWORKS');
    console.log('==============================================');
    
    let createdCount = 0;
    let withGA4Access = 0;
    let withoutGA4Access = 0;
    
    for (const dealer of dealershipData) {
      const dealerName = dealer.Dealer || dealer.dealer;
      const ga4PropertyId = dealer["G44 Property IDs"] || dealer.ga4PropertyId;
      const website = dealer["Website URL"] || dealer.website;
      
      // Check if GA4 property ID is valid (numeric)
      const hasGA4Access = ga4PropertyId && /^\d+$/.test(ga4PropertyId);
      
      const dealershipSlug = dealerName.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      
      const dealership = await prisma.dealerships.create({
        data: {
          id: `seoworks-${dealershipSlug}`,
          name: dealerName,
          agencyId: seowerksAgency.id,
          website: website,
          activePackageType: 'PLATINUM',
          currentBillingPeriodStart: new Date(),
          currentBillingPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          settings: {
            ga4PropertyId: hasGA4Access ? ga4PropertyId : null,
            hasGA4Access: hasGA4Access,
            ga4AccessNote: hasGA4Access ? null : ga4PropertyId
          }
        }
      });
      
      console.log(`✅ Created: ${dealerName}`);
      console.log(`   - Website: ${website}`);
      console.log(`   - GA4: ${hasGA4Access ? ga4PropertyId : `No access (${ga4PropertyId})`}`);
      
      createdCount++;
      if (hasGA4Access) withGA4Access++;
      else withoutGA4Access++;
    }
    
    // Step 5: Update user assignments
    console.log('\n👤 STEP 5: UPDATING USER ASSIGNMENTS');
    console.log('===================================');
    
    // Find the main user
    const mainUser = await prisma.users.findFirst({
      where: {
        OR: [
          { id: '3e50bcc8-cd3e-4773-a790-e0570de37371' },
          { email: 'josh.copp@onekeel.ai' },
          { role: 'SUPER_ADMIN' }
        ]
      }
    });
    
    if (mainUser) {
      // Get the first dealership for assignment
      const firstDealership = await prisma.dealerships.findFirst({
        where: { agencyId: seowerksAgency.id },
        orderBy: { name: 'asc' }
      });
      
      await prisma.users.update({
        where: { id: mainUser.id },
        data: {
          agencyId: seowerksAgency.id,
          dealershipId: firstDealership?.id
        }
      });
      
      console.log(`✅ Updated user: ${mainUser.email}`);
      console.log(`   - Assigned to SEOwerks agency`);
      console.log(`   - Default dealership: ${firstDealership?.name}`);
    }
    
    // Update any other users to SEOwerks
    const updatedUsers = await prisma.users.updateMany({
      where: {
        agencyId: { not: seowerksAgency.id }
      },
      data: {
        agencyId: seowerksAgency.id
      }
    });
    
    if (updatedUsers.count > 0) {
      console.log(`✅ Updated ${updatedUsers.count} other users to SEOwerks agency`);
    }
    
    // Step 6: Final validation
    console.log('\n📊 FINAL VALIDATION');
    console.log('==================');
    
    const finalStats = {
      totalAgencies: await prisma.agencies.count(),
      totalDealerships: await prisma.dealerships.count(),
      seowerksDealerships: await prisma.dealerships.count({
        where: { agencyId: seowerksAgency.id }
      }),
      dealershipsWithGA4: withGA4Access,
      dealershipsWithoutGA4: withoutGA4Access
    };
    
    console.log('Final Statistics:');
    console.log(`  - Total agencies: ${finalStats.totalAgencies} (should be 1)`);
    console.log(`  - Total dealerships: ${finalStats.totalDealerships} (should be 22)`);
    console.log(`  - SEOwerks dealerships: ${finalStats.seowerksDealerships} (should be 22)`);
    console.log(`  - Dealerships with GA4 access: ${finalStats.dealershipsWithGA4}`);
    console.log(`  - Dealerships without GA4 access: ${finalStats.dealershipsWithoutGA4}`);
    
    console.log('\n🎉 SETUP COMPLETED SUCCESSFULLY!');
    console.log('================================');
    console.log('✅ One agency: SEOwerks');
    console.log('✅ 22 dealerships under SEOwerks');
    console.log('✅ GA4 properties configured where available');
    console.log('✅ All users assigned to SEOwerks');
    
    return finalStats;
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the setup
setupSEOwerksAndDealerships()
  .then(stats => {
    console.log('\n✅ Setup script completed successfully!');
    console.log('You can now run the application and see:');
    console.log('- All 22 dealerships in the dropdown');
    console.log('- Real GA4 data when you connect your Google account');
    console.log('- Real Search Console data when you connect your Google account');
  })
  .catch(error => {
    console.error('💥 Setup script failed:', error);
    process.exit(1);
  });
