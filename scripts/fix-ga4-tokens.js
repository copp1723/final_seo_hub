const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateGA4Tokens() {
  try {
    console.log('🔧 MIGRATING GA4 TOKENS');
    console.log('=======================\n');
    
    // Get all GA4 connections
    const ga4Connections = await prisma.ga4_connections.findMany({
      where: {
        accessToken: { not: null }
      }
    });
    
    console.log(`Found ${ga4Connections.length} GA4 connections to migrate`);
    
    let migrated = 0;
    let failed = 0;
    let skipped = 0;
    
    for (const connection of ga4Connections) {
      try {
        // Skip placeholder tokens
        if (connection.accessToken === 'placeholder-access-token' || 
            connection.refreshToken === 'placeholder-refresh-token') {
          console.log(`⚠️  Skipping placeholder tokens for user ${connection.userId}`);
          skipped++;
          continue;
        }
        
        // Check if user already has tokens in user_ga4_tokens
        const existingToken = await prisma.user_ga4_tokens.findUnique({
          where: { userId: connection.userId }
        });
        
        if (existingToken) {
          console.log(`✅ User ${connection.userId} already has tokens in user_ga4_tokens, updating...`);
          
          // Update existing token with connection data
          await prisma.user_ga4_tokens.update({
            where: { userId: connection.userId },
            data: {
              encryptedAccessToken: connection.accessToken,
              encryptedRefreshToken: connection.refreshToken,
              expiryDate: connection.expiresAt,
              scope: 'https://www.googleapis.com/auth/analytics.readonly',
              tokenType: 'Bearer',
              updatedAt: new Date()
            }
          });
          
          migrated++;
          continue;
        }
        
        // Create new token entry
        await prisma.user_ga4_tokens.create({
          data: {
            userId: connection.userId,
            encryptedAccessToken: connection.accessToken,
            encryptedRefreshToken: connection.refreshToken,
            expiryDate: connection.expiresAt,
            scope: 'https://www.googleapis.com/auth/analytics.readonly',
            tokenType: 'Bearer'
          }
        });
        
        console.log(`✓ Migrated tokens for user ${connection.userId}`);
        migrated++;
        
      } catch (error) {
        console.error(`✗ Failed to migrate tokens for user ${connection.userId}:`, error.message);
        failed++;
      }
    }
    
    console.log('\n=== Migration Summary ===');
    console.log(`Total connections found: ${ga4Connections.length}`);
    console.log(`Successfully migrated: ${migrated}`);
    console.log(`Failed: ${failed}`);
    console.log(`Skipped (placeholders): ${skipped}`);
    
    if (migrated > 0) {
      console.log('\n✅ Migration completed! GA4Service should now find tokens.');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateGA4Tokens(); 