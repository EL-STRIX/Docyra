const { getIO } = require('../../sockets');
const logger = require('../../utils/logger');

class SocketChannel {
  /**
   * Emit real-time event to targeted rooms (user or clinic)
   */
  async send({ recipientId, clinicId, event, data }) {
    try {
      const io = getIO();
      if (!io) {
        logger.debug('🔌 [SocketChannel] Socket.IO not initialized, skipping emission');
        return false;
      }

      if (recipientId) {
        io.to(`user:${recipientId}`).emit(event, data);
        logger.info(`🔌 [SocketChannel] Emitted "${event}" to user:${recipientId}`);
      }

      if (clinicId) {
        io.to(`clinic:${clinicId}`).emit(event, data);
        logger.info(`🔌 [SocketChannel] Emitted "${event}" to clinic:${clinicId}`);
      }

      return true;
    } catch (err) {
      logger.error(`❌ [SocketChannel] Emission error: ${err.message}`);
      return false;
    }
  }
}

module.exports = new SocketChannel();
