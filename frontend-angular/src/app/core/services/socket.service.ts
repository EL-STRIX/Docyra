import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket | null = null;
  private appointmentEvents = new Subject<any>();

  public appointmentEvents$ = this.appointmentEvents.asObservable();

  public connect(): void {
    const token = localStorage.getItem('docyra_access_token');
    if (!this.socket && token) {
      this.socket = io('http://localhost:5000', {
        auth: { token },
        transports: ['websocket', 'polling'],
        withCredentials: true
      });

      this.socket.on('appointment:created', (data) => {
        this.appointmentEvents.next({ type: 'created', data });
      });

      this.socket.on('appointment:statusChanged', (data) => {
        this.appointmentEvents.next({ type: 'statusChanged', data });
      });

      this.socket.on('appointment:cancelled', (data) => {
        this.appointmentEvents.next({ type: 'cancelled', data });
      });
    }
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}
