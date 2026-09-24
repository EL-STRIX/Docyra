import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import logger from '../utils/logger.js';

let ioInstance = null;

/**
 * Initialize Socket.IO with JWT authentication and room subscriptions
 * @param {import('socket.io').Server} io
 */
export const initSocketServer = (io) => {
  ioInstance = io;

  // Authentication Middleware for WebSocket Connections
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '') ||
        socket.handshake.headers?.cookie
          ?.split(';')
          .find((c) => c.trim().startsWith('accessToken='))
          ?.split('=')[1];

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
      socket.user = decoded;
      return next();
    } catch (err) {
      logger.warn(`Socket connection rejected: ${err.message}`);
      return next(new Error('Invalid or expired socket authentication token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    logger.info(`User connected to Socket.IO: ${user.email} (${user.id})`);

    // 1. Join personal user room
    const userRoom = `user:${user.id}`;
    socket.join(userRoom);

    // 2. Join clinic room if affiliated
    if (user.clinicId) {
      const clinicRoom = `clinic:${user.clinicId}`;
      socket.join(clinicRoom);
      logger.info(`Socket ${socket.id} joined clinic room: ${clinicRoom}`);
    }

    socket.on('disconnect', () => {
      logger.info(`User disconnected from Socket.IO: ${user.email} (${user.id})`);
    });
  });

  logger.info('Socket.IO authentication and room handlers initialized');
  return ioInstance;
};

/**
 * Get Socket.IO instance
 */
export const getIO = () => ioInstance;

/**
 * Emit real-time event to a specific user's private room
 */
export const emitToUser = (userId, event, payload) => {
  if (ioInstance && userId) {
    ioInstance.to(`user:${userId}`).emit(event, payload);
  }
};

/**
 * Emit real-time event to a clinic's room (staff/admin)
 */
export const emitToClinic = (clinicId, event, payload) => {
  if (ioInstance && clinicId) {
    ioInstance.to(`clinic:${clinicId}`).emit(event, payload);
  }
};

export default {
  initSocketServer,
  getIO,
  emitToUser,
  emitToClinic,
};
