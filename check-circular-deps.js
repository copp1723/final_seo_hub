#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const visited = new Set();
const visiting = new Set();
const dependencies = new Map();

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

function extractImports(filePath, content) {
  const imports = [];
  const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
  
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    if (importPath.startsWith('.')) {
      const resolvedPath = resolveImportPath(importPath, filePath);
      if (resolvedPath) {
        imports.push(resolvedPath);
      }
    }
  }
  
  return imports;
}

function resolveImportPath(importPath, fromFile) {
  const fromDir = path.dirname(fromFile);
  const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'];
  const resolvedPath = path.resolve(fromDir, importPath);
  
  for (const ext of extensions) {
    const fullPath = resolvedPath + ext;
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }
  
  return null;
}

function detectCycles(node, ancestors = []) {
  if (visiting.has(node)) {
    const cycleStart = ancestors.indexOf(node);
    return ancestors.slice(cycleStart).concat(node);
  }
  
  if (visited.has(node)) {
    return null;
  }
  
  visiting.add(node);
  ancestors.push(node);
  
  const deps = dependencies.get(node) || [];
  for (const dep of deps) {
    const cycle = detectCycles(dep, [...ancestors]);
    if (cycle) {
      return cycle;
    }
  }
  
  visiting.delete(node);
  visited.add(node);
  
  return null;
}

// Build dependency graph
const files = getAllFiles('.');
console.log(`Analyzing ${files.length} files for circular dependencies...\n`);

files.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const imports = extractImports(file, content);
    dependencies.set(file, imports);
  } catch (error) {
    // Ignore errors
  }
});

// Detect cycles
const cycles = [];
for (const file of files) {
  if (!visited.has(file)) {
    const cycle = detectCycles(file);
    if (cycle) {
      cycles.push(cycle);
    }
  }
}

// Report results
if (cycles.length > 0) {
  console.log(`❌ Found ${cycles.length} circular dependencies:\n`);
  cycles.forEach((cycle, i) => {
    console.log(`Cycle ${i + 1}:`);
    cycle.forEach((file, j) => {
      const relativePath = path.relative(process.cwd(), file);
      console.log(`  ${j === cycle.length - 1 ? '└─>' : '├─>'} ${relativePath}`);
    });
    console.log('');
  });
} else {
  console.log('✅ No circular dependencies found!');
}