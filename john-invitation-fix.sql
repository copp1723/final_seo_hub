-- Execute this SQL in your PostgreSQL database to add John's invitation
INSERT INTO users (id, email, name, role, "invitationToken", "invitationTokenExpires", "onboardingCompleted", "createdAt", "updatedAt")
VALUES (
  'd9f8f3bb-cfab-49b5-b001-c47e741cca7b',
  'john@customerscout.com',
  'John Customer Scout',
  'SUPER_ADMIN',
  '79f8be55c26f23367961f1e38a94399ff5382b347b2de81752c3fd8c11f5fa2a',
  '2025-08-16T19:42:08.669Z',
  true,
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  "invitationToken" = '79f8be55c26f23367961f1e38a94399ff5382b347b2de81752c3fd8c11f5fa2a',
  "invitationTokenExpires" = '2025-08-16T19:42:08.669Z',
  role = 'SUPER_ADMIN',
  "onboardingCompleted" = true,
  "updatedAt" = NOW();

-- Verify the user was added correctly
SELECT id, email, name, role, "invitationToken", "invitationTokenExpires", "onboardingCompleted" 
FROM users 
WHERE email = 'john@customerscout.com';