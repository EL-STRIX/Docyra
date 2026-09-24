import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class CsrfService {
  /**
   * Retrieves the CSRF token from document cookies (XSRF-TOKEN or _csrf)
   */
  getToken(): string | null {
    if (typeof document === 'undefined') return null;

    const cookies = document.cookie ? document.cookie.split('; ') : [];
    for (const cookie of cookies) {
      const [name, ...rest] = cookie.split('=');
      const val = rest.join('=');
      if (name === 'XSRF-TOKEN' || name === '_csrf' || name === 'csrfToken') {
        return decodeURIComponent(val);
      }
    }
    return null;
  }
}
