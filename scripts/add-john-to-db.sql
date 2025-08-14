-- Add JOHN@customerscout.com as SUPER_ADMIN with invitation token
INSERT INTO users (id, email, name, role, "invitationToken", "invitationTokenExpires", "onboardingCompleted", "createdAt", "updatedAt")
VALUES (
  'bfd9a0f9-d403-4b83-973b-fff4aaad0897',
  'john@customerscout.com',
  'John Customer Scout',
  'SUPER_ADMIN',
  '03f8f904cabe53218236f32deca9c1b9d1788f13871b35fe5a001070dc7a5fb8',
  '2025-08-16T19:40:55.055Z',
  true,
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  "invitationToken" = '03f8f904cabe53218236f32deca9c1b9d1788f13871b35fe5a001070dc7a5fb8',
  "invitationTokenExpires" = '2025-08-16T19:40:55.055Z',
  "updatedAt" = NOW();

-- Verify the user was added
SELECT id, email, name, role, "invitationToken", "invitationTokenExpires", "onboardingCompleted" 
FROM users 
WHERE email = 'john@customerscout.com';