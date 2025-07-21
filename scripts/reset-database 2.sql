-- WARNING: This will DELETE ALL DATA and start fresh
-- Run this in your Render PostgreSQL shell

-- Drop all tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS user_invites CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS verification_tokens CASCADE;
DROP TABLE IF EXISTS dealerships CASCADE;
DROP TABLE IF EXISTS agencies CASCADE;

-- Now run your Prisma migration to recreate everything
-- prisma migrate deploy

-- Then create your super admin user
INSERT INTO users (id, email, role, name, "createdAt", "updatedAt") 
VALUES (
    gen_random_uuid(), 
    'josh.copp@onekeel.ai', 
    'SUPER_ADMIN', 
    'Josh Copp',
    NOW(), 
    NOW()
);

-- Create a simple session (if you have the sessions table)
INSERT INTO sessions ("sessionToken", "userId", expires) 
VALUES (
    'TEMP-SESSION-' || encode(gen_random_bytes(16), 'hex'),
    (SELECT id FROM users WHERE email = 'josh.copp@onekeel.ai'),
    NOW() + INTERVAL '30 days'
);

-- Get your session token
SELECT "sessionToken" FROM sessions WHERE "userId" = (SELECT id FROM users WHERE email = 'josh.copp@onekeel.ai');