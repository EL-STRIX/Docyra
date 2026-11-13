import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { take, filter, map } from 'rxjs/operators';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // If already authenticated in memory, allow navigation immediately
  if (authService.isAuthenticated) {
    return true;
  }

  return authService.isAuthLoading$.pipe(
    filter((loading) => !loading),
    take(1),
    map(() => {
      if (authService.isAuthenticated) {
        return true;
      }
      return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
    })
  );
};
