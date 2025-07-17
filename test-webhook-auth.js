const crypto = require('crypto');

// Test the timing-safe comparison
const apiKey = '8dadbc27d7fbf88bbfe2d871882216eb5dca53829766d2224100d1fa55ce81df';
const expectedKey = '8dadbc27d7fbf88bbfe2d871882216eb5dca53829766d2224100d1fa55ce81df';

console.log('API Key:', apiKey);
console.log('Expected Key:', expectedKey);
console.log('Keys match:', apiKey === expectedKey);
console.log('Keys length match:', apiKey.length === expectedKey.length);

// Test timing-safe comparison
const result = crypto.timingSafeEqual(Buffer.from(apiKey), Buffer.from(expectedKey));
console.log('Timing-safe comparison:', result);

// Test with webhook secret from env
console.log('\nChecking env variable:');
console.log('SEOWORKS_WEBHOOK_SECRET:', process.env.SEOWORKS_WEBHOOK_SECRET);