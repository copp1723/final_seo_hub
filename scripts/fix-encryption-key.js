#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log('🔐 Encryption Key Fix Script\n');

// Generate a proper encryption key
function generateSecureKey(length = 64) {
  return crypto.randomBytes(length / 2).toString('hex');
}

// Current weak key
const currentKey = 'a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890';

// Generate new secure key
const newKey = generateSecureKey(64);

console.log('❌ Current WEAK encryption key detected:');
console.log(`   ${currentKey}\n`);

console.log('✅ New SECURE encryption key generated:');
console.log(`   ${newKey}\n`);

console.log('📋 Instructions to fix:\n');
console.log('1. Update your .env file with the new key:');
console.log(`   ENCRYPTION_KEY=${newKey}\n`);

console.log('2. If you have existing encrypted data, you\'ll need to:');
console.log('   - Decrypt with the old key');
console.log('   - Re-encrypt with the new key');
console.log('   - Update the database\n');

console.log('3. For production deployment on Render:');
console.log('   - Go to your Render dashboard');
console.log('   - Navigate to Environment > Environment Variables');
console.log('   - Update ENCRYPTION_KEY with the new value\n');

// Check if we should update the .env file
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  if (envContent.includes(currentKey)) {
    console.log('🔄 Would you like to automatically update the .env file? (This will create a backup)');
    console.log('   Run with --update flag to auto-update: node fix-encryption-key.js --update');
    
    if (process.argv.includes('--update')) {
      // Backup current .env
      const backupPath = `${envPath}.backup.${Date.now()}`;
      fs.copyFileSync(envPath, backupPath);
      console.log(`\n✅ Backup created: ${backupPath}`);
      
      // Update .env
      const updatedContent = envContent.replace(
        `ENCRYPTION_KEY=${currentKey}`,
        `ENCRYPTION_KEY=${newKey}`
      );
      fs.writeFileSync(envPath, updatedContent);
      console.log('✅ .env file updated with new encryption key');
    }
  }
}

console.log('\n⚠️  IMPORTANT: After updating the encryption key:');
console.log('   - Restart your application');
console.log('   - Test OAuth connections');
console.log('   - Users may need to reconnect their Google accounts');