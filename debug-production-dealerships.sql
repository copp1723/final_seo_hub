-- Debug queries for AGENCY production dealership filtering issues
-- Run these against your production database to diagnose issues
-- Focus on agency-dealership relationships and GA4 property mappings

-- 1. Check YOUR agency and all associated dealerships
SELECT
  a.id as agency_id,
  a.name as agency_name,
  COUNT(d.id) as dealership_count,
  COUNT(u.id) as user_count
FROM "Agency" a
LEFT JOIN "Dealership" d ON d."agencyId" = a.id
LEFT JOIN "User" u ON u."agencyId" = a.id
WHERE a.name ILIKE '%your_agency_name%' OR u.email = 'josh.copp@onekeel.ai'
GROUP BY a.id, a.name;

-- 2. Check all dealerships under your agency with GA4 mappings
SELECT
  d.id as dealership_id,
  d.name as dealership_name,
  d.website,
  d."ga4PropertyId",
  d."ga4MeasurementId",
  d."searchConsoleUrl",
  CASE WHEN d."ga4PropertyId" IS NOT NULL THEN 'YES' ELSE 'NO' END as has_ga4_mapping,
  COUNT(u.id) as assigned_users
FROM "Dealership" d
LEFT JOIN "User" u ON u."dealershipId" = d.id
WHERE d."agencyId" IN (
  SELECT a.id FROM "Agency" a
  LEFT JOIN "User" u ON u."agencyId" = a.id
  WHERE u.email = 'josh.copp@onekeel.ai'
)
GROUP BY d.id, d.name, d.website, d."ga4PropertyId", d."ga4MeasurementId", d."searchConsoleUrl"
ORDER BY d.name;

-- 3. Check YOUR user account and dealership associations
SELECT
  u.id as user_id,
  u.email,
  u.name,
  u.role,
  u."dealershipId",
  u."agencyId",
  d.name as current_dealership_name,
  a.name as agency_name,
  CASE WHEN u."dealershipId" IS NOT NULL THEN 'YES' ELSE 'NO' END as has_dealership_assigned
FROM "User" u
LEFT JOIN "Dealership" d ON d.id = u."dealershipId"
LEFT JOIN "Agency" a ON a.id = u."agencyId"
WHERE u.email = 'josh.copp@onekeel.ai' OR u.id = '3e50bcc8-cd3e-4773-a790-e0570de37371';

-- 4. Check GA4 connections for your dealerships
SELECT
  d.id as dealership_id,
  d.name as dealership_name,
  d."ga4PropertyId" as mapped_property_id,
  d."ga4MeasurementId" as measurement_id,
  COUNT(g.id) as ga4_connection_records,
  MAX(g."updatedAt") as last_ga4_update
FROM "Dealership" d
LEFT JOIN "ga4_connections" g ON g."dealershipId" = d.id
WHERE d."agencyId" IN (
  SELECT a.id FROM "Agency" a
  LEFT JOIN "User" u ON u."agencyId" = a.id
  WHERE u.email = 'josh.copp@onekeel.ai'
)
GROUP BY d.id, d.name, d."ga4PropertyId", d."ga4MeasurementId"
ORDER BY d.name;

-- 5. Check Search Console connections for your dealerships
SELECT
  d.id as dealership_id,
  d.name as dealership_name,
  d."searchConsoleUrl" as mapped_site_url,
  COUNT(sc.id) as search_console_connections,
  MAX(sc."updatedAt") as last_sc_update
FROM "Dealership" d
LEFT JOIN "search_console_connections" sc ON sc."dealershipId" = d.id
WHERE d."agencyId" IN (
  SELECT a.id FROM "Agency" a
  LEFT JOIN "User" u ON u."agencyId" = a.id
  WHERE u.email = 'josh.copp@onekeel.ai'
)
GROUP BY d.id, d.name, d."searchConsoleUrl"
ORDER BY d.name;

-- 6. Check recent SEO requests by dealership (to verify data filtering is working)
SELECT
  d.name as dealership_name,
  COUNT(r.id) as total_requests,
  COUNT(CASE WHEN r.status = 'PENDING' THEN 1 END) as pending_requests,
  COUNT(CASE WHEN r.status = 'COMPLETED' THEN 1 END) as completed_requests,
  MAX(r."createdAt") as latest_request_date
FROM "Dealership" d
LEFT JOIN "Request" r ON r."dealershipId" = d.id
WHERE d."agencyId" IN (
  SELECT a.id FROM "Agency" a
  LEFT JOIN "User" u ON u."agencyId" = a.id
  WHERE u.email = 'josh.copp@onekeel.ai'
)
GROUP BY d.id, d.name
ORDER BY total_requests DESC;

-- 7. CRITICAL: Check if dealership switching is working in the database
-- This shows what dealership your user account is currently set to
SELECT
  'Current user dealership setting:' as info,
  u.email,
  u."dealershipId" as current_dealership_id,
  d.name as current_dealership_name,
  u."updatedAt" as last_user_update
FROM "User" u
LEFT JOIN "Dealership" d ON d.id = u."dealershipId"
WHERE u.email = 'josh.copp@onekeel.ai';
