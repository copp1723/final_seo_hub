#!/bin/bash

# Script to create emergency invitations for SEO Hub
# This bypasses the circular dependency of needing to be logged in to create invitations

# Check if email is provided
if [ -z "$1" ]; then
    echo "Usage: ./create-emergency-invite.sh <email> [role] [agencyId]"
    echo "Example: ./create-emergency-invite.sh josh.copp@onekeel.ai SUPER_ADMIN"
    exit 1
fi

EMAIL=$1
ROLE=${2:-"SUPER_ADMIN"}
AGENCY_ID=${3:-null}

# Check if EMERGENCY_ADMIN_TOKEN is set
if [ -z "$EMERGENCY_ADMIN_TOKEN" ]; then
    echo "Error: EMERGENCY_ADMIN_TOKEN environment variable is not set"
    echo "Please set it in your Render environment variables"
    exit 1
fi

# Determine the base URL
if [ -z "$API_BASE_URL" ]; then
    API_BASE_URL="https://rylie-seo-hub.onrender.com"
fi

# Create the invitation
echo "Creating invitation for: $EMAIL"
echo "Role: $ROLE"
echo "Agency ID: $AGENCY_ID"
echo ""

RESPONSE=$(curl -s -X POST "$API_BASE_URL/api/auth/emergency-invite" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $EMERGENCY_ADMIN_TOKEN" \
  -d "{\"email\": \"$EMAIL\", \"role\": \"$ROLE\", \"agencyId\": $AGENCY_ID}")

# Check if the request was successful
if echo "$RESPONSE" | grep -q '"success":true'; then
    echo "✅ Invitation created successfully!"
    echo ""
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
else
    echo "❌ Failed to create invitation"
    echo "$RESPONSE"
fi