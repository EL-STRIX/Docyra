import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { NotificationService } from '../services/notification.service';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notificationService = inject(NotificationService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Don't show toast for 401s handled by authInterceptor or background checks
      const isSilentEndpoint = req.url.includes('/auth/me') || req.url.includes('/auth/refresh');

      if (!isSilentEndpoint && error.status !== 401) {
        let errorMsg = 'An unexpected error occurred. Please try again.';
        if (error.error?.error?.message) {
          errorMsg = error.error.error.message;
        } else if (error.error?.message) {
          errorMsg = error.error.message;
        } else if (typeof error.error === 'string') {
          errorMsg = error.error;
        } else if (error.status === 0) {
          errorMsg = 'Cannot reach the server. Please check your network connection.';
        } else if (error.status === 403) {
          errorMsg = 'Permission denied. You do not have access to perform this action.';
        } else if (error.status === 404) {
          errorMsg = 'Requested resource not found.';
        } else if (error.status === 429) {
          errorMsg = 'Too many requests. Please slow down and try again.';
        }
        notificationService.error(errorMsg);
      }

      return throwError(() => error);
    })
  );
};
