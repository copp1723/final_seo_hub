#!/bin/bash

# Test script for AGENCY production dealership filtering APIs
#
# SETUP INSTRUCTIONS:
# 1. Go to https://rylie-seo-hub.onrender.com in your browser
# 2. Open Developer Tools (F12)
# 3. Go to Application/Storage tab -> Cookies
# 4. Copy the value of the session cookie (usually next-auth.session-token)
# 5. Replace YOUR_SESSION_COOKIE below with that value

PRODUCTION_URL="https://rylie-seo-hub.onrender.com"
SESSION_COOKIE="YOUR_SESSION_COOKIE"

echo "🏢 Testing AGENCY Production Dealership Filtering APIs"
echo "======================================================"
echo "🎯 Target: $PRODUCTION_URL"
echo ""

# 1. Test dealership switching endpoint (GET) - Should show ALL your dealerships
echo "1️⃣ Testing dealership list (should show all your agency's dealerships)..."
DEALERSHIP_RESPONSE=$(curl -s -H "Cookie: $SESSION_COOKIE" \
  "$PRODUCTION_URL/api/dealerships/switch")

echo "$DEALERSHIP_RESPONSE" | jq '.'

# Extract first dealership ID for testing
FIRST_DEALERSHIP_ID=$(echo "$DEALERSHIP_RESPONSE" | jq -r '.availableDealerships[0].id // empty')
echo ""
echo "🔍 First dealership ID found: $FIRST_DEALERSHIP_ID"

echo ""
echo "2️⃣ Testing dashboard data WITHOUT dealership filter (should show mixed/default data)..."
DASHBOARD_DEFAULT=$(curl -s -H "Cookie: $SESSION_COOKIE" \
  "$PRODUCTION_URL/api/dashboard")
echo "$DASHBOARD_DEFAULT" | jq '{activeRequests, completedRequests, dealership: .dealership.name}'

echo ""
echo "3️⃣ Testing dashboard analytics WITHOUT dealership filter..."
ANALYTICS_DEFAULT=$(curl -s -H "Cookie: $SESSION_COOKIE" \
  "$PRODUCTION_URL/api/dashboard/analytics?dateRange=30days")
echo "$ANALYTICS_DEFAULT" | jq '.data.combinedMetrics // .error // "No data structure found"'

if [ "$FIRST_DEALERSHIP_ID" != "null" ] && [ "$FIRST_DEALERSHIP_ID" != "" ]; then
  echo ""
  echo "4️⃣ Testing dashboard data WITH dealership filter ($FIRST_DEALERSHIP_ID)..."
  DASHBOARD_FILTERED=$(curl -s -H "Cookie: $SESSION_COOKIE" \
    "$PRODUCTION_URL/api/dashboard?dealershipId=$FIRST_DEALERSHIP_ID")
  echo "$DASHBOARD_FILTERED" | jq '{activeRequests, completedRequests, dealership: .dealership.name}'

  echo ""
  echo "5️⃣ Testing dashboard analytics WITH dealership filter..."
  ANALYTICS_FILTERED=$(curl -s -H "Cookie: $SESSION_COOKIE" \
    "$PRODUCTION_URL/api/dashboard/analytics?dateRange=30days&dealershipId=$FIRST_DEALERSHIP_ID")
  echo "$ANALYTICS_FILTERED" | jq '.data.combinedMetrics // .error // "No data structure found"'

  echo ""
  echo "6️⃣ Testing dealership switching (POST) - switching to $FIRST_DEALERSHIP_ID..."
  SWITCH_RESULT=$(curl -s -X POST \
    -H "Cookie: $SESSION_COOKIE" \
    -H "Content-Type: application/json" \
    -d "{\"dealershipId\":\"$FIRST_DEALERSHIP_ID\"}" \
    "$PRODUCTION_URL/api/dealerships/switch")
  echo "$SWITCH_RESULT" | jq '.'

  echo ""
  echo "7️⃣ Testing analytics AFTER switching dealership..."
  sleep 2  # Give it a moment to process the switch
  ANALYTICS_AFTER_SWITCH=$(curl -s -H "Cookie: $SESSION_COOKIE" \
    "$PRODUCTION_URL/api/dashboard/analytics?dateRange=30days")
  echo "$ANALYTICS_AFTER_SWITCH" | jq '.data.combinedMetrics // .error // "No data structure found"'
else
  echo ""
  echo "⚠️ No dealership ID found - skipping dealership-specific tests"
fi

echo ""
echo "8️⃣ Testing cache clearing..."
CACHE_CLEAR=$(curl -s -H "Cookie: $SESSION_COOKIE" \
  "$PRODUCTION_URL/api/dashboard/analytics?dateRange=30days&clearCache=true")
echo "$CACHE_CLEAR" | jq '.cached // "Cache status not found"'

echo ""
echo "✅ AGENCY API Testing Complete!"
echo "=================================================="
echo "🔍 WHAT TO LOOK FOR:"
echo "• Step 1: Should show multiple dealerships for your agency"
echo "• Steps 2-3: Default data (might be mixed or from your current dealership)"
echo "• Steps 4-5: Should show DIFFERENT data when filtered by specific dealership"
echo "• Step 6: Should confirm successful dealership switch"
echo "• Step 7: Should show dealership-specific data after switch"
echo "• Step 8: Should show cache clearing worked"
echo ""
echo "❌ RED FLAGS:"
echo "• Same data in steps 2-3 vs 4-5 (filtering not working)"
echo "• Errors in dealership switching (step 6)"
echo "• No dealerships returned in step 1"
