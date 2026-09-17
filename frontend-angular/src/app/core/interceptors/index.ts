import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
  const token = localStorage.getItem('docyra_access_token');
  
  let clonedReq = req.clone({
    withCredentials: true
  });

  if (token && !req.headers.has('Authorization')) {
    clonedReq = clonedReq.clone({
      headers: clonedReq.headers.set('Authorization', `Bearer ${token}`)
    });
  }

  return next(clonedReq);
};

export const csrfInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
  const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  
  if (mutatingMethods.includes(req.method.toUpperCase())) {
    const cookies = document.cookie.split(';');
    const csrfCookie = cookies.find((c) => c.trim().startsWith('csrfToken='));
    
    if (csrfCookie) {
      const csrfToken = csrfCookie.split('=')[1]?.trim();
      if (csrfToken) {
        req = req.clone({
          headers: req.headers.set('X-CSRF-Token', csrfToken)
        });
      }
    }
  }

  return next(req);
};

export const errorInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !req.url.includes('/auth/login')) {
        localStorage.removeItem('docyra_access_token');
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};
