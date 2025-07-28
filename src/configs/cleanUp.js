// scripts/cleanupTokens.js
const { cleanupExpiredTokens } = require('./setup');

cleanupExpiredTokens()
  .then(() => {
    console.log('✅ Token cleanup complete');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Cleanup error:', err);
    process.exit(1);
  });
