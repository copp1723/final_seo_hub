#!/bin/bash

echo "🚀 Comprehensive Deployment Fix for Render"
echo "=========================================="

# 1. Fix all API routes to be dynamic (prevents static generation errors)
echo ""
echo "📝 Adding dynamic configuration to API routes..."

cat > add-dynamic-config.js << 'EOF'
const fs = require('fs');
const path = require('path');

function addDynamicConfig(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      addDynamicConfig(filePath);
    } else if (file === 'route.ts' || file === 'route.js') {
      console.log(`Processing ${filePath}...`);
      
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Check if dynamic config already exists
      if (!content.includes('export const dynamic')) {
        // Add dynamic config at the top of the file after imports
        const importMatch = content.match(/((?:import[\s\S]*?from\s+['"][\s\S]*?['"];?\s*\n)*)/);
        if (importMatch) {
          const imports = importMatch[1];
          const restOfFile = content.slice(imports.length);
          
          content = imports + '\n// Force dynamic rendering to prevent build-time errors\nexport const dynamic = \'force-dynamic\';\n' + restOfFile;
        } else {
          content = '// Force dynamic rendering to prevent build-time errors\nexport const dynamic = \'force-dynamic\';\n\n' + content;
        }
        
        fs.writeFileSync(filePath, content);
        console.log(`✅ Updated ${filePath}`);
      } else {
        console.log(`⏭️  Skipped ${filePath} (already has dynamic config)`);
      }
    }
  });
}

// Process API routes
const apiDir = path.join(__dirname, 'app', 'api');
if (fs.existsSync(apiDir)) {
  console.log('Processing API routes...\n');
  addDynamicConfig(apiDir);
  console.log('\n✅ All API routes updated with dynamic config');
} else {
  console.error('❌ API directory not found');
  process.exit(1);
}
EOF

# Run the script
node add-dynamic-config.js

# Clean up
rm add-dynamic-config.js

# 2. Clear build cache
echo ""
echo "🧹 Clearing build cache..."
rm -rf .next
rm -rf node_modules/.cache

# 3. Install dependencies (ensure everything is up to date)
echo ""
echo "📦 Installing dependencies..."
npm install

# 4. Run a test build
echo ""
echo "🔨 Running test build..."
npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build successful!"
    echo ""
    echo "📌 Next steps:"
    echo "1. Commit all changes:"
    echo "   git add -A"
    echo "   git commit -m 'Fix deployment: Update Mailgun validation and make API routes dynamic'"
    echo ""
    echo "2. Push to your repository:"
    echo "   git push origin main"
    echo ""
    echo "3. Your Render deployment should now work!"
    echo ""
    echo "Note: The deployment fixes include:"
    echo "- Updated Mailgun API key validation (no longer requires 'key-' prefix)"
    echo "- Made all API routes dynamic to prevent static generation errors"
    echo "- Cleared build cache to ensure clean deployment"
else
    echo ""
    echo "❌ Build failed. Please check the errors above."
    echo ""
    echo "Common issues:"
    echo "1. Check if all environment variables are set correctly"
    echo "2. Ensure database connection is working"
    echo "3. Look for any syntax errors in the code"
    exit 1
fi
