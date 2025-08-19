
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
