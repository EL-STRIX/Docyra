import { useEffect } from 'react';
import useSocket from './useSocket.js';

export function useSocketEvent(eventName, callback) {
  const { socket } = useSocket() || {};

  useEffect(() => {
    if (!socket || !eventName || !callback) return;

    socket.on(eventName, callback);

    return () => {
      socket.off(eventName, callback);
    };
  }, [socket, eventName, callback]);
}

export default useSocketEvent;
