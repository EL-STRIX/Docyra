import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { map, tap, catchError, finalize } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { User, LoginResponse, TwoFactorSetupResponse, UserRole } from '../models/user.model';
import { ApiResponse } from '../models/api-response.model';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private notificationService = inject(NotificationService);

  private readonly API_URL = `${environment.apiBaseUrl}/auth`;

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$: Observable<User | null> = this.currentUserSubject.asObservable();

  private isAuthLoadingSubject = new BehaviorSubject<boolean>(true);
  public isAuthLoading$: Observable<boolean> = this.isAuthLoadingSubject.asObservable();

  // Temporary 2FA token state during multi-step login
  private temp2faToken: string | null = null;
  private pending2faUser: User | null = null;

  constructor() {
    this.checkSession().subscribe();
  }

  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  get isAuthenticated(): boolean {
    return !!this.currentUserSubject.value;
  }

  get userRole(): UserRole | null {
    return this.currentUserSubject.value?.role || null;
  }

  get isStaffOrAdmin(): boolean {
    const r = this.userRole;
    return r === 'doctor' || r === 'clinic_admin' || r === 'admin';
  }

  getTemp2faToken(): string | null {
    return this.temp2faToken;
  }

  getPending2faUser(): User | null {
    return this.pending2faUser;
  }

  /**
   * Bootstraps user session from /api/v1/auth/me
   */
  checkSession(): Observable<User | null> {
    this.isAuthLoadingSubject.next(true);
    return this.http.get<ApiResponse<{ user: User }>>(`${this.API_URL}/me`, { withCredentials: true }).pipe(
      map((res) => {
        if (res.success && res.data?.user) {
          const user = res.data.user;
          this.currentUserSubject.next(user);
          this.notificationService.connectSocket();
          return user;
        }
        this.currentUserSubject.next(null);
        return null;
      }),
      catchError(() => {
        this.currentUserSubject.next(null);
        return of(null);
      }),
      finalize(() => this.isAuthLoadingSubject.next(false))
    );
  }

  /**
   * Login with email and password
   */
  login(credentials: { email: string; password: string }): Observable<LoginResponse> {
    return this.http.post<ApiResponse<LoginResponse>>(`${this.API_URL}/login`, credentials, { withCredentials: true }).pipe(
      map((res) => res.data),
      tap((data) => {
        const requires2FA = data.requiresTwoFactor || (data as any)?.requires2FA;
        if (requires2FA) {
          this.temp2faToken = data.tempToken || null;
          this.pending2faUser = data.user || null;
        } else if (data.user) {
          this.currentUserSubject.next(data.user);
          this.temp2faToken = null;
          this.pending2faUser = null;
          this.notificationService.connectSocket();
          this.redirectAfterLogin(data.user.role);
        }
      })
    );
  }

  /**
   * Complete login via 2FA TOTP code
   */
  verify2faLogin(code: string): Observable<User> {
    if (!this.temp2faToken) {
      return throwError(() => new Error('2FA session expired. Please log in again.'));
    }

    return this.http.post<ApiResponse<{ user: User }>>(
      `${this.API_URL}/2fa/login`,
      { tempToken: this.temp2faToken, code },
      { withCredentials: true }
    ).pipe(
      map((res) => res.data.user),
      tap((user) => {
        this.currentUserSubject.next(user);
        this.temp2faToken = null;
        this.pending2faUser = null;
        this.notificationService.connectSocket();
        this.redirectAfterLogin(user.role);
      })
    );
  }

  /**
   * Request 2FA TOTP setup secret and QR code URL
   */
  setup2fa(): Observable<TwoFactorSetupResponse> {
    return this.http.post<ApiResponse<TwoFactorSetupResponse>>(
      `${this.API_URL}/2fa/setup`,
      {},
      { withCredentials: true }
    ).pipe(map((res) => res.data));
  }

  /**
   * Verify and enable 2FA with generated TOTP code
   */
  confirm2fa(code: string): Observable<boolean> {
    return this.http.post<ApiResponse<{ isTwoFactorEnabled: boolean }>>(
      `${this.API_URL}/2fa/verify`,
      { code },
      { withCredentials: true }
    ).pipe(
      map((res) => res.data.isTwoFactorEnabled),
      tap((enabled) => {
        if (this.currentUser) {
          this.currentUserSubject.next({
            ...this.currentUser,
            isTwoFactorEnabled: enabled,
          });
        }
      })
    );
  }

  /**
   * Disable 2FA with current code
   */
  disable2fa(code: string): Observable<boolean> {
    return this.http.post<ApiResponse<{ isTwoFactorEnabled: boolean }>>(
      `${this.API_URL}/2fa/disable`,
      { code },
      { withCredentials: true }
    ).pipe(
      map((res) => !res.data.isTwoFactorEnabled),
      tap(() => {
        if (this.currentUser) {
          this.currentUserSubject.next({
            ...this.currentUser,
            isTwoFactorEnabled: false,
          });
        }
      })
    );
  }

  /**
   * Silent refresh of session token via HttpOnly cookie
   */
  refreshToken(): Observable<boolean> {
    return this.http.post<ApiResponse<any>>(
      `${this.API_URL}/refresh`,
      {},
      { withCredentials: true }
    ).pipe(
      map((res) => res.success),
      catchError((err) => {
        this.currentUserSubject.next(null);
        return throwError(() => err);
      })
    );
  }

  /**
   * Forgot password request link
   */
  forgotPassword(email: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.API_URL}/forgot-password`, { email });
  }

  /**
   * Reset password with reset token
   */
  resetPassword(token: string, password: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.API_URL}/reset-password/${token}`, { password });
  }

  /**
   * Logout user and clear session
   */
  logout(): Observable<boolean> {
    return this.http.post<ApiResponse<any>>(`${this.API_URL}/logout`, {}, { withCredentials: true }).pipe(
      map(() => true),
      catchError(() => of(true)),
      tap(() => {
        this.currentUserSubject.next(null);
        this.temp2faToken = null;
        this.pending2faUser = null;
        this.notificationService.disconnectSocket();
        this.router.navigate(['/login']);
      })
    );
  }

  /**
   * Redirect user based on their role
   */
  redirectAfterLogin(role: UserRole): void {
    switch (role) {
      case 'doctor':
        this.router.navigate(['/doctor/dashboard']);
        break;
      case 'clinic_admin':
        this.router.navigate(['/clinic/dashboard']);
        break;
      case 'admin':
        this.router.navigate(['/admin/dashboard']);
        break;
      default:
        this.router.navigate(['/login']);
        break;
    }
  }
}
