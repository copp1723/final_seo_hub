#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('Fixing authentication checks...');

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
    
    // Fix malformed authentication checks
    // Pattern: if (!authResult.authenticated || !authResult.users return authResult.response
    content = content.replace(
      /if\s*\(\s*!authResult\.authenticated\s*\|\|\s*!authResult\.users?\s+return\s+authResult\.response/g,
      'if (!authResult.authenticated) return authResult.response'
    );
    
    // Fix similar patterns with user
    content = content.replace(
      /if\s*\(\s*!authResult\.authenticated\s*\|\|\s*!authResult\.user\)\s*{\s*return\s+authResult\.response/g,
      'if (!authResult.authenticated) {\n    return authResult.response'
    );
    
    // Fix inline patterns
    content = content.replace(
      /if\s*\(\s*!auth\.success\s*\|\|\s*!auth\.users?\s+return\s+auth\.response/g,
      'if (!auth.success) return auth.response'
    );
    
    if (content !== originalContent) {
      fs.writeFileSync(file, content, 'utf8');
      totalFixed++;
      console.log(`Fixed: ${file}`);
    }
  } catch (error) {
    console.error(`Error processing ${file}:`, error.message);
  }
});

console.log(`\nFixed authentication checks in ${totalFixed} files`);