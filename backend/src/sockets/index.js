const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { User } = require('../models');
const logger = require('../utils/logger');

let io = null;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (env.ALLOWED_ORIGINS_ARRAY.includes(origin) || env.NODE_ENV === 'development' || env.NODE_ENV === 'test') {
          return callback(null, true);
        }
        return callback(new Error('CORS origin not allowed'));
      },
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  // JWT-Authenticated Socket Handshake
  io.use(async (socket, next) => {
    try {
      let token = socket.handshake.auth?.token;

      if (!token && socket.handshake.headers?.authorization) {
        const parts = socket.handshake.headers.authorization.split(' ');
        if (parts.length === 2 && parts[0] === 'Bearer') {
          token = parts[1];
        }
      }

      if (!token && socket.handshake.headers?.cookie) {
        const cookies = socket.handshake.headers.cookie.split(';').reduce((acc, curr) => {
          const [k, v] = curr.trim().split('=');
          acc[k] = v;
          return acc;
        }, {});
        token = cookies.accessToken;
      }

      if (!token) {
        return next(new Error('Authentication error: Token required'));
      }

      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
      if (decoded.is2FAPending) {
        return next(new Error('Authentication error: 2FA verification required'));
      }

      const user = await User.findById(decoded.sub).select('_id role clinicId status');
      if (!user || user.status !== 'active') {
        return next(new Error('Authentication error: User inactive or not found'));
      }

      socket.user = user;
      next();
    } catch (err) {
      logger.warn(`🔌 Socket auth failed: ${err.message}`);
      next(new Error(`Authentication error: ${err.message}`));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    logger.info(`🔌 Socket connected: User ${user._id} (${user.role}) [Socket ID: ${socket.id}]`);

    // Join user-specific room
    socket.join(`user:${user._id}`);

    // Join clinic-specific room if applicable
    if (user.clinicId) {
      socket.join(`clinic:${user.clinicId}`);
    }

    socket.on('disconnect', (reason) => {
      logger.info(`🔌 Socket disconnected: User ${user._id} (${reason})`);
    });
  });

  logger.info('✅ Socket.IO server initialized successfully');
  return io;
};

const getIO = () => {
  return io;
};

module.exports = {
  initSocket,
  getIO
};
