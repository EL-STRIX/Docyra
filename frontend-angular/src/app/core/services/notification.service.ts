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

  private notificationsSubject = new BehaviorSubject<PortalNotification[]>(this.defaultNotifications);
  public notifications$: Observable<PortalNotification[]> = this.notificationsSubject.asObservable();

  private unreadCountSubject = new BehaviorSubject<number>(1);
  public unreadCount$: Observable<number> = this.unreadCountSubject.asObservable();

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

  private handleIncomingNotification(ntf: PortalNotification): void {
    const list = [ntf, ...this.notificationsSubject.value];
    this.notificationsSubject.next(list);
    this.unreadCountSubject.next(list.filter((n) => !n.read).length);
  }

  markAsRead(id: string): void {
    const updated = this.notificationsSubject.value.map((n) =>
      n.id === id ? { ...n, read: true } : n
    );
    this.notificationsSubject.next(updated);
    this.unreadCountSubject.next(updated.filter((n) => !n.read).length);
  }

  markAllAsRead(): void {
    const updated = this.notificationsSubject.value.map((n) => ({ ...n, read: true }));
    this.notificationsSubject.next(updated);
    this.unreadCountSubject.next(0);
  }

  deleteNotification(id: string): void {
    const updated = this.notificationsSubject.value.filter((n) => n.id !== id);
    this.notificationsSubject.next(updated);
    this.unreadCountSubject.next(updated.filter((n) => !n.read).length);
  }

  clearNotifications(): void {
    this.notificationsSubject.next([]);
    this.unreadCountSubject.next(0);
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
