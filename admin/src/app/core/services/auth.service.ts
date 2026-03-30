import { Injectable, computed, signal } from '@angular/core';
import { AuthError, Session, User } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly sessionSignal = signal<Session | null>(null);
  private readonly userSignal = signal<User | null>(null);

  readonly session = this.sessionSignal.asReadonly();
  readonly user = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => Boolean(this.sessionSignal()));

  constructor(private readonly supabaseService: SupabaseService) {
    this.initializeSession();
    this.supabaseService.client.auth.onAuthStateChange((_event, session) => {
      this.sessionSignal.set(session);
      this.userSignal.set(session?.user ?? null);
    });
  }

  async login(email: string, password: string): Promise<AuthError | null> {
    const { data, error } = await this.supabaseService.client.auth.signInWithPassword({
      email,
      password,
    });

    this.sessionSignal.set(data.session ?? null);
    this.userSignal.set(data.user ?? null);

    return error;
  }

  async logout(): Promise<AuthError | null> {
    const { error } = await this.supabaseService.client.auth.signOut();
    if (!error) {
      this.sessionSignal.set(null);
      this.userSignal.set(null);
    }

    return error;
  }

  getSession(): Session | null {
    return this.sessionSignal();
  }

  getUser(): User | null {
    return this.userSignal();
  }

  private async initializeSession(): Promise<void> {
    const { data } = await this.supabaseService.client.auth.getSession();
    this.sessionSignal.set(data.session ?? null);
    this.userSignal.set(data.session?.user ?? null);
  }
}
