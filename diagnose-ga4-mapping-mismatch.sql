-- CRITICAL: Diagnose GA4 Property Mapping Mismatch
-- This compares your production database dealership IDs with the hardcoded mappings

-- 1. Show all dealerships in production database
SELECT 
  'PRODUCTION DATABASE DEALERSHIPS:' as section,
  d.id as production_dealership_id,
  d.name as dealership_name,
  d."ga4PropertyId" as db_property_id,
  d.website
FROM "Dealership" d
WHERE d."agencyId" IN (
  SELECT a.id FROM "Agency" a 
  LEFT JOIN "User" u ON u."agencyId" = a.id 
  WHERE u.email = 'josh.copp@onekeel.ai'
)
ORDER BY d.name;

-- 2. Show hardcoded mappings that should exist
SELECT 
  'HARDCODED MAPPINGS (from dealership-property-mapping.ts):' as section,
  mapping_id,
  mapping_name,
  ga4_property_id,
  has_access
FROM (VALUES
  ('dealer-jhc-columbus', 'Jay Hatfield Chevrolet of Columbus', '323480238', true),
  ('dealer-jhc-chanute', 'Jay hatfield Chevrolet GMC of Chanute', '323404832', true),
  ('dealer-jhc-pittsburg', 'Jay Hatfield Chevrolet GMC of Pittsburg', '371672738', true),
  ('dealer-jhc-vinita', 'Jay Hatfield Chevrolet of Vinita', '320759942', true),
  ('dealer-jhdjr-frontenac', 'Jay Hatfield CDJR of Frontenac', '323415736', true),
  ('dealer-sarcoxie-ford', 'Sarcoxie Ford', '452793966', true),
  ('dealer-jhhp-wichita', 'Jay Hatfield Honda Powerhouse', '336729443', true),
  ('dealer-jhm-wichita', 'Jay Hatfield Motorsports of Wichita', '317592148', true),
  ('dealer-jhm-frontenac', 'Jay Hatfield Motorsports of Frontenac', '317608467', true),
  ('dealer-jhm-joplin', 'Jay Hatfield Motorsports of Joplin', '317578343', true),
  ('dealer-acura-columbus', 'Acura of Columbus', '284944578', true),
  ('dealer-genesis-wichita', 'Genesis of Wichita', '323502411', true),
  ('dealer-jhm-portal', 'Jay Hatfield Motorsports Portal', '461644624', true),
  ('dealer-jhm-ottawa', 'Jay Hatfield Motorsports Ottawa', '472110523', true),
  ('dealer-hatchett-hyundai-east', 'Hatchett Hyundai East', '323448557', true),
  ('dealer-hatchett-hyundai-west', 'Hatchett Hyundai West', '323465145', true),
  ('dealer-premier-mitsubishi', 'Premier Mitsubishi', '473660351', true),
  ('dealer-premier-auto-tucson', 'Premier Auto Center - Tucson', '470694371', true),
  ('dealer-world-kia', 'World Kia', NULL, false),
  ('dealer-aeo-powersports', 'AEO Powersports', NULL, false),
  ('dealer-columbus-auto-group', 'Columbus Auto Group', NULL, false),
  ('dealer-winnebago-rockford', 'Winnebago of Rockford', NULL, false)
) AS mappings(mapping_id, mapping_name, ga4_property_id, has_access)
ORDER BY mapping_name;

-- 3. CRITICAL: Find mismatches between database and hardcoded mappings
SELECT 
  'MISMATCHES - THESE ARE THE PROBLEM:' as section,
  COALESCE(d.id, m.mapping_id) as dealership_identifier,
  COALESCE(d.name, m.mapping_name) as dealership_name,
  d.id as database_id,
  m.mapping_id as hardcoded_mapping_id,
  d."ga4PropertyId" as database_property_id,
  m.ga4_property_id as hardcoded_property_id,
  CASE 
    WHEN d.id IS NULL THEN '❌ MISSING IN DATABASE'
    WHEN m.mapping_id IS NULL THEN '⚠️ NOT IN HARDCODED MAPPINGS'
    WHEN d.id != m.mapping_id THEN '🔥 ID MISMATCH - THIS BREAKS FILTERING'
    WHEN d."ga4PropertyId" != m.ga4_property_id THEN '⚠️ PROPERTY ID MISMATCH'
    ELSE '✅ MATCH'
  END as status
FROM "Dealership" d
FULL OUTER JOIN (VALUES
  ('dealer-jhc-columbus', 'Jay Hatfield Chevrolet of Columbus', '323480238'),
  ('dealer-jhc-chanute', 'Jay hatfield Chevrolet GMC of Chanute', '323404832'),
  ('dealer-jhc-pittsburg', 'Jay Hatfield Chevrolet GMC of Pittsburg', '371672738'),
  ('dealer-jhc-vinita', 'Jay Hatfield Chevrolet of Vinita', '320759942'),
  ('dealer-jhdjr-frontenac', 'Jay Hatfield CDJR of Frontenac', '323415736'),
  ('dealer-sarcoxie-ford', 'Sarcoxie Ford', '452793966'),
  ('dealer-jhhp-wichita', 'Jay Hatfield Honda Powerhouse', '336729443'),
  ('dealer-jhm-wichita', 'Jay Hatfield Motorsports of Wichita', '317592148'),
  ('dealer-jhm-frontenac', 'Jay Hatfield Motorsports of Frontenac', '317608467'),
  ('dealer-jhm-joplin', 'Jay Hatfield Motorsports of Joplin', '317578343'),
  ('dealer-acura-columbus', 'Acura of Columbus', '284944578'),
  ('dealer-genesis-wichita', 'Genesis of Wichita', '323502411'),
  ('dealer-jhm-portal', 'Jay Hatfield Motorsports Portal', '461644624'),
  ('dealer-jhm-ottawa', 'Jay Hatfield Motorsports Ottawa', '472110523'),
  ('dealer-hatchett-hyundai-east', 'Hatchett Hyundai East', '323448557'),
  ('dealer-hatchett-hyundai-west', 'Hatchett Hyundai West', '323465145'),
  ('dealer-premier-mitsubishi', 'Premier Mitsubishi', '473660351'),
  ('dealer-premier-auto-tucson', 'Premier Auto Center - Tucson', '470694371')
) AS m(mapping_id, mapping_name, ga4_property_id) ON d.id = m.mapping_id
WHERE d."agencyId" IN (
  SELECT a.id FROM "Agency" a 
  LEFT JOIN "User" u ON u."agencyId" = a.id 
  WHERE u.email = 'josh.copp@onekeel.ai'
) OR m.mapping_id IS NOT NULL
ORDER BY 
  CASE 
    WHEN d.id IS NULL THEN 1
    WHEN m.mapping_id IS NULL THEN 2
    WHEN d.id != m.mapping_id THEN 3
    ELSE 4
  END,
  COALESCE(d.name, m.mapping_name);
