import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from '@core/supabase/supabase.service';
import { Session } from '@supabase/supabase-js';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseService).client;
  private readonly router = inject(Router);

  private readonly _session = signal<Session | null>(null);
  private readonly _status = signal<AuthStatus>('loading');
  private readonly _error = signal<string | null>(null);

  readonly session = this._session.asReadonly();
  readonly status = this._status.asReadonly();
  readonly error = this._error.asReadonly();
  readonly user = computed(() => this._session()?.user ?? null);
  readonly isAuthenticated = computed(() => this._status() === 'authenticated');
  readonly isLoading = computed(() => this._status() === 'loading');

  constructor() {
    this.init();
  }

  private init(): void {
    this.supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        this._status.set('unauthenticated');
        return;
      }
      this._session.set(data.session);
      this._status.set(data.session ? 'authenticated' : 'unauthenticated');
    });

    this.supabase.auth.onAuthStateChange((event, session) => {
      this._session.set(session);
      this._error.set(null);

      switch (event) {
        case 'SIGNED_IN':
        case 'TOKEN_REFRESHED':
        case 'USER_UPDATED':
          this._status.set('authenticated');
          break;
        case 'SIGNED_OUT':
          this._status.set('unauthenticated');
          this.router.navigate(['/auth/login']);
          break;
        case 'PASSWORD_RECOVERY':
          this._status.set('authenticated');
          this.router.navigate(['/auth/reset-password']);
          break;
      }
    });
  }

  async signIn(email: string, password: string): Promise<void> {
    this._error.set(null);
    this._status.set('loading');
    const { error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error) {
      this._error.set(this.mapAuthError(error.message));
      this._status.set('unauthenticated');
    }
  }

  async signOut(): Promise<void> {
    await this.supabase.auth.signOut();
  }

  async sendPasswordReset(email: string): Promise<{ success: boolean; error: string | null }> {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    return { success: !error, error: error ? this.mapAuthError(error.message) : null };
  }

  async updatePassword(newPassword: string): Promise<{ success: boolean; error: string | null }> {
    const { error } = await this.supabase.auth.updateUser({ password: newPassword });
    return { success: !error, error: error ? this.mapAuthError(error.message) : null };
  }

  getAccessToken(): string | null {
    return this._session()?.access_token ?? null;
  }

  /** @deprecated Use signIn() */
  async login(email: string, password: string) {
    await this.signIn(email, password);
    return this._error() ? { message: this._error()! } : null;
  }

  /** @deprecated Use signOut() */
  async logout() {
    await this.signOut();
    return null;
  }

  /** @deprecated Use user() signal */
  getUser() {
    return this.user();
  }

  /** @deprecated Use session() signal */
  getSession() {
    return this.session();
  }

  private mapAuthError(message: string): string {
    const map: Record<string, string> = {
      'Invalid login credentials': 'Email ou senha incorretos.',
      'Email not confirmed': 'Confirme seu email antes de entrar.',
      'User not found': 'Usuário não encontrado.',
      'Password should be at least 6 characters': 'A senha deve ter no mínimo 6 caracteres.',
      'Rate limit exceeded': 'Muitas tentativas. Aguarde alguns minutos.',
    };
    return map[message] ?? 'Ocorreu um erro inesperado. Tente novamente.';
  }
}
