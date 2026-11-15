import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { io, Socket } from 'socket.io-client';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PortalNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  read: boolean;
  data?: any;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private snackBar = inject(MatSnackBar);
  private socket: Socket | null = null;
  private readonly STORAGE_KEY = 'docyra_ops_notifications';
  private readonly SEEDED_KEY = 'docyra_ops_notifications_seeded';

  private defaultNotifications: PortalNotification[] = [
    {
      id: 'ntf-1',
      title: 'Clinic Workspace Synchronized',
      message: 'Unified physician roster and appointment schedule are active.',
      type: 'success',
      timestamp: new Date(Date.now() - 1000 * 60 * 12),
      read: false,
    },
    {
      id: 'ntf-2',
      title: 'Appointment Service Ready',
      message: 'Real-time patient bookings and status changes are synced with the clinic.',
      type: 'info',
      timestamp: new Date(Date.now() - 1000 * 60 * 55),
      read: true,
    },
  ];

  private notificationsSubject = new BehaviorSubject<PortalNotification[]>([]);
  public notifications$: Observable<PortalNotification[]> = this.notificationsSubject.asObservable();

  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$: Observable<number> = this.unreadCountSubject.asObservable();

  constructor() {
    this.initNotifications();
  }

  private initNotifications(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          this.notificationsSubject.next(parsed);
          this.unreadCountSubject.next(parsed.filter((n) => !n.read).length);
          return;
        }
      }
      const wasSeeded = localStorage.getItem(this.SEEDED_KEY) === 'true';
      if (wasSeeded) {
        this.notificationsSubject.next([]);
        this.unreadCountSubject.next(0);
        return;
      }
      this.notificationsSubject.next(this.defaultNotifications);
      this.unreadCountSubject.next(this.defaultNotifications.filter((n) => !n.read).length);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.defaultNotifications));
      localStorage.setItem(this.SEEDED_KEY, 'true');
    } catch {
      this.notificationsSubject.next(this.defaultNotifications);
      this.unreadCountSubject.next(1);
    }
  }

  private persistNotifications(list: PortalNotification[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
      localStorage.setItem(this.SEEDED_KEY, 'true');
    } catch {
      // ignore
    }
  }

  /**
   * Connect real-time socket with cookies
   */
  connectSocket(): void {
    if (this.socket && this.socket.connected) return;

    const url = environment.socketUrl || window.location.origin;
    this.socket = io(url, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    this.socket.on('appointment:created', (payload) => {
      this.handleIncomingNotification({
        id: `ntf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: 'New Appointment Booked',
        message: `Appointment received for ${payload.patientName || 'Patient'} on ${payload.date || 'scheduled time'}.`,
        type: 'info',
        timestamp: new Date(),
        read: false,
        data: payload,
      });
      this.info('New appointment booking received');
    });

    this.socket.on('appointment:statusChanged', (payload) => {
      this.handleIncomingNotification({
        id: `ntf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: 'Appointment Status Changed',
        message: `Appointment status updated to ${payload.status}.`,
        type: 'info',
        timestamp: new Date(),
        read: false,
        data: payload,
      });
    });

    this.socket.on('appointment:cancelled', (payload) => {
      this.handleIncomingNotification({
        id: `ntf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: 'Appointment Cancelled',
        message: `Appointment cancelled: ${payload.reason || 'No reason provided'}.`,
        type: 'warning',
        timestamp: new Date(),
        read: false,
        data: payload,
      });
      this.warning('An appointment was cancelled');
    });
  }

  disconnectSocket(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  private recentNotificationHashes = new Map<string, number>();

  private handleIncomingNotification(ntf: PortalNotification): void {
    const aptId = ntf.data?.appointmentId || ntf.data?._id || '';
    const key = aptId ? `${ntf.title}:${aptId}` : `${ntf.title}:${ntf.message}`;
    const now = Date.now();
    const last = this.recentNotificationHashes.get(key);
    if (last && now - last < 8000) {
      return;
    }
    this.recentNotificationHashes.set(key, now);

    const list = [ntf, ...this.notificationsSubject.value.slice(0, 49)];
    this.notificationsSubject.next(list);
    this.unreadCountSubject.next(list.filter((n) => !n.read).length);
    this.persistNotifications(list);
  }

  markAsRead(id: string): void {
    const updated = this.notificationsSubject.value.map((n) =>
      n.id === id ? { ...n, read: true } : n
    );
    this.notificationsSubject.next(updated);
    this.unreadCountSubject.next(updated.filter((n) => !n.read).length);
    this.persistNotifications(updated);
  }

  markAllAsRead(): void {
    const updated = this.notificationsSubject.value.map((n) => ({ ...n, read: true }));
    this.notificationsSubject.next(updated);
    this.unreadCountSubject.next(0);
    this.persistNotifications(updated);
  }

  deleteNotification(id: string): void {
    const updated = this.notificationsSubject.value.filter((n) => n.id !== id);
    this.notificationsSubject.next(updated);
    this.unreadCountSubject.next(updated.filter((n) => !n.read).length);
    this.persistNotifications(updated);
  }

  clearNotifications(): void {
    this.notificationsSubject.next([]);
    this.unreadCountSubject.next(0);
    this.persistNotifications([]);
  }

  // Toast helpers
  success(message: string, duration = 4000): void {
    this.snackBar.open(message, 'Close', {
      duration,
      panelClass: ['toast-success'],
      horizontalPosition: 'end',
      verticalPosition: 'bottom',
    });
  }

  error(message: string, duration = 5000): void {
    this.snackBar.open(message, 'Close', {
      duration,
      panelClass: ['toast-error'],
      horizontalPosition: 'end',
      verticalPosition: 'bottom',
    });
  }

  info(message: string, duration = 4000): void {
    this.snackBar.open(message, 'Close', {
      duration,
      panelClass: ['toast-info'],
      horizontalPosition: 'end',
      verticalPosition: 'bottom',
    });
  }

  warning(message: string, duration = 4500): void {
    this.snackBar.open(message, 'Close', {
      duration,
      panelClass: ['toast-warning'],
      horizontalPosition: 'end',
      verticalPosition: 'bottom',
    });
  }
}
