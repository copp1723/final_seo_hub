#!/bin/bash

# Production check script for Acura of Columbus webhook activity
# Run this on your production server (Render)

echo "🎯 ACURA OF COLUMBUS WEBHOOK INVESTIGATION"
echo "=========================================="
echo ""
echo "📅 Current Time: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
echo "🌐 Server: $(hostname)"
echo ""

echo "1️⃣ TESTING WEBHOOK ENDPOINT CONNECTIVITY..."
echo "--------------------------------------------"
WEBHOOK_RESPONSE=$(curl -s -X GET https://rylie-seo-hub.onrender.com/api/seoworks/webhook 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✅ Webhook endpoint is reachable"
    echo "   Response: $WEBHOOK_RESPONSE"
else
    echo "❌ Webhook endpoint is not reachable"
fi
echo ""

echo "2️⃣ CHECKING RECENT REQUESTS FOR ACURA OF COLUMBUS..."
echo "----------------------------------------------------"
psql $DATABASE_URL -c "
SELECT 
    r.id,
    r.title,
    r.type,
    r.status,
    r.\"seoworksTaskId\",
    TO_CHAR(r.\"createdAt\", 'YYYY-MM-DD HH24:MI:SS UTC') as created_at,
    TO_CHAR(r.\"updatedAt\", 'YYYY-MM-DD HH24:MI:SS UTC') as updated_at,
    u.email as user_email,
    d.name as dealership_name
FROM requests r
LEFT JOIN users u ON r.\"userId\" = u.id
LEFT JOIN dealerships d ON r.\"dealershipId\" = d.id
WHERE (
    d.id = 'dealer-acura-columbus' 
    OR d.name ILIKE '%Acura%Columbus%'
    OR d.\"clientId\" = 'dealer-acura-columbus'
)
AND r.\"createdAt\" >= NOW() - INTERVAL '3 hours'
ORDER BY r.\"createdAt\" DESC
LIMIT 10;
" 2>/dev/null

echo ""
echo "3️⃣ CHECKING ORPHANED TASKS (UNMATCHED WEBHOOKS)..."
echo "---------------------------------------------------"
psql $DATABASE_URL -c "
SELECT 
    ot.id,
    ot.\"externalId\",
    ot.\"clientId\",
    ot.\"clientEmail\", 
    ot.\"eventType\",
    ot.\"taskType\",
    ot.status,
    ot.processed,
    TO_CHAR(ot.\"createdAt\", 'YYYY-MM-DD HH24:MI:SS UTC') as created_at,
    LEFT(ot.notes, 100) as notes_preview
FROM orphaned_tasks ot
WHERE (
    ot.\"clientId\" ILIKE '%acura%'
    OR ot.\"clientEmail\" ILIKE '%acura%'
    OR ot.notes ILIKE '%acura%'
    OR ot.deliverables::text ILIKE '%acura%'
)
AND ot.\"createdAt\" >= NOW() - INTERVAL '3 hours'
ORDER BY ot.\"createdAt\" DESC
LIMIT 10;
" 2>/dev/null

echo ""
echo "4️⃣ CHECKING RECENT SEOWORKS TASKS..."
echo "------------------------------------"
psql $DATABASE_URL -c "
SELECT 
    st.id,
    st.\"externalId\",
    st.\"taskType\",
    st.status,
    TO_CHAR(st.\"receivedAt\", 'YYYY-MM-DD HH24:MI:SS UTC') as received_at,
    st.\"postTitle\"
FROM seoworks_tasks st
WHERE (
    st.payload::text ILIKE '%acura%'
    OR st.payload::text ILIKE '%columbus%'
    OR st.\"postTitle\" ILIKE '%acura%'
    OR st.\"postUrl\" ILIKE '%acura%'
)
AND st.\"receivedAt\" >= NOW() - INTERVAL '3 hours'
ORDER BY st.\"receivedAt\" DESC
LIMIT 10;
" 2>/dev/null

echo ""
echo "5️⃣ CHECKING ACURA OF COLUMBUS DEALERSHIP SETUP..."
echo "---------------------------------------------------"
psql $DATABASE_URL -c "
SELECT 
    d.id,
    d.name,
    d.\"clientId\",
    d.website,
    d.\"agencyId\",
    TO_CHAR(d.\"createdAt\", 'YYYY-MM-DD HH24:MI:SS UTC') as created_at,
    COUNT(u.id) as user_count
FROM dealerships d
LEFT JOIN users u ON u.\"dealershipId\" = d.id
WHERE (
    d.id = 'dealer-acura-columbus'
    OR d.name ILIKE '%Acura%Columbus%'
    OR d.\"clientId\" = 'dealer-acura-columbus'
)
GROUP BY d.id, d.name, d.\"clientId\", d.website, d.\"agencyId\", d.\"createdAt\"
ORDER BY d.\"createdAt\" DESC;
" 2>/dev/null

echo ""
echo "6️⃣ CHECKING USERS ASSOCIATED WITH ACURA OF COLUMBUS..."
echo "------------------------------------------------------"
psql $DATABASE_URL -c "
SELECT 
    u.id,
    u.email,
    u.name,
    u.role,
    u.\"dealershipId\",
    d.name as dealership_name,
    TO_CHAR(u.\"createdAt\", 'YYYY-MM-DD HH24:MI:SS UTC') as created_at
FROM users u
LEFT JOIN dealerships d ON u.\"dealershipId\" = d.id
WHERE (
    d.id = 'dealer-acura-columbus'
    OR d.name ILIKE '%Acura%Columbus%'
    OR u.email ILIKE '%acura%'
)
ORDER BY u.\"createdAt\" DESC
LIMIT 10;
" 2>/dev/null

echo ""
echo "7️⃣ SUMMARY AND RECOMMENDATIONS..."
echo "--------------------------------"
echo ""

# Count recent activity
RECENT_REQUESTS=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM requests r LEFT JOIN dealerships d ON r.\"dealershipId\" = d.id WHERE (d.id = 'dealer-acura-columbus' OR d.name ILIKE '%Acura%Columbus%') AND r.\"createdAt\" >= NOW() - INTERVAL '3 hours';" 2>/dev/null | tr -d ' ')

RECENT_ORPHANED=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM orphaned_tasks ot WHERE (ot.\"clientId\" ILIKE '%acura%' OR ot.\"clientEmail\" ILIKE '%acura%' OR ot.deliverables::text ILIKE '%acura%') AND ot.\"createdAt\" >= NOW() - INTERVAL '3 hours';" 2>/dev/null | tr -d ' ')

echo "📊 ACTIVITY SUMMARY (Last 3 hours):"
echo "   • Recent Requests: ${RECENT_REQUESTS:-0}"
echo "   • Recent Orphaned Tasks: ${RECENT_ORPHANED:-0}"
echo ""

if [ "${RECENT_REQUESTS:-0}" -gt 0 ]; then
    echo "✅ WEBHOOK PROCESSED: Found recent activity for Acura of Columbus"
    echo "   → The webhook was received and processed successfully"
    echo "   → Check the requests above for details"
    echo ""
elif [ "${RECENT_ORPHANED:-0}" -gt 0 ]; then
    echo "⚠️  WEBHOOK ORPHANED: Found webhook but no matching user/dealership"
    echo "   → The webhook was received but couldn't be matched to a user"
    echo "   → Check orphaned_tasks above and run onboarding process"
    echo ""
else
    echo "❌ NO WEBHOOK ACTIVITY: No recent activity found for Acura of Columbus"
    echo "   → Webhook may not have been sent"
    echo "   → Check SEOWorks webhook configuration"
    echo "   → Verify API key and endpoint URL"
    echo ""
fi

echo "🔧 NEXT STEPS:"
echo "1. If webhook found: Review the data above"
echo "2. If orphaned: Run user onboarding process"
echo "3. If no activity: Check SEOWorks webhook settings"
echo "4. Monitor application logs for errors"
echo ""

echo "🕒 Investigation completed at: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"