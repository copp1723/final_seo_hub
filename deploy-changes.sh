#!/bin/bash

# Deploy script for SEO Hub branding changes
echo "🚀 Deploying SEO Hub branding changes..."

# Add changes to git
git add lib/branding/config.ts package.json

# Commit changes
git commit -m "feat: Update branding from 'Rylie SEO Hub' to 'SEO Hub'

- Updated branding configuration to use 'SEO Hub' for all domains
- Changed package name from 'rylie-seo-hub' to 'seo-hub'
- Maintains backwards compatibility with existing functionality
- Updates navigation, page titles, and email signatures"

# Push to main branch
echo "📤 Pushing changes to repository..."
git push origin main

echo "✅ Changes pushed successfully!"
echo "🔄 Your Render deployment should automatically start building..."
echo "⏱️  Build typically takes 2-3 minutes"
echo "🌐 Check your deployment status at: https://dashboard.render.com"
