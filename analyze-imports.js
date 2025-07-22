#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const issues = {
  missingImports: [],
  circularDependencies: [],
  incorrectPaths: [],
  missingPackages: [],
  unusedImports: [],
  importExportMismatch: [],
  caseSensitivity: [],
  missingExtensions: []
};

// Get all TS/JS files
function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!filePath.includes('node_modules') && 
          !filePath.includes('.next') && 
          !filePath.includes('dist') &&
          !filePath.includes('build')) {
        getAllFiles(filePath, fileList);
      }
    } else {
      if (file.match(/\.(ts|tsx|js|jsx)$/)) {
        fileList.push(filePath);
      }
    }
  });
  
  return fileList;
}

// Extract imports from file
function extractImports(content) {
  const imports = [];
  
  // ES6 imports
  const es6ImportRegex = /import\s+(?:(?:\{[^}]*\})|(?:\*\s+as\s+\w+)|(?:\w+))?\s*(?:,\s*(?:\{[^}]*\}|\w+))?\s*from\s*['"]([^'"]+)['"]/g;
  const requireRegex = /(?:const|let|var)\s+(?:\{[^}]*\}|\w+)\s*=\s*require\s*\(['"]([^'"]+)['"]\)/g;
  const dynamicImportRegex = /import\s*\(['"]([^'"]+)['"]\)/g;
  
  let match;
  while ((match = es6ImportRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  while ((match = requireRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  while ((match = dynamicImportRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  
  return imports;
}

// Check if import path resolves
function checkImportPath(importPath, fromFile) {
  const fromDir = path.dirname(fromFile);
  
  // Skip node_modules imports
  if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
    return { valid: true, type: 'node_module' };
  }
  
  // Try different extensions
  const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'];
  const resolvedPath = path.resolve(fromDir, importPath);
  
  for (const ext of extensions) {
    if (fs.existsSync(resolvedPath + ext)) {
      return { valid: true, resolved: resolvedPath + ext };
    }
  }
  
  return { valid: false, attempted: resolvedPath };
}

// Analyze file
function analyzeFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const imports = extractImports(content);
    
    imports.forEach(importPath => {
      const result = checkImportPath(importPath, filePath);
      
      if (!result.valid && result.type !== 'node_module') {
        issues.incorrectPaths.push({
          file: filePath,
          import: importPath,
          attempted: result.attempted
        });
      }
      
      // Check for node_module imports
      if (result.type === 'node_module' && !importPath.includes('@types/')) {
        const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
        const allDeps = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies
        };
        
        const packageName = importPath.split('/')[0].replace('@', '');
        if (!allDeps[importPath] && !allDeps[packageName] && !allDeps[`@${packageName}`]) {
          issues.missingPackages.push({
            file: filePath,
            package: importPath
          });
        }
      }
    });
    
  } catch (error) {
    console.error(`Error analyzing ${filePath}:`, error.message);
  }
}

// Main analysis
console.log('Starting import analysis...\n');

const files = getAllFiles('.');
console.log(`Found ${files.length} files to analyze\n`);

files.forEach(file => {
  analyzeFile(file);
});

// Report results
console.log('\n=== IMPORT ANALYSIS RESULTS ===\n');

if (issues.incorrectPaths.length > 0) {
  console.log(`\n❌ INCORRECT IMPORT PATHS (${issues.incorrectPaths.length}):`);
  issues.incorrectPaths.forEach(issue => {
    console.log(`  File: ${issue.file}`);
    console.log(`  Import: "${issue.import}"`);
    console.log(`  Attempted: ${issue.attempted}`);
    console.log('');
  });
}

if (issues.missingPackages.length > 0) {
  console.log(`\n❌ MISSING NPM PACKAGES (${issues.missingPackages.length}):`);
  const uniquePackages = [...new Set(issues.missingPackages.map(i => i.package))];
  uniquePackages.forEach(pkg => {
    console.log(`  - ${pkg}`);
  });
}

console.log('\nAnalysis complete!');