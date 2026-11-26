import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { switchMap } from 'rxjs';
import { CsrfService } from '../services/csrf.service';

export const csrfInterceptor: HttpInterceptorFn = (req, next) => {
  const csrfService = inject(CsrfService);

  // Set withCredentials for cross-origin cookie sharing with backend API
  let modifiedReq = req.clone({
    withCredentials: true,
  });

  const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (mutatingMethods.includes(req.method.toUpperCase()) && !req.url.includes('/auth/csrf-token')) {
    const token = csrfService.getToken();
    if (token) {
      modifiedReq = modifiedReq.clone({
        setHeaders: {
          'x-csrf-token': token,
        },
      });
      return next(modifiedReq);
    } else {
      // If token not present in memory or document.cookie, fetch it first
      return csrfService.fetchToken().pipe(
        switchMap((res) => {
          const fetchedToken = res?.data?.csrfToken;
          if (fetchedToken) {
            modifiedReq = modifiedReq.clone({
              setHeaders: {
                'x-csrf-token': fetchedToken,
              },
            });
          }
          return next(modifiedReq);
        })
      );
    }
  }

  return next(modifiedReq);
};
