import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (isAuthenticated && user) {
      const socketUrl = import.meta.env.VITE_API_BASE_URL
        ? import.meta.env.VITE_API_BASE_URL.replace('/api/v1', '')
        : 'http://localhost:5000';

      const token = localStorage.getItem('docyra_access_token');

      const newSocket = io(socketUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        withCredentials: true
      });

      newSocket.on('connect', () => {
        console.log('🔌 Connected to Docyra real-time notifications');
      });

      // General event listeners
      newSocket.on('appointment:created', (data) => {
        addNotification({ type: 'appointment:created', title: 'Appointment Confirmed', data, time: new Date() });
      });

      newSocket.on('appointment:statusChanged', (data) => {
        addNotification({ type: 'appointment:statusChanged', title: 'Appointment Status Updated', data, time: new Date() });
      });

      newSocket.on('appointment:cancelled', (data) => {
        addNotification({ type: 'appointment:cancelled', title: 'Appointment Cancelled', data, time: new Date() });
      });

      newSocket.on('waitlist:slotAvailable', (data) => {
        addNotification({ type: 'waitlist:slotAvailable', title: 'Waitlist Slot Open!', data, time: new Date() });
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    } else {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
    }
  }, [isAuthenticated, user]);

  const addNotification = (notif) => {
    setNotifications((prev) => [notif, ...prev]);
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  return (
    <SocketContext.Provider value={{ socket, notifications, clearNotifications }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  return context || { socket: null, notifications: [], clearNotifications: () => {} };
};

export default SocketContext;
