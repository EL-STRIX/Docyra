import { useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import useAuth from './useAuth.js';
import { SocketContext } from './socketContextDefinition.js';

const DEFAULT_NOTIFICATIONS = [
  {
    id: 'sys-welcome',
    type: 'system:welcome',
    category: 'system',
    title: 'Welcome to Docyra',
    message: 'Your patient portal is ready. Book consultations, manage family dependents, and track your healthcare effortlessly.',
    timestamp: new Date().toISOString(),
    read: false,
    link: '/doctors',
    actionLabel: 'Browse Doctors',
  },
  {
    id: 'sys-security',
    type: 'security:tip',
    category: 'security',
    title: 'Protect Your Health Records',
    message: 'Enhance your security by enabling Two-Factor Authentication (2FA) in your profile.',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    read: false,
    link: '/profile',
    actionLabel: 'Security Settings',
  },
];

export function SocketProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);
  const socketRef = useRef(null);
  const recentHashesRef = useRef(new Map()); // Deduplication map: key -> timestamp

  // Storage keys per user
  const userId = user?._id || user?.id;
  const storageKey = userId ? `docyra_notifications_${userId}` : null;
  const seededKey = userId ? `docyra_notifications_seeded_${userId}` : null;

  // 1. Initialize notifications from localStorage
  useEffect(() => {
    if (!isAuthenticated || !storageKey) {
      setNotifications([]);
      return;
    }

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setNotifications(parsed);
          return;
        }
      }

      // If key doesn't exist, check whether this user account has already been seeded in the past
      const alreadySeeded = seededKey ? localStorage.getItem(seededKey) === 'true' : false;
      if (alreadySeeded) {
        setNotifications([]);
        localStorage.setItem(storageKey, JSON.stringify([]));
        return;
      }

      // First-time visit: seed initial default notifications once
      setNotifications(DEFAULT_NOTIFICATIONS);
      localStorage.setItem(storageKey, JSON.stringify(DEFAULT_NOTIFICATIONS));
      if (seededKey) {
        localStorage.setItem(seededKey, 'true');
      }
    } catch {
      setNotifications([]);
    }
  }, [isAuthenticated, storageKey, seededKey]);

  // Persist notifications whenever they change
  const persistNotifications = useCallback(
    (newNotifs) => {
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(newNotifs));
          if (seededKey) {
            localStorage.setItem(seededKey, 'true');
          }
        } catch {
          // Ignore quota/private mode errors
        }
      }
    },
    [storageKey, seededKey]
  );

  // Dismiss a toast
  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Universal add notification (used by socket handlers & UI actions)
  const addNotification = useCallback(
    ({
      type = 'system:alert',
      category = 'appointment',
      title = 'Notification',
      message = '',
      link,
      actionLabel,
      data,
      unread = true,
      skipToast = false,
    }) => {
      const now = Date.now();

      // Extract semantic entity id to deduplicate across socket events & optimistic UI actions
      let entityId =
        data?.appointmentId ||
        data?._id ||
        data?.id ||
        data?.dependentId ||
        data?.waitlistId ||
        data?.doctorId ||
        data?.userId ||
        '';

      if (!entityId && link) {
        const match = link.match(/\/(?:appointments|dependents|doctors|waitlist)\/([a-zA-Z0-9]+)/);
        if (match) {
          entityId = match[1];
        }
      }

      // Deduplicate: semantic key ensures exactly 1 notification per unique event / work item
      const dedupKey = entityId ? `${type}:${entityId}` : `${type}:${category}`;
      const lastTriggered = recentHashesRef.current.get(dedupKey);

      // Discard duplicate triggers within 8 seconds
      if (lastTriggered && now - lastTriggered < 8000) {
        return;
      }
      recentHashesRef.current.set(dedupKey, now);

      const newNotif = {
        id: `notif_${now}_${Math.random().toString(36).substring(2, 7)}`,
        type,
        category,
        title,
        message,
        timestamp: new Date().toISOString(),
        read: !unread,
        link,
        actionLabel,
        data,
      };

      setNotifications((prev) => {
        // Guard against duplicate insertion in state within recent time window
        const isDuplicate = prev.some((n) => {
          if (n.type !== type) return false;
          const nEntity =
            n.data?.appointmentId ||
            n.data?._id ||
            n.data?.id ||
            n.data?.dependentId ||
            n.data?.waitlistId ||
            '';
          if (entityId && nEntity) {
            return nEntity === entityId;
          }
          const diff = now - new Date(n.timestamp).getTime();
          return diff < 8000;
        });

        if (isDuplicate) {
          return prev;
        }

        const updated = [newNotif, ...prev.slice(0, 49)]; // keep latest 50
        persistNotifications(updated);
        return updated;
      });

      if (!skipToast) {
        setToasts((prev) => {
          const isToastDuplicate = prev.some((t) => {
            if (t.type !== type) return false;
            const tEntity =
              t.data?.appointmentId ||
              t.data?._id ||
              t.data?.id ||
              t.data?.dependentId ||
              t.data?.waitlistId ||
              '';
            if (entityId && tEntity) {
              return tEntity === entityId;
            }
            return true;
          });
          if (isToastDuplicate) return prev;
          return [newNotif, ...prev.slice(0, 3)];
        });

        // Auto-dismiss toast after 5.5s
        setTimeout(() => {
          dismissToast(newNotif.id);
        }, 5500);
      }
    },
    [persistNotifications, dismissToast]
  );

  // Mark specific notification as read
  const markAsRead = useCallback(
    (id) => {
      setNotifications((prev) => {
        const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
        persistNotifications(updated);
        return updated;
      });
    },
    [persistNotifications]
  );

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      persistNotifications(updated);
      return updated;
    });
  }, [persistNotifications]);

  // Delete a specific notification
  const deleteNotification = useCallback(
    (id) => {
      setNotifications((prev) => {
        const updated = prev.filter((n) => n.id !== id);
        persistNotifications(updated);
        return updated;
      });
      if (seededKey) {
        try {
          localStorage.setItem(seededKey, 'true');
        } catch {
          // Fallback
        }
      }
    },
    [persistNotifications, seededKey]
  );

  // Clear all notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify([]));
        if (seededKey) {
          localStorage.setItem(seededKey, 'true');
        }
      } catch {
        // Fallback
      }
    }
  }, [storageKey, seededKey]);

  // 2. Connect to Socket.IO when authenticated
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

    // ==========================================
    // Real-Time Socket Event Listeners
    // ==========================================

    // 1. Appointment Booked / Confirmed
    newSocket.on('appointment:created', (payload) => {
      const docName = payload.doctorName ? `Dr. ${payload.doctorName.replace(/^Dr\.\s*/i, '')}` : 'your doctor';
      const dateText = payload.date || (payload.slotStart ? new Date(payload.slotStart).toDateString() : 'scheduled date');
      addNotification({
        type: 'appointment:created',
        category: 'appointment',
        title: 'Appointment Booked',
        message: `Your appointment with ${docName} on ${dateText} is confirmed.`,
        link: payload.appointmentId ? `/appointments/${payload.appointmentId}` : '/dashboard',
        actionLabel: 'View Appointment',
        data: payload,
      });
    });

    // 2. Appointment Status Changed
    newSocket.on('appointment:statusChanged', (payload) => {
      addNotification({
        type: 'appointment:statusChanged',
        category: 'appointment',
        title: 'Appointment Status Updated',
        message: payload.message || `Appointment status has been updated to ${payload.status || 'updated'}.`,
        link: payload.appointmentId ? `/appointments/${payload.appointmentId}` : '/dashboard',
        actionLabel: 'View Appointment',
        data: payload,
      });
    });

    // 3. Appointment Cancelled
    newSocket.on('appointment:cancelled', (payload) => {
      const dateText = payload.date || (payload.slotStart ? new Date(payload.slotStart).toDateString() : 'the scheduled date');
      addNotification({
        type: 'appointment:cancelled',
        category: 'appointment',
        title: 'Appointment Cancelled',
        message: `Your appointment on ${dateText} has been cancelled (${payload.reason || 'Notice'}).`,
        link: '/dashboard',
        actionLabel: 'View Appointments',
        data: payload,
      });
    });

    // 4. Appointment Reminder
    newSocket.on('appointment:reminder', (payload) => {
      const docName = payload.doctorName ? `Dr. ${payload.doctorName.replace(/^Dr\.\s*/i, '')}` : 'your doctor';
      addNotification({
        type: 'appointment:reminder',
        category: 'appointment',
        title: 'Upcoming Appointment Reminder',
        message: payload.message || `Reminder: Your appointment with ${docName} starts soon.`,
        link: payload.appointmentId ? `/appointments/${payload.appointmentId}` : '/dashboard',
        actionLabel: 'View Appointment',
        data: payload,
      });
    });

    // 5. Waitlist Slot Opened Up
    newSocket.on('waitlist:slotAvailable', (payload) => {
      addNotification({
        type: 'waitlist:slotAvailable',
        category: 'waitlist',
        title: 'Waitlist Opening Available!',
        message: 'A doctor slot opened up matching your waitlist preference. Claim within 2 hours!',
        link: '/waitlist',
        actionLabel: 'Claim Slot',
        data: payload,
      });
    });

    // 6. Family Member Added
    newSocket.on('dependent:created', (payload) => {
      addNotification({
        type: 'dependent:created',
        category: 'family',
        title: 'Family Member Added',
        message: payload.message || `${payload.name || 'Member'} was added to your family profiles.`,
        link: '/dependents',
        actionLabel: 'View Family',
        data: payload,
      });
    });

    // 7. Family Member Removed
    newSocket.on('dependent:deleted', (payload) => {
      addNotification({
        type: 'dependent:deleted',
        category: 'family',
        title: 'Family Member Removed',
        message: payload.message || `${payload.name || 'Member'} was removed from your account.`,
        link: '/dependents',
        actionLabel: 'View Family',
        data: payload,
      });
    });

    // 8. Profile Details Updated
    newSocket.on('profile:updated', (payload) => {
      addNotification({
        type: 'profile:updated',
        category: 'profile',
        title: 'Profile Updated',
        message: payload.message || 'Your personal profile details have been saved.',
        link: '/profile',
        actionLabel: 'View Profile',
        data: payload,
      });
    });

    // 9. Profile Consent Updated
    newSocket.on('profile:consent_updated', (payload) => {
      addNotification({
        type: 'profile:consent_updated',
        category: 'profile',
        title: 'Terms Consent Updated',
        message: payload.message || 'Terms and Privacy Policy consent updated to version 2.0.',
        link: '/privacy-data',
        actionLabel: 'View Privacy',
        data: payload,
      });
    });

    // 10. Security 2FA Enabled
    newSocket.on('security:2fa_enabled', (payload) => {
      addNotification({
        type: 'security:2fa_enabled',
        category: 'security',
        title: 'Two-Factor Auth Enabled',
        message: payload.message || 'Two-factor authenticator protection is now active.',
        link: '/profile',
        actionLabel: 'Security Settings',
        data: payload,
      });
    });

    // 11. Security 2FA Disabled
    newSocket.on('security:2fa_disabled', (payload) => {
      addNotification({
        type: 'security:2fa_disabled',
        category: 'security',
        title: 'Two-Factor Auth Disabled',
        message: payload.message || 'Two-factor authentication has been turned off.',
        link: '/profile',
        actionLabel: 'Security Settings',
        data: payload,
      });
    });

    // 12. GDPR Data Export
    newSocket.on('gdpr:exported', (payload) => {
      addNotification({
        type: 'gdpr:exported',
        category: 'security',
        title: 'Health Archive Exported',
        message: payload.message || 'Your personal healthcare records archive was exported.',
        link: '/privacy-data',
        actionLabel: 'View Privacy',
        data: payload,
      });
    });

    return () => {
      newSocket.disconnect();
    };
  }, [isAuthenticated, user, addNotification]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <SocketContext.Provider
      value={{
        socket,
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearNotifications,
        toasts,
        dismissToast,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export default SocketProvider;
