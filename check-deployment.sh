#!/bin/bash

echo "🔍 Running deployment diagnostics..."

# Check if the app is accessible
echo -e "\n📡 Checking app accessibility..."
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" https://rylie-seo-hub.onrender.com

# Check specific endpoints
echo -e "\n🔐 Checking auth endpoints..."
curl -s -o /dev/null -w "  /auth/signin: %{http_code}\n" https://rylie-seo-hub.onrender.com/auth/signin
curl -s -o /dev/null -w "  /api/auth/providers: %{http_code}\n" https://rylie-seo-hub.onrender.com/api/auth/providers

echo -e "\n📊 Checking API health..."
curl -s https://rylie-seo-hub.onrender.com/api/health | jq '.' 2>/dev/null || echo "  Health endpoint not responding with JSON"

echo -e "\n✅ Diagnostic complete"
