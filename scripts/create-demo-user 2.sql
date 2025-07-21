-- Create demo super admin user for auto-login
INSERT INTO users (id, email, name, role, created_at, updated_at)
VALUES (
  'user-super-admin-001',
  'josh.copp@onekeel.ai',
  'Josh Copp (Demo Super Admin)',
  'SUPER_ADMIN',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  updated_at = NOW();