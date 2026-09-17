const http = require('http');
const app = require('./app');
const env = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');
const { initSocket } = require('./sockets');
const { startSlotGenerationJob, stopSlotGenerationJob } = require('./jobs/slotGeneration.job');
const { startReminderJob, stopReminderJob } = require('./jobs/reminder.job');
const logger = require('./utils/logger');

const server = http.createServer(app);

// Initialize Socket.IO
const io = initSocket(server);

const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    // Start background cron jobs in non-test environments
    if (env.NODE_ENV !== 'test') {
      startSlotGenerationJob();
      startReminderJob();
    }

    // Start HTTP server
    server.listen(env.PORT, () => {
      logger.info(`🚀 Docyra API Server listening on port ${env.PORT} [${env.NODE_ENV}]`);
      logger.info(`🩺 Health check available at: http://localhost:${env.PORT}/api/v1/health`);
    });
  } catch (error) {
    logger.error(`❌ Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

// Graceful Shutdown
const handleShutdown = async (signal) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  stopSlotGenerationJob();
  stopReminderJob();
  server.close(async () => {
    logger.info('HTTP server closed');
    await disconnectDB();
    process.exit(0);
  });

  // Force close after 10s if graceful shutdown hangs
  setTimeout(() => {
    logger.error('Forced shutdown due to timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = { server, app, io };
