-- First, find your agency ID by running this query:
-- SELECT id, name FROM "Agency";
-- Then replace 'YOUR_AGENCY_ID' in the script below with the actual agency ID

-- Create all dealerships
INSERT INTO "Dealership" (id, name, website, "agencyId", settings, "createdAt", "updatedAt")
VALUES 
  (gen_random_uuid(), 'Jay Hatfield Chevrolet of Columbus', 'https://www.jayhatfieldchevy.net/', 'YOUR_AGENCY_ID', '{}', NOW(), NOW()),
  (gen_random_uuid(), 'Jay Hatfield Chevrolet GMC of Chanute', 'https://www.jayhatfieldchanute.com/', 'YOUR_AGENCY_ID', '{}', NOW(), NOW()),
  (gen_random_uuid(), 'Jay Hatfield Chevrolet GMC of Pittsburg', 'https://www.jayhatfieldchevroletgmc.com/', 'YOUR_AGENCY_ID', '{}', NOW(), NOW()),
  (gen_random_uuid(), 'Jay Hatfield Chevrolet of Vinita', 'https://www.jayhatfieldchevroletvinita.com/', 'YOUR_AGENCY_ID', '{}', NOW(), NOW()),
  (gen_random_uuid(), 'Jay Hatfield CDJR of Frontenac', 'https://www.jayhatfieldchryslerdodgejeepram.com/', 'YOUR_AGENCY_ID', '{}', NOW(), NOW()),
  (gen_random_uuid(), 'Sarcoxie Ford', 'https://www.sarcoxieford.com', 'YOUR_AGENCY_ID', '{}', NOW(), NOW()),
  (gen_random_uuid(), 'Jay Hatfield Honda Powerhouse', 'https://www.jayhatfieldhondawichita.com/', 'YOUR_AGENCY_ID', '{}', NOW(), NOW()),
  (gen_random_uuid(), 'Jay Hatfield Motorsports of Wichita', 'https://www.kansasmotorsports.com/', 'YOUR_AGENCY_ID', '{}', NOW(), NOW()),
  (gen_random_uuid(), 'Jay Hatfield Motorsports of Frontenac', 'https://www.jayhatfieldkawasaki.com/', 'YOUR_AGENCY_ID', '{}', NOW(), NOW()),
  (gen_random_uuid(), 'Jay Hatfield Motorsports of Joplin', 'https://www.jhmofjoplin.com/', 'YOUR_AGENCY_ID', '{}', NOW(), NOW()),
  (gen_random_uuid(), 'Acura of Columbus', 'https://www.acuracolumbus.com/', 'YOUR_AGENCY_ID', '{}', NOW(), NOW()),
  (gen_random_uuid(), 'Genesis of Wichita', 'https://www.genesisofwichita.com/', 'YOUR_AGENCY_ID', '{}', NOW(), NOW()),
  (gen_random_uuid(), 'Jay Hatfield Motorsports Portal', 'http://jayhatfieldmotorsports.com/', 'YOUR_AGENCY_ID', '{}', NOW(), NOW()),
  (gen_random_uuid(), 'Jay Hatfield Motorsports Ottawa', 'https://www.jayhatfieldottawa.com/', 'YOUR_AGENCY_ID', '{}', NOW(), NOW()),
  (gen_random_uuid(), 'Hatchett Hyundai East', 'https://www.hatchetthyundaieast.com/', 'YOUR_AGENCY_ID', '{}', NOW(), NOW()),
  (gen_random_uuid(), 'Hatchett Hyundai West', 'https://www.hatchetthyundaiwest.com/', 'YOUR_AGENCY_ID', '{}', NOW(), NOW()),
  (gen_random_uuid(), 'Premier Mitsubishi', 'https://premiermitsubishi.com/', 'YOUR_AGENCY_ID', '{}', NOW(), NOW()),
  (gen_random_uuid(), 'Premier Auto Center - Tucson', 'https://scottsaysyes.com/', 'YOUR_AGENCY_ID', '{}', NOW(), NOW()),
  (gen_random_uuid(), 'World Kia', 'https://www.worldkiajoliet.com/', 'YOUR_AGENCY_ID', '{}', NOW(), NOW()),
  (gen_random_uuid(), 'AEO Powersports', 'https://aeopowersports.com/', 'YOUR_AGENCY_ID', '{}', NOW(), NOW()),
  (gen_random_uuid(), 'Columbus Auto Group', 'https://columbusautogroup.com/', 'YOUR_AGENCY_ID', '{}', NOW(), NOW()),
  (gen_random_uuid(), 'Winnebago of Rockford', 'https://www.winnebagomotorhomes.com/', 'YOUR_AGENCY_ID', '{}', NOW(), NOW());

-- Now create GA4 connections for dealerships that have property IDs
-- This creates the connection records but doesn't authenticate them yet
INSERT INTO "GA4Connection" (id, "dealershipId", "propertyId", "propertyName", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  d.id,
  CASE d.name
    WHEN 'Jay Hatfield Chevrolet of Columbus' THEN '323480238'
    WHEN 'Jay Hatfield Chevrolet GMC of Chanute' THEN '323404832'
    WHEN 'Jay Hatfield Chevrolet GMC of Pittsburg' THEN '371672738'
    WHEN 'Jay Hatfield Chevrolet of Vinita' THEN '320759942'
    WHEN 'Jay Hatfield CDJR of Frontenac' THEN '323415736'
    WHEN 'Sarcoxie Ford' THEN '452793966'
    WHEN 'Jay Hatfield Honda Powerhouse' THEN '336729443'
    WHEN 'Jay Hatfield Motorsports of Wichita' THEN '317592148'
    WHEN 'Jay Hatfield Motorsports of Frontenac' THEN '317608467'
    WHEN 'Jay Hatfield Motorsports of Joplin' THEN '317578343'
    WHEN 'Acura of Columbus' THEN '284944578'
    WHEN 'Genesis of Wichita' THEN '323502411'
    WHEN 'Jay Hatfield Motorsports Portal' THEN '461644624'
    WHEN 'Jay Hatfield Motorsports Ottawa' THEN '472110523'
    WHEN 'Hatchett Hyundai East' THEN '323448557'
    WHEN 'Hatchett Hyundai West' THEN '323465145'
    WHEN 'Premier Mitsubishi' THEN '473660351'
    WHEN 'Premier Auto Center - Tucson' THEN '470694371'
  END,
  d.name || ' - GA4',
  NOW(),
  NOW()
FROM "Dealership" d
WHERE d."agencyId" = 'YOUR_AGENCY_ID'
  AND d.name IN (
    'Jay Hatfield Chevrolet of Columbus',
    'Jay Hatfield Chevrolet GMC of Chanute',
    'Jay Hatfield Chevrolet GMC of Pittsburg',
    'Jay Hatfield Chevrolet of Vinita',
    'Jay Hatfield CDJR of Frontenac',
    'Sarcoxie Ford',
    'Jay Hatfield Honda Powerhouse',
    'Jay Hatfield Motorsports of Wichita',
    'Jay Hatfield Motorsports of Frontenac',
    'Jay Hatfield Motorsports of Joplin',
    'Acura of Columbus',
    'Genesis of Wichita',
    'Jay Hatfield Motorsports Portal',
    'Jay Hatfield Motorsports Ottawa',
    'Hatchett Hyundai East',
    'Hatchett Hyundai West',
    'Premier Mitsubishi',
    'Premier Auto Center - Tucson'
  );

-- Create Search Console connections for all dealerships
INSERT INTO "SearchConsoleConnection" (id, "dealershipId", "siteUrl", "siteName", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  d.id,
  d.website,
  d.name || ' - Search Console',
  NOW(),
  NOW()
FROM "Dealership" d
WHERE d."agencyId" = 'YOUR_AGENCY_ID'
  AND d.name IN (
    'Jay Hatfield Chevrolet of Columbus',
    'Jay Hatfield Chevrolet GMC of Chanute',
    'Jay Hatfield Chevrolet GMC of Pittsburg',
    'Jay Hatfield Chevrolet of Vinita',
    'Jay Hatfield CDJR of Frontenac',
    'Sarcoxie Ford',
    'Jay Hatfield Honda Powerhouse',
    'Jay Hatfield Motorsports of Wichita',
    'Jay Hatfield Motorsports of Frontenac',
    'Jay Hatfield Motorsports of Joplin',
    'Acura of Columbus',
    'Genesis of Wichita',
    'Jay Hatfield Motorsports Portal',
    'Jay Hatfield Motorsports Ottawa',
    'Hatchett Hyundai East',
    'Hatchett Hyundai West',
    'Premier Mitsubishi',
    'Premier Auto Center - Tucson',
    'World Kia',
    'AEO Powersports',
    'Columbus Auto Group',
    'Winnebago of Rockford'
  );

-- After running this script, query to get all dealership IDs for SEOWorks:
-- SELECT id, name FROM "Dealership" WHERE "agencyId" = 'YOUR_AGENCY_ID' ORDER BY name;