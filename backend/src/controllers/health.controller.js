import mongoose from 'mongoose';
import { env } from '../config/env.js';

export const getHealth = (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

  res.status(200).json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: env.NODE_ENV,
      services: {
        database: dbStatus,
        api: 'online',
      },
    },
  });
};

export default {
  getHealth,
};
