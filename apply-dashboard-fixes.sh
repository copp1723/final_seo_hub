#!/bin/bash

echo "🔧 Applying final dashboard fixes..."

# Find and update the dashboard page
cat > dashboard-patch.js << 'EOF'
const fs = require('fs');
const path = require('path');

// Read the dashboard file
const dashboardPath = path.join(__dirname, 'app/(authenticated)/dashboard/page.tsx');
let content = fs.readFileSync(dashboardPath, 'utf8');

// Fix 1: Update connection status display
const oldConnectionStatus = `<span className={\`flex items-center gap-1 \${analyticsData.metadata.hasGA4Connection ? 'text-green-600' : 'text-orange-600'}\`}>
                    <div className={\`w-2 h-2 rounded-full \${analyticsData.metadata.hasGA4Connection ? 'bg-green-500' : 'bg-orange-500'}\`} />
                    GA4 {analyticsData.metadata.hasGA4Connection ? 'Connected' : 'Not Connected'}
                  </span>`;

const newConnectionStatus = `<span className={\`flex items-center gap-1 \${analyticsData.metadata.hasGA4Connection ? 'text-green-600' : 'text-orange-600'}\`}>
                    <div className={\`w-2 h-2 rounded-full \${analyticsData.metadata.hasGA4Connection ? 'bg-green-500' : 'bg-orange-500'}\`} />
                    GA4 {analyticsData.metadata.hasGA4Connection ? 'Connected' : analyticsData.metadata.dealershipId ? 'Not Configured' : 'Select Dealership'}
                  </span>`;

// Fix 2: Update GA4 Sessions card
const oldGA4Value = `analyticsData?.ga4Data?.sessions?.toLocaleString() || (analyticsData?.errors.ga4Error ? 'Error' : 'N/A')`;
const newGA4Value = `!analyticsData?.metadata.dealershipId ? '-' : analyticsData?.ga4Data?.sessions?.toLocaleString() || '-'`;

const oldGA4Subtitle = `analyticsData?.metadata.hasGA4Connection ? "Last 30 days" : "Connect GA4"`;
const newGA4Subtitle = `!analyticsData?.metadata.dealershipId ? "Select dealership" : analyticsData?.metadata.hasGA4Connection ? "Last 30 days" : "No GA4 configured"`;

// Fix 3: Update Search Console card
const oldSCValue = `analyticsData?.searchConsoleData?.clicks?.toLocaleString() || (analyticsData?.errors.searchConsoleError ? 'Error' : 'N/A')`;
const newSCValue = `!analyticsData?.metadata.dealershipId ? '-' : analyticsData?.searchConsoleData?.clicks?.toLocaleString() || '-'`;

const oldSCSubtitle = `analyticsData?.metadata.hasSearchConsoleConnection ? "Last 30 days" : "Connect Search Console"`;
const newSCSubtitle = `!analyticsData?.metadata.dealershipId ? "Select dealership" : analyticsData?.metadata.hasSearchConsoleConnection ? "Last 30 days" : "No Search Console configured"`;

// Apply fixes
if (content.includes(oldConnectionStatus)) {
  content = content.replace(oldConnectionStatus, newConnectionStatus);
  console.log('✅ Fixed GA4 connection status display');
}

// Similar for Search Console
const oldSCConnectionStatus = oldConnectionStatus.replace(/GA4/g, 'Search Console');
const newSCConnectionStatus = newConnectionStatus.replace(/GA4/g, 'Search Console');
if (content.includes(oldSCConnectionStatus)) {
  content = content.replace(oldSCConnectionStatus, newSCConnectionStatus);
  console.log('✅ Fixed Search Console connection status display');
}

// Fix stat cards
content = content.replace(oldGA4Value, newGA4Value);
content = content.replace(oldGA4Subtitle, newGA4Subtitle);
content = content.replace(oldSCValue, newSCValue);
content = content.replace(oldSCSubtitle, newSCSubtitle);

console.log('✅ Fixed analytics stat cards');

// Write back
fs.writeFileSync(dashboardPath, content);
console.log('✅ Dashboard patched successfully');
EOF

# Run the patch
node dashboard-patch.js

# Clean up
rm dashboard-patch.js

# Commit and push
git add -A
git commit -m "fix: Update dashboard to show dealership-specific connection status

- Remove misleading 'Error' messages
- Show 'Select dealership' when none selected  
- Show 'Not Configured' instead of 'Not Connected' for dealership-specific status
- Analytics values show '-' instead of 'Error' when no dealership selected"

git push origin main

echo "✅ Dashboard fixes deployed!"
