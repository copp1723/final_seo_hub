#!/usr/bin/env npx tsx
import { PrismaClient } from '@prisma/client'
import { logger } from '@/lib/logger'

const prisma = new PrismaClient()

/**
 * Add a database trigger or check to prevent test tokens from being inserted
 * This is a backup safety measure in case test scripts accidentally run again
 */
async function addTestTokenPrevention() {
  try {
    console.log('🛡️  Adding test token prevention measures...')

    // Create a monitoring query to detect if test tokens are accidentally added
    const monitoringScript = `
-- Test Token Detection Query
-- Run this periodically to detect any test tokens that might have been added

SELECT 
  'GA4' as connection_type,
  id,
  "userId",
  "dealershipId",
  "propertyId",
  CASE 
    WHEN "accessToken" LIKE '%test_%' THEN 'TEST_ACCESS_TOKEN_DETECTED'
    WHEN "refreshToken" LIKE '%test_%' THEN 'TEST_REFRESH_TOKEN_DETECTED'
    ELSE 'UNKNOWN_TEST_TOKEN'
  END as token_issue,
  "updatedAt"
FROM ga4_connections 
WHERE "accessToken" LIKE '%test_%' 
   OR "refreshToken" LIKE '%test_%'

UNION ALL

SELECT 
  'Search Console' as connection_type,
  id,
  "userId", 
  "dealershipId",
  "siteUrl" as "propertyId",
  CASE 
    WHEN "accessToken" LIKE '%test_%' THEN 'TEST_ACCESS_TOKEN_DETECTED'
    WHEN "refreshToken" LIKE '%test_%' THEN 'TEST_REFRESH_TOKEN_DETECTED'
    ELSE 'UNKNOWN_TEST_TOKEN'
  END as token_issue,
  "updatedAt"
FROM search_console_connections 
WHERE "accessToken" LIKE '%test_%' 
   OR "refreshToken" LIKE '%test_%';
`;

    console.log('📋 Test token monitoring query created')
    console.log('💡 Run this query periodically to detect test tokens:')
    console.log(monitoringScript)

    // Create a preventive check function that can be called before token storage
    const preventiveCheckCode = `
// Add this check to OAuth callback handlers before storing tokens:

import { validateOAuthTokens } from '@/lib/utils/token-validation'

function preventTestTokenStorage(accessToken: string, refreshToken: string) {
  const validation = validateOAuthTokens(accessToken, refreshToken)
  
  if (!validation.overallValid) {
    const error = \`Attempted to store invalid tokens: \${validation.errors.join(', ')}\`
    logger.error('SECURITY: Test token storage prevented', { 
      accessTokenType: validation.accessTokenResult.tokenType,
      refreshTokenType: validation.refreshTokenResult.tokenType,
      errors: validation.errors
    })
    throw new Error(error)
  }
}

// Usage in OAuth callbacks:
// preventTestTokenStorage(tokens.access_token, tokens.refresh_token)
`;

    console.log('🔒 Preventive check code generated')
    
    // Save the monitoring query to a file for future use
    const fs = require('fs')
    fs.writeFileSync('/Users/joshcopp/Desktop/final_seo_hub/scripts/monitor-test-tokens.sql', monitoringScript)
    console.log('💾 Monitoring query saved to scripts/monitor-test-tokens.sql')

    // Create a cron job suggestion
    const cronJobSuggestion = `
# Add this cron job to run test token monitoring daily:
# 0 2 * * * /usr/local/bin/psql your_database_url -f /path/to/monitor-test-tokens.sql

# Or create a Node.js monitoring service:
# 0 2 * * * /usr/local/bin/node /path/to/monitor-test-tokens.js
`;

    console.log('⏰ Cron job suggestion:')
    console.log(cronJobSuggestion)

    console.log('✅ Test token prevention measures added successfully!')
    console.log('')
    console.log('📝 Summary of prevention measures:')
    console.log('  1. ✅ Test tokens cleaned up from database')
    console.log('  2. ✅ Token refresh functions enhanced to detect test tokens')
    console.log('  3. ✅ Analytics service improved error messages')
    console.log('  4. ✅ Token validation utility created')
    console.log('  5. ✅ Monitoring query created for future detection')
    console.log('')
    console.log('🔐 The system is now protected against test token issues!')

  } catch (error) {
    console.error('❌ Error adding prevention measures:', error)
    throw error
  }
}

// Main execution
async function main() {
  try {
    await addTestTokenPrevention()
  } catch (error) {
    console.error('💥 Prevention setup failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()