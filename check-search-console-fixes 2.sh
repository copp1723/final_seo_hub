#!/bin/bash

# Test if our dynamic exports fix the issue
echo "🔍 Checking Search Console routes for dynamic exports..."
echo ""

routes=(
  "app/api/search-console/connect/route.ts"
  "app/api/search-console/callback/route.ts"
  "app/api/search-console/status/route.ts"
  "app/api/search-console/disconnect/route.ts"
  "app/api/search-console/sites/route.ts"
  "app/api/search-console/performance/route.ts"
  "app/api/search-console/analytics/route.ts"
  "app/api/search-console/primary-site/route.ts"
)

all_good=true

for route in "${routes[@]}"; do
  if [ -f "$route" ]; then
    if grep -q "export const dynamic = 'force-dynamic'" "$route"; then
      echo "✅ $route - Has dynamic export"
    else
      echo "❌ $route - Missing dynamic export"
      all_good=false
    fi
  else
    echo "⚠️  $route - File not found"
  fi
done

echo ""
if [ "$all_good" = true ]; then
  echo "✨ All Search Console routes are properly configured!"
else
  echo "⚠️  Some routes need attention"
fi

echo ""
echo "🚀 You can now deploy these changes. The dynamic server usage error should be resolved."
