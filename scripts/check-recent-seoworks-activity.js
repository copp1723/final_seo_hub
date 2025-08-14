#!/usr/bin/env node

// Script to check for recent SEOWorks activity
// Run this on your production server to see recent webhook activity

console.log('🔍 Checking recent SEOWorks webhook activity...\n')

console.log('📋 Run these commands on your production server:')
console.log('')

console.log('1️⃣ Check recent requests for Acura of Columbus:')
console.log('psql $DATABASE_URL -c "')
console.log(`SELECT 
    r.id,
    r.title,
    r.type,
    r.status,
    r."seoworksTaskId",
    r."createdAt",
    r."updatedAt",
    u.email as user_email,
    d.name as dealership_name
FROM requests r
LEFT JOIN users u ON r."userId" = u.id
LEFT JOIN dealerships d ON r."dealershipId" = d.id
WHERE d.id = 'dealer-acura-columbus'
AND r."createdAt" >= NOW() - INTERVAL '2 hours'
ORDER BY r."createdAt" DESC;`)
console.log('"')
console.log('')

console.log('2️⃣ Check orphaned tasks (unmatched webhooks):')
console.log('psql $DATABASE_URL -c "')
console.log(`SELECT 
    ot.id,
    ot."externalId",
    ot."clientId",
    ot."eventType",
    ot."taskType",
    ot.status,
    ot."createdAt",
    ot.processed
FROM orphaned_tasks ot
WHERE ot."createdAt" >= NOW() - INTERVAL '2 hours'
ORDER BY ot."createdAt" DESC;`)
console.log('"')
console.log('')

console.log('3️⃣ Check recent SEOWorks tasks:')
console.log('psql $DATABASE_URL -c "')
console.log(`SELECT 
    st.id,
    st."externalId",
    st."taskType",
    st.status,
    st."receivedAt",
    st."postTitle"
FROM seoworks_tasks st
WHERE st."receivedAt" >= NOW() - INTERVAL '2 hours'
ORDER BY st."receivedAt" DESC;`)
console.log('"')
console.log('')

console.log('4️⃣ Check webhook endpoint logs:')
console.log('# Check your application logs for webhook entries:')
console.log('# Look for: "SEOWorks webhook" OR "webhook processing" OR "Acura" OR "Columbus"')
console.log('')

console.log('5️⃣ Test webhook endpoint directly:')
console.log('curl -X GET https://rylie-seo-hub.onrender.com/api/seoworks/webhook')
console.log('# Should return: {"status": "ok", "message": "SEOWorks webhook endpoint is active"}')
console.log('')

console.log('📊 Expected Results if webhook came through:')
console.log('• New entry in requests table OR orphaned_tasks table')
console.log('• Recent timestamp (within last 2 hours)')
console.log('• External ID from SEOWorks')
console.log('• Task type (page, blog, gbp_post, improvement)')
console.log('• Associated with Acura of Columbus dealership or user')
console.log('')

console.log('🚨 If no results found:')
console.log('• Check webhook URL configuration in SEOWorks')
console.log('• Verify API key authentication')
console.log('• Check rate limiting (100 requests/minute)')
console.log('• Review application logs for errors')
console.log('')

console.log('✅ What to look for:')
console.log('• clientId: "dealer-acura-columbus"')
console.log('• clientEmail: related to acura/columbus domain')
console.log('• Deliverables with URLs containing acuracolumbus.com')
console.log('• Task completion or update events')