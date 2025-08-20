#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get all TypeScript files that might have Prisma issues
function getAllTSFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      getAllTSFiles(fullPath, files);
    } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Common fixes for Prisma issues
const commonFixes = [
  // Fix relation queries - replace 'users' with proper relations
  {
    pattern: /include:\s*{\s*users:\s*true\s*}/g,
    replacement: 'include: { user_dealership_access: true }'
  },
  {
    pattern: /include:\s*{\s*users:\s*{\s*select:\s*{[^}]+}\s*}\s*}/g,
    replacement: 'include: { user_dealership_access: { include: { users: { select: { id: true, email: true, name: true } } } } }'
  },
  {
    pattern: /where:\s*{\s*users:\s*{\s*some:\s*{\s*id:\s*([^}]+)\s*}\s*}\s*}/g,
    replacement: 'where: { user_dealership_access: { some: { userId: $1, isActive: true } } }'
  },
  
  // Fix create operations - remove explicit id and updatedAt
  {
    pattern: /data:\s*{\s*id:\s*[^,]+,/g,
    replacement: 'data: {'
  },
  {
    pattern: /,\s*updatedAt:\s*new Date\(\)/g,
    replacement: ''
  },
  {
    pattern: /updatedAt:\s*new Date\(\),/g,
    replacement: ''
  },
  {
    pattern: /,\s*createdAt:\s*new Date\(\)/g,
    replacement: ''
  },
  {
    pattern: /createdAt:\s*new Date\(\),/g,
    replacement: ''
  },
  
  // Fix property access on relations
  {
    pattern: /\.agencies\.name/g,
    replacement: '.agencies.name'
  },
  {
    pattern: /\.dealerships\.name/g,
    replacement: '.dealerships.name'
  },
  
  // Fix _count queries
  {
    pattern: /_count:\s*{\s*select:\s*{\s*users:\s*true\s*}\s*}/g,
    replacement: '_count: { select: { user_dealership_access: true } }'
  },
  {
    pattern: /\._count\.users/g,
    replacement: '._count.user_dealership_access'
  },
  
  // Fix select queries
  {
    pattern: /select:\s*{[^}]*dealerships:\s*true[^}]*}/g,
    replacement: 'select: { id: true, name: true, email: true, role: true, agencyId: true, dealershipId: true, currentDealershipId: true }'
  },
  
  // Fix include queries
  {
    pattern: /include:\s*{[^}]*dealerships:\s*true[^}]*}/g,
    replacement: 'include: { user_dealership_access: { include: { dealerships: true } } }'
  }
];

// Apply fixes to a file
function fixFile(filePath) {
  if (!fs.existsSync(filePath)) return false;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  for (const fix of commonFixes) {
    const newContent = content.replace(fix.pattern, fix.replacement);
    if (newContent !== content) {
      content = newContent;
      changed = true;
    }
  }
  
  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed ${path.relative(process.cwd(), filePath)}`);
    return true;
  }
  
  return false;
}

// Main execution
console.log('🔧 Fixing Prisma TypeScript errors...\n');

const tsFiles = getAllTSFiles('./app');
let fixedCount = 0;

for (const file of tsFiles) {
  if (fixFile(file)) {
    fixedCount++;
  }
}

console.log(`\n📊 Fixed ${fixedCount} files`);

// Check compilation status
console.log('\n🔍 Checking TypeScript compilation...');
try {
  execSync('npx tsc --noEmit', { stdio: 'pipe' });
  console.log('✅ TypeScript compilation successful!');
} catch (error) {
  const errorOutput = error.stdout.toString();
  const errorCount = (errorOutput.match(/error TS/g) || []).length;
  console.log(`⚠️  ${errorCount} TypeScript errors remaining`);
  
  // Show first few errors
  const lines = errorOutput.split('\n').slice(0, 10);
  console.log('\nFirst few errors:');
  lines.forEach(line => {
    if (line.trim()) console.log(line);
  });
}

console.log('\n🎉 Prisma fix script completed!');