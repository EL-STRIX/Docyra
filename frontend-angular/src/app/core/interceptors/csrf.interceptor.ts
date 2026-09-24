import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { CsrfService } from '../services/csrf.service';

export const csrfInterceptor: HttpInterceptorFn = (req, next) => {
  const csrfService = inject(CsrfService);

  // Set withCredentials for cross-origin cookie sharing with backend API
  let modifiedReq = req.clone({
    withCredentials: true,
  });

  const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (mutatingMethods.includes(req.method.toUpperCase())) {
    const token = csrfService.getToken();
    if (token) {
      modifiedReq = modifiedReq.clone({
        setHeaders: {
          'x-csrf-token': token,
        },
      });
    }
  }

  return next(modifiedReq);
};
