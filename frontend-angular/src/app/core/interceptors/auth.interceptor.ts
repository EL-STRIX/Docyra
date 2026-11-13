import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, switchMap, throwError } from 'rxjs';

let isRefreshing = false;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const injector = inject(Injector);

  // Attach credentials (cookies) and Authorization Bearer header if accessToken is available
  let authReq = req.clone({ withCredentials: true });

  const token = localStorage.getItem('docyra_access_token');
  if (token && !req.headers.has('Authorization')) {
    authReq = authReq.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      const isAuthEndpoint =
        req.url.includes('/auth/login') ||
        req.url.includes('/auth/refresh') ||
        req.url.includes('/auth/me');

      if (error.status === 401 && !isAuthEndpoint && !isRefreshing) {
        const refreshToken = localStorage.getItem('docyra_refresh_token');
        const authService = injector.get(AuthService);

        if (!refreshToken) {
          authService.logout().subscribe();
          return throwError(() => error);
        }

        isRefreshing = true;
        return authService.refreshToken().pipe(
          switchMap(() => {
            isRefreshing = false;
            const newToken = localStorage.getItem('docyra_access_token');
            const retriedReq = req.clone({
              withCredentials: true,
              setHeaders: newToken ? { Authorization: `Bearer ${newToken}` } : {},
            });
            return next(retriedReq);
          }),
          catchError((refreshErr) => {
            isRefreshing = false;
            authService.logout().subscribe();
            return throwError(() => refreshErr);
          })
        );
      }

      return throwError(() => error);
    })
  );
};
