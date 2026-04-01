import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return toObservable(auth.status).pipe(
    filter((status) => status !== 'loading'),
    take(1),
    map((status) => {
      if (status === 'authenticated') return true;
      return router.createUrlTree(['/auth/login'], {
        queryParams: { returnUrl: state.url },
      });
    }),
  );
};

export const publicGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return toObservable(auth.status).pipe(
    filter((status) => status !== 'loading'),
    take(1),
    map((status) => {
      if (status === 'unauthenticated') return true;
      const returnUrl = route.queryParams['returnUrl'] ?? '/';
      return router.createUrlTree([returnUrl]);
    }),
  );
};
