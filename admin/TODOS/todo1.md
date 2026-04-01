# Roteiro de implementação — boilerplate-manager boilerplate
# Execute este arquivo como prompt no Claude Code

---

## CONTEXTO DO PROJETO

Projeto Angular 21 standalone (sem NgModules), TypeScript 5.9, Tailwind CSS v4, ngx-formly v7, Supabase (PostgreSQL + Auth + RLS). Estado gerenciado 100% com Angular Signals (`signal()`, `computed()`, `effect()`). DI via `inject()` funcional. Guards funcionais (`CanActivateFn`). Sem NgRx.

O Supabase já possui:
- 8 tabelas com RLS habilitado
- Função `has_permission()` no PostgreSQL
- Audit log via triggers automáticos
- RBAC implementado no banco

**Antes de qualquer implementação, leia a estrutura atual do projeto com `find src -type f -name "*.ts" | head -80` e `cat` nos arquivos relevantes para entender o que já existe. Nunca sobrescreva código funcional sem ler primeiro.**

---

## OBJETIVO

Transformar o projeto em um boilerplate SaaS genérico multi-tenant production-ready. As tarefas abaixo devem ser executadas em ordem pois há dependências entre elas.

---

## TAREFA 1 — ESTRUTURA DE PASTAS

Reorganize `src/app/` para a seguinte estrutura se ainda não existir. Não delete arquivos — mova-os:

```
src/app/
├── core/
│   ├── auth/
│   │   ├── auth.service.ts
│   │   ├── auth.guard.ts
│   │   └── auth.interceptor.ts
│   ├── supabase/
│   │   └── supabase.service.ts        ← já existe, mova se necessário
│   └── repositories/
│       ├── org.repository.ts
│       ├── project.repository.ts
│       ├── member.repository.ts
│       └── audit.repository.ts
├── features/
│   ├── auth/
│   │   ├── login/
│   │   ├── forgot-password/
│   │   └── reset-password/
│   ├── dashboard/
│   ├── organizations/
│   ├── projects/
│   └── users/
└── shared/
    ├── components/
    └── models/
        ├── org.model.ts
        ├── project.model.ts
        ├── member.model.ts
        └── audit.model.ts
```

Atualize todos os imports após mover. Rode `ng build` para confirmar que não quebrou nada antes de continuar.

---

## TAREFA 2 — MODELOS TYPESCRIPT

Crie os modelos em `src/app/shared/models/`. Use `readonly` em todos os campos de leitura.

**`org.model.ts`**
```typescript
export interface Org {
  readonly id: string
  readonly name: string
  readonly slug: string
  readonly created_at: string
  readonly updated_at: string
}

export interface CreateOrgDto {
  name: string
  slug: string
}

export interface UpdateOrgDto {
  name?: string
  slug?: string
}
```

**`project.model.ts`**
```typescript
export interface Project {
  readonly id: string
  readonly org_id: string
  readonly name: string
  readonly description: string | null
  readonly status: 'active' | 'inactive' | 'archived'
  readonly created_at: string
  readonly updated_at: string
}

export interface CreateProjectDto {
  org_id: string
  name: string
  description?: string
  status?: Project['status']
}

export interface UpdateProjectDto {
  name?: string
  description?: string
  status?: Project['status']
}
```

**`member.model.ts`**
```typescript
export interface Member {
  readonly id: string
  readonly org_id: string
  readonly user_id: string
  readonly role: string
  readonly status: 'active' | 'invited' | 'inactive'
  readonly email: string
  readonly full_name: string | null
  readonly created_at: string
}
```

**`audit.model.ts`**
```typescript
export interface AuditEntry {
  readonly id: string
  readonly org_id: string | null
  readonly user_id: string | null
  readonly action: string
  readonly table_name: string
  readonly record_id: string | null
  readonly old_data: Record<string, unknown> | null
  readonly new_data: Record<string, unknown> | null
  readonly created_at: string
}
```

Adapte os campos para bater exatamente com o schema real do banco. Rode `supabase db dump --schema public` ou leia as migrations para confirmar os nomes das colunas antes de criar os modelos.

---

## TAREFA 3 — AUTH SERVICE COM REFRESH TOKEN

Crie `src/app/core/auth/auth.service.ts`:

```typescript
import { Injectable, signal, computed, inject } from '@angular/core'
import { Router } from '@angular/router'
import { SupabaseService } from '@core/supabase/supabase.service'
import { Session, User } from '@supabase/supabase-js'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

@Injectable({ providedIn: 'root' })
export class AuthService {
  private supabase = inject(SupabaseService).client
  private router   = inject(Router)

  private _session = signal<Session | null>(null)
  private _status  = signal<AuthStatus>('loading')
  private _error   = signal<string | null>(null)

  readonly session         = this._session.asReadonly()
  readonly status          = this._status.asReadonly()
  readonly error           = this._error.asReadonly()
  readonly user            = computed(() => this._session()?.user ?? null)
  readonly isAuthenticated = computed(() => this._status() === 'authenticated')
  readonly isLoading       = computed(() => this._status() === 'loading')

  constructor() {
    this.init()
  }

  private init(): void {
    // Recupera sessão existente — o Supabase já faz refresh se necessário
    this.supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        this._status.set('unauthenticated')
        return
      }
      this._session.set(data.session)
      this._status.set(data.session ? 'authenticated' : 'unauthenticated')
    })

    // Listener para todos os eventos — TOKEN_REFRESHED é o refresh silencioso
    this.supabase.auth.onAuthStateChange((event, session) => {
      this._session.set(session)
      this._error.set(null)

      switch (event) {
        case 'SIGNED_IN':
        case 'TOKEN_REFRESHED':
          this._status.set('authenticated')
          break
        case 'SIGNED_OUT':
          this._status.set('unauthenticated')
          this.router.navigate(['/auth/login'])
          break
        case 'PASSWORD_RECOVERY':
          this.router.navigate(['/auth/reset-password'])
          break
        case 'USER_UPDATED':
          this._status.set('authenticated')
          break
      }
    })
  }

  async signIn(email: string, password: string): Promise<void> {
    this._error.set(null)
    this._status.set('loading')
    const { error } = await this.supabase.auth.signInWithPassword({ email, password })
    if (error) {
      this._error.set(this.mapAuthError(error.message))
      this._status.set('unauthenticated')
    }
    // sucesso: onAuthStateChange dispara SIGNED_IN automaticamente
  }

  async signOut(): Promise<void> {
    await this.supabase.auth.signOut()
    // onAuthStateChange dispara SIGNED_OUT automaticamente
  }

  async sendPasswordReset(email: string): Promise<{ success: boolean; error: string | null }> {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    })
    return { success: !error, error: error ? this.mapAuthError(error.message) : null }
  }

  async updatePassword(newPassword: string): Promise<{ success: boolean; error: string | null }> {
    const { error } = await this.supabase.auth.updateUser({ password: newPassword })
    return { success: !error, error: error ? this.mapAuthError(error.message) : null }
  }

  getAccessToken(): string | null {
    return this._session()?.access_token ?? null
  }

  private mapAuthError(message: string): string {
    const map: Record<string, string> = {
      'Invalid login credentials':       'Email ou senha incorretos.',
      'Email not confirmed':             'Confirme seu email antes de entrar.',
      'User not found':                  'Usuário não encontrado.',
      'Password should be at least 6 characters': 'A senha deve ter no mínimo 6 caracteres.',
      'Rate limit exceeded':             'Muitas tentativas. Aguarde alguns minutos.',
    }
    return map[message] ?? 'Ocorreu um erro inesperado. Tente novamente.'
  }
}
```

---

## TAREFA 4 — AUTH GUARD COM RETURNURL

Crie `src/app/core/auth/auth.guard.ts`:

```typescript
import { inject } from '@angular/core'
import { CanActivateFn, Router } from '@angular/router'
import { AuthService } from './auth.service'
import { toObservable } from '@angular/core/rxjs-interop'
import { filter, map, take } from 'rxjs'

export const authGuard: CanActivateFn = (route, state) => {
  const auth   = inject(AuthService)
  const router = inject(Router)

  // Espera o status sair de 'loading' (sessão sendo verificada)
  return toObservable(auth.status).pipe(
    filter(status => status !== 'loading'),
    take(1),
    map(status => {
      if (status === 'authenticated') return true
      return router.createUrlTree(['/auth/login'], {
        queryParams: { returnUrl: state.url }
      })
    })
  )
}

// Guard para rotas públicas (login, forgot-password) — redireciona se já autenticado
export const publicGuard: CanActivateFn = (route, state) => {
  const auth   = inject(AuthService)
  const router = inject(Router)

  return toObservable(auth.status).pipe(
    filter(status => status !== 'loading'),
    take(1),
    map(status => {
      if (status === 'unauthenticated') return true
      const returnUrl = route.queryParams['returnUrl'] ?? '/dashboard'
      return router.createUrlTree([returnUrl])
    })
  )
}
```

Aplique `authGuard` em todas as rotas protegidas e `publicGuard` nas rotas de `/auth/*`. Leia o arquivo de rotas atual antes de editar.

---

## TAREFA 5 — REPOSITÓRIOS

Crie os 4 repositórios em `src/app/core/repositories/`. Padrão obrigatório: injetam `SupabaseService`, retornam `Promise`, nunca têm lógica de UI, nunca navegam, nunca mostram toast.

**`org.repository.ts`**
```typescript
import { Injectable, inject } from '@angular/core'
import { SupabaseService } from '@core/supabase/supabase.service'
import { Org, CreateOrgDto, UpdateOrgDto } from '@shared/models/org.model'

@Injectable({ providedIn: 'root' })
export class OrgRepository {
  private db = inject(SupabaseService).client

  async getAll(): Promise<Org[]> {
    const { data, error } = await this.db
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  }

  async getById(id: string): Promise<Org> {
    const { data, error } = await this.db
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  }

  async create(dto: CreateOrgDto): Promise<Org> {
    const { data, error } = await this.db
      .from('organizations')
      .insert(dto)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async update(id: string, dto: UpdateOrgDto): Promise<Org> {
    const { data, error } = await this.db
      .from('organizations')
      .update(dto)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.db
      .from('organizations')
      .delete()
      .eq('id', id)
    if (error) throw error
  }

  async count(): Promise<number> {
    const { count, error } = await this.db
      .from('organizations')
      .select('*', { count: 'exact', head: true })
    if (error) throw error
    return count ?? 0
  }
}
```

**`project.repository.ts`** — mesmo padrão, tabela `projects`, filtros por `org_id`:
```typescript
import { Injectable, inject } from '@angular/core'
import { SupabaseService } from '@core/supabase/supabase.service'
import { Project, CreateProjectDto, UpdateProjectDto } from '@shared/models/project.model'

@Injectable({ providedIn: 'root' })
export class ProjectRepository {
  private db = inject(SupabaseService).client

  async getByOrg(orgId: string): Promise<Project[]> {
    const { data, error } = await this.db
      .from('projects')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  }

  async getRecent(orgId: string, limit = 5): Promise<Project[]> {
    const { data, error } = await this.db
      .from('projects')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data
  }

  async getById(id: string): Promise<Project> {
    const { data, error } = await this.db
      .from('projects')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  }

  async create(dto: CreateProjectDto): Promise<Project> {
    const { data, error } = await this.db
      .from('projects')
      .insert(dto)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async update(id: string, dto: UpdateProjectDto): Promise<Project> {
    const { data, error } = await this.db
      .from('projects')
      .update(dto)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.db
      .from('projects')
      .delete()
      .eq('id', id)
    if (error) throw error
  }

  async countByOrg(orgId: string): Promise<number> {
    const { count, error } = await this.db
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
    if (error) throw error
    return count ?? 0
  }
}
```

**`member.repository.ts`**
```typescript
import { Injectable, inject } from '@angular/core'
import { SupabaseService } from '@core/supabase/supabase.service'
import { Member } from '@shared/models/member.model'

@Injectable({ providedIn: 'root' })
export class MemberRepository {
  private db = inject(SupabaseService).client

  async getByOrg(orgId: string): Promise<Member[]> {
    const { data, error } = await this.db
      .from('org_members')           // confirme o nome real da tabela nas migrations
      .select(`
        id, org_id, user_id, role, status, created_at,
        profiles ( email, full_name )
      `)
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
    if (error) throw error
    // Flatten do join
    return data.map((m: any) => ({
      ...m,
      email:     m.profiles?.email     ?? '',
      full_name: m.profiles?.full_name ?? null,
    }))
  }

  async countByOrg(orgId: string): Promise<number> {
    const { count, error } = await this.db
      .from('org_members')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
    if (error) throw error
    return count ?? 0
  }

  async updateRole(memberId: string, role: string): Promise<void> {
    const { error } = await this.db
      .from('org_members')
      .update({ role })
      .eq('id', memberId)
    if (error) throw error
  }

  async remove(memberId: string): Promise<void> {
    const { error } = await this.db
      .from('org_members')
      .delete()
      .eq('id', memberId)
    if (error) throw error
  }
}
```

**`audit.repository.ts`**
```typescript
import { Injectable, inject } from '@angular/core'
import { SupabaseService } from '@core/supabase/supabase.service'
import { AuditEntry } from '@shared/models/audit.model'

@Injectable({ providedIn: 'root' })
export class AuditRepository {
  private db = inject(SupabaseService).client

  async getRecent(orgId: string, limit = 10): Promise<AuditEntry[]> {
    const { data, error } = await this.db
      .from('audit_log')             // confirme o nome real da tabela nas migrations
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data
  }

  async getAll(orgId: string): Promise<AuditEntry[]> {
    const { data, error } = await this.db
      .from('audit_log')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  }
}
```

**ATENÇÃO**: Antes de criar os repositórios, rode `cat supabase/migrations/*.sql | grep -E "CREATE TABLE"` para confirmar os nomes exatos das tabelas e ajuste os `.from()` de acordo.

---

## TAREFA 6 — FLUXO DE AUTH (PÁGINAS)

### 6a — Login page

Crie ou reescreva `src/app/features/auth/login/login.component.ts`:

- Injeta `AuthService`
- Formulário com `email` e `password` (pode usar ngx-formly ou template-driven)
- Chama `authService.signIn(email, password)`
- Exibe `authService.error()` inline abaixo do form
- Botão desabilitado enquanto `authService.isLoading()`
- Após login bem-sucedido, redireciona para `returnUrl` do queryParam ou `/dashboard`
- Aplica `publicGuard` na rota

### 6b — Forgot password page

Crie `src/app/features/auth/forgot-password/forgot-password.component.ts`:

- Campo de email
- Chama `authService.sendPasswordReset(email)`
- Após sucesso exibe mensagem: "Enviamos um link para seu email. Verifique a caixa de entrada."
- Não redireciona automaticamente
- Link "Voltar ao login"

### 6c — Reset password page

Crie `src/app/features/auth/reset-password/reset-password.component.ts`:

- Dois campos: `nova senha` e `confirmar senha`
- Valida que as senhas coincidem antes de submeter
- Chama `authService.updatePassword(newPassword)`
- Após sucesso redireciona para `/dashboard` com mensagem de confirmação
- Esta rota é acessada via link de email — o Supabase injeta o token na URL automaticamente, não precisa tratá-lo manualmente
- Proteja com guard que verifica se há sessão ativa (o link de reset já cria uma sessão temporária)

---

## TAREFA 7 — EDGE FUNCTION PARA CONVITE DE USUÁRIO

**IMPORTANTE**: O `supabase.auth.admin.inviteUserByEmail()` exige `service_role` key. Nunca coloque essa key no frontend Angular. Crie uma Edge Function.

Crie `supabase/functions/invite-user/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verifica se o chamador está autenticado e é admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Cliente com a sessão do usuário chamador (para verificar permissão)
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    // Verifica se o usuário tem permissão de admin
    const { data: permData, error: permError } = await userClient
      .rpc('has_permission', { permission_name: 'manage_users' })
    
    if (permError || !permData) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Cliente admin com service_role (só no servidor)
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { email, role, org_id } = await req.json()

    if (!email || !org_id) {
      return new Response(JSON.stringify({ error: 'email e org_id são obrigatórios' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { org_id, role: role ?? 'member' },
      redirectTo: `${Deno.env.get('SITE_URL')}/auth/accept-invite`
    })

    if (error) throw error

    return new Response(JSON.stringify({ success: true, user: data.user }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
```

Crie um `InviteService` em `src/app/features/users/invite.service.ts` que chama esta Edge Function via `supabase.functions.invoke('invite-user', { body: { email, role, org_id } })`.

---

## TAREFA 8 — DASHBOARD COM DADOS REAIS

Crie ou reescreva `src/app/features/dashboard/dashboard.component.ts`:

```typescript
import { Component, inject, signal, computed, OnInit } from '@angular/core'
import { OrgRepository }     from '@core/repositories/org.repository'
import { ProjectRepository } from '@core/repositories/project.repository'
import { MemberRepository }  from '@core/repositories/member.repository'
import { AuditRepository }   from '@core/repositories/audit.repository'
// importe o OrgContextService existente para pegar a org ativa

@Component({
  selector: 'app-dashboard',
  standalone: true,
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private orgRepo     = inject(OrgRepository)
  private projectRepo = inject(ProjectRepository)
  private memberRepo  = inject(MemberRepository)
  private auditRepo   = inject(AuditRepository)
  // private orgContext = inject(OrgContextService) ← adapte para o service existente

  // Métricas
  totalOrgs     = signal<number>(0)
  totalProjects = signal<number>(0)
  totalMembers  = signal<number>(0)

  // Listagens
  recentProjects = signal<any[]>([])
  recentActivity = signal<any[]>([])

  // Estados de carregamento
  loadingMetrics  = signal(true)
  loadingProjects = signal(true)
  loadingActivity = signal(true)

  // Erros por seção
  errorMetrics  = signal<string | null>(null)
  errorProjects = signal<string | null>(null)
  errorActivity = signal<string | null>(null)

  ngOnInit(): void {
    // Leia a org ativa do context service existente
    // const orgId = this.orgContext.activeOrg()?.id
    // if (!orgId) return
    // Substitua 'ACTIVE_ORG_ID' pelo signal/valor real da org ativa

    this.loadMetrics()
    this.loadRecentProjects()
    this.loadRecentActivity()
  }

  private async loadMetrics(): Promise<void> {
    this.loadingMetrics.set(true)
    this.errorMetrics.set(null)
    try {
      const [orgs, projects, members] = await Promise.all([
        this.orgRepo.count(),
        this.projectRepo.countByOrg('ACTIVE_ORG_ID'),
        this.memberRepo.countByOrg('ACTIVE_ORG_ID'),
      ])
      this.totalOrgs.set(orgs)
      this.totalProjects.set(projects)
      this.totalMembers.set(members)
    } catch (e: any) {
      this.errorMetrics.set('Erro ao carregar métricas.')
    } finally {
      this.loadingMetrics.set(false)
    }
  }

  private async loadRecentProjects(): Promise<void> {
    this.loadingProjects.set(true)
    this.errorProjects.set(null)
    try {
      const projects = await this.projectRepo.getRecent('ACTIVE_ORG_ID', 5)
      this.recentProjects.set(projects)
    } catch (e: any) {
      this.errorProjects.set('Erro ao carregar projetos.')
    } finally {
      this.loadingProjects.set(false)
    }
  }

  private async loadRecentActivity(): Promise<void> {
    this.loadingActivity.set(true)
    this.errorActivity.set(null)
    try {
      const activity = await this.auditRepo.getRecent('ACTIVE_ORG_ID', 10)
      this.recentActivity.set(activity)
    } catch (e: any) {
      this.errorActivity.set('Erro ao carregar atividade.')
    } finally {
      this.loadingActivity.set(false)
    }
  }
}
```

**Template do dashboard** — crie `dashboard.component.html` com:

1. **Cards de métricas** (3 cards lado a lado): Total de Organizações, Total de Projetos, Total de Membros. Cada card exibe skeleton (div animado com `animate-pulse`) enquanto `loadingMetrics()` for true. Se `errorMetrics()`, exibe mensagem de erro com botão "Tentar novamente".

2. **Projetos recentes** (tabela ou lista): nome, status (badge colorido), data de criação formatada com `DatePipe`. Skeleton de 5 linhas durante o loading. Coluna com link para `/projects/:id`.

3. **Feed de atividade recente**: lista vertical com ação, tabela afetada, usuário (se disponível) e timestamp relativo (use `DatePipe` com `'relative'` ou formate manualmente). Skeleton de 10 linhas durante o loading.

**IMPORTANTE**: Leia o template atual do dashboard antes de reescrever. Preserve a estrutura de layout (sidebar, topbar, grid) — só substitua a área de conteúdo.

---

## TAREFA 9 — REATIVIDADE AO ORG SWITCHER

Localize o `OrgContextService` (ou equivalente) que gerencia a org ativa. Ele já deve existir baseado na análise do projeto.

No `DashboardComponent`, substitua o `ngOnInit` estático por um `effect()` que reage à mudança de org:

```typescript
constructor() {
  effect(() => {
    const orgId = this.orgContext.activeOrg()?.id
    if (!orgId) return
    // Recarrega tudo quando a org muda
    this.loadMetrics(orgId)
    this.loadRecentProjects(orgId)
    this.loadRecentActivity(orgId)
  })
}
```

Atualize os métodos `loadMetrics`, `loadRecentProjects` e `loadRecentActivity` para receber `orgId: string` como parâmetro.

---

## TAREFA 10 — REMOÇÃO DO TRIGGER DE DEV

Verifique se o arquivo `supabase/migrations/006_force_admin_for_lfj182.sql` existe:

```bash
ls supabase/migrations/
cat supabase/migrations/006_force_admin_for_lfj182.sql
```

Se existir, crie uma migration de rollback:

```sql
-- supabase/migrations/007_remove_dev_trigger.sql
-- Remove trigger de desenvolvimento que força admin para usuário específico
-- Este trigger não deve existir em produção

DROP TRIGGER IF EXISTS force_admin_for_lfj182 ON auth.users;
DROP FUNCTION IF EXISTS force_admin_for_lfj182();
```

Adapte o nome do trigger/function para o nome real encontrado no arquivo. Rode `supabase db reset` localmente para confirmar que a migration funciona sem erros.

---

## TAREFA 11 — VERIFICAÇÃO FINAL

Após completar todas as tarefas, execute:

```bash
# Build sem erros
ng build --configuration production

# Verificar que não há imports diretos de supabaseService.client nos feature components
grep -r "supabaseService.client" src/app/features/ && echo "PROBLEMA: ainda há acesso direto" || echo "OK: nenhum acesso direto nos features"

# Verificar que todos os repositórios estão sendo usados
grep -r "from.*repositories" src/app/features/ | head -20

# Verificar que o trigger de dev foi removido
grep -r "force_admin" supabase/migrations/ && echo "ATENÇÃO: trigger de dev ainda existe"
```

Corrija qualquer erro de build antes de finalizar.

---

## RESTRIÇÕES GLOBAIS

- **Nunca** use `supabase.client.from()` diretamente em components — sempre via repositório
- **Nunca** exponha `service_role` key no frontend — apenas em Edge Functions
- **Sempre** use `signal()`, `computed()`, `effect()` — nunca `BehaviorSubject` ou `Subject` para estado
- **Sempre** trate erros com mensagens em português amigáveis ao usuário
- **Sempre** implemente loading states — nunca deixe a UI sem feedback durante operações assíncronas
- **Sempre** leia o arquivo existente antes de editar — nunca sobrescreva sem analisar
- Mantenha 100% standalone components — nunca crie NgModules
- Use `inject()` funcional — nunca injete via construtor com tipagem antiga

---

## ORDEM DE EXECUÇÃO OBRIGATÓRIA

```
1. Estrutura de pastas
2. Modelos TypeScript
3. AuthService + refresh token
4. Auth Guard
5. Repositórios (leia as migrations primeiro)
6. Páginas de auth (login, forgot, reset)
7. Edge Function invite-user
8. Dashboard com dados reais
9. Reatividade ao org switcher
10. Remoção do trigger de dev
11. Verificação final com ng build
```

Não pule etapas. Cada etapa depende da anterior.
