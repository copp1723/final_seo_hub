#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all route.ts files in the app directory
const routeFiles = glob.sync('app/api/**/route.ts', { 
  ignore: ['**/node_modules/**', '**/auth/**'] 
});

console.log(`Found ${routeFiles.length} API route files to update\n`);

let updatedCount = 0;
let skippedCount = 0;

routeFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  let updated = content;
  let changes = [];
  
  // Update import statements
  if (content.includes("import { auth } from '@/lib/auth'")) {
    updated = updated.replace(
      "import { auth } from '@/lib/auth'",
      "import { requireAuth } from '@/lib/api-auth'"
    );
    changes.push('Updated auth import');
  }
  
  // Update direct auth() calls to requireAuth(request)
  if (content.includes('await auth()')) {
    // Find function signatures to get request parameter name
    const funcMatches = content.matchAll(/export\s+async\s+function\s+\w+\s*\(([^)]*)\)/g);
    for (const match of funcMatches) {
      const params = match[1];
      if (params.includes('request') || params.includes('req')) {
        const requestParam = params.includes('request') ? 'request' : 'req';
        updated = updated.replace(
          /const\s+session\s*=\s*await\s+auth\(\)/g,
          `const authResult = await requireAuth(${requestParam})\n  if (!authResult.authenticated) return authResult.response\n  const session = { user: authResult.user }`
        );
        changes.push('Updated auth() to requireAuth(request)');
      }
    }
  }
  
  // Update requireAuth() without params
  if (content.includes('requireAuth()') && !content.includes('requireAuth(request)')) {
    const funcMatches = content.matchAll(/export\s+async\s+function\s+\w+\s*\(([^)]*)\)/g);
    for (const match of funcMatches) {
      const params = match[1];
      if (params.includes('request') || params.includes('req')) {
        const requestParam = params.includes('request') ? 'request' : 'req';
        updated = updated.replace(
          /requireAuth\(\)/g,
          `requireAuth(${requestParam})`
        );
        changes.push('Added request parameter to requireAuth');
      }
    }
  }
  
  // Write back if changed
  if (updated !== content) {
    fs.writeFileSync(file, updated);
    console.log(`✅ ${file}`);
    changes.forEach(change => console.log(`   - ${change}`));
    updatedCount++;
  } else {
    skippedCount++;
  }
});

console.log(`\n✅ Updated ${updatedCount} files`);
console.log(`⏭️  Skipped ${skippedCount} files (no changes needed)`);