# Guia do Admin — Boilerplate Manager

> Este painel é o back-office de um SaaS multi-tenant.
> Cada "tenant" é uma **Organização**. Tudo gira em torno dela.

---

## Conceitos fundamentais

```
Organização
  └── Membros (usuários com papel/role)
  └── Projetos
  └── Roles → Permissões
```

Um usuário pode pertencer a **várias organizações**, com **roles diferentes** em cada uma.
O seletor de organização no topo/sidebar define o contexto de tudo que você vê.

---

## Menu a menu

---

### Dashboard

**O que é:**
Visão geral da organização selecionada.

**O que mostra:**
| Card | Fonte |
|------|-------|
| Organizações | Total no banco (sem filtro de org) |
| Projetos | Total da org ativa |
| Membros | Total de memberships na org ativa |

Abaixo dos cards:
- **Projetos recentes** — últimos 5 projetos criados na org
- **Atividade recente** — últimas 10 entradas do `audit_log` (quem fez o quê e quando)

**Quando usar:**
Primeira tela após login. Dá uma foto do estado da conta.

**Limitações atuais:**
- Sem gráfico de crescimento ao longo do tempo
- Audit log mostra apenas ação + tabela, sem nome do usuário

---

### Organizations

**O que é:**
CRUD de organizações (tenants).

**Fluxo típico:**
1. Criar uma org com **nome** e **slug** (identificador único, ex.: `minha-empresa`)
2. A org aparece no seletor do cabeçalho/sidebar
3. Tudo que você criar a partir daí (projetos, membros) fica dentro dessa org

**Regras importantes:**
- `slug` é único globalmente — use kebab-case (`minha-empresa`, não `Minha Empresa`)
- Só quem criou a org (ou tem permissão `manage_organizations`) consegue editá-la/deletá-la (RLS no banco)
- Deletar uma org remove em cascata: projetos, memberships e audit logs dela

**Quando usar:**
- Onboarding de um novo cliente → cria a org dele
- Renomear/reorganizar tenants existentes

---

### Users

**O que é:**
Gerenciamento de **memberships** — quem faz parte da organização ativa e qual o papel de cada um.

**O que você vê:**
| Coluna | Origem |
|--------|--------|
| Nome / Email | Tabela `profiles` (join) |
| Status | `active`, `invited`, `suspended` |
| Role | Seletor com todas as roles disponíveis |

**Ações disponíveis:**
- **Convidar usuário**: preenche o email e clica "Convidar"
  - Dispara a Edge Function `invite-user`
  - Supabase envia email com link de aceite
  - O usuário aparece com status `invited` até aceitar
- **Trocar role**: dropdown direto na tabela, salva imediatamente

**Fluxo de convite:**
```
Admin digita email → Edge Function verifica permissão →
supabase.auth.admin.inviteUserByEmail() → email enviado →
usuário clica no link → status muda para "active"
```

**Quando usar:**
- Adicionar um novo colaborador à organização
- Promover/rebaixar alguém (ex.: member → admin)
- Visualizar quem ainda não aceitou o convite

**Restrição:** só quem tem a permissão `manage_users` pode convidar.
Essa permissão é verificada dentro da Edge Function (não no frontend).

---

### Roles

**O que é:**
Gerenciamento de **roles** (papéis) e suas **permissões**.

**Estrutura:**
```
Role  ──── role_permissions ──── Permission
admin            M:N              manage_users
member                            manage_projects
viewer                            view_reports
```

**O que você pode fazer:**
- **Criar role**: nome + descrição opcional
- **Editar nome/descrição** de uma role existente
- **Atribuir permissões**: checkboxes que ligam/desligam permissões para a role
- **Deletar role** (cuidado — membros com essa role perdem o papel)

**Roles padrão (seed):**
| Role | Descrição sugerida |
|------|--------------------|
| admin | Acesso total |
| member | Acesso operacional |
| viewer | Somente leitura |

**Permissões padrão (seed):**
Definidas em `supabase/migrations/005_seed.sql`.
A função `has_permission(user_id, permission_name, org_id)` no PostgreSQL é usada pelo RLS para bloquear operações não autorizadas diretamente no banco.

**Quando usar:**
- Criar um novo tipo de usuário (ex.: `billing_manager`)
- Restringir o que um `member` pode fazer
- Revisar quais permissões cada role tem antes de convidar alguém

---

### Projects

**O que é:**
CRUD de projetos dentro da organização ativa.

**Campos:**
| Campo | Obrigatório | Descrição |
|-------|-------------|-----------|
| Name | Sim | Nome do projeto |
| Description | Não | Texto livre |

Internamente o banco também armazena `organization_id` e `owner_id` (quem criou).

**Fluxo:**
1. Seleciona a organização no seletor (cabeçalho ou sidebar)
2. Clica em **New project**
3. Preenche nome e descrição
4. O projeto aparece na lista e no Dashboard (projetos recentes)

**Navegação:**
- `/projects` → lista
- `/projects/new` → formulário de criação
- `/projects/:id/edit` → formulário de edição

**RLS:**
Só membros ativos da organização conseguem ver/editar projetos dela.
O `owner_id` pode ter regras extras (ex.: só o dono pode deletar — a depender da policy).

**Quando usar:**
- Cada "produto", "cliente" ou "iniciativa" que o tenant gerencia pode ser um projeto
- O projeto é a entidade central que você vai expandir com sub-recursos (tarefas, arquivos, etc.)

---

## Seletor de Organização

Aparece no **cabeçalho** (dropdown) e na **sidebar** (quando há mais de uma org).

**O que ele faz:**
- Muda o contexto de **todos** os dados exibidos
- Recarrega projetos, membros e atividade automaticamente (via `effect()` nos componentes)
- Carrega as permissões RBAC do usuário para a org selecionada

**Fluxo de troca:**
```
Usuário seleciona org B →
OrganizationService.setCurrentOrganization(orgB.id) →
RbacService.loadForOrganization(userId, orgB.id) →
Dashboard/Projects/Users recarregam via effect()
```

---

## Rotas de autenticação

| Rota | Uso |
|------|-----|
| `/auth/login` | Login principal (com returnUrl) |
| `/auth/forgot-password` | Solicitar link de reset por email |
| `/auth/reset-password` | Definir nova senha (acessado via link do email) |
| `/signin` | Rota legada (redireciona ao login) |

---

## Permissões relevantes para o admin

| Permissão | O que libera |
|-----------|--------------|
| `manage_organizations` | Editar/deletar orgs |
| `manage_users` | Convidar usuários (edge function) |
| `manage_projects` | Criar/editar/deletar projetos |
| `manage_roles` | Criar/editar roles e permissões |

Permissões são verificadas em dois lugares:
1. **Banco (RLS)** — bloqueia na query se `has_permission()` retornar `false`
2. **Edge Function** — verifica antes de usar `service_role`

---

## Como expandir o boilerplate

| Quero adicionar... | Onde mexer |
|-------------------|-----------|
| Novo tipo de recurso (ex: faturas) | Nova tabela + migration + novo repository + novo feature component |
| Nova permissão | `INSERT INTO permissions` na seed + checar via `has_permission()` |
| Novo campo no projeto | Migration de `ALTER TABLE` + atualizar `project.model.ts` + form |
| Notificações in-app | Nova tabela `notifications` + componente no header |
| Audit log detalhado | O trigger `write_audit_log` já registra tudo em `audit_logs` — só criar a UI |
