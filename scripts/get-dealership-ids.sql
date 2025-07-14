-- Run this query after creating the dealerships to get the IDs for SEOWorks
-- This will show the dealership ID that SEOWorks should use as the clientId

SELECT 
  d.id as dealership_id,
  d.name as dealership_name,
  d.website,
  u.id as user_id,
  u.email as user_email,
  u.name as user_name
FROM "Dealership" d
LEFT JOIN "User" u ON u."dealershipId" = d.id
WHERE d."agencyId" = 'YOUR_AGENCY_ID'
ORDER BY d.name, u.email;

-- For SEOWorks integration, they need to send ONE of these in the webhook:
-- 1. clientId: The user_id from this query (if users are already assigned)
-- 2. clientEmail: The user_email from this query
-- 3. If tracking at dealership level: Use the dealership_id

-- Example webhook payload for SEOWorks:
/*
{
  "eventType": "task.completed",
  "data": {
    "externalId": "task-123",
    "clientId": "[user_id from query above]",
    "clientEmail": "[user_email from query above]",
    "taskType": "page",
    "status": "completed",
    "completionDate": "2024-01-14T10:00:00Z",
    "deliverables": [{
      "type": "page",
      "title": "Ford F-150 Deals",
      "url": "https://dealership.com/ford-f150"
    }]
  }
}
*/