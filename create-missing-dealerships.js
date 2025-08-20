#!/usr/bin/env node

/**
 * Create Missing Dealerships: Winnebago Motor Homes & Brown Motors
 * Provides unique client IDs for SEOWorks integration
 */

const { PrismaClient } = require('@prisma/client');

async function createMissingDealerships() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🏢 CREATING MISSING DEALERSHIPS FOR SEOWORKS');
    console.log('===============================================');
    
    // First, check if SEOWorks agency exists
    const seoworksAgency = await prisma.agencies.findFirst({
      where: { slug: 'seoworks' }
    });
    
    if (!seoworksAgency) {
      console.log('❌ SEOWorks agency not found. Cannot create dealerships.');
      return;
    }
    
    console.log(`✅ Found SEOWorks agency: ${seoworksAgency.id}`);
    
    // Dealerships to create
    const dealershipsToCreate = [
      {
        id: 'dealer-winnebago-rockford',
        name: 'Winnebago of Rockford', 
        clientId: 'dealer-winnebago-rockford',
        website: 'https://www.winnebagomotorhomes.com/',
        clientEmail: 'manager@winnebagomotorhomes.com',
        userName: 'Winnebago Rockford Manager'
      },
      {
        id: 'dealer-brown-motors',
        name: 'Brown Motors',
        clientId: 'dealer-brown-motors', 
        website: 'https://www.brownmotors.com/',
        clientEmail: 'manager@brownmotors.com',
        userName: 'Brown Motors Manager'
      }
    ];
    
    console.log(`\n📋 Creating ${dealershipsToCreate.length} dealerships...\n`);
    
    for (const dealership of dealershipsToCreate) {
      // Check if dealership already exists
      const existing = await prisma.dealerships.findUnique({
        where: { id: dealership.id }
      });
      
      if (existing) {
        console.log(`⏭️  ${dealership.name} already exists - skipping`);
        continue;
      }
      
      // Create dealership
      console.log(`🏢 Creating: ${dealership.name}`);
      console.log(`   ID: ${dealership.id}`);
      console.log(`   Client ID: ${dealership.clientId}`);
      console.log(`   Website: ${dealership.website}`);
      
      const newDealership = await prisma.dealerships.create({
        data: {
          id: dealership.id,
          name: dealership.name,
          agencyId: seoworksAgency.id,
          website: dealership.website,
          clientId: dealership.clientId,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      console.log(`   ✅ Dealership created successfully`);
      
      // Create user for this dealership
      console.log(`👤 Creating user: ${dealership.userName}`);
      
      const newUser = await prisma.users.create({
        data: {
          id: `user-${dealership.id.replace('dealer-', '')}`,
          email: dealership.clientEmail,
          name: dealership.userName,
          role: 'DEALERSHIP_ADMIN',
          agencyId: seoworksAgency.id,
          dealershipId: dealership.id,
          emailVerified: new Date(),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      console.log(`   ✅ User created: ${newUser.email}`);
      console.log('');
    }
    
    console.log('🎉 DEALERSHIP CREATION COMPLETE!');
    console.log('================================');
    console.log('');
    
    // Show the client IDs for SEOWorks team
    console.log('📋 CLIENT IDs FOR SEOWORKS TEAM:');
    console.log('================================');
    
    for (const dealership of dealershipsToCreate) {
      console.log(`"${dealership.clientId}" → ${dealership.name}`);
      console.log(`   🌐 ${dealership.website}`);
      console.log(`   📧 ${dealership.clientEmail}`);
      console.log('');
    }
    
    console.log('✅ Both dealerships are now ready for webhook integration!');
    
  } catch (error) {
    console.error('❌ Error creating dealerships:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createMissingDealerships();