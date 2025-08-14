-- Check for recent SEOWorks activity for Acura of Columbus
-- Run this in your production database to see if the webhook came through

-- 1. Check recent requests for Acura of Columbus dealership
SELECT 
    r.id,
    r.title,
    r.type,
    r.status,
    r."seoworksTaskId",
    r."createdAt",
    r."updatedAt",
    r."completedAt",
    r."pagesCompleted",
    r."blogsCompleted",
    r."gbpPostsCompleted",
    r."improvementsCompleted",
    u.email as user_email,
    d.name as dealership_name
FROM requests r
LEFT JOIN users u ON r."userId" = u.id
LEFT JOIN dealerships d ON r."dealershipId" = d.id
WHERE (
    d.id = 'dealer-acura-columbus' 
    OR d.name ILIKE '%Acura%Columbus%'
    OR d."clientId" = 'dealer-acura-columbus'
)
AND r."createdAt" >= NOW() - INTERVAL '2 hours'
ORDER BY r."createdAt" DESC;

-- 2. Check for orphaned tasks (webhooks that couldn't be matched to users)
SELECT 
    ot.id,
    ot."externalId",
    ot."clientId",
    ot."clientEmail", 
    ot."eventType",
    ot."taskType",
    ot.status,
    ot."completionDate",
    ot.processed,
    ot."createdAt",
    ot.notes,
    ot.deliverables
FROM orphaned_tasks ot
WHERE (
    ot."clientId" ILIKE '%acura%columbus%'
    OR ot."clientEmail" ILIKE '%acura%'
    OR ot.notes ILIKE '%acura%'
    OR ot.deliverables::text ILIKE '%acura%'
)
AND ot."createdAt" >= NOW() - INTERVAL '2 hours'
ORDER BY ot."createdAt" DESC;

-- 3. Check recent SEOWorks tasks table entries
SELECT 
    st.id,
    st."externalId",
    st."taskType",
    st.status,
    st."completionDate",
    st."postTitle",
    st."postUrl",
    st."receivedAt",
    st."processedAt",
    st.payload
FROM seoworks_tasks st
WHERE (
    st.payload::text ILIKE '%acura%'
    OR st.payload::text ILIKE '%columbus%'
    OR st."postTitle" ILIKE '%acura%'
    OR st."postUrl" ILIKE '%acura%'
)
AND st."receivedAt" >= NOW() - INTERVAL '2 hours'
ORDER BY st."receivedAt" DESC;

-- 4. Check for users associated with Acura of Columbus
SELECT 
    u.id,
    u.email,
    u.name,
    u.role,
    u."dealershipId",
    d.name as dealership_name,
    d."clientId"
FROM users u
LEFT JOIN dealerships d ON u."dealershipId" = d.id
WHERE (
    d.id = 'dealer-acura-columbus'
    OR d.name ILIKE '%Acura%Columbus%'
    OR u.email ILIKE '%acura%'
)
ORDER BY u."createdAt" DESC;

-- 5. Check audit logs for recent Acura activity
SELECT 
    al.id,
    al.action,
    al."entityType",
    al."entityId",
    al."userEmail",
    al.details,
    al."createdAt"
FROM audit_logs al
WHERE (
    al.details::text ILIKE '%acura%'
    OR al.details::text ILIKE '%columbus%'
    OR al.details::text ILIKE '%dealer-acura-columbus%'
)
AND al."createdAt" >= NOW() - INTERVAL '2 hours'
ORDER BY al."createdAt" DESC;