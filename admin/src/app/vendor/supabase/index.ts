export interface AuthError {
  message: string;
}

export interface User {
  id: string;
  email?: string;
}

export interface Session {
  access_token: string;
  refresh_token?: string;
  user: User;
}

type Listener = (event: string, session: Session | null) => void;

// ─── JWT helpers ──────────────────────────────────────────────────────────────

function jwtExp(token: string): number | null {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(b64));
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

/** Retorna true se o token expirou (ou vai expirar em menos de 60 s). */
function isExpired(token: string): boolean {
  const exp = jwtExp(token);
  if (exp === null) return true;
  return Date.now() / 1000 >= exp - 60;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

class SupabaseAuthClient {
  private session: Session | null = null;
  private listeners = new Set<Listener>();
  private refreshPromise: Promise<Session | null> | null = null;

  constructor(private readonly url: string, private readonly anonKey: string) {
    const raw = localStorage.getItem('sb_session');
    this.session = raw ? JSON.parse(raw) : null;
    // Tenta refresh silencioso na inicialização se o token estiver expirado
    if (this.session && isExpired(this.session.access_token)) {
      this.silentRefresh();
    }
  }

  // ── Listeners ──────────────────────────────────────────────────────────────

  onAuthStateChange(callback: Listener): { data: { subscription: { unsubscribe: () => void } } } {
    this.listeners.add(callback);
    return {
      data: { subscription: { unsubscribe: () => this.listeners.delete(callback) } },
    };
  }

  // ── Sign in / out ──────────────────────────────────────────────────────────

  async signInWithPassword(params: {
    email: string;
    password: string;
  }): Promise<{ data: { session: Session | null; user: User | null }; error: AuthError | null }> {
    try {
      const response = await fetch(`${this.url}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { apikey: this.anonKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const payload = await response.json();
      if (!response.ok) {
        return { data: { session: null, user: null }, error: { message: payload?.msg ?? 'Login failed' } };
      }
      this.setSession({ access_token: payload.access_token, refresh_token: payload.refresh_token, user: payload.user });
      this.emit('SIGNED_IN');
      return { data: { session: this.session, user: this.session!.user }, error: null };
    } catch {
      return { data: { session: null, user: null }, error: { message: 'Network error during login' } };
    }
  }

  async signOut(): Promise<{ error: AuthError | null }> {
    this.clearSession();
    this.emit('SIGNED_OUT');
    return { error: null };
  }

  // ── Session ────────────────────────────────────────────────────────────────

  /**
   * Retorna a sessão válida. Se o access_token estiver expirado, faz refresh
   * automático usando o refresh_token antes de retornar.
   */
  async getSession(): Promise<{ data: { session: Session | null }; error: AuthError | null }> {
    if (this.session && isExpired(this.session.access_token)) {
      const refreshed = await this.refresh();
      return { data: { session: refreshed }, error: null };
    }
    return { data: { session: this.session }, error: null };
  }

  async getUser(): Promise<{ data: { user: User | null }; error: AuthError | null }> {
    const { data } = await this.getSession();
    return { data: { user: data.session?.user ?? null }, error: null };
  }

  // ── Password ───────────────────────────────────────────────────────────────

  async resetPasswordForEmail(
    email: string,
    options?: { redirectTo?: string },
  ): Promise<{ data: Record<string, unknown>; error: AuthError | null }> {
    try {
      const response = await fetch(`${this.url}/auth/v1/recover`, {
        method: 'POST',
        headers: { apikey: this.anonKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, ...options }),
      });
      return { data: {}, error: response.ok ? null : { message: 'Failed to send reset email' } };
    } catch {
      return { data: {}, error: { message: 'Network error' } };
    }
  }

  async updateUser(params: {
    password?: string;
    email?: string;
    data?: Record<string, unknown>;
  }): Promise<{ data: { user: User | null }; error: AuthError | null }> {
    const token = await this.freshToken();
    try {
      const response = await fetch(`${this.url}/auth/v1/user`, {
        method: 'PUT',
        headers: {
          apikey: this.anonKey,
          Authorization: `Bearer ${token ?? ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });
      const payload = await response.json();
      if (!response.ok) {
        return { data: { user: null }, error: { message: payload?.msg ?? 'Failed to update user' } };
      }
      return { data: { user: payload }, error: null };
    } catch {
      return { data: { user: null }, error: { message: 'Network error' } };
    }
  }

  // ── Token access (usado pelo QueryBuilder / FunctionsClient) ───────────────

  /** Retorna o access_token atual sem refresh. Apenas leitura rápida. */
  get accessToken(): string | null {
    return this.session?.access_token ?? null;
  }

  /**
   * Retorna um access_token fresco, fazendo refresh silencioso se necessário.
   * Usado pelo QueryBuilder antes de cada request.
   */
  async freshToken(): Promise<string | null> {
    if (!this.session) return null;
    if (isExpired(this.session.access_token)) {
      const refreshed = await this.refresh();
      return refreshed?.access_token ?? null;
    }
    return this.session.access_token;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Chama o endpoint de refresh. Serializa chamadas concorrentes numa única
   * Promise para evitar múltiplos refreshes simultâneos.
   */
  private refresh(): Promise<Session | null> {
    if (!this.refreshPromise) {
      this.refreshPromise = this.doRefresh().finally(() => {
        this.refreshPromise = null;
      });
    }
    return this.refreshPromise;
  }

  private async doRefresh(): Promise<Session | null> {
    const refreshToken = this.session?.refresh_token;
    if (!refreshToken) {
      this.clearSession();
      this.emit('SIGNED_OUT');
      return null;
    }

    try {
      const response = await fetch(`${this.url}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: { apikey: this.anonKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      const payload = await response.json();

      if (!response.ok) {
        // Refresh inválido/expirado — força logout
        this.clearSession();
        this.emit('SIGNED_OUT');
        return null;
      }

      const newSession: Session = {
        access_token: payload.access_token,
        refresh_token: payload.refresh_token ?? refreshToken,
        user: payload.user ?? this.session!.user,
      };
      this.setSession(newSession);
      this.emit('TOKEN_REFRESHED');
      return newSession;
    } catch {
      return null;
    }
  }

  /** Kick-off silencioso (sem await no construtor) */
  private silentRefresh(): void {
    this.refresh().catch(() => null);
  }

  private setSession(session: Session): void {
    this.session = session;
    localStorage.setItem('sb_session', JSON.stringify(session));
  }

  private clearSession(): void {
    this.session = null;
    localStorage.removeItem('sb_session');
  }

  private emit(event: string): void {
    for (const listener of this.listeners) {
      listener(event, this.session);
    }
  }
}

// ─── QueryBuilder ─────────────────────────────────────────────────────────────

class QueryBuilder {
  private selected = '*';
  private filters: Array<[string, string]> = [];
  private orderBy: { column: string; ascending: boolean } | null = null;
  private limitValue: number | null = null;
  private shouldSingle = false;
  private selectOptions: { count?: 'exact'; head?: boolean } | undefined;
  private mutationMethod: 'POST' | 'PATCH' | 'DELETE' | null = null;
  private mutationBody: Record<string, unknown> | Record<string, unknown>[] | null = null;

  constructor(
    private readonly url: string,
    private readonly anonKey: string,
    // Recebe uma função que retorna o token fresco (não um valor estático)
    private readonly getToken: () => Promise<string | null>,
    private readonly table: string,
  ) {}

  select(columns: string, options?: { count?: 'exact'; head?: boolean }): this {
    this.selected = columns;
    this.selectOptions = options;
    return this;
  }

  eq(column: string, value: string): this {
    this.filters.push([column, `eq.${value}`]);
    return this;
  }

  order(column: string, options: { ascending: boolean }): this {
    this.orderBy = { column, ascending: options.ascending };
    return this;
  }

  limit(n: number): this {
    this.limitValue = n;
    return this;
  }

  single(): this {
    this.shouldSingle = true;
    return this;
  }

  insert(values: Record<string, unknown> | Record<string, unknown>[]): this {
    this.mutationMethod = 'POST';
    this.mutationBody = values;
    return this;
  }

  update(values: Record<string, unknown>): this {
    this.mutationMethod = 'PATCH';
    this.mutationBody = values;
    return this;
  }

  delete(): this {
    this.mutationMethod = 'DELETE';
    this.mutationBody = null;
    return this;
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: AuthError | null; count?: number | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    const method = this.mutationMethod ?? 'GET';
    return this.execute(method, this.mutationBody ?? undefined).then(onfulfilled, onrejected);
  }

  private async execute(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    body?: unknown,
  ): Promise<{ data: any; error: AuthError | null; count?: number | null }> {
    const params = new URLSearchParams();
    params.set('select', this.selected);
    for (const [col, val] of this.filters) params.set(col, val);
    if (this.orderBy) params.set('order', `${this.orderBy.column}.${this.orderBy.ascending ? 'asc' : 'desc'}`);
    if (this.limitValue !== null) params.set('limit', String(this.limitValue));

    // Obtém token fresco (faz refresh se necessário) antes de enviar
    const token = await this.getToken();

    try {
      const response = await fetch(`${this.url}/rest/v1/${this.table}?${params.toString()}`, {
        method,
        headers: {
          apikey: this.anonKey,
          Authorization: `Bearer ${token ?? ''}`,
          'Content-Type': 'application/json',
          Prefer:
            this.selectOptions?.count === 'exact'
              ? 'count=exact,return=representation'
              : 'return=representation',
        },
        body: method === 'POST' || method === 'PATCH' ? JSON.stringify(body) : undefined,
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        return { data: null, error: { message: payload?.message ?? payload?.msg ?? 'Request failed' } };
      }

      const contentRange = response.headers.get('content-range');
      const count = contentRange?.includes('/') ? Number(contentRange.split('/')[1]) : null;
      const data = this.shouldSingle && Array.isArray(payload) ? (payload[0] ?? null) : payload;

      return { data, error: null, count };
    } catch {
      return { data: null, error: { message: 'Network error while querying Supabase' } };
    }
  }
}

// ─── FunctionsClient ──────────────────────────────────────────────────────────

class FunctionsClient {
  constructor(
    private readonly url: string,
    private readonly getToken: () => Promise<string | null>,
    private readonly anonKey: string,
  ) {}

  async invoke(fnName: string, options?: { body?: unknown }): Promise<{ data: unknown; error: AuthError | null }> {
    const token = await this.getToken();
    try {
      const response = await fetch(`${this.url}/functions/v1/${fnName}`, {
        method: 'POST',
        headers: {
          apikey: this.anonKey,
          Authorization: `Bearer ${token ?? ''}`,
          'Content-Type': 'application/json',
        },
        body: options?.body ? JSON.stringify(options.body) : undefined,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        return { data: null, error: { message: payload?.error ?? 'Edge function error' } };
      }
      return { data: payload, error: null };
    } catch {
      return { data: null, error: { message: 'Network error invoking edge function' } };
    }
  }
}

// ─── SupabaseClient ───────────────────────────────────────────────────────────

export class SupabaseClient {
  readonly auth: SupabaseAuthClient;
  readonly functions: FunctionsClient;

  constructor(private readonly url: string, private readonly anonKey: string) {
    this.auth = new SupabaseAuthClient(url, anonKey);
    // Passa um getter que sempre obtém o token mais recente (com refresh se necessário)
    const getToken = () => this.auth.freshToken();
    this.functions = new FunctionsClient(url, getToken, anonKey);
  }

  from(table: string): QueryBuilder {
    return new QueryBuilder(this.url, this.anonKey, () => this.auth.freshToken(), table);
  }
}

export function createClient(url: string, anonKey: string): SupabaseClient {
  return new SupabaseClient(url, anonKey);
}
