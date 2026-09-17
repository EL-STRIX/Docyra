import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, tap, catchError, of } from 'rxjs';
import { User } from '../models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly baseUrl = 'http://localhost:5000/api/v1/auth';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  // Modern Angular Signals
  public userSignal = signal<User | null>(null);
  public isAuthenticated = computed(() => !!this.userSignal());
  public userRole = computed(() => this.userSignal()?.role || null);

  constructor(private http: HttpClient, private router: Router) {
    this.checkSession();
  }

  public checkSession(): void {
    const token = localStorage.getItem('docyra_access_token');
    if (token) {
      this.http.get<{ success: boolean; data: { user: User } }>(`${this.baseUrl}/me`, { withCredentials: true })
        .subscribe({
          next: (res) => {
            if (res.data?.user) {
              this.setUser(res.data.user);
            }
          },
          error: () => {
            this.clearUser();
          }
        });
    }
  }

  public login(credentials: { email: string; password: string }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/login`, credentials, { withCredentials: true })
      .pipe(
        tap((res) => {
          if (!res.data?.requires2FA && res.data?.user) {
            this.setSession(res.data.accessToken, res.data.user);
          }
        })
      );
  }

  public verify2FA(token: string, tempToken?: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/2fa/verify`, { token, tempToken }, { withCredentials: true })
      .pipe(
        tap((res) => {
          if (res.data?.user) {
            this.setSession(res.data.accessToken, res.data.user);
          }
        })
      );
  }

  public setup2FA(): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/2fa/setup`, {}, { withCredentials: true });
  }

  public forgotPassword(email: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/forgot-password`, { email });
  }

  public resetPassword(payload: { token: string; newPassword: string }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/reset-password`, payload);
  }

  public logout(): void {
    this.http.post(`${this.baseUrl}/logout`, {}, { withCredentials: true }).subscribe({
      complete: () => {
        this.clearUser();
        this.router.navigate(['/login']);
      },
      error: () => {
        this.clearUser();
        this.router.navigate(['/login']);
      }
    });
  }

  public redirectByRole(): void {
    const role = this.userRole();
    if (role === 'doctor') {
      this.router.navigate(['/doctor/dashboard']);
    } else if (role === 'clinic_admin') {
      this.router.navigate(['/clinic-admin/dashboard']);
    } else if (role === 'admin') {
      this.router.navigate(['/admin/dashboard']);
    } else {
      this.router.navigate(['/login']);
    }
  }

  private setSession(token: string, user: User): void {
    if (token) {
      localStorage.setItem('docyra_access_token', token);
    }
    this.setUser(user);
  }

  private setUser(user: User): void {
    this.currentUserSubject.next(user);
    this.userSignal.set(user);
  }

  private clearUser(): void {
    localStorage.removeItem('docyra_access_token');
    this.currentUserSubject.next(null);
    this.userSignal.set(null);
  }
}
