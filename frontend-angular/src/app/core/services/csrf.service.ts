import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class CsrfService {
  private http = inject(HttpClient);
  private cachedToken: string | null = null;

  /**
   * Retrieves the CSRF token from document cookies (XSRF-TOKEN or _csrf or csrfToken)
   * or memory cache if cross-origin cookie access is blocked by document.cookie
   */
  getToken(): string | null {
    if (this.cachedToken) return this.cachedToken;
    if (typeof document === 'undefined') return null;

    const cookies = document.cookie ? document.cookie.split('; ') : [];
    for (const cookie of cookies) {
      const [name, ...rest] = cookie.split('=');
      const val = rest.join('=');
      if (name === 'XSRF-TOKEN' || name === '_csrf' || name === 'csrfToken') {
        this.cachedToken = decodeURIComponent(val);
        return this.cachedToken;
      }
    }
    return null;
  }

  /**
   * Explicitly fetches the CSRF token from backend API
   */
  fetchToken(): Observable<{ success: boolean; data: { csrfToken: string } }> {
    return this.http
      .get<{ success: boolean; data: { csrfToken: string } }>(
        `${environment.apiBaseUrl}/auth/csrf-token`,
        { withCredentials: true }
      )
      .pipe(
        tap((res) => {
          if (res?.data?.csrfToken) {
            this.cachedToken = res.data.csrfToken;
          }
        })
      );
  }
}
