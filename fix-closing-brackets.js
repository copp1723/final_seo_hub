#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('Fixing closing bracket issues...');

// Find all TypeScript files
const tsFiles = glob.sync('**/*.{ts,tsx}', {
  ignore: ['node_modules/**', '.next/**', 'dist/**', 'build/**'],
  nodir: true
});

let totalFixed = 0;

// Specific fixes for known issues
const specificFixes = [
  // Fix empty closing JSX tag patterns
  { pattern: /\/>\s*<\/CardContent>/g, replacement: '/>\n          </CardContent>' },
  { pattern: /}\s*<\/CardContent>/g, replacement: '}\n          </CardContent>' },
  { pattern: /}\s*<\/Card>/g, replacement: '}\n        </Card>' },
  
  // Fix closing brackets in JSX
  { pattern: /(\s*)\)}\s*$/gm, replacement: '$1)}' },
  
  // Clean up double closing brackets
  { pattern: /}}\s*}/g, replacement: '}}' },
  
  // Fix ending of files
  { pattern: /}\s*}\s*$/g, replacement: '}\n}' }
];

tsFiles.forEach(file => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    let originalContent = content;
    
    // Apply specific fixes
    specificFixes.forEach(fix => {
      content = content.replace(fix.pattern, fix.replacement);
    });
    
    // Ensure files end with newline
    if (!content.endsWith('\n')) {
      content += '\n';
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

console.log(`\nFixed closing bracket issues in ${totalFixed} files`);