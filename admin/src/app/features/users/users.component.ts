import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OrganizationService } from '../../core/services/organization.service';
import { MemberRepository } from '@core/repositories/member.repository';
import { RolesRepository } from '@core/repositories/roles.repository';
import { InviteService } from './invite.service';
import { Member } from '@shared/models/member.model';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <h1 class="text-2xl font-semibold text-gray-800 dark:text-white/90">Users</h1>

      @if (error()) {
        <div class="rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300">{{ error() }}</div>
      }

      <!-- Convidar usuário -->
      <form class="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/5 md:grid-cols-3" (ngSubmit)="inviteUser()">
        <input
          class="rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700 dark:bg-transparent md:col-span-2"
          type="email"
          placeholder="Email para convidar"
          [(ngModel)]="inviteEmail"
          name="inviteEmail"
          required
        />
        <button
          class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
          type="submit"
          [disabled]="inviting() || !inviteEmail"
        >
          {{ inviting() ? 'Enviando...' : 'Convidar' }}
        </button>
      </form>

      @if (inviteSuccess()) {
        <div class="rounded-lg border border-success-200 bg-success-50 p-3 text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-300">
          Convite enviado com sucesso para {{ inviteEmail }}.
        </div>
      }

      <div class="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/5">
        <table class="min-w-full">
          <thead class="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/5">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Profile</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Status</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Role</th>
            </tr>
          </thead>
          <tbody>
            @for (member of members(); track member.id) {
              <tr class="border-b border-gray-200 last:border-b-0 dark:border-gray-800">
                <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                  <div>{{ member.full_name || 'No name' }}</div>
                  <div class="text-xs text-gray-500">{{ member.email || member.user_id }}</div>
                </td>
                <td class="px-4 py-3 text-sm text-gray-500">{{ member.status }}</td>
                <td class="px-4 py-3">
                  <select
                    class="h-9 rounded-lg border border-gray-200 bg-transparent px-2 text-sm dark:border-gray-700"
                    [ngModel]="member.role_id"
                    (ngModelChange)="updateRole(member.id, $event)"
                  >
                    @for (role of roles(); track role.id) {
                      <option [ngValue]="role.id">{{ role.name }}</option>
                    }
                  </select>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="3" class="px-4 py-8 text-center text-sm text-gray-500">Nenhum membro encontrado para esta organização.</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class UsersComponent {
  private readonly memberRepo = inject(MemberRepository);
  private readonly rolesRepo = inject(RolesRepository);
  private readonly inviteService = inject(InviteService);
  private readonly organizationService = inject(OrganizationService);

  readonly members = signal<Member[]>([]);
  readonly roles = signal<{ id: string; name: string }[]>([]);
  readonly error = signal<string | null>(null);
  readonly inviteEmail = '';
  readonly inviting = signal(false);
  readonly inviteSuccess = signal(false);
  readonly organizationId = computed(() => this.organizationService.currentOrganizationId());

  inviteEmail_value = '';
  get inviteEmail_bind() { return this.inviteEmail_value; }
  set inviteEmail_bind(v: string) { this.inviteEmail_value = v; }

  constructor() {
    effect(() => {
      const orgId = this.organizationId();
      if (orgId) void this.loadData(orgId);
    });
  }

  async loadData(organizationId: string): Promise<void> {
    this.error.set(null);
    try {
      const [members, roles] = await Promise.all([
        this.memberRepo.getByOrg(organizationId),
        this.rolesRepo.getRoles(),
      ]);
      this.members.set(members);
      this.roles.set(roles);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Erro ao carregar dados.');
    }
  }

  async updateRole(memberId: string, roleId: string): Promise<void> {
    const orgId = this.organizationId();
    if (!orgId) return;
    try {
      await this.memberRepo.updateRole(memberId, roleId, orgId);
      await this.loadData(orgId);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Erro ao atualizar role.');
    }
  }

  async inviteUser(): Promise<void> {
    const orgId = this.organizationId();
    if (!orgId || !this.inviteEmail_value) return;

    this.inviting.set(true);
    this.error.set(null);
    this.inviteSuccess.set(false);

    const result = await this.inviteService.invite({
      email: this.inviteEmail_value,
      organization_id: orgId,
    });

    if (result.error) {
      this.error.set(result.error);
    } else {
      this.inviteSuccess.set(true);
      this.inviteEmail_value = '';
    }

    this.inviting.set(false);
  }
}
