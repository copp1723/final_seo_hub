-- Seed data for multi-agency/dealership SEO platform
-- Run this after successful migration to populate initial data

-- Insert Super Admin User (Josh)
INSERT INTO "User" (
  "id", 
  "email", 
  "name", 
  "role", 
  "onboardingCompleted",
  "createdAt", 
  "updatedAt"
) VALUES (
  'user_super_admin_001',
  'josh.copp@onekeel.ai',
  'Josh Copp',
  'SUPER_ADMIN',
  true,
  NOW(),
  NOW()
) ON CONFLICT ("email") DO UPDATE SET
  "role" = 'SUPER_ADMIN',
  "name" = 'Josh Copp',
  "onboardingCompleted" = true,
  "updatedAt" = NOW();

-- Insert Sample Agency
INSERT INTO "Agency" (
  "id",
  "name",
  "domain",
  "settings",
  "createdAt",
  "updatedAt"
) VALUES (
  'agency_sample_001',
  'Sample Auto Agency',
  'sample-auto.com',
  '{"branding":{"primaryColor":"#1f2937","logoUrl":null},"features":{"multiDealership":true,"customReporting":true}}',
  NOW(),
  NOW()
) ON CONFLICT ("id") DO UPDATE SET
  "name" = 'Sample Auto Agency',
  "domain" = 'sample-auto.com',
  "updatedAt" = NOW();

-- Insert Sample Dealerships
INSERT INTO "Dealership" (
  "id",
  "name",
  "address",
  "phone", 
  "website",
  "agencyId",
  "settings",
  "createdAt",
  "updatedAt"
) VALUES 
(
  'dealer_sample_001',
  'Downtown Ford',
  '123 Main St, Austin, TX 78701',
  '(512) 555-0123',
  'https://downtownford.com',
  'agency_sample_001',
  '{"branding":{"primaryColor":"#003f7f","logoUrl":null},"seo":{"targetRadius":25,"primaryKeywords":["Ford dealer Austin","new Ford Austin","used cars Austin"]}}',
  NOW(),
  NOW()
),
(
  'dealer_sample_002', 
  'Westside Toyota',
  '456 Oak Ave, Austin, TX 78704',
  '(512) 555-0456',
  'https://westsidetoyota.com',
  'agency_sample_001',
  '{"branding":{"primaryColor":"#eb0a1e","logoUrl":null},"seo":{"targetRadius":30,"primaryKeywords":["Toyota dealer Austin","new Toyota Austin","Prius Austin"]}}',
  NOW(),
  NOW()
) ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "address" = EXCLUDED."address",
  "phone" = EXCLUDED."phone",
  "website" = EXCLUDED."website",
  "updatedAt" = NOW();

-- Insert Agency Admin
INSERT INTO "User" (
  "id",
  "email",
  "name", 
  "role",
  "agencyId",
  "onboardingCompleted",
  "createdAt",
  "updatedAt"
) VALUES (
  'user_agency_admin_001',
  'admin@sample-auto.com',
  'Agency Admin',
  'AGENCY_ADMIN',
  'agency_sample_001',
  true,
  NOW(),
  NOW()
) ON CONFLICT ("email") DO UPDATE SET
  "role" = 'AGENCY_ADMIN',
  "agencyId" = 'agency_sample_001',
  "onboardingCompleted" = true,
  "updatedAt" = NOW();

-- Insert Dealership Admins
INSERT INTO "User" (
  "id",
  "email",
  "name",
  "role", 
  "agencyId",
  "dealershipId",
  "onboardingCompleted",
  "createdAt",
  "updatedAt"
) VALUES 
(
  'user_dealer_admin_001',
  'manager@downtownford.com',
  'Ford Manager',
  'DEALERSHIP_ADMIN',
  'agency_sample_001',
  'dealer_sample_001',
  true,
  NOW(),
  NOW()
),
(
  'user_dealer_admin_002',
  'manager@westsidetoyota.com', 
  'Toyota Manager',
  'DEALERSHIP_ADMIN',
  'agency_sample_001',
  'dealer_sample_002',
  true,
  NOW(),
  NOW()
) ON CONFLICT ("email") DO UPDATE SET
  "role" = 'DEALERSHIP_ADMIN',
  "agencyId" = 'agency_sample_001',
  "dealershipId" = EXCLUDED."dealershipId",
  "onboardingCompleted" = true,
  "updatedAt" = NOW();

-- Insert User Preferences for all users
INSERT INTO "UserPreferences" (
  "id",
  "userId",
  "emailNotifications",
  "requestCreated",
  "statusChanged", 
  "taskCompleted",
  "weeklySummary",
  "marketingEmails",
  "timezone",
  "language",
  "createdAt",
  "updatedAt"
) VALUES 
(
  'pref_super_admin_001',
  'user_super_admin_001',
  true, true, true, true, true, false,
  'America/Chicago', 'en', NOW(), NOW()
),
(
  'pref_agency_admin_001',
  'user_agency_admin_001', 
  true, true, true, true, true, false,
  'America/Chicago', 'en', NOW(), NOW()
),
(
  'pref_dealer_admin_001',
  'user_dealer_admin_001',
  true, true, true, true, true, false,
  'America/Chicago', 'en', NOW(), NOW()
),
(
  'pref_dealer_admin_002',
  'user_dealer_admin_002',
  true, true, true, true, true, false,
  'America/Chicago', 'en', NOW(), NOW()
) ON CONFLICT ("userId") DO UPDATE SET
  "emailNotifications" = true,
  "updatedAt" = NOW();

-- Insert System Settings
INSERT INTO "SystemSettings" (
  "id",
  "maintenanceMode",
  "newUserRegistration", 
  "emailNotifications",
  "auditLogging",
  "maxUsersPerAgency",
  "maxRequestsPerUser",
  "maxFileUploadSize",
  "smtpHost",
  "smtpPort", 
  "smtpUser",
  "smtpFromEmail",
  "maintenanceMessage",
  "welcomeMessage",
  "rateLimitPerMinute",
  "sessionTimeoutMinutes",
  "createdAt",
  "updatedAt"
) VALUES (
  'default',
  false, true, true, true,
  50, 1000, 10,
  '', 587, '', '',
  'The system is currently under maintenance. Please try again later.',
  'Welcome to our SEO management platform! Get started by exploring your dashboard.',
  60, 480,
  NOW(), NOW()
) ON CONFLICT ("id") DO UPDATE SET
  "maintenanceMode" = false,
  "updatedAt" = NOW();