import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
      <div class="w-full max-w-md">
        <div class="mb-8 text-center">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Recuperar senha</h1>
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Informe seu email e enviaremos um link de recuperação.
          </p>
        </div>

        <div class="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          @if (success()) {
            <div class="mb-4 rounded-lg border border-success-200 bg-success-50 p-4 text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-300">
              Link enviado! Verifique sua caixa de entrada e clique no link para redefinir sua senha.
            </div>
          }

          @if (error()) {
            <div class="mb-4 rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300">
              {{ error() }}
            </div>
          }

          @if (!success()) {
            <form class="space-y-4" (ngSubmit)="onSubmit()">
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

              <button
                type="submit"
                [disabled]="loading() || !email"
                class="flex w-full items-center justify-center rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                @if (loading()) {
                  <svg class="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Enviando...
                } @else {
                  Enviar link de recuperação
                }
              </button>
            </form>
          }

          <p class="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Lembrou a senha?
            <a routerLink="/auth/login" class="text-brand-500 hover:text-brand-600">Voltar ao login</a>
          </p>
        </div>
      </div>
    </div>
  `,
})
export class ForgotPasswordComponent {
  private readonly authService = inject(AuthService);

  email = '';
  readonly loading = signal(false);
  readonly success = signal(false);
  readonly error = signal<string | null>(null);

  async onSubmit(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    const result = await this.authService.sendPasswordReset(this.email);

    if (result.error) {
      this.error.set(result.error);
    } else {
      this.success.set(true);
    }

    this.loading.set(false);
  }
}
