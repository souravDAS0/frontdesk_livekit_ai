const { processTimeouts } = require('../services/helpRequest.service');
const { pool } = require('../../db/config');

/**
 * Background job to monitor and process timed-out help requests
 * Runs periodically to mark requests as timed-out
 */

const INTERVAL_MS = 60000; // Check every 60 seconds (1 minute)

async function monitorTimeouts() {
  console.log('🔄 Timeout monitor started...\n');

  const intervalId = setInterval(async () => {
    try {
      await processTimeouts();
    } catch (error) {
      console.error('Error processing timeouts:', error);
    }
  }, INTERVAL_MS);

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, stopping timeout monitor...');
    clearInterval(intervalId);
    await pool.end();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('\nSIGINT received, stopping timeout monitor...');
    clearInterval(intervalId);
    await pool.end();
    process.exit(0);
  });
}

// Run if executed directly
if (require.main === module) {
  monitorTimeouts();
}

module.exports = { monitorTimeouts };
