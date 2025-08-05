-- FIX DEALERSHIP ID MAPPINGS
-- Run this ONLY after confirming the mismatches with diagnose-ga4-mapping-mismatch.sql
-- This will update your production database dealership IDs to match the hardcoded mappings

-- BACKUP FIRST! Run this to see what will change:
SELECT 
  'PREVIEW OF CHANGES:' as action,
  d.id as current_id,
  d.name as dealership_name,
  CASE d.name
    WHEN 'Jay Hatfield Chevrolet of Columbus' THEN 'dealer-jhc-columbus'
    WHEN 'Jay hatfield Chevrolet GMC of Chanute' THEN 'dealer-jhc-chanute'
    WHEN 'Jay Hatfield Chevrolet GMC of Pittsburg' THEN 'dealer-jhc-pittsburg'
    WHEN 'Jay Hatfield Chevrolet of Vinita' THEN 'dealer-jhc-vinita'
    WHEN 'Jay Hatfield CDJR of Frontenac' THEN 'dealer-jhdjr-frontenac'
    WHEN 'Sarcoxie Ford' THEN 'dealer-sarcoxie-ford'
    WHEN 'Jay Hatfield Honda Powerhouse' THEN 'dealer-jhhp-wichita'
    WHEN 'Jay Hatfield Motorsports of Wichita' THEN 'dealer-jhm-wichita'
    WHEN 'Jay Hatfield Motorsports of Frontenac' THEN 'dealer-jhm-frontenac'
    WHEN 'Jay Hatfield Motorsports of Joplin' THEN 'dealer-jhm-joplin'
    WHEN 'Acura of Columbus' THEN 'dealer-acura-columbus'
    WHEN 'Genesis of Wichita' THEN 'dealer-genesis-wichita'
    WHEN 'Jay Hatfield Motorsports Portal' THEN 'dealer-jhm-portal'
    WHEN 'Jay Hatfield Motorsports Ottawa' THEN 'dealer-jhm-ottawa'
    WHEN 'Hatchett Hyundai East' THEN 'dealer-hatchett-hyundai-east'
    WHEN 'Hatchett Hyundai West' THEN 'dealer-hatchett-hyundai-west'
    WHEN 'Premier Mitsubishi' THEN 'dealer-premier-mitsubishi'
    WHEN 'Premier Auto Center - Tucson' THEN 'dealer-premier-auto-tucson'
    WHEN 'World Kia' THEN 'dealer-world-kia'
    WHEN 'AEO Powersports' THEN 'dealer-aeo-powersports'
    WHEN 'Columbus Auto Group' THEN 'dealer-columbus-auto-group'
    WHEN 'Winnebago of Rockford' THEN 'dealer-winnebago-rockford'
    ELSE d.id
  END as new_id,
  CASE 
    WHEN d.id = CASE d.name
      WHEN 'Jay Hatfield Chevrolet of Columbus' THEN 'dealer-jhc-columbus'
      WHEN 'Jay hatfield Chevrolet GMC of Chanute' THEN 'dealer-jhc-chanute'
      WHEN 'Jay Hatfield Chevrolet GMC of Pittsburg' THEN 'dealer-jhc-pittsburg'
      WHEN 'Jay Hatfield Chevrolet of Vinita' THEN 'dealer-jhc-vinita'
      WHEN 'Jay Hatfield CDJR of Frontenac' THEN 'dealer-jhdjr-frontenac'
      WHEN 'Sarcoxie Ford' THEN 'dealer-sarcoxie-ford'
      WHEN 'Jay Hatfield Honda Powerhouse' THEN 'dealer-jhhp-wichita'
      WHEN 'Jay Hatfield Motorsports of Wichita' THEN 'dealer-jhm-wichita'
      WHEN 'Jay Hatfield Motorsports of Frontenac' THEN 'dealer-jhm-frontenac'
      WHEN 'Jay Hatfield Motorsports of Joplin' THEN 'dealer-jhm-joplin'
      WHEN 'Acura of Columbus' THEN 'dealer-acura-columbus'
      WHEN 'Genesis of Wichita' THEN 'dealer-genesis-wichita'
      WHEN 'Jay Hatfield Motorsports Portal' THEN 'dealer-jhm-portal'
      WHEN 'Jay Hatfield Motorsports Ottawa' THEN 'dealer-jhm-ottawa'
      WHEN 'Hatchett Hyundai East' THEN 'dealer-hatchett-hyundai-east'
      WHEN 'Hatchett Hyundai West' THEN 'dealer-hatchett-hyundai-west'
      WHEN 'Premier Mitsubishi' THEN 'dealer-premier-mitsubishi'
      WHEN 'Premier Auto Center - Tucson' THEN 'dealer-premier-auto-tucson'
      WHEN 'World Kia' THEN 'dealer-world-kia'
      WHEN 'AEO Powersports' THEN 'dealer-aeo-powersports'
      WHEN 'Columbus Auto Group' THEN 'dealer-columbus-auto-group'
      WHEN 'Winnebago of Rockford' THEN 'dealer-winnebago-rockford'
      ELSE d.id
    END THEN '✅ NO CHANGE NEEDED'
    ELSE '🔄 NEEDS UPDATE'
  END as change_needed
FROM "Dealership" d
WHERE d."agencyId" IN (
  SELECT a.id FROM "Agency" a 
  LEFT JOIN "User" u ON u."agencyId" = a.id 
  WHERE u.email = 'josh.copp@onekeel.ai'
)
ORDER BY d.name;

-- UNCOMMENT AND RUN THE FOLLOWING UPDATES ONLY IF YOU CONFIRMED THE CHANGES ABOVE
-- WARNING: This will change primary keys and affect all related records!

/*
-- Step 1: Disable foreign key constraints temporarily (PostgreSQL)
SET session_replication_role = replica;

-- Step 2: Update dealership IDs to match hardcoded mappings
-- You'll need to run these one by one, checking each dealership name matches exactly

UPDATE "Dealership" SET id = 'dealer-jhc-columbus' 
WHERE name = 'Jay Hatfield Chevrolet of Columbus' AND id != 'dealer-jhc-columbus';

UPDATE "Dealership" SET id = 'dealer-jhc-chanute' 
WHERE name = 'Jay hatfield Chevrolet GMC of Chanute' AND id != 'dealer-jhc-chanute';

UPDATE "Dealership" SET id = 'dealer-jhc-pittsburg' 
WHERE name = 'Jay Hatfield Chevrolet GMC of Pittsburg' AND id != 'dealer-jhc-pittsburg';

UPDATE "Dealership" SET id = 'dealer-jhc-vinita' 
WHERE name = 'Jay Hatfield Chevrolet of Vinita' AND id != 'dealer-jhc-vinita';

UPDATE "Dealership" SET id = 'dealer-jhdjr-frontenac' 
WHERE name = 'Jay Hatfield CDJR of Frontenac' AND id != 'dealer-jhdjr-frontenac';

UPDATE "Dealership" SET id = 'dealer-sarcoxie-ford' 
WHERE name = 'Sarcoxie Ford' AND id != 'dealer-sarcoxie-ford';

UPDATE "Dealership" SET id = 'dealer-jhhp-wichita' 
WHERE name = 'Jay Hatfield Honda Powerhouse' AND id != 'dealer-jhhp-wichita';

UPDATE "Dealership" SET id = 'dealer-jhm-wichita' 
WHERE name = 'Jay Hatfield Motorsports of Wichita' AND id != 'dealer-jhm-wichita';

UPDATE "Dealership" SET id = 'dealer-jhm-frontenac' 
WHERE name = 'Jay Hatfield Motorsports of Frontenac' AND id != 'dealer-jhm-frontenac';

UPDATE "Dealership" SET id = 'dealer-jhm-joplin' 
WHERE name = 'Jay Hatfield Motorsports of Joplin' AND id != 'dealer-jhm-joplin';

UPDATE "Dealership" SET id = 'dealer-acura-columbus' 
WHERE name = 'Acura of Columbus' AND id != 'dealer-acura-columbus';

UPDATE "Dealership" SET id = 'dealer-genesis-wichita' 
WHERE name = 'Genesis of Wichita' AND id != 'dealer-genesis-wichita';

UPDATE "Dealership" SET id = 'dealer-jhm-portal' 
WHERE name = 'Jay Hatfield Motorsports Portal' AND id != 'dealer-jhm-portal';

UPDATE "Dealership" SET id = 'dealer-jhm-ottawa' 
WHERE name = 'Jay Hatfield Motorsports Ottawa' AND id != 'dealer-jhm-ottawa';

UPDATE "Dealership" SET id = 'dealer-hatchett-hyundai-east' 
WHERE name = 'Hatchett Hyundai East' AND id != 'dealer-hatchett-hyundai-east';

UPDATE "Dealership" SET id = 'dealer-hatchett-hyundai-west' 
WHERE name = 'Hatchett Hyundai West' AND id != 'dealer-hatchett-hyundai-west';

UPDATE "Dealership" SET id = 'dealer-premier-mitsubishi' 
WHERE name = 'Premier Mitsubishi' AND id != 'dealer-premier-mitsubishi';

UPDATE "Dealership" SET id = 'dealer-premier-auto-tucson' 
WHERE name = 'Premier Auto Center - Tucson' AND id != 'dealer-premier-auto-tucson';

-- Step 3: Re-enable foreign key constraints
SET session_replication_role = DEFAULT;

-- Step 4: Verify the changes
SELECT 'VERIFICATION:' as status, id, name FROM "Dealership" 
WHERE "agencyId" IN (
  SELECT a.id FROM "Agency" a 
  LEFT JOIN "User" u ON u."agencyId" = a.id 
  WHERE u.email = 'josh.copp@onekeel.ai'
)
ORDER BY name;
*/
