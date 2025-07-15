#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('Fixing final syntax errors...');

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
    
    // Fix remaining auth patterns
    content = content.replace(/if\s*\(\s*!authResult\.authenticated\s*\|\|\s*!authResult\.users\s*{/g, 'if (!authResult.authenticated) {');
    
    // Fix property access with extra dots in specific patterns
    content = content.replace(/\.agencies\.(name|id)(\s*[,\}\)\]])/g, '.agencies?.$1$2');
    content = content.replace(/\.users\.(name|id|email)(\s*[,\}\)\]])/g, '.users?.$1$2');
    content = content.replace(/\.dealerships\.(name|id)(\s*[,\}\)\]])/g, '.dealerships?.$1$2');
    
    // Fix incomplete object destructuring
    content = content.replace(/,\s*}\s*=/g, ' } =');
    
    // Fix trailing commas in object literals
    content = content.replace(/,(\s*[}\]])/g, '$1');
    
    // Fix specific pattern with e.g,
    content = content.replace(/e\.g,/g, 'e.g.,');
    
    // Fix incomplete closing tags
    content = content.replace(/(<\/\w+>)\s*}\s*$/gm, '$1');
    
    // Fix double spaces after periods
    content = content.replace(/\.\s{2,}(?=[A-Z])/g, '. ');
    
    // Fix incomplete try-catch blocks
    if (content.includes('} catch') && !content.includes('} catch (')) {
      content = content.replace(/}\s*catch\s*{/g, '} catch (error) {');
    }
    
    if (content !== originalContent) {
      fs.writeFileSync(file, content, 'utf8');
      totalFixed++;
      console.log(`Fixed: ${file}`);
    }
  } catch (error) {
    console.error(`Error processing ${file}:`, error.message);
  }
});

console.log(`\nFixed final syntax errors in ${totalFixed} files`);