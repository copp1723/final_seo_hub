-- Create Missing Dealerships: Winnebago Motor Homes & Brown Motors
-- Direct SQL approach to avoid Prisma schema mismatches

-- First check if agency exists
-- INSERT INTO agencies if needed (assuming it exists)

-- Create Winnebago of Rockford (restore from backup)
INSERT INTO dealerships (
    id, 
    name, 
    slug,
    "agencyId", 
    website, 
    "logoUrl",
    domain,
    "primaryColor",
    "secondaryColor", 
    status,
    "createdAt",
    "updatedAt",
    "ga4PropertyId",
    "googleAnalyticsAccount"
) VALUES (
    'dealer-winnebago-rockford',
    'Winnebago of Rockford',
    'winnebago-rockford',
    'seowerks-id',
    'https://www.winnebagomotorhomes.com/',
    NULL,
    NULL,
    '#3b82f6',
    '#1e40af',
    'active',
    NOW(),
    NOW(),
    NULL,
    NULL
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    website = EXCLUDED.website,
    "updatedAt" = NOW();

-- Create Brown Motors (new dealership)  
INSERT INTO dealerships (
    id,
    name,
    slug,
    "agencyId",
    website,
    "logoUrl", 
    domain,
    "primaryColor",
    "secondaryColor",
    status,
    "createdAt", 
    "updatedAt",
    "ga4PropertyId",
    "googleAnalyticsAccount"
) VALUES (
    'dealer-brown-motors',
    'Brown Motors', 
    'brown-motors',
    'seowerks-id',
    'https://www.brownmotors.com/',
    NULL,
    NULL,
    '#8B4513',
    '#654321', 
    'active',
    NOW(),
    NOW(),
    NULL,
    NULL
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    website = EXCLUDED.website,
    "updatedAt" = NOW();

-- Verify creation
SELECT id, name, website, status FROM dealerships 
WHERE id IN ('dealer-winnebago-rockford', 'dealer-brown-motors');

-- Show the client IDs for SEOWorks team
SELECT 
    id AS "Client ID",
    name AS "Dealership Name", 
    website AS "Website"
FROM dealerships 
WHERE id IN ('dealer-winnebago-rockford', 'dealer-brown-motors');