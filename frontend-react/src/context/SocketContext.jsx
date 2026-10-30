import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import useAuth from './useAuth.js';
import { SocketContext } from './socketContextDefinition.js';

export function SocketProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
      return;
    }

    const derivedBackendUrl = import.meta.env.VITE_API_BASE_URL
      ? import.meta.env.VITE_API_BASE_URL.replace(/\/api\/v1\/?$/, '')
      : 'http://localhost:5000';
    const socketUrl = import.meta.env.VITE_SOCKET_URL || derivedBackendUrl;
    const newSocket = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Global event listeners
    newSocket.on('appointment:created', (payload) => {
      setNotifications((prev) => [
        {
          id: Date.now(),
          type: 'appointment:created',
          title: 'Appointment Confirmed',
          message: `Your appointment with ${payload.doctorName || 'your doctor'} on ${payload.date || 'the scheduled date'} is confirmed.`,
          timestamp: new Date().toISOString(),
          data: payload,
        },
        ...prev,
      ]);
    });

    newSocket.on('appointment:statusChanged', (payload) => {
      setNotifications((prev) => [
        {
          id: Date.now(),
          type: 'appointment:statusChanged',
          title: 'Status Updated',
          message: `Appointment status updated to ${payload.status}.`,
          timestamp: new Date().toISOString(),
          data: payload,
        },
        ...prev,
      ]);
    });

    newSocket.on('appointment:cancelled', (payload) => {
      setNotifications((prev) => [
        {
          id: Date.now(),
          type: 'appointment:cancelled',
          title: 'Appointment Cancelled',
          message: `Appointment has been cancelled (${payload.reason || 'Notice'}).`,
          timestamp: new Date().toISOString(),
          data: payload,
        },
        ...prev,
      ]);
    });

    newSocket.on('waitlist:slotAvailable', (payload) => {
      setNotifications((prev) => [
        {
          id: Date.now(),
          type: 'waitlist:slotAvailable',
          title: 'Slot Available!',
          message: 'An appointment slot opened up matching your waitlist preference!',
          timestamp: new Date().toISOString(),
          data: payload,
        },
        ...prev,
      ]);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [isAuthenticated, user]);

  const clearNotifications = () => setNotifications([]);

  return (
    <SocketContext.Provider value={{ socket, notifications, clearNotifications }}>
      {children}
    </SocketContext.Provider>
  );
}

export default SocketProvider;
