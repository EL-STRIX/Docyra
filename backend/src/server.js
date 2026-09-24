import http from 'http';
import { Server as SocketIOServer } from 'socket.io';

import app from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import logger from './utils/logger.js';
import { startSlotGenerationCron } from './jobs/slotGeneration.job.js';
import { startReminderCron } from './jobs/reminder.job.js';
import { initSocketServer } from './sockets/index.js';

const server = http.createServer(app);

// Initialize Socket.IO with authentication and room subscriptions
const io = new SocketIOServer(server, {
  cors: {
    origin: env.ALLOWED_ORIGINS,
    credentials: true,
  },
});

initSocketServer(io);

// Start Server
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    // Start background cron jobs (slot generation, reminders)
    if (env.NODE_ENV !== 'test') {
      startSlotGenerationCron();
      startReminderCron();
    }

    server.listen(env.PORT, () => {
      logger.info(`Docyra Backend API listening on port ${env.PORT} in ${env.NODE_ENV} mode`);
      logger.info(`Health check available at http://localhost:${env.PORT}/api/v1/health`);
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();

export { app, server, io };
