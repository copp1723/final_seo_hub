#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('Fixing property access errors...');

// Find all TypeScript files
const tsFiles = glob.sync('**/*.{ts,tsx}', {
  ignore: ['node_modules/**', '.next/**', 'dist/**', 'build/**'],
  nodir: true
});

let totalFixed = 0;

tsFiles.forEach(file => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    let originalContent = content;
    
    // Pattern 1: Fix array access with extra dot (e.g., .dealerships.[0] -> .dealerships[0])
    content = content.replace(/\.(\w+)\.\[/g, '.$1[');
    
    // Pattern 2: Fix property access with trailing dot (e.g., ._count.requests. -> ._count.requests)
    content = content.replace(/\.(\w+)\.(\s*[,\}\)\]\s<>])/g, '.$1$2');
    
    // Pattern 3: Fix specific pattern for object property access with extra dot
    content = content.replace(/(\w+)\.(\s*[,\}\)\]])/g, '$1$2');
    
    // Pattern 4: Fix cases like user?.dealerships. or user.dealerships.
    content = content.replace(/(\?\.)(\w+)\.\s*([,\}\)\]])/g, '$1$2$3');
    content = content.replace(/(\.)(\w+)\.\s*([,\}\)\]])/g, '$1$2$3');
    
    if (content !== originalContent) {
      fs.writeFileSync(file, content, 'utf8');
      totalFixed++;
      console.log(`Fixed: ${file}`);
    }
  } catch (error) {
    console.error(`Error processing ${file}:`, error.message);
  }
});

console.log(`\nFixed property access errors in ${totalFixed} files`);