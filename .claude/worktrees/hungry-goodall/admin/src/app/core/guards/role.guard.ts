import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { RbacService } from '../services/rbac.service';

export const roleGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const rbacService = inject(RbacService);
  const requiredRole = route.data?.['role'] as string | undefined;
  const requiredPermission = route.data?.['permission'] as string | undefined;

  if (requiredRole && !rbacService.hasRole(requiredRole)) {
    return router.createUrlTree(['/']);
  }

  if (requiredPermission && !rbacService.hasPermission(requiredPermission)) {
    return router.createUrlTree(['/']);
  }

  return true;
};
