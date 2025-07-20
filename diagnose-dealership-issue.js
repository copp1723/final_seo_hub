const { PrismaClient } = require('@prisma/client');

async function diagnoseDealershipIssue() {
  const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL
  });
  
  try {
    console.log('🔍 DIAGNOSING DEALERSHIP ISSUE');
    console.log('==============================\n');
    
    // Get Jay Hatfield agency
    const jayHatfieldAgency = await prisma.agencies.findFirst({
      where: {
        OR: [
          { slug: 'jay-hatfield' },
          { name: { contains: 'Jay Hatfield' } }
        ]
      }
    });
    
    console.log('Jay Hatfield Agency ID:', jayHatfieldAgency?.id);
    console.log('Jay Hatfield Agency Name:', jayHatfieldAgency?.name);
    console.log('');
    
    // Get all dealerships
    const allDealerships = await prisma.dealerships.findMany({
      select: {
        id: true,
        name: true,
        agencyId: true,
        agencies: {
          select: {
            name: true
          }
        }
      }
    });
    
    console.log(`Total dealerships in database: ${allDealerships.length}`);
    console.log('');
    
    // Group by agency
    const dealershipsByAgency = {};
    allDealerships.forEach(d => {
      const agencyName = d.agencies?.name || 'Unknown Agency';
      if (!dealershipsByAgency[agencyName]) {
        dealershipsByAgency[agencyName] = [];
      }
      dealershipsByAgency[agencyName].push(d);
    });
    
    console.log('Dealerships by Agency:');
    console.log('======================');
    Object.entries(dealershipsByAgency).forEach(([agency, dealerships]) => {
      console.log(`\n${agency}: ${dealerships.length} dealerships`);
      dealerships.forEach(d => {
        console.log(`  - ${d.name} (ID: ${d.id.slice(-8)})`);
      });
    });
    
    // Check for duplicates
    console.log('\n\nChecking for Duplicate Dealerships:');
    console.log('===================================');
    
    const nameGroups = {};
    allDealerships.forEach(d => {
      const normalizedName = d.name.toLowerCase().trim();
      if (!nameGroups[normalizedName]) {
        nameGroups[normalizedName] = [];
      }
      nameGroups[normalizedName].push(d);
    });
    
    const duplicates = Object.entries(nameGroups).filter(([_, dealerships]) => dealerships.length > 1);
    
    if (duplicates.length > 0) {
      console.log(`Found ${duplicates.length} duplicate dealership names:`);
      duplicates.forEach(([name, dealerships]) => {
        console.log(`\n"${dealerships[0].name}" appears ${dealerships.length} times:`);
        dealerships.forEach(d => {
          console.log(`  - ID: ${d.id}, Agency: ${d.agencies?.name || d.agencyId}`);
        });
      });
    } else {
      console.log('No duplicate dealership names found.');
    }
    
    // Expected Jay Hatfield dealerships
    const expectedDealerships = [
      "Jay Hatfield Chevrolet of Columbus",
      "Jay hatfield Chevrolet GMC of Chanute",
      "Jay Hatfield Chevrolet GMC of Pittsburg",
      "Jay Hatfield Chevrolet of Vinita",
      "Jay Hatfield CDJR of Frontenac",
      "Sarcoxie Ford",
      "Jay Hatfield Honda Powerhouse",
      "Jay Hatfield Motorsports of Wichita",
      "Jay Hatfield Motorsports of Frontenac",
      "Jay Hatfield Motorsports of Joplin",
      "Acura of Columbus",
      "Genesis of Wichita",
      "Jay Hatfield Motorsports Portal",
      "Jay Hatfield Motorsports Ottawa",
      "Hatchett Hyundai East",
      "Hatchett Hyundai West",
      "Premier Mitsubishi",
      "Premier Auto Center - Tucson",
      "World Kia",
      "AEO Powersports",
      "Columbus Auto Group",
      "Winnebago of Rockford"
    ];
    
    // Check which expected dealerships are missing from Jay Hatfield agency
    console.log('\n\nJay Hatfield Dealership Status:');
    console.log('===============================');
    
    if (jayHatfieldAgency) {
      const jayHatfieldDealerships = allDealerships.filter(d => d.agencyId === jayHatfieldAgency.id);
      console.log(`Found ${jayHatfieldDealerships.length} dealerships under Jay Hatfield agency`);
      
      const foundNames = jayHatfieldDealerships.map(d => d.name);
      const missing = expectedDealerships.filter(name => !foundNames.includes(name));
      
      if (missing.length > 0) {
        console.log(`\nMissing ${missing.length} expected dealerships:`);
        missing.forEach(name => console.log(`  - ${name}`));
      }
      
      // Check if any of the missing ones exist under different agencies
      console.log('\nChecking if missing dealerships exist under other agencies:');
      missing.forEach(name => {
        const found = allDealerships.find(d => d.name === name);
        if (found) {
          console.log(`  - "${name}" exists under agency: ${found.agencies?.name || found.agencyId}`);
        }
      });
    }
    
    return {
      totalDealerships: allDealerships.length,
      jayHatfieldCount: jayHatfieldAgency ? allDealerships.filter(d => d.agencyId === jayHatfieldAgency.id).length : 0,
      duplicateCount: duplicates.length
    };
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the diagnosis
diagnoseDealershipIssue()
  .then(result => {
    console.log('\n✅ Diagnosis completed');
    console.log('Summary:', result);
  })
  .catch(error => {
    console.error('Diagnosis failed:', error);
    process.exit(1);
  });
