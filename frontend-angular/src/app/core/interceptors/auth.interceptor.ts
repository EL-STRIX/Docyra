import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, switchMap, throwError } from 'rxjs';

let isRefreshing = false;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // If 401 Unauthorized and not already refreshing or calling auth endpoints
      const isAuthEndpoint = req.url.includes('/auth/login') ||
                             req.url.includes('/auth/refresh') ||
                             req.url.includes('/auth/me');

      if (error.status === 401 && !isAuthEndpoint && !isRefreshing) {
        isRefreshing = true;
        return authService.refreshToken().pipe(
          switchMap(() => {
            isRefreshing = false;
            // Retry the original request
            return next(req);
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
