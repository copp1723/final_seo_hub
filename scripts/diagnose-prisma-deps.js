#!/usr/bin/env node

console.log('=== PRISMA DEPENDENCY DIAGNOSIS ===');
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('Platform:', process.platform);
console.log('Node version:', process.version);

// Check if @prisma/engines is available
try {
  const enginesPath = require.resolve('@prisma/engines');
  console.log('✅ @prisma/engines found at:', enginesPath);
} catch (error) {
  console.log('❌ @prisma/engines NOT FOUND:', error.message);
}

// Check if prisma is available
try {
  const prismaPath = require.resolve('prisma');
  console.log('✅ prisma found at:', prismaPath);
} catch (error) {
  console.log('❌ prisma NOT FOUND:', error.message);
}

// Check if @prisma/client is available
try {
  const clientPath = require.resolve('@prisma/client');
  console.log('✅ @prisma/client found at:', clientPath);
} catch (error) {
  console.log('❌ @prisma/client NOT FOUND:', error.message);
}

// List all prisma-related packages
console.log('\n=== INSTALLED PRISMA PACKAGES ===');
const fs = require('fs');
const path = require('path');

try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  console.log('Production dependencies:');
  Object.keys(packageJson.dependencies || {})
    .filter(pkg => pkg.includes('prisma'))
    .forEach(pkg => console.log(`  ${pkg}: ${packageJson.dependencies[pkg]}`));
    
  console.log('Dev dependencies:');
  Object.keys(packageJson.devDependencies || {})
    .filter(pkg => pkg.includes('prisma'))
    .forEach(pkg => console.log(`  ${pkg}: ${packageJson.devDependencies[pkg]}`));
} catch (error) {
  console.log('Error reading package.json:', error.message);
}

console.log('\n=== DIAGNOSIS COMPLETE ===');