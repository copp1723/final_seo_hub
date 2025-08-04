#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const { GA4Service } = require('./lib/google/ga4Service');

const prisma = new PrismaClient();

async function testGA4Connection() {
  try {
    console.log('🧪 Testing GA4 Connection');
    console.log('========================\n');

    // Find the working connection
    const workingConnection = await prisma.ga4_connections.findFirst({
      where: {
        userId: 'cmdsymufh0001nm2ionch4qdn', // josh.copp@onekeel.ai with valid tokens
        accessToken: { not: null }
      },
      include: {
        users: { select: { email: true } }
      }
    });

    if (!workingConnection) {
      console.log('❌ No working GA4 connection found');
      return;
    }

    console.log(`✅ Found working connection for ${workingConnection.users.email}`);
    console.log(`   Property: ${workingConnection.propertyName} (${workingConnection.propertyId})`);
    console.log(`   Expires: ${workingConnection.expiresAt}`);

    // Test the GA4 service
    const ga4Service = new GA4Service(workingConnection.userId);
    
    console.log('\n🔄 Initializing GA4 service...');
    await ga4Service.initialize();
    
    console.log('✅ GA4 service initialized successfully');

    // Test fetching data
    console.log('\n📊 Fetching GA4 data...');
    const report = await ga4Service.runReport({
      propertyId: workingConnection.propertyId,
      metrics: ['sessions', 'totalUsers', 'eventCount'],
      startDate: '30daysAgo',
      endDate: 'today',
      limit: 1
    });

    if (report && report.rows && report.rows.length > 0) {
      const row = report.rows[0];
      console.log('✅ GA4 data fetched successfully:');
      console.log(`   Sessions: ${row.metricValues[0]?.value || 0}`);
      console.log(`   Users: ${row.metricValues[1]?.value || 0}`);
      console.log(`   Events: ${row.metricValues[2]?.value || 0}`);
    } else {
      console.log('⚠️  No data returned from GA4 API');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testGA4Connection();