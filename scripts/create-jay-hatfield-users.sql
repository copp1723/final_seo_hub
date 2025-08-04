-- Create users for each Jay Hatfield dealership
-- Replace 'YOUR_AGENCY_ID_HERE' with your actual agency ID

INSERT INTO "User" (id, email, name, role, "agencyId", "dealershipId", "emailVerified", "onboardingCompleted", "createdAt", "updatedAt") VALUES

-- Chevrolet dealership users
(gen_random_uuid(), 'columbus@jayhatfield.com', 'Columbus Manager', 'DEALERSHIP_ADMIN', 'YOUR_AGENCY_ID_HERE', 'dealer-jay-hatfield-columbus', NOW(), true, NOW(), NOW()),
(gen_random_uuid(), 'chanute@jayhatfield.com', 'Chanute Manager', 'DEALERSHIP_ADMIN', 'YOUR_AGENCY_ID_HERE', 'dealer-jay-hatfield-chanute', NOW(), true, NOW(), NOW()),
(gen_random_uuid(), 'pittsburg@jayhatfield.com', 'Pittsburg Manager', 'DEALERSHIP_ADMIN', 'YOUR_AGENCY_ID_HERE', 'dealer-jay-hatfield-pittsburg', NOW(), true, NOW(), NOW()),
(gen_random_uuid(), 'vinita@jayhatfield.com', 'Vinita Manager', 'DEALERSHIP_ADMIN', 'YOUR_AGENCY_ID_HERE', 'dealer-jay-hatfield-vinita', NOW(), true, NOW(), NOW()),
(gen_random_uuid(), 'frontenac.cdjr@jayhatfield.com', 'Frontenac CDJR Manager', 'DEALERSHIP_ADMIN', 'YOUR_AGENCY_ID_HERE', 'dealer-jay-hatfield-frontenac-cdjr', NOW(), true, NOW(), NOW()),

-- Ford dealership user
(gen_random_uuid(), 'manager@sarcoxieford.com', 'Sarcoxie Ford Manager', 'DEALERSHIP_ADMIN', 'YOUR_AGENCY_ID_HERE', 'dealer-sarcoxie-ford', NOW(), true, NOW(), NOW()),

-- Honda dealership user
(gen_random_uuid(), 'honda@jayhatfield.com', 'Honda Manager', 'DEALERSHIP_ADMIN', 'YOUR_AGENCY_ID_HERE', 'dealer-jay-hatfield-honda', NOW(), true, NOW(), NOW()),

-- Motorsports users
(gen_random_uuid(), 'motorsports.wichita@jayhatfield.com', 'Wichita Motorsports Manager', 'DEALERSHIP_ADMIN', 'YOUR_AGENCY_ID_HERE', 'dealer-jay-hatfield-motorsports-wichita', NOW(), true, NOW(), NOW()),
(gen_random_uuid(), 'motorsports.frontenac@jayhatfield.com', 'Frontenac Motorsports Manager', 'DEALERSHIP_ADMIN', 'YOUR_AGENCY_ID_HERE', 'dealer-jay-hatfield-motorsports-frontenac', NOW(), true, NOW(), NOW()),
(gen_random_uuid(), 'motorsports.joplin@jayhatfield.com', 'Joplin Motorsports Manager', 'DEALERSHIP_ADMIN', 'YOUR_AGENCY_ID_HERE', 'dealer-jay-hatfield-motorsports-joplin', NOW(), true, NOW(), NOW()),
(gen_random_uuid(), 'motorsports.portal@jayhatfield.com', 'Portal Motorsports Manager', 'DEALERSHIP_ADMIN', 'YOUR_AGENCY_ID_HERE', 'dealer-jay-hatfield-motorsports-portal', NOW(), true, NOW(), NOW()),
(gen_random_uuid(), 'motorsports.ottawa@jayhatfield.com', 'Ottawa Motorsports Manager', 'DEALERSHIP_ADMIN', 'YOUR_AGENCY_ID_HERE', 'dealer-jay-hatfield-motorsports-ottawa', NOW(), true, NOW(), NOW()),

-- Luxury brand users
(gen_random_uuid(), 'manager@acuracolumbus.com', 'Acura Columbus Manager', 'DEALERSHIP_ADMIN', 'YOUR_AGENCY_ID_HERE', 'dealer-acura-columbus', NOW(), true, NOW(), NOW()),
(gen_random_uuid(), 'manager@genesisofwichita.com', 'Genesis Wichita Manager', 'DEALERSHIP_ADMIN', 'YOUR_AGENCY_ID_HERE', 'dealer-genesis-wichita', NOW(), true, NOW(), NOW()),

-- Hatchett Hyundai users
(gen_random_uuid(), 'east@hatchetthyundai.com', 'Hatchett East Manager', 'DEALERSHIP_ADMIN', 'YOUR_AGENCY_ID_HERE', 'dealer-hatchett-hyundai-east', NOW(), true, NOW(), NOW()),
(gen_random_uuid(), 'west@hatchetthyundai.com', 'Hatchett West Manager', 'DEALERSHIP_ADMIN', 'YOUR_AGENCY_ID_HERE', 'dealer-hatchett-hyundai-west', NOW(), true, NOW(), NOW()),

-- Other brand users
(gen_random_uuid(), 'manager@premiermitsubishi.com', 'Premier Mitsubishi Manager', 'DEALERSHIP_ADMIN', 'YOUR_AGENCY_ID_HERE', 'dealer-premier-mitsubishi', NOW(), true, NOW(), NOW()),
(gen_random_uuid(), 'manager@scottsaysyes.com', 'Premier Auto Tucson Manager', 'DEALERSHIP_ADMIN', 'YOUR_AGENCY_ID_HERE', 'dealer-premier-auto-tucson', NOW(), true, NOW(), NOW()),
(gen_random_uuid(), 'manager@worldkiajoliet.com', 'World Kia Manager', 'DEALERSHIP_ADMIN', 'YOUR_AGENCY_ID_HERE', 'dealer-world-kia', NOW(), true, NOW(), NOW()),
(gen_random_uuid(), 'manager@aeopowersports.com', 'AEO Powersports Manager', 'DEALERSHIP_ADMIN', 'YOUR_AGENCY_ID_HERE', 'dealer-aeo-powersports', NOW(), true, NOW(), NOW()),
(gen_random_uuid(), 'manager@columbusautogroup.com', 'Columbus Auto Group Manager', 'DEALERSHIP_ADMIN', 'YOUR_AGENCY_ID_HERE', 'dealer-columbus-auto-group', NOW(), true, NOW(), NOW()),
(gen_random_uuid(), 'manager@winnebagomotorhomes.com', 'Winnebago Rockford Manager', 'DEALERSHIP_ADMIN', 'YOUR_AGENCY_ID_HERE', 'dealer-winnebago-rockford', NOW(), true, NOW(), NOW());

-- Verify the users were created
SELECT u.id, u.email, u.name, d.name as dealership_name 
FROM "User" u 
JOIN "Dealership" d ON u."dealershipId" = d.id 
WHERE u."agencyId" = 'YOUR_AGENCY_ID_HERE' 
ORDER BY d.name;