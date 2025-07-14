-- Create Jay Hatfield Auto Group dealerships
-- First, you need to get your agency ID by running:
-- SELECT id, name FROM "Agency" LIMIT 5;
-- Replace 'YOUR_AGENCY_ID_HERE' below with the actual agency ID

-- Create the dealerships
INSERT INTO "Dealership" (id, name, website, "agencyId", settings, "createdAt", "updatedAt") VALUES

-- Jay Hatfield Chevrolet locations
('dealer-jay-hatfield-columbus', 'Jay Hatfield Chevrolet of Columbus', 'https://www.jayhatfieldchevy.net/', 'YOUR_AGENCY_ID_HERE', '{"ga4PropertyId": "323480238"}', NOW(), NOW()),
('dealer-jay-hatfield-chanute', 'Jay Hatfield Chevrolet GMC of Chanute', 'https://www.jayhatfieldchanute.com/', 'YOUR_AGENCY_ID_HERE', '{"ga4PropertyId": "323404832"}', NOW(), NOW()),
('dealer-jay-hatfield-pittsburg', 'Jay Hatfield Chevrolet GMC of Pittsburg', 'https://www.jayhatfieldchevroletgmc.com/', 'YOUR_AGENCY_ID_HERE', '{"ga4PropertyId": "371672738"}', NOW(), NOW()),
('dealer-jay-hatfield-vinita', 'Jay Hatfield Chevrolet of Vinita', 'https://www.jayhatfieldchevroletvinita.com/', 'YOUR_AGENCY_ID_HERE', '{"ga4PropertyId": "320759942"}', NOW(), NOW()),
('dealer-jay-hatfield-frontenac-cdjr', 'Jay Hatfield CDJR of Frontenac', 'https://www.jayhatfieldchryslerdodgejeepram.com/', 'YOUR_AGENCY_ID_HERE', '{"ga4PropertyId": "323415736"}', NOW(), NOW()),

-- Ford dealership
('dealer-sarcoxie-ford', 'Sarcoxie Ford', 'https://www.sarcoxieford.com', 'YOUR_AGENCY_ID_HERE', '{"ga4PropertyId": "452793966"}', NOW(), NOW()),

-- Honda dealership
('dealer-jay-hatfield-honda', 'Jay Hatfield Honda Powerhouse', 'https://www.jayhatfieldhondawichita.com/', 'YOUR_AGENCY_ID_HERE', '{"ga4PropertyId": "336729443"}', NOW(), NOW()),

-- Motorsports locations
('dealer-jay-hatfield-motorsports-wichita', 'Jay Hatfield Motorsports of Wichita', 'https://www.kansasmotorsports.com/', 'YOUR_AGENCY_ID_HERE', '{"ga4PropertyId": "317592148"}', NOW(), NOW()),
('dealer-jay-hatfield-motorsports-frontenac', 'Jay Hatfield Motorsports of Frontenac', 'https://www.jayhatfieldkawasaki.com/', 'YOUR_AGENCY_ID_HERE', '{"ga4PropertyId": "317608467"}', NOW(), NOW()),
('dealer-jay-hatfield-motorsports-joplin', 'Jay Hatfield Motorsports of Joplin', 'https://www.jhmofjoplin.com/', 'YOUR_AGENCY_ID_HERE', '{"ga4PropertyId": "317578343"}', NOW(), NOW()),
('dealer-jay-hatfield-motorsports-portal', 'Jay Hatfield Motorsports Portal', 'http://jayhatfieldmotorsports.com/', 'YOUR_AGENCY_ID_HERE', '{"ga4PropertyId": "461644624"}', NOW(), NOW()),
('dealer-jay-hatfield-motorsports-ottawa', 'Jay Hatfield Motorsports Ottawa', 'https://www.jayhatfieldottawa.com/', 'YOUR_AGENCY_ID_HERE', '{"ga4PropertyId": "472110523"}', NOW(), NOW()),

-- Luxury brands
('dealer-acura-columbus', 'Acura of Columbus', 'https://www.acuracolumbus.com/', 'YOUR_AGENCY_ID_HERE', '{"ga4PropertyId": "284944578"}', NOW(), NOW()),
('dealer-genesis-wichita', 'Genesis of Wichita', 'https://www.genesisofwichita.com/', 'YOUR_AGENCY_ID_HERE', '{"ga4PropertyId": "323502411"}', NOW(), NOW()),

-- Hatchett Hyundai locations
('dealer-hatchett-hyundai-east', 'Hatchett Hyundai East', 'https://www.hatchetthyundaieast.com/', 'YOUR_AGENCY_ID_HERE', '{"ga4PropertyId": "323448557"}', NOW(), NOW()),
('dealer-hatchett-hyundai-west', 'Hatchett Hyundai West', 'https://www.hatchetthyundaiwest.com/', 'YOUR_AGENCY_ID_HERE', '{"ga4PropertyId": "323465145"}', NOW(), NOW()),

-- Other brands
('dealer-premier-mitsubishi', 'Premier Mitsubishi', 'https://premiermitsubishi.com/', 'YOUR_AGENCY_ID_HERE', '{"ga4PropertyId": "473660351"}', NOW(), NOW()),
('dealer-premier-auto-tucson', 'Premier Auto Center - Tucson', 'https://scottsaysyes.com/', 'YOUR_AGENCY_ID_HERE', '{"ga4PropertyId": "470694371"}', NOW(), NOW()),

-- Dealerships without GA4 access yet
('dealer-world-kia', 'World Kia', 'https://www.worldkiajoliet.com/', 'YOUR_AGENCY_ID_HERE', '{"ga4PropertyId": null, "ga4Status": "no access"}', NOW(), NOW()),
('dealer-aeo-powersports', 'AEO Powersports', 'https://aeopowersports.com/', 'YOUR_AGENCY_ID_HERE', '{"ga4PropertyId": null, "ga4Status": "no access yet"}', NOW(), NOW()),
('dealer-columbus-auto-group', 'Columbus Auto Group', 'https://columbusautogroup.com/', 'YOUR_AGENCY_ID_HERE', '{"ga4PropertyId": null, "ga4Status": "no access (pending name change?)"}', NOW(), NOW()),
('dealer-winnebago-rockford', 'Winnebago of Rockford', 'https://www.winnebagomotorhomes.com/', 'YOUR_AGENCY_ID_HERE', '{"ga4PropertyId": null, "ga4Status": "not launched"}', NOW(), NOW());

-- Verify the dealerships were created
SELECT id, name, website FROM "Dealership" WHERE "agencyId" = 'YOUR_AGENCY_ID_HERE' ORDER BY name;