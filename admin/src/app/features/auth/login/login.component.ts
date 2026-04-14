import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { OrganizationService } from '../../../core/services/organization.service';
import { RbacService } from '../../../core/services/rbac.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
      <div class="w-full max-w-md">
        <div class="mb-8 text-center">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Entrar na conta</h1>
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Não tem conta?
            <a routerLink="/auth/signup" class="text-brand-500 hover:text-brand-600">Cadastre-se</a>
          </p>
        </div>

        <div class="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          @if (authService.error()) {
            <div class="mb-4 rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300">
              {{ authService.error() }}
            </div>
          }

          <form class="space-y-4" (ngSubmit)="onLogin()">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
              <input
                type="email"
                [(ngModel)]="email"
                name="email"
                required
                placeholder="seu@email.com"
                class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90 dark:placeholder:text-white/30"
              />
            </div>

            <div>
              <div class="mb-1.5 flex items-center justify-between">
                <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Senha</label>
                <a routerLink="/auth/forgot-password" class="text-xs text-brand-500 hover:text-brand-600">
                  Esqueceu a senha?
                </a>
              </div>
              <input
                type="password"
                [(ngModel)]="password"
                name="password"
                required
                placeholder="Sua senha"
                class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90 dark:placeholder:text-white/30"
              />
            </div>

            <button
              type="submit"
              [disabled]="loading() || !email || !password"
              class="flex w-full items-center justify-center rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              @if (loading()) {
                <svg class="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Entrando...
              } @else {
                Entrar
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {
  readonly authService = inject(AuthService);
  private readonly organizationService = inject(OrganizationService);
  private readonly rbacService = inject(RbacService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  email = '';
  password = '';
  readonly loading = signal(false);

  async onLogin(): Promise<void> {
    this.loading.set(true);

    await this.authService.signIn(this.email, this.password);

    if (this.authService.error()) {
      this.loading.set(false);
      return;
    }

    const userId = this.authService.user()?.id;
    if (userId) {
      await this.organizationService.loadOrganizationsForUser(userId);
      const orgId = this.organizationService.currentOrganizationId();
      if (orgId) {
        await this.rbacService.loadForOrganization(userId, orgId);
      }
    }

    this.loading.set(false);
    const returnUrl = this.route.snapshot.queryParams['returnUrl'] ?? '/';
    await this.router.navigateByUrl(returnUrl);
  }
}
