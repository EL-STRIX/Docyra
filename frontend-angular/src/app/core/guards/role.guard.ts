import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole, User } from '../models/user.model';
import { map, take, filter } from 'rxjs/operators';

export function roleGuard(allowedRoles: UserRole[]): CanActivateFn {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const evaluateRole = (user: User | null) => {
      if (!user) {
        return router.createUrlTree(['/login']);
      }

      if (allowedRoles.includes(user.role)) {
        return true;
      }

      // Redirect to their own role's home
      if (user.role === 'doctor') return router.createUrlTree(['/doctor/dashboard']);
      if (user.role === 'clinic_admin') return router.createUrlTree(['/clinic/dashboard']);
      if (user.role === 'admin') return router.createUrlTree(['/admin/dashboard']);
      return router.createUrlTree(['/login']);
    };

    // If user is already loaded in memory, evaluate role immediately
    if (authService.currentUser) {
      return evaluateRole(authService.currentUser);
    }

    return authService.isAuthLoading$.pipe(
      filter((loading) => !loading),
      take(1),
      map(() => evaluateRole(authService.currentUser))
    );
  };
}
