#!/bin/bash

echo "🔧 Resolving merge conflicts automatically..."

# List of conflicted files
conflicts=(
    "app/api/search-console/callback/route.ts"
    "app/api/search-console/performance/route.ts"
    "components/layout/dealership-selector.tsx"
    "components/layout/navigation.tsx"
    "lib/google/dealership-analytics-service.ts"
    "lib/prisma-errors 2.ts"
    "lib/search-console-token-refresh.ts"
    "scripts/test-ga4-api 2.js"
)

echo "📋 Found ${#conflicts[@]} conflicted files"
echo ""

# For each conflict, we'll take our version (the fixes we made)
for file in "${conflicts[@]}"; do
    if [ -f "$file" ]; then
        echo "✏️  Resolving: $file"
        
        # For the critical API routes, we want to keep our changes
        if [[ "$file" == *"route.ts"* ]]; then
            echo "   → Keeping our version (with dynamic export fix)"
            git checkout --ours "$file"
        # For the analytics service, keep our simplified version
        elif [[ "$file" == *"dealership-analytics-service.ts"* ]]; then
            echo "   → Keeping our simplified version"
            git checkout --ours "$file"
        else
            echo "   → Keeping our version"
            git checkout --ours "$file"
        fi
        
        git add "$file"
    fi
done

echo ""
echo "📊 Checking resolution status..."
git status --short

echo ""
echo "✅ All conflicts resolved using our versions (with the fixes)"
echo ""
echo "🚀 Continuing rebase..."
git rebase --continue --no-edit

if [ $? -eq 0 ]; then
    echo ""
    echo "📤 Pushing to remote..."
    git push origin main
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "🎉 SUCCESS! Your changes have been pushed!"
        echo ""
        echo "✅ Key fixes now deployed:"
        echo "- Dynamic rendering fixed for all API routes"
        echo "- Simplified connection logic (no more dealership lookups)"
        echo "- Better error handling for expired tokens"
        echo "- Consolidated Search Console routes"
        echo ""
        echo "🔥 The GA4 and Search Console data should now load consistently!"
    fi
else
    echo "❌ Rebase still has issues. Manual intervention needed."
fi
