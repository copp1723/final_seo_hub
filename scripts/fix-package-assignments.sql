-- Fix package assignments to match the correct configuration
-- Safe update script to set proper package types for each dealership

-- First, let's see current state (for verification)
SELECT name, "activePackageType" FROM dealerships ORDER BY name;

-- Update dealerships with PLATINUM packages
UPDATE dealerships 
SET "activePackageType" = 'PLATINUM'
WHERE name IN (
  'AEO Powersports',
  'Genesis of Wichita', 
  'Jay Hatfield Motorsports (portal)',
  'World Kia Joliet'
);

-- Update all others to SILVER (safer to be explicit)
UPDATE dealerships 
SET "activePackageType" = 'SILVER'
WHERE name IN (
  'Acura Columbus',
  'Columbus Auto Group',
  'Hatchett Hyundai East',
  'Hatchett Hyundai West',
  'Jay Hatfield Chevrolet',
  'Jay Hatfield Chevrolet GMC',
  'Jay Hatfield Chevrolet GMC of Pittsburg',
  'Jay Hatfield Chevrolet of Vinita',
  'Jay Hatfield Chrysler Dodge Jeep Ram',
  'Jay Hatfield Honda Powersports of Wichita',
  'Jay Hatfield Motorsports of Frontenac',
  'Jay Hatfield Motorsports of Joplin',
  'Jay Hatfield Motorsports of Ottawa',
  'Jay Hatfield Motorsports of Wichita',
  'Premier Auto Center',
  'Premier Mitsubishi',
  'Sarcoxie Ford'
);

-- Verify the changes
SELECT 
  name, 
  "activePackageType",
  CASE 
    WHEN name IN ('AEO Powersports', 'Genesis of Wichita', 'Jay Hatfield Motorsports (portal)', 'World Kia Joliet') 
    THEN 'Should be PLATINUM'
    ELSE 'Should be SILVER'
  END as expected_package
FROM dealerships 
ORDER BY name;

-- Count by package type
SELECT "activePackageType", COUNT(*) as count 
FROM dealerships 
GROUP BY "activePackageType"
ORDER BY "activePackageType";