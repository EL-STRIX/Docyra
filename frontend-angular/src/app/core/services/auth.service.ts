import { Injectable, inject, NgZone } from '@angular/core';
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
  private ngZone = inject(NgZone);
  private notificationService = inject(NotificationService);

  private readonly API_URL = `${environment.apiBaseUrl}/auth`;
  private readonly ACCESS_TOKEN_KEY = 'docyra_access_token';
  private readonly REFRESH_TOKEN_KEY = 'docyra_refresh_token';

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

  getAccessToken(): string | null {
    try {
      return localStorage.getItem(this.ACCESS_TOKEN_KEY);
    } catch {
      return null;
    }
  }

  getRefreshToken(): string | null {
    try {
      return localStorage.getItem(this.REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  }

  saveTokens(accessToken?: string, refreshToken?: string): void {
    try {
      if (accessToken) localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
      if (refreshToken) localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
    } catch (e) {
      console.warn('Failed to save tokens to localStorage', e);
    }
  }

  clearTokens(): void {
    try {
      localStorage.removeItem(this.ACCESS_TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    } catch (e) {
      console.warn('Failed to clear tokens from localStorage', e);
    }
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
          // Operations Portal is strictly for clinic_admin, doctor, and admin
          if (user.role === 'patient') {
            this.clearTokens();
            this.currentUserSubject.next(null);
            return null;
          }
          this.currentUserSubject.next(user);
          this.notificationService.connectSocket();
          return user;
        }
        this.clearTokens();
        this.currentUserSubject.next(null);
        return null;
      }),
      catchError(() => {
        this.clearTokens();
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
      map((res) => {
        const data = res.data;
        if (data.user && data.user.role === 'patient') {
          this.clearTokens();
          throw new Error('Access denied. Patient accounts must log in via the Patient Portal (http://localhost:5173/login).');
        }
        return data;
      }),
      tap((data) => {
        const requires2FA = data.requiresTwoFactor || (data as any)?.requires2FA;
        if (requires2FA) {
          this.temp2faToken = data.tempToken || null;
          this.pending2faUser = data.user || null;
        } else if (data.user) {
          if (data.accessToken) {
            this.saveTokens(data.accessToken, data.refreshToken);
          }
          this.currentUserSubject.next(data.user);
          this.isAuthLoadingSubject.next(false);
          this.temp2faToken = null;
          this.pending2faUser = null;
          this.notificationService.connectSocket();
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

    return this.http.post<ApiResponse<{ user: User; accessToken?: string; refreshToken?: string }>>(
      `${this.API_URL}/2fa/login`,
      { tempToken: this.temp2faToken, code },
      { withCredentials: true }
    ).pipe(
      map((res) => {
        if (res.data?.user?.role === 'patient') {
          this.clearTokens();
          throw new Error('Access denied. Patient accounts must log in via the Patient Portal (http://localhost:5173/login).');
        }
        if (res.data?.accessToken) {
          this.saveTokens(res.data.accessToken, res.data.refreshToken);
        }
        return res.data.user;
      }),
      tap((user) => {
        this.currentUserSubject.next(user);
        this.isAuthLoadingSubject.next(false);
        this.temp2faToken = null;
        this.pending2faUser = null;
        this.notificationService.connectSocket();
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
   * Silent refresh of session token via HttpOnly cookie or refreshToken payload
   */
  refreshToken(): Observable<boolean> {
    const refreshToken = this.getRefreshToken();
    return this.http.post<ApiResponse<any>>(
      `${this.API_URL}/refresh`,
      { refreshToken },
      { withCredentials: true }
    ).pipe(
      map((res) => {
        if (res.success && res.data) {
          if (res.data.accessToken) {
            this.saveTokens(res.data.accessToken, res.data.refreshToken);
          }
          if (res.data.user) {
            this.currentUserSubject.next(res.data.user);
          }
          return true;
        }
        return false;
      }),
      catchError((err) => {
        this.clearTokens();
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
        this.clearTokens();
        this.currentUserSubject.next(null);
        this.temp2faToken = null;
        this.pending2faUser = null;
        this.notificationService.disconnectSocket();
        this.ngZone.run(() => {
          this.router.navigate(['/login']);
        });
      })
    );
  }

  /**
   * Redirect user based on their role inside Angular zone
   */
  redirectAfterLogin(role: UserRole): void {
    let target = '/login';
    switch (role) {
      case 'doctor':
        target = '/doctor/dashboard';
        break;
      case 'clinic_admin':
        target = '/clinic/dashboard';
        break;
      case 'admin':
        target = '/admin/dashboard';
        break;
    }
    this.ngZone.run(() => {
      this.router.navigate([target]).then((success) => {
        if (!success) {
          this.router.navigate(['/']);
        }
      });
    });
  }
}
