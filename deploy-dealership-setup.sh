#!/bin/bash

echo "🚀 Deploying dealership setup scripts to Render..."

# Add and commit the setup scripts
git add scripts/setup-all-dealerships.js scripts/test-db-connection.js scripts/README-dealership-setup.md
git commit -m "Add dealership setup scripts for Render deployment"

# Push to trigger Render deployment
git push origin main

echo "✅ Deployment triggered! Wait for Render to finish building..."
echo "📋 Then run: node scripts/setup-all-dealerships.js"