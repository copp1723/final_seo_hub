#!/usr/bin/env node

// Final diagnostic using correct database URL
const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://rylie_user:ebXTHowfZmW7tv5PRAxoIyEJXvw27qKS@dpg-d1bmcqmuk2gs739tht80-a.oregon-postgres.render.com:5432/rylie_seo_hub'
});

async function runFinalDiagnosis() {
  console.log('🔍 Final dealership diagnostics...\n');

  try {
    await client.connect();
    console.log('✅ Connected to database');
    
    // Get counts
    const counts = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM dealerships) as dealership_count,
        (SELECT COUNT(*) FROM agencies) as agency_count,
        (SELECT COUNT(*) FROM users) as user_count
    `);
    
    const { dealership_count, agency_count, user_count } = counts.rows[0];
    
    console.log('📊 Database Overview:');
    console.log(`- Dealerships: ${dealership_count}`);
    console.log(`- Agencies: ${agency_count}`);
    console.log(`- Users: ${user_count}`);
    
    // Check for issues
    const issues = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE agencyId IS NULL AND role != 'SUPER_ADMIN') as users_without_agency,
        (SELECT COUNT(*) FROM dealerships WHERE agencyId IS NULL) as dealerships_without_agency
    `);
    
    const { users_without_agency, dealerships_without_agency } = issues.rows[0];
    
    console.log('\n⚠️  Issues Found:');
    console.log(`- Users without agency: ${users_without_agency}`);
    console.log(`- Dealerships without agency: ${dealerships_without_agency}`);
    
    // Get sample data
    const dealerships = await client.query(`
      SELECT d.name, d.id, a.name as agency_name, d.agencyId
      FROM dealerships d
      LEFT JOIN agencies a ON d.agencyId = a.id
      ORDER BY d.createdAt DESC
      LIMIT 5
    `);
    
    console.log('\n🏢 Dealerships:');
    dealerships.rows.forEach(d => {
      console.log(`- ${d.name} (${d.agency_name || 'No Agency'})`);
    });
    
    const users = await client.query(`
      SELECT email, role, agencyId, dealershipId
      FROM users
      ORDER BY createdAt DESC
      LIMIT 5
    `);
    
    console.log('\n👥 Users:');
    users.rows.forEach(u => {
      console.log(`- ${u.email} (${u.role}) - Agency: ${u.agencyid || 'None'}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

runFinalDiagnosis();