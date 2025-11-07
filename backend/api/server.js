const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
require('dotenv').config();

const helpRequestRoutes = require('./routes/help-requests');
const knowledgeBaseRoutes = require('./routes/knowledge-base');
const { pool } = require('../db/config');
const { processTimeouts } = require('./services/helpRequest.service');

const app = express();
const PORT = process.env.PORT || 3000;

/**
 * Middleware
 */
app.use(cors()); // Enable CORS for frontend
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    // Log full URL including query parameters
    console.log(`${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

/**
 * Health check endpoint
 */
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await pool.query('SELECT 1');
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    });
  }
});

/**
 * API Routes
 */
app.use('/api/help-requests', helpRequestRoutes);
app.use('/api/knowledge-base', knowledgeBaseRoutes);

/**
 * 404 Handler
 */
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    timestamp: new Date().toISOString()
  });
});

/**
 * Global error handler
 * Catches all errors and returns consistent error responses
 */
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message,
      details: err.details
    });
  }

  if (err.code === '23505') { // PostgreSQL unique violation
    return res.status(409).json({
      error: 'Conflict',
      message: 'A record with this value already exists'
    });
  }

  // Default error response
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: err.name || 'Internal Server Error',
    message: err.message || 'An unexpected error occurred',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

/**
 * Graceful shutdown
 */
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  if (timeoutJob) {
    timeoutJob.stop();
    console.log('⏰ Timeout monitor stopped');
  }
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  if (timeoutJob) {
    timeoutJob.stop();
    console.log('⏰ Timeout monitor stopped');
  }
  await pool.end();
  process.exit(0);
});

/**
 * Start timeout monitor
 * Runs every minute to check for and process timed-out requests
 */
let timeoutJob = null;

function startTimeoutMonitor() {
  // Run every minute (cron syntax: '* * * * *' = every minute)
  timeoutJob = cron.schedule('* * * * *', async () => {
    try {
      await processTimeouts();
    } catch (error) {
      console.error('Error in timeout monitor:', error);
    }
  });

  console.log('⏰ Timeout monitor started (runs every minute)');
}

/**
 * Start server
 */
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║  Frontdesk AI Supervisor API Server                  ║
║  Environment: ${process.env.NODE_ENV || 'development'}${' '.repeat(37 - (process.env.NODE_ENV || 'development').length)}║
║  Port: ${PORT}${' '.repeat(45 - PORT.toString().length)}║
║  Health: http://localhost:${PORT}/health${' '.repeat(23 - PORT.toString().length)}║
╚═══════════════════════════════════════════════════════╝
  `);

  // Start the timeout monitor after server is running
  startTimeoutMonitor();
});

module.exports = app;
