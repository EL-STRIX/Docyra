import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { take, filter, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isAuthLoading$.pipe(
    filter((loading) => !loading),
    take(1),
    switchMap(() => {
      if (authService.isAuthenticated) {
        return of(true);
      }
      return router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    })
  );
};
