-- Script to set up SUPER_ADMIN users
-- Run this after database reset to restore admin access

-- Update existing users to SUPER_ADMIN
UPDATE "User" SET role = 'SUPER_ADMIN' WHERE email IN (
  'josh.copp@onekeel.ai',
  'Kyle.Olinger@onekeel.ai'
);

-- Insert SUPER_ADMIN users if they don't exist (for fresh database)
INSERT INTO "User" (
  id, 
  email, 
  role, 
  name, 
  "onboardingCompleted", 
  "pagesUsedThisPeriod", 
  "blogsUsedThisPeriod", 
  "gbpPostsUsedThisPeriod", 
  "improvementsUsedThisPeriod", 
  "createdAt", 
  "updatedAt"
) VALUES 
  (
    gen_random_uuid(), 
    'josh.copp@onekeel.ai', 
    'SUPER_ADMIN', 
    'Josh Copp', 
    false, 
    0, 
    0, 
    0, 
    0, 
    NOW(), 
    NOW()
  ),
  (
    gen_random_uuid(), 
    'Kyle.Olinger@onekeel.ai', 
    'SUPER_ADMIN', 
    'Kyle Olinger', 
    false, 
    0, 
    0, 
    0, 
    0, 
    NOW(), 
    NOW()
  )
ON CONFLICT (email) DO UPDATE SET 
  role = 'SUPER_ADMIN',
  "updatedAt" = NOW();

-- Verify the setup
SELECT id, email, role, name FROM "User" WHERE email IN (
  'josh.copp@onekeel.ai',
  'Kyle.Olinger@onekeel.ai'
);