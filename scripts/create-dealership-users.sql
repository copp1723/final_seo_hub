-- Create one user per dealership for SEOWorks integration
-- First, get your agency ID and dealership IDs by running:
-- SELECT id, name FROM "Agency";
-- SELECT id, name FROM "Dealership" WHERE "agencyId" = 'YOUR_AGENCY_ID';

-- Then create users for each dealership
INSERT INTO "User" (id, email, name, role, "agencyId", "dealershipId", "emailVerified", "onboardingCompleted", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  LOWER(REPLACE(d.name, ' ', '.')) || '@seoworks.integration',  -- Creates email like: jay.hatfield.chevrolet.of.columbus@seoworks.integration
  d.name || ' - SEO User',
  'USER',
  d."agencyId",
  d.id,
  NOW(),  -- Mark as verified
  true,   -- Mark onboarding as completed
  NOW(),
  NOW()
FROM "Dealership" d
WHERE d."agencyId" = 'YOUR_AGENCY_ID';

-- Query to get all the user IDs and emails for SEOWorks
SELECT 
  u.id as user_id,
  u.email as user_email,
  u.name as user_name,
  d.id as dealership_id,
  d.name as dealership_name,
  d.website
FROM "User" u
JOIN "Dealership" d ON u."dealershipId" = d.id
WHERE u."agencyId" = 'YOUR_AGENCY_ID'
  AND u.email LIKE '%@seoworks.integration'
ORDER BY d.name;

-- This will give you a list like:
-- user_id                              | user_email                                      | dealership_name
-- ----------------------------------------------------------------------------------------------------
-- 123e4567-e89b-12d3-a456-426614174000 | jay.hatfield.chevrolet.of.columbus@seoworks.integration | Jay Hatfield Chevrolet of Columbus
-- 223e4567-e89b-12d3-a456-426614174001 | jay.hatfield.chevrolet.gmc.of.chanute@seoworks.integration | Jay Hatfield Chevrolet GMC of Chanute
-- etc...