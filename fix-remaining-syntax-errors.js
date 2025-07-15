#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('Fixing remaining syntax errors...');

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
    
    // Fix malformed auth checks
    // Pattern: if (!session?.users {
    content = content.replace(/if\s*\(\s*!session\?\.\s*users\s*{/g, 'if (!session?.user) {');
    
    // Pattern: if (!session?.users.id) {
    content = content.replace(/if\s*\(\s*!session\?\.\s*users\.id\s*\)/g, 'if (!session?.user?.id)');
    
    // Pattern: if (!authResult.authenticated || !authResult.users return
    content = content.replace(/if\s*\(\s*!authResult\.authenticated\s*\|\|\s*!authResult\.users\s+return/g, 'if (!authResult.authenticated) return');
    
    // Pattern: req: typeof requests
    content = content.replace(/req:\s*typeof\s+requests/g, 'req: Request');
    
    // Fix property access patterns with extra spaces/commas
    // Pattern: thing. thing
    content = content.replace(/(\w+)\.\s+(\w+)/g, '$1.$2');
    
    // Fix trailing dots before commas, brackets, etc.
    content = content.replace(/(\w+)\.\s*([,\}\)\]<>])/g, '$1$2');
    
    // Fix object property issues
    content = content.replace(/(\w+):\s*{\s*,/g, '$1: {');
    
    // Fix double commas
    content = content.replace(/,\s*,/g, ',');
    
    // Fix specific auth patterns
    content = content.replace(/const auth = await requireAuth\(\)\s*if\s*\(\s*!auth\.success\s*\|\|\s*!auth\.users/g, 'const auth = await requireAuth()\n  if (!auth.authenticated');
    
    // Fix authResult patterns 
    content = content.replace(/const authResult = await requireAuth\(\)\s*if\s*\(\s*!authResult\.authenticated\s*\|\|\s*!authResult\.users/g, 'const authResult = await requireAuth()\n  if (!authResult.authenticated');
    
    if (content !== originalContent) {
      fs.writeFileSync(file, content, 'utf8');
      totalFixed++;
      console.log(`Fixed: ${file}`);
    }
  } catch (error) {
    console.error(`Error processing ${file}:`, error.message);
  }
});

console.log(`\nFixed syntax errors in ${totalFixed} files`);