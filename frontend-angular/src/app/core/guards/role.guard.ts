import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/user.model';
import { map, take, filter } from 'rxjs/operators';

export function roleGuard(allowedRoles: UserRole[]): CanActivateFn {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    return authService.isAuthLoading$.pipe(
      filter((loading) => !loading),
      take(1),
      map(() => {
        const user = authService.currentUser;
        if (!user) {
          router.navigate(['/login']);
          return false;
        }

        if (allowedRoles.includes(user.role)) {
          return true;
        }

        // Redirect to their own role's home
        authService.redirectAfterLogin(user.role);
        return false;
      })
    );
  };
}
