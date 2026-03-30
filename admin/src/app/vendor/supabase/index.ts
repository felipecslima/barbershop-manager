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

class SupabaseAuthClient {
  private session: Session | null = null;
  private listeners = new Set<Listener>();

  constructor(private readonly url: string, private readonly anonKey: string) {
    const raw = localStorage.getItem('sb_session');
    this.session = raw ? JSON.parse(raw) : null;
  }

  onAuthStateChange(callback: Listener): { data: { subscription: { unsubscribe: () => void } } } {
    this.listeners.add(callback);
    return {
      data: {
        subscription: {
          unsubscribe: () => this.listeners.delete(callback),
        },
      },
    };
  }

  async signInWithPassword(params: { email: string; password: string }): Promise<{ data: { session: Session | null; user: User | null }; error: AuthError | null }> {
    try {
      const response = await fetch(`${this.url}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          apikey: this.anonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      const payload = await response.json();
      if (!response.ok) {
        return { data: { session: null, user: null }, error: { message: payload?.msg ?? 'Login failed' } };
      }

      this.session = {
        access_token: payload.access_token,
        refresh_token: payload.refresh_token,
        user: payload.user,
      };

      localStorage.setItem('sb_session', JSON.stringify(this.session));
      this.emit('SIGNED_IN');
      return { data: { session: this.session, user: this.session.user }, error: null };
    } catch {
      return { data: { session: null, user: null }, error: { message: 'Network error during login' } };
    }
  }

  async signOut(): Promise<{ error: AuthError | null }> {
    this.session = null;
    localStorage.removeItem('sb_session');
    this.emit('SIGNED_OUT');
    return { error: null };
  }

  async getSession(): Promise<{ data: { session: Session | null } }> {
    return { data: { session: this.session } };
  }

  async getUser(): Promise<{ data: { user: User | null } }> {
    return { data: { user: this.session?.user ?? null } };
  }

  get accessToken(): string | null {
    return this.session?.access_token ?? null;
  }

  private emit(event: string): void {
    for (const listener of this.listeners) {
      listener(event, this.session);
    }
  }
}

class QueryBuilder {
  private selected = '*';
  private filters: Array<[string, string]> = [];
  private orderBy: { column: string; ascending: boolean } | null = null;
  private shouldSingle = false;
  private selectOptions: { count?: 'exact'; head?: boolean } | undefined;
  private mutationMethod: 'PATCH' | 'DELETE' | null = null;
  private mutationBody: Record<string, unknown> | null = null;

  constructor(
    private readonly url: string,
    private readonly anonKey: string,
    private readonly accessToken: string | null,
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

  single(): this {
    this.shouldSingle = true;
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

  async insert(values: Record<string, unknown> | Record<string, unknown>[]): Promise<{ data: unknown; error: AuthError | null }> {
    const result = await this.execute('POST', values);
    return { data: result.data, error: result.error };
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: AuthError | null; count?: number | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    const method = this.mutationMethod ?? 'GET';
    return this.execute(method, this.mutationBody ?? undefined).then(onfulfilled, onrejected);
  }

  private async execute(method: 'GET' | 'POST' | 'PATCH' | 'DELETE', body?: unknown): Promise<{ data: any; error: AuthError | null; count?: number | null }> {
    const params = new URLSearchParams();
    params.set('select', this.selected);
    for (const [column, value] of this.filters) params.set(column, value);
    if (this.orderBy) params.set('order', `${this.orderBy.column}.${this.orderBy.ascending ? 'asc' : 'desc'}`);

    try {
      const response = await fetch(`${this.url}/rest/v1/${this.table}?${params.toString()}`, {
        method,
        headers: {
          apikey: this.anonKey,
          Authorization: `Bearer ${this.accessToken ?? ''}`,
          'Content-Type': 'application/json',
          Prefer: this.selectOptions?.count === 'exact' ? 'count=exact,return=representation' : 'return=representation',
        },
        body: method === 'POST' || method === 'PATCH' ? JSON.stringify(body) : undefined,
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        return { data: null, error: { message: payload?.message ?? 'Request failed' } };
      }

      const contentRange = response.headers.get('content-range');
      const count = contentRange?.includes('/') ? Number(contentRange.split('/')[1]) : null;
      const data = this.shouldSingle && Array.isArray(payload) ? payload[0] ?? null : payload;

      return { data, error: null, count };
    } catch {
      return { data: null, error: { message: 'Network error while querying Supabase' } };
    }
  }
}

export class SupabaseClient {
  readonly auth: SupabaseAuthClient;

  constructor(private readonly url: string, private readonly anonKey: string) {
    this.auth = new SupabaseAuthClient(url, anonKey);
  }

  from(table: string): QueryBuilder {
    return new QueryBuilder(this.url, this.anonKey, this.auth.accessToken, table);
  }
}

export function createClient(url: string, anonKey: string): SupabaseClient {
  return new SupabaseClient(url, anonKey);
}
