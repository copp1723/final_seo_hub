#!/bin/bash

echo "🔍 Testing all main application routes..."
echo ""

BASE_URL="https://rylie-seo-hub.onrender.com"

# Test public routes
echo "📄 Testing Public Routes:"
routes=(
    "/"
    "/auth/signin"
    "/auth/emergency-access"
    "/privacy"
    "/terms"
)

for route in "${routes[@]}"; do
    status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$route")
    if [ "$status" = "200" ]; then
        echo "  ✅ $route - $status"
    else
        echo "  ❌ $route - $status"
    fi
done

echo ""
echo "🔐 Testing API Routes:"
api_routes=(
    "/api/health"
    "/api/auth/session"
    "/api/auth/providers"
    "/api/user/profile"
)

for route in "${api_routes[@]}"; do
    status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$route")
    if [ "$status" = "200" ] || [ "$status" = "401" ]; then
        echo "  ✅ $route - $status"
    else
        echo "  ❌ $route - $status"
    fi
done

echo ""
echo "✅ Route testing complete"
