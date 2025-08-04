-- Emergency SQL script to fix missing dealershipId values
-- Run this if the TypeScript migration script fails or for quick fixes

-- Check current state
SELECT 'Requests without dealershipId' as check_type, COUNT(*) as count
FROM requests 
WHERE dealershipId IS NULL
UNION ALL
SELECT 'Tasks without dealershipId', COUNT(*) 
FROM tasks 
WHERE dealershipId IS NULL
UNION ALL
SELECT 'Users without dealershipId', COUNT(*) 
FROM users 
WHERE dealershipId IS NULL;

-- Fix requests with missing dealershipId
UPDATE requests r
SET dealershipId = u.dealershipId
FROM users u
WHERE r.userId = u.id
AND r.dealershipId IS NULL
AND u.dealershipId IS NOT NULL;

-- Fix tasks with missing dealershipId  
UPDATE tasks t
SET dealershipId = u.dealershipId
FROM users u
WHERE t.userId = u.id
AND t.dealershipId IS NULL
AND u.dealershipId IS NOT NULL;

-- Report on remaining issues
SELECT 
  'Users without dealership' as issue_type,
  u.email,
  u.role,
  a.name as agency_name
FROM users u
LEFT JOIN agencies a ON u.agencyId = a.id
WHERE u.dealershipId IS NULL
ORDER BY u.role, u.email;

-- Final statistics
SELECT 
  'Final Statistics' as report,
  (SELECT COUNT(*) FROM requests WHERE dealershipId IS NOT NULL) || '/' || (SELECT COUNT(*) FROM requests) as requests_with_dealership,
  (SELECT COUNT(*) FROM tasks WHERE dealershipId IS NOT NULL) || '/' || (SELECT COUNT(*) FROM tasks) as tasks_with_dealership,
  (SELECT COUNT(*) FROM users WHERE dealershipId IS NOT NULL) || '/' || (SELECT COUNT(*) FROM users) as users_with_dealership;
